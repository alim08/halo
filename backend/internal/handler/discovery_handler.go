package handler

import (
	"errors"
	"net/http"
	"strconv"

	"github.com/go-chi/chi/v5"

	"halo/backend/internal/auth"
	"halo/backend/internal/handler/httputil"
	"halo/backend/internal/service"
)

// DiscoveryHandler handles /v1/discovery/* endpoints.
// Constitution: responses MUST NOT include any photo URLs, photo tokens,
// photo variant identifiers, or internal scores.
type DiscoveryHandler struct {
	discoveryService *service.DiscoveryService
	intentService    *service.ConnectionIntentService
}

// NewDiscoveryHandler creates a new DiscoveryHandler.
func NewDiscoveryHandler(
	discoveryService *service.DiscoveryService,
	intentService *service.ConnectionIntentService,
) *DiscoveryHandler {
	return &DiscoveryHandler{
		discoveryService: discoveryService,
		intentService:    intentService,
	}
}

// GetFeed handles GET /v1/discovery.
// Returns text-only cards. Response schema enforces no photo data.
func (h *DiscoveryHandler) GetFeed(w http.ResponseWriter, r *http.Request) {
	userID := auth.UserIDFromContext(r.Context())
	if userID == "" {
		httputil.Unauthorized(w, "not authenticated")
		return
	}

	// Parse optional ?limit query param (default 20, max 50).
	limit := 20
	if raw := r.URL.Query().Get("limit"); raw != "" {
		n, err := strconv.Atoi(raw)
		if err != nil || n < 1 {
			httputil.BadRequest(w, "limit must be a positive integer")
			return
		}
		if n > 50 {
			n = 50
		}
		limit = n
	}

	resp, err := h.discoveryService.GetDiscoveryFeed(r.Context(), userID, limit)
	if err != nil {
		if errors.Is(err, service.ErrNotOnboarded) {
			httputil.Forbidden(w, "complete onboarding before using discovery")
			return
		}
		httputil.InternalError(w)
		return
	}

	// Constitution enforcement: double-check that no photo data leaked.
	// The service layer already excludes photos, but we verify at the handler
	// boundary as a defense-in-depth measure.
	// DiscoveryCard struct has no photo fields, so this is structurally guaranteed.
	// Additionally, run runtime sanitizer as a belt-and-suspenders check.
	sanitized := service.SanitizeDiscoveryResponse(resp)

	httputil.EncodeJSON(w, http.StatusOK, sanitized)
}

// Pass handles POST /v1/discovery/{cardId}/pass.
func (h *DiscoveryHandler) Pass(w http.ResponseWriter, r *http.Request) {
	userID := auth.UserIDFromContext(r.Context())
	if userID == "" {
		httputil.Unauthorized(w, "not authenticated")
		return
	}

	cardID := chi.URLParam(r, "cardId")
	if cardID == "" {
		httputil.BadRequest(w, "cardId is required")
		return
	}

	err := h.intentService.Pass(r.Context(), userID, cardID)
	if err != nil {
		if errors.Is(err, service.ErrTargetNotFound) {
			httputil.NotFound(w, "user not found")
			return
		}
		httputil.InternalError(w)
		return
	}

	httputil.NoContent(w)
}

// Connect handles POST /v1/discovery/{cardId}/connect.
func (h *DiscoveryHandler) Connect(w http.ResponseWriter, r *http.Request) {
	userID := auth.UserIDFromContext(r.Context())
	if userID == "" {
		httputil.Unauthorized(w, "not authenticated")
		return
	}

	cardID := chi.URLParam(r, "cardId")
	if cardID == "" {
		httputil.BadRequest(w, "cardId is required")
		return
	}

	result, err := h.intentService.Connect(r.Context(), userID, cardID)
	if err != nil {
		if errors.Is(err, service.ErrTargetNotFound) {
			httputil.NotFound(w, "user not found")
			return
		}
		httputil.InternalError(w)
		return
	}

	httputil.EncodeJSON(w, http.StatusOK, result)
}
