package handler

import (
	"errors"
	"net/http"
	"strconv"

	"halo/backend/internal/auth"
	"halo/backend/internal/handler/httputil"
	"halo/backend/internal/repository"
	"halo/backend/internal/service"
)

// MatchesHandler handles /v1/matches endpoints.
type MatchesHandler struct {
	chatService   *service.ChatService
	sparksService *service.SparksService
	matchRepo     *repository.MatchRepository
	userRepo      *repository.UserRepository
}

// NewMatchesHandler creates a new MatchesHandler.
func NewMatchesHandler(
	chatService *service.ChatService,
	sparksService *service.SparksService,
	matchRepo *repository.MatchRepository,
	userRepo *repository.UserRepository,
) *MatchesHandler {
	return &MatchesHandler{
		chatService:   chatService,
		sparksService: sparksService,
		matchRepo:     matchRepo,
		userRepo:      userRepo,
	}
}

// listMatchesResponse is the JSON envelope for GET /v1/matches.
type listMatchesResponse struct {
	Matches    []service.MatchSummary `json:"matches"`
	NextCursor string                 `json:"next_cursor,omitempty"`
}

// ListMatches handles GET /v1/matches.
func (h *MatchesHandler) ListMatches(w http.ResponseWriter, r *http.Request) {
	userID := auth.UserIDFromContext(r.Context())
	if userID == "" {
		httputil.Unauthorized(w, "not authenticated")
		return
	}

	limit := 50
	if raw := r.URL.Query().Get("limit"); raw != "" {
		n, err := strconv.Atoi(raw)
		if err != nil || n < 1 {
			httputil.BadRequest(w, "limit must be a positive integer")
			return
		}
		if n > 100 {
			n = 100
		}
		limit = n
	}

	var cursor *string
	if c := r.URL.Query().Get("cursor"); c != "" {
		cursor = &c
	}

	matches, err := h.chatService.ListMatches(r.Context(), userID, limit, cursor)
	if err != nil {
		httputil.InternalError(w)
		return
	}

	summaries := make([]service.MatchSummary, 0, len(matches))
	for _, m := range matches {
		partnerID := m.PartnerID(userID)
		partner, err := h.userRepo.GetByID(r.Context(), partnerID)
		if err != nil {
			continue // skip if partner not found
		}
		summaries = append(summaries, service.BuildMatchSummary(m, partner))
	}

	resp := listMatchesResponse{Matches: summaries}
	if len(matches) == limit {
		resp.NextCursor = matches[len(matches)-1].ID
	}

	httputil.EncodeJSON(w, http.StatusOK, resp)
}

// GetSparks handles GET /v1/matches/{matchId}/sparks.
func (h *MatchesHandler) GetSparks(w http.ResponseWriter, r *http.Request) {
	userID := auth.UserIDFromContext(r.Context())
	if userID == "" {
		httputil.Unauthorized(w, "not authenticated")
		return
	}

	matchID := matchIDFromRequest(r)
	if matchID == "" {
		httputil.BadRequest(w, "matchId is required")
		return
	}

	resp, err := h.sparksService.GetSparks(r.Context(), matchID, userID)
	if err != nil {
		if errors.Is(err, repository.ErrMatchNotFound) {
			httputil.NotFound(w, "match not found")
			return
		}
		if errors.Is(err, service.ErrNotParticipant) {
			httputil.Forbidden(w, "not a participant")
			return
		}
		httputil.InternalError(w)
		return
	}

	httputil.EncodeJSON(w, http.StatusOK, resp)
}

// Unmatch handles DELETE /v1/matches/{matchId}.
// Soft-deletes the match by setting unmatched_at and unmatched_by.
// Only the match participants may unmatch. Returns 204 on success.
func (h *MatchesHandler) Unmatch(w http.ResponseWriter, r *http.Request) {
	userID := auth.UserIDFromContext(r.Context())
	if userID == "" {
		httputil.Unauthorized(w, "not authenticated")
		return
	}

	matchID := matchIDFromRequest(r)
	if matchID == "" {
		httputil.BadRequest(w, "matchId is required")
		return
	}

	// Fetch match first to separate "not found" from "not a participant".
	m, err := h.matchRepo.GetByID(r.Context(), matchID)
	if err != nil {
		if errors.Is(err, repository.ErrMatchNotFound) {
			httputil.NotFound(w, "match not found")
			return
		}
		httputil.InternalError(w)
		return
	}

	if m.UserAID != userID && m.UserBID != userID {
		httputil.Forbidden(w, "not a participant")
		return
	}

	// Already unmatched — treat as idempotent success.
	if m.UnmatchedAt != nil {
		httputil.NoContent(w)
		return
	}

	if err := h.matchRepo.Unmatch(r.Context(), matchID, userID); err != nil {
		if errors.Is(err, repository.ErrMatchNotFound) {
			// Race: another request unmatched simultaneously — idempotent.
			httputil.NoContent(w)
			return
		}
		httputil.InternalError(w)
		return
	}

	httputil.NoContent(w)
}
