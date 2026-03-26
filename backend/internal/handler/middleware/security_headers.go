package middleware

import (
	"net/http"
	"strings"
)

// SecurityHeaders adds standard security headers to every response.
// These headers protect against common web vulnerabilities.
func SecurityHeaders(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		// Prevent MIME-type sniffing.
		w.Header().Set("X-Content-Type-Options", "nosniff")

		// Prevent clickjacking.
		w.Header().Set("X-Frame-Options", "DENY")

		// Enable HSTS (browsers should only connect over HTTPS).
		// max-age=31536000 = 1 year; includeSubDomains applies to all subdomains.
		w.Header().Set("Strict-Transport-Security", "max-age=31536000; includeSubDomains")

		// Disable referrer for cross-origin requests.
		w.Header().Set("Referrer-Policy", "strict-origin-when-cross-origin")

		// Content Security Policy: restrict to self.
		w.Header().Set("Content-Security-Policy", "default-src 'self'")

		// Prevent browser features we don't need.
		w.Header().Set("Permissions-Policy", "camera=(), microphone=(), geolocation=()")

		next.ServeHTTP(w, r)
	})
}

// CORSConfig holds CORS middleware configuration.
type CORSConfig struct {
	// AllowedOrigins lists the origins allowed to make cross-origin requests.
	// Use "*" to allow all origins (not recommended in production).
	AllowedOrigins []string

	// AllowedMethods lists the HTTP methods allowed for cross-origin requests.
	AllowedMethods []string

	// AllowedHeaders lists the headers clients are allowed to send.
	AllowedHeaders []string

	// AllowCredentials indicates whether the response can include credentials.
	AllowCredentials bool

	// MaxAge is how long (in seconds) preflight results can be cached.
	MaxAge string
}

// DefaultCORSConfig returns a sensible CORS configuration for the Halo API.
func DefaultCORSConfig() CORSConfig {
	return CORSConfig{
		AllowedOrigins:   []string{"http://localhost:3000"},
		AllowedMethods:   []string{"GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"},
		AllowedHeaders:   []string{"Authorization", "Content-Type", "X-Request-ID"},
		AllowCredentials: true,
		MaxAge:           "3600",
	}
}

// CORS returns CORS middleware for the given configuration.
func CORS(cfg CORSConfig) func(http.Handler) http.Handler {
	originSet := make(map[string]bool, len(cfg.AllowedOrigins))
	allowAll := false
	for _, o := range cfg.AllowedOrigins {
		if o == "*" {
			allowAll = true
		}
		originSet[o] = true
	}

	methods := strings.Join(cfg.AllowedMethods, ", ")
	headers := strings.Join(cfg.AllowedHeaders, ", ")

	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			origin := r.Header.Get("Origin")

			// Check if origin is allowed.
			if origin != "" && (allowAll || originSet[origin]) {
				w.Header().Set("Access-Control-Allow-Origin", origin)
				w.Header().Set("Vary", "Origin")

				if cfg.AllowCredentials {
					w.Header().Set("Access-Control-Allow-Credentials", "true")
				}
			}

			// Handle preflight.
			if r.Method == http.MethodOptions {
				w.Header().Set("Access-Control-Allow-Methods", methods)
				w.Header().Set("Access-Control-Allow-Headers", headers)
				if cfg.MaxAge != "" {
					w.Header().Set("Access-Control-Max-Age", cfg.MaxAge)
				}
				w.WriteHeader(http.StatusNoContent)
				return
			}

			next.ServeHTTP(w, r)
		})
	}
}
