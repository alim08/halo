package observability

import (
	"context"
	"log/slog"
	"net/http"
	"time"

	"halo/backend/internal/handler/middleware"
)

// AuditEvent represents a structured audit log entry.
// Every request that mutates state or accesses protected resources
// should produce one of these.
type AuditEvent struct {
	Timestamp  time.Time `json:"timestamp"`
	RequestID  string    `json:"request_id"`
	ActorID    string    `json:"actor_id"`
	Action     string    `json:"action"`
	Resource   string    `json:"resource"`
	ResourceID string    `json:"resource_id,omitempty"`
	Method     string    `json:"method"`
	Path       string    `json:"path"`
	StatusCode int       `json:"status_code,omitempty"`
	DurationMs int64     `json:"duration_ms,omitempty"`
	Detail     string    `json:"detail,omitempty"`
}

// LogAuditEvent writes a structured audit log using slog.
func LogAuditEvent(ctx context.Context, event AuditEvent) {
	if event.Timestamp.IsZero() {
		event.Timestamp = time.Now().UTC()
	}
	if event.RequestID == "" {
		event.RequestID = middleware.GetRequestID(ctx)
	}

	slog.LogAttrs(ctx, slog.LevelInfo, "audit",
		slog.String("request_id", event.RequestID),
		slog.String("actor_id", event.ActorID),
		slog.String("action", event.Action),
		slog.String("resource", event.Resource),
		slog.String("resource_id", event.ResourceID),
		slog.String("method", event.Method),
		slog.String("path", event.Path),
		slog.Int("status_code", event.StatusCode),
		slog.Int64("duration_ms", event.DurationMs),
		slog.String("detail", event.Detail),
	)
}

// AuditMiddleware is HTTP middleware that logs an audit event for every request.
// For richer events (e.g., with resource IDs), handlers should call LogAuditEvent
// directly with additional detail.
func AuditMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		start := time.Now()

		// Wrap response writer to capture status code.
		sw := &statusWriter{ResponseWriter: w, statusCode: http.StatusOK}
		next.ServeHTTP(sw, r)

		duration := time.Since(start)

		// Extract actor from context (set by auth middleware).
		actorID := actorFromContext(r.Context())

		LogAuditEvent(r.Context(), AuditEvent{
			Timestamp:  start.UTC(),
			RequestID:  middleware.GetRequestID(r.Context()),
			ActorID:    actorID,
			Action:     methodToAction(r.Method),
			Resource:   r.URL.Path,
			Method:     r.Method,
			Path:       r.URL.Path,
			StatusCode: sw.statusCode,
			DurationMs: duration.Milliseconds(),
		})
	})
}

// statusWriter wraps http.ResponseWriter to capture the status code.
type statusWriter struct {
	http.ResponseWriter
	statusCode int
	written    bool
}

func (sw *statusWriter) WriteHeader(code int) {
	if !sw.written {
		sw.statusCode = code
		sw.written = true
	}
	sw.ResponseWriter.WriteHeader(code)
}

func (sw *statusWriter) Write(b []byte) (int, error) {
	if !sw.written {
		sw.written = true
	}
	return sw.ResponseWriter.Write(b)
}

// methodToAction maps HTTP methods to human-readable audit actions.
func methodToAction(method string) string {
	switch method {
	case http.MethodGet:
		return "read"
	case http.MethodPost:
		return "create"
	case http.MethodPut:
		return "update"
	case http.MethodPatch:
		return "update"
	case http.MethodDelete:
		return "delete"
	default:
		return method
	}
}

type auditContextKey string

const actorKey auditContextKey = "audit_actor_id"

// actorFromContext tries to extract the authenticated user ID.
// It checks the auth middleware's context key first.
func actorFromContext(ctx context.Context) string {
	// Try the auth middleware's key (same key used in auth package).
	type authContextKey string
	const userIDKey authContextKey = "user_id"
	if id, ok := ctx.Value(userIDKey).(string); ok {
		return id
	}
	return "anonymous"
}
