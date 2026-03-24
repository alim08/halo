package auth

import (
	"context"
	"net/http"
	"strings"

	"halo/backend/internal/handler/httputil"
)

type authContextKey string

const userIDKey authContextKey = "user_id"

// Middleware returns HTTP middleware that validates Bearer tokens
// and injects the authenticated user ID into the request context.
func Middleware(jwtService *JWTService) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			authHeader := r.Header.Get("Authorization")
			if authHeader == "" {
				httputil.Unauthorized(w, "missing authorization header")
				return
			}

			parts := strings.SplitN(authHeader, " ", 2)
			if len(parts) != 2 || !strings.EqualFold(parts[0], "bearer") {
				httputil.Unauthorized(w, "invalid authorization header format")
				return
			}

			token := parts[1]
			claims, err := jwtService.Verify(token)
			if err != nil {
				httputil.Unauthorized(w, "invalid or expired token")
				return
			}

			ctx := context.WithValue(r.Context(), userIDKey, claims.UserID)
			next.ServeHTTP(w, r.WithContext(ctx))
		})
	}
}

// UserIDFromContext extracts the authenticated user ID from the request context.
// Returns empty string if not authenticated.
func UserIDFromContext(ctx context.Context) string {
	if id, ok := ctx.Value(userIDKey).(string); ok {
		return id
	}
	return ""
}
