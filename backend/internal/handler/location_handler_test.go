package handler

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
)

func TestLocationHandlerBadRequestErrorsAreJSON(t *testing.T) {
	handler := NewLocationHandler()

	tests := []struct {
		name        string
		requestPath string
		handle      func(http.ResponseWriter, *http.Request)
		wantMessage string
	}{
		{
			name:        "missing search query",
			requestPath: "/v1/locations/search",
			handle:      handler.SearchLocations,
			wantMessage: "Query parameter 'q' is required",
		},
		{
			name:        "missing reverse geocode coordinates",
			requestPath: "/v1/locations/reverse-geocode",
			handle:      handler.ReverseGeocode,
			wantMessage: "lat and lon parameters are required",
		},
	}

	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			req := httptest.NewRequest(http.MethodGet, tc.requestPath, nil)
			rec := httptest.NewRecorder()

			tc.handle(rec, req)

			if rec.Code != http.StatusBadRequest {
				t.Fatalf("status = %d, want %d", rec.Code, http.StatusBadRequest)
			}

			contentType := rec.Header().Get("Content-Type")
			if !strings.HasPrefix(contentType, "application/json") {
				t.Fatalf("Content-Type = %q, want application/json", contentType)
			}

			var body struct {
				Error struct {
					Code    string `json:"code"`
					Message string `json:"message"`
				} `json:"error"`
			}
			if err := json.NewDecoder(rec.Body).Decode(&body); err != nil {
				t.Fatalf("decode response body: %v", err)
			}

			if body.Error.Code != "bad_request" {
				t.Errorf("error.code = %q, want bad_request", body.Error.Code)
			}
			if body.Error.Message != tc.wantMessage {
				t.Errorf("error.message = %q, want %q", body.Error.Message, tc.wantMessage)
			}
		})
	}
}
