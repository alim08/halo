package middleware

import (
	"net/http"
	"sync"
	"time"

	"halo/backend/internal/auth"
	"halo/backend/internal/handler/httputil"
)

// RateLimiter is per-IP sliding-window rate limiting middleware.
// It uses an in-memory token bucket per IP with configurable rate and burst.
type RateLimiter struct {
	mu       sync.Mutex
	visitors map[string]*visitor
	rate     int           // tokens refilled per interval
	burst    int           // max bucket size
	interval time.Duration // refill interval
}

// visitor tracks the token bucket state for a single IP.
type visitor struct {
	tokens   int
	lastSeen time.Time
}

// NewRateLimiter creates a rate limiter.
//   - rate: number of requests allowed per interval
//   - burst: maximum burst size (bucket capacity)
//   - interval: time window for the rate
//
// Example: NewRateLimiter(60, 10, time.Minute) allows 60 req/min with burst of 10.
func NewRateLimiter(rate, burst int, interval time.Duration) *RateLimiter {
	rl := &RateLimiter{
		visitors: make(map[string]*visitor),
		rate:     rate,
		burst:    burst,
		interval: interval,
	}

	// Background cleanup of stale entries.
	go rl.cleanup()

	return rl
}

// Middleware returns an HTTP middleware that enforces the rate limit per IP.
// Suitable for unauthenticated endpoints (login, registration).
func (rl *RateLimiter) Middleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		ip := r.RemoteAddr // chi RealIP middleware sets this to the real IP

		if !rl.allow(ip) {
			w.Header().Set("Retry-After", "60")
			httputil.TooManyRequests(w, "rate limit exceeded, please try again later")
			return
		}

		next.ServeHTTP(w, r)
	})
}

// MiddlewareByUser returns an HTTP middleware that enforces the rate limit
// per authenticated user (extracted from the request context). When the
// context has no user ID — which on auth-gated routes shouldn't happen but
// is treated defensively — the limit is keyed by IP. Use this for
// endpoints behind auth.Middleware so multiple users behind the same NAT
// don't share a bucket.
func (rl *RateLimiter) MiddlewareByUser(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		key := auth.UserIDFromContext(r.Context())
		if key == "" {
			key = "ip:" + r.RemoteAddr
		} else {
			key = "user:" + key
		}

		if !rl.allow(key) {
			w.Header().Set("Retry-After", "60")
			httputil.TooManyRequests(w, "rate limit exceeded, please try again later")
			return
		}

		next.ServeHTTP(w, r)
	})
}

// allow checks whether the IP is allowed to make a request.
func (rl *RateLimiter) allow(ip string) bool {
	rl.mu.Lock()
	defer rl.mu.Unlock()

	now := time.Now()

	v, exists := rl.visitors[ip]
	if !exists {
		rl.visitors[ip] = &visitor{
			tokens:   rl.burst - 1, // consume one token for this request
			lastSeen: now,
		}
		return true
	}

	// Refill tokens based on elapsed time.
	elapsed := now.Sub(v.lastSeen)
	refill := int(elapsed / rl.interval) * rl.rate
	if refill > 0 {
		v.tokens += refill
		if v.tokens > rl.burst {
			v.tokens = rl.burst
		}
		v.lastSeen = now
	}

	if v.tokens <= 0 {
		return false
	}

	v.tokens--
	return true
}

// cleanup periodically removes stale visitors to prevent memory leaks.
func (rl *RateLimiter) cleanup() {
	ticker := time.NewTicker(5 * time.Minute)
	defer ticker.Stop()

	for range ticker.C {
		rl.mu.Lock()
		cutoff := time.Now().Add(-10 * time.Minute)
		for ip, v := range rl.visitors {
			if v.lastSeen.Before(cutoff) {
				delete(rl.visitors, ip)
			}
		}
		rl.mu.Unlock()
	}
}
