package handler

import (
	"context"
	"errors"
	"log/slog"
	"net/http"
	"strconv"

	"halo/backend/internal/auth"
	"halo/backend/internal/handler/httputil"
	"halo/backend/internal/model"
	"halo/backend/internal/repository"
	"halo/backend/internal/service"
)

// matchStore is the subset of MatchRepository required by MatchesHandler.
type matchStore interface {
	GetByID(ctx context.Context, matchID string) (*model.Match, error)
	Unmatch(ctx context.Context, matchID, userID string) error
}

// userStore is the subset of UserRepository required by MatchesHandler.
type userStore interface {
	GetByID(ctx context.Context, id string) (*model.User, error)
	GetByIDs(ctx context.Context, ids []string) ([]*model.User, error)
}

// chatMatchesLister is the subset of ChatService required by ListMatches.
// Defined as an interface so handler tests can fake it without standing up
// repositories/redis.
type chatMatchesLister interface {
	ListMatches(ctx context.Context, userID string, limit int, cursor *string) ([]*model.Match, error)
}

// sparksGetter is the subset of SparksService required by GetSparks.
type sparksGetter interface {
	GetSparks(ctx context.Context, matchID, userID string) (*service.SparksResponse, error)
}

// MatchesHandler handles /v1/matches endpoints.
type MatchesHandler struct {
	chatService   chatMatchesLister
	sparksService sparksGetter
	matchRepo     matchStore
	userRepo      userStore
}

// NewMatchesHandler creates a new MatchesHandler.
func NewMatchesHandler(
	chatService chatMatchesLister,
	sparksService sparksGetter,
	matchRepo matchStore,
	userRepo userStore,
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
		if errors.Is(err, repository.ErrMatchNotFound) {
			// Stale cursor: return an empty page rather than 500. Clients
			// without a valid cursor see "no more matches" and can refresh.
			httputil.EncodeJSON(w, http.StatusOK, listMatchesResponse{
				Matches: []service.MatchSummary{},
			})
			return
		}
		httputil.InternalError(w)
		return
	}

	// Resolve all partners in a single query (vs. N+1 GetByID calls).
	partners, err := h.fetchPartners(r.Context(), userID, matches)
	if err != nil {
		httputil.InternalError(w)
		return
	}

	summaries := make([]service.MatchSummary, 0, len(matches))
	for _, m := range matches {
		partner, ok := partners[m.PartnerID(userID)]
		if !ok {
			// Partner row missing — likely a deleted account that wasn't
			// cleaned up. Skip rather than 500, but log so this is observable.
			slog.Warn("matches: partner not found, skipping",
				"match_id", m.ID,
				"partner_id", m.PartnerID(userID),
			)
			continue
		}
		summaries = append(summaries, service.BuildMatchSummary(m, partner))
	}

	resp := listMatchesResponse{Matches: summaries}
	if len(matches) == limit {
		resp.NextCursor = matches[len(matches)-1].ID
	}

	httputil.EncodeJSON(w, http.StatusOK, resp)
}

// fetchPartners batches the partner-user lookup into a single query and
// returns a map keyed by user ID for O(1) lookup during summary build-out.
func (h *MatchesHandler) fetchPartners(ctx context.Context, viewerID string, matches []*model.Match) (map[string]*model.User, error) {
	if len(matches) == 0 {
		return nil, nil
	}
	ids := make([]string, 0, len(matches))
	seen := make(map[string]struct{}, len(matches))
	for _, m := range matches {
		pid := m.PartnerID(viewerID)
		if _, ok := seen[pid]; ok {
			continue
		}
		seen[pid] = struct{}{}
		ids = append(ids, pid)
	}

	users, err := h.userRepo.GetByIDs(ctx, ids)
	if err != nil {
		slog.Error("matches: bulk partner fetch failed", "err", err)
		return nil, err
	}

	out := make(map[string]*model.User, len(users))
	for _, u := range users {
		out[u.ID] = u
	}
	return out, nil
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
