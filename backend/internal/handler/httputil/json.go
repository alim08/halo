package httputil

import (
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
)

// MaxRequestBodySize is the default maximum request body size (1 MB).
const MaxRequestBodySize = 1 << 20 // 1 MB

// DecodeJSON reads and decodes JSON from the request body into dst.
// It enforces a size limit to prevent abuse and rejects unknown fields.
func DecodeJSON(r *http.Request, dst interface{}) error {
	return DecodeJSONWithLimit(r, dst, MaxRequestBodySize)
}

// DecodeJSONWithLimit reads and decodes JSON with a custom size limit.
func DecodeJSONWithLimit(r *http.Request, dst interface{}, maxBytes int64) error {
	r.Body = http.MaxBytesReader(nil, r.Body, maxBytes)

	dec := json.NewDecoder(r.Body)
	dec.DisallowUnknownFields()

	if err := dec.Decode(dst); err != nil {
		var maxBytesErr *http.MaxBytesError
		if errors.As(err, &maxBytesErr) {
			return fmt.Errorf("request body too large (max %d bytes)", maxBytes)
		}

		var syntaxErr *json.SyntaxError
		if errors.As(err, &syntaxErr) {
			return fmt.Errorf("invalid JSON at position %d", syntaxErr.Offset)
		}

		var unmarshalErr *json.UnmarshalTypeError
		if errors.As(err, &unmarshalErr) {
			return fmt.Errorf("invalid value for field %q", unmarshalErr.Field)
		}

		if errors.Is(err, io.EOF) {
			return fmt.Errorf("request body is empty")
		}

		return fmt.Errorf("invalid JSON: %w", err)
	}

	// Reject requests with multiple JSON objects in the body.
	if dec.More() {
		return fmt.Errorf("request body must contain a single JSON object")
	}

	return nil
}

// EncodeJSON writes a JSON response with the given status code.
func EncodeJSON(w http.ResponseWriter, status int, data interface{}) {
	w.Header().Set("Content-Type", "application/json; charset=utf-8")
	w.WriteHeader(status)
	if data != nil {
		_ = json.NewEncoder(w).Encode(data)
	}
}

// NoContent writes a 204 No Content response.
func NoContent(w http.ResponseWriter) {
	w.WriteHeader(http.StatusNoContent)
}
