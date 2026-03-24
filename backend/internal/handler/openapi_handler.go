package handler

import (
	"net/http"
	"os"
	"sync"
)

// OpenAPIHandler serves the OpenAPI specification file.
type OpenAPIHandler struct {
	specPath string
	once     sync.Once
	content  []byte
	loadErr  error
}

// NewOpenAPIHandler creates a handler that serves the given OpenAPI YAML file.
func NewOpenAPIHandler(specPath string) *OpenAPIHandler {
	return &OpenAPIHandler{specPath: specPath}
}

// ServeHTTP serves the OpenAPI specification.
func (h *OpenAPIHandler) ServeHTTP(w http.ResponseWriter, _ *http.Request) {
	h.once.Do(func() {
		h.content, h.loadErr = os.ReadFile(h.specPath)
	})

	if h.loadErr != nil {
		http.Error(w, "OpenAPI spec not available", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/yaml; charset=utf-8")
	w.Header().Set("Cache-Control", "public, max-age=3600")
	w.WriteHeader(http.StatusOK)
	_, _ = w.Write(h.content)
}
