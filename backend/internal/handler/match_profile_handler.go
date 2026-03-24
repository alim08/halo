package handler

import (
	"errors"
	"net/http"

	"github.com/go-chi/chi/v5"

	"halo/backend/internal/auth"
	"halo/backend/internal/handler/httputil"
	"halo/backend/internal/repository"
	"halo/backend/internal/service"
)

// MatchProfileHandler handles GET /v1/matches/{matchId}/profile.
type MatchProfileHandler struct {
	secureRevealService *service.SecureRevealService
	chatService         *service.ChatService
	userRepo            *repository.UserRepository
}

// NewMatchProfileHandler creates a new MatchProfileHandler.
func NewMatchProfileHandler(
	secureRevealService *service.SecureRevealService,
	chatService *service.ChatService,
	userRepo *repository.UserRepository,
) *MatchProfileHandler {
	return &MatchProfileHandler{
		secureRevealService: secureRevealService,
		chatService:         chatService,
		userRepo:            userRepo,
	}
}

// GetProfile returns the match partner's profile with Secure Reveal photo URL.
func (h *MatchProfileHandler) GetProfile(w http.ResponseWriter, r *http.Request) {
	userID := auth.UserIDFromContext(r.Context())
	if userID == "" {
		httputil.Unauthorized(w, "not authenticated")
		return
	}

	matchID := chi.URLParam(r, "matchId")
	if matchID == "" {
		httputil.BadRequest(w, "matchId is required")
		return
	}

	// Verify participant and get match.
	match, err := h.chatService.GetMatch(r.Context(), matchID, userID)
	if err != nil {
		if errors.Is(err, service.ErrNotParticipant) {
			httputil.Forbidden(w, "not a participant")
			return
		}
		if errors.Is(err, repository.ErrMatchNotFound) {
			httputil.NotFound(w, "match not found")
			return
		}
		httputil.InternalError(w)
		return
	}

	// Get partner user.
	partnerID := match.PartnerID(userID)
	partner, err := h.userRepo.GetByID(r.Context(), partnerID)
	if err != nil {
		httputil.InternalError(w)
		return
	}

	// Build full profile response with Secure Reveal photo variant.
	profileResp, err := h.secureRevealService.GetMatchProfile(r.Context(), matchID, userID, partner)
	if err != nil {
		httputil.InternalError(w)
		return
	}

	httputil.EncodeJSON(w, http.StatusOK, profileResp)
}
