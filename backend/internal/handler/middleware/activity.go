package middleware

import (
	"context"
	"log/slog"
	"net/http"
	"sync"
	"time"

	"halo/backend/internal/auth"
)

const touchLastActiveTimeout = 5 * time.Second

// lastActiveUpdater is the subset of UserRepository required by TouchLastActive.
type lastActiveUpdater interface {
	TouchLastActive(ctx context.Context, userID string) error
}

// TouchLastActive returns middleware that asynchronously updates
// users.last_active_at on every authenticated request.
//
// Concurrency safety: an in-flight de-duplication map ensures at most one
// outstanding goroutine per user. Without this, a burst of concurrent
// requests from one client could spawn an unbounded number of goroutines
// (up to ~5s × RPS). With it, goroutine count is bounded by the active-user
// set size — and the second update for the same user is harmlessly dropped
// because the column has second-level granularity at best.
//
// The update runs in a goroutine so it never adds latency to the response
// path. Errors are logged at WARN and silently dropped — this is best-effort.
func TouchLastActive(userRepo lastActiveUpdater) func(http.Handler) http.Handler {
	d := &touchDeduper{inflight: make(map[string]struct{})}

	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			userID := auth.UserIDFromContext(r.Context())
			if userID != "" && d.acquire(userID) {
				go func() {
					defer d.release(userID)
					// Fresh context independent of the request lifecycle so the
					// update isn't cancelled when the handler returns.
					ctx, cancel := context.WithTimeout(context.Background(), touchLastActiveTimeout)
					defer cancel()
					if err := userRepo.TouchLastActive(ctx, userID); err != nil {
						slog.Warn("touch last_active_at failed",
							"user_id", userID,
							"err", err,
						)
					}
				}()
			}
			next.ServeHTTP(w, r)
		})
	}
}

// touchDeduper bounds the number of in-flight TouchLastActive goroutines
// to one per user.
type touchDeduper struct {
	mu       sync.Mutex
	inflight map[string]struct{}
}

// acquire reports whether the caller should spawn a goroutine for userID.
// Returns false if one is already in flight.
func (d *touchDeduper) acquire(userID string) bool {
	d.mu.Lock()
	defer d.mu.Unlock()
	if _, ok := d.inflight[userID]; ok {
		return false
	}
	d.inflight[userID] = struct{}{}
	return true
}

func (d *touchDeduper) release(userID string) {
	d.mu.Lock()
	defer d.mu.Unlock()
	delete(d.inflight, userID)
}
