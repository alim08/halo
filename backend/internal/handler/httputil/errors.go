package httputil

import (
	"encoding/json"
	"log/slog"
	"net/http"
	"strings"
)

// APIError represents a structured JSON error returned by the API.
// Schema matches the OpenAPI Error component.
type APIError struct {
	Err ErrorBody `json:"error"`
}

// ErrorBody is the inner error object.
type ErrorBody struct {
	Code      string `json:"code"`
	Message   string `json:"message"`
	RequestID string `json:"request_id,omitempty"`
}

// Error implements the error interface.
func (e *APIError) Error() string {
	return e.Err.Message
}

// NewAPIError constructs an APIError.
func NewAPIError(code, message string) *APIError {
	return &APIError{
		Err: ErrorBody{
			Code:    code,
			Message: message,
		},
	}
}

// WriteError writes a structured JSON error response.
// It sets the Content-Type header and writes the appropriate status code.
// The message is sanitized to prevent leaking internal details.
func WriteError(w http.ResponseWriter, status int, code, message string) {
	safe := SanitizeErrorMessage(message, status)
	apiErr := NewAPIError(code, safe)

	w.Header().Set("Content-Type", "application/json; charset=utf-8")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(apiErr)
}

// WriteErrorWithRequestID writes a structured JSON error with an explicit request ID.
func WriteErrorWithRequestID(w http.ResponseWriter, status int, code, message, requestID string) {
	safe := SanitizeErrorMessage(message, status)
	apiErr := &APIError{
		Err: ErrorBody{
			Code:      code,
			Message:   safe,
			RequestID: requestID,
		},
	}
	w.Header().Set("Content-Type", "application/json; charset=utf-8")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(apiErr)
}

// SanitizeErrorMessage ensures error messages sent to clients do not expose
// internal details such as stack traces, SQL errors, file paths, or sensitive
// configuration. For 5xx errors, always return a generic message. For 4xx
// errors, strip common dangerous patterns.
func SanitizeErrorMessage(msg string, statusCode int) string {
	// 5xx errors: always return a safe generic message.
	if statusCode >= 500 {
		return "an internal error occurred"
	}

	// For 4xx errors, strip patterns that might leak internals.
	lower := strings.ToLower(msg)
	for _, pattern := range unsafePatterns {
		if strings.Contains(lower, pattern) {
			slog.Warn("sanitized error message containing unsafe pattern",
				"pattern", pattern,
				"original_length", len(msg),
			)
			return genericMessages[statusCode]
		}
	}

	return msg
}

// unsafePatterns are substrings that indicate an error message contains internal
// details that must not be exposed to clients.
var unsafePatterns = []string{
	"sql:",
	"pq:",
	"pgx:",
	"redis:",
	"panic",
	"goroutine",
	"runtime error",
	".go:",
	"stack trace",
	"connection refused",
	"password",
	"secret",
	"private key",
	"signing key",
	"/internal/",
}

// genericMessages maps HTTP status codes to safe default messages.
var genericMessages = map[int]string{
	400: "bad request",
	401: "unauthorized",
	403: "forbidden",
	404: "not found",
	409: "conflict",
	429: "too many requests",
}

// Common error constructors for convenience.

// BadRequest writes a 400 error.
func BadRequest(w http.ResponseWriter, message string) {
	WriteError(w, http.StatusBadRequest, "bad_request", message)
}

// Unauthorized writes a 401 error.
func Unauthorized(w http.ResponseWriter, message string) {
	WriteError(w, http.StatusUnauthorized, "unauthorized", message)
}

// Forbidden writes a 403 error.
func Forbidden(w http.ResponseWriter, message string) {
	WriteError(w, http.StatusForbidden, "forbidden", message)
}

// NotFound writes a 404 error.
func NotFound(w http.ResponseWriter, message string) {
	WriteError(w, http.StatusNotFound, "not_found", message)
}

// Conflict writes a 409 error.
func Conflict(w http.ResponseWriter, message string) {
	WriteError(w, http.StatusConflict, "conflict", message)
}

// TooManyRequests writes a 429 error.
func TooManyRequests(w http.ResponseWriter, message string) {
	WriteError(w, http.StatusTooManyRequests, "too_many_requests", message)
}

// InternalError writes a 500 error with a safe generic message.
// Never leak internal details to the client.
func InternalError(w http.ResponseWriter) {
	WriteError(w, http.StatusInternalServerError, "internal_error", "an internal error occurred")
}
