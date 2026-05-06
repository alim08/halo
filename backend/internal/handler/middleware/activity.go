package middleware

import (
	"context"
	"log/slog"
	"net/http"
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
// The update runs in a goroutine so it never adds latency to the response path.
// Errors are logged at WARN level and silently dropped — this is best-effort.
func TouchLastActive(userRepo lastActiveUpdater) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			userID := auth.UserIDFromContext(r.Context())
			if userID != "" {
				go func() {
					// Use a fresh context independent of the request lifecycle so
					// the update is not cancelled when the handler returns.
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
