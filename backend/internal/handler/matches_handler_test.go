package handler

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/go-chi/chi/v5"

	"halo/backend/internal/auth"
	"halo/backend/internal/model"
	"halo/backend/internal/repository"
)

// ── fakes ─────────────────────────────────────────────────────────────────────

type fakeMatchStore struct {
	getByIDFunc func(ctx context.Context, matchID string) (*model.Match, error)
	unmatchFunc func(ctx context.Context, matchID, userID string) error
}

func (f *fakeMatchStore) GetByID(ctx context.Context, matchID string) (*model.Match, error) {
	return f.getByIDFunc(ctx, matchID)
}

func (f *fakeMatchStore) Unmatch(ctx context.Context, matchID, userID string) error {
	return f.unmatchFunc(ctx, matchID, userID)
}

// ── helpers ───────────────────────────────────────────────────────────────────

// newUnmatchRequest creates a DELETE /v1/matches/{matchId} request with
// optional auth and chi URL params already populated.
func newUnmatchRequest(userID, matchID string) *http.Request {
	req := httptest.NewRequest(http.MethodDelete, "/v1/matches/"+matchID, nil)

	rctx := chi.NewRouteContext()
	rctx.URLParams.Add("matchId", matchID)
	ctx := context.WithValue(req.Context(), chi.RouteCtxKey, rctx)

	if userID != "" {
		ctx = auth.NewContextWithUserID(ctx, userID)
	}

	return req.WithContext(ctx)
}

// decodeErrorBody parses the standard {error:{code,message}} JSON envelope.
func decodeErrorBody(t *testing.T, rec *httptest.ResponseRecorder) struct {
	Code    string `json:"code"`
	Message string `json:"message"`
} {
	t.Helper()

	var envelope struct {
		Error struct {
			Code    string `json:"code"`
			Message string `json:"message"`
		} `json:"error"`
	}
	if err := json.NewDecoder(rec.Body).Decode(&envelope); err != nil {
		t.Fatalf("decode error envelope: %v", err)
	}

	return envelope.Error
}

// ── TestUnmatch ───────────────────────────────────────────────────────────────

func TestUnmatch(t *testing.T) {
	t.Parallel()

	now := time.Now()
	alreadyUnmatched := &now

	const (
		userA   = "user-a-id"
		userB   = "user-b-id"
		matchID = "match-1-id"
	)

	activeMatch := &model.Match{
		ID:      matchID,
		UserAID: userA,
		UserBID: userB,
	}

	unmatchedMatch := &model.Match{
		ID:          matchID,
		UserAID:     userA,
		UserBID:     userB,
		UnmatchedAt: alreadyUnmatched,
	}

	tests := []struct {
		name       string
		userID     string
		matchID    string
		matchStore *fakeMatchStore
		wantStatus int
		wantCode   string // error envelope code; empty means no body check
	}{
		{
			name:       "missing auth returns 401",
			userID:     "",
			matchID:    matchID,
			matchStore: &fakeMatchStore{},
			wantStatus: http.StatusUnauthorized,
			wantCode:   "unauthorized",
		},
		{
			name:       "empty matchID returns 400",
			userID:     userA,
			matchID:    "",
			matchStore: &fakeMatchStore{},
			wantStatus: http.StatusBadRequest,
			wantCode:   "bad_request",
		},
		{
			name:   "match not found returns 404",
			userID: userA,
			matchID: matchID,
			matchStore: &fakeMatchStore{
				getByIDFunc: func(_ context.Context, _ string) (*model.Match, error) {
					return nil, repository.ErrMatchNotFound
				},
			},
			wantStatus: http.StatusNotFound,
			wantCode:   "not_found",
		},
		{
			name:   "GetByID unexpected error returns 500 with sanitized body",
			userID: userA,
			matchID: matchID,
			matchStore: &fakeMatchStore{
				getByIDFunc: func(_ context.Context, _ string) (*model.Match, error) {
					return nil, errInternalForTest
				},
			},
			wantStatus: http.StatusInternalServerError,
			wantCode:   "internal_error",
		},
		{
			name:   "user not a participant returns 403",
			userID: "other-user",
			matchID: matchID,
			matchStore: &fakeMatchStore{
				getByIDFunc: func(_ context.Context, _ string) (*model.Match, error) {
					return activeMatch, nil
				},
			},
			wantStatus: http.StatusForbidden,
			wantCode:   "forbidden",
		},
		{
			name:   "already unmatched returns 204 idempotent",
			userID: userA,
			matchID: matchID,
			matchStore: &fakeMatchStore{
				getByIDFunc: func(_ context.Context, _ string) (*model.Match, error) {
					return unmatchedMatch, nil
				},
			},
			wantStatus: http.StatusNoContent,
		},
		{
			name:   "valid participant unmatch succeeds with 204",
			userID: userA,
			matchID: matchID,
			matchStore: &fakeMatchStore{
				getByIDFunc: func(_ context.Context, _ string) (*model.Match, error) {
					return activeMatch, nil
				},
				unmatchFunc: func(_ context.Context, _, _ string) error {
					return nil
				},
			},
			wantStatus: http.StatusNoContent,
		},
		{
			name:   "user_b also valid participant can unmatch",
			userID: userB,
			matchID: matchID,
			matchStore: &fakeMatchStore{
				getByIDFunc: func(_ context.Context, _ string) (*model.Match, error) {
					return activeMatch, nil
				},
				unmatchFunc: func(_ context.Context, _, _ string) error {
					return nil
				},
			},
			wantStatus: http.StatusNoContent,
		},
		{
			name:   "concurrent unmatch race returns 204",
			userID: userA,
			matchID: matchID,
			matchStore: &fakeMatchStore{
				getByIDFunc: func(_ context.Context, _ string) (*model.Match, error) {
					return activeMatch, nil
				},
				unmatchFunc: func(_ context.Context, _, _ string) error {
					// Simulates the row being deleted by a concurrent request.
					return repository.ErrMatchNotFound
				},
			},
			wantStatus: http.StatusNoContent,
		},
		{
			name:   "Unmatch unexpected error returns 500 with sanitized body",
			userID: userA,
			matchID: matchID,
			matchStore: &fakeMatchStore{
				getByIDFunc: func(_ context.Context, _ string) (*model.Match, error) {
					return activeMatch, nil
				},
				unmatchFunc: func(_ context.Context, _, _ string) error {
					return errInternalForTest
				},
			},
			wantStatus: http.StatusInternalServerError,
			wantCode:   "internal_error",
		},
	}

	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			t.Parallel()

			h := &MatchesHandler{matchRepo: tc.matchStore}

			req := newUnmatchRequest(tc.userID, tc.matchID)
			rec := httptest.NewRecorder()

			h.Unmatch(rec, req)

			if rec.Code != tc.wantStatus {
				t.Fatalf("status = %d, want %d", rec.Code, tc.wantStatus)
			}

			if tc.wantCode != "" {
				ct := rec.Header().Get("Content-Type")
				if ct == "" {
					t.Fatalf("Content-Type is empty, want application/json")
				}

				body := decodeErrorBody(t, rec)
				if body.Code != tc.wantCode {
					t.Errorf("error.code = %q, want %q", body.Code, tc.wantCode)
				}
				// 5xx responses must never expose internal details.
				if rec.Code >= 500 {
					if body.Message != "an internal error occurred" {
						t.Errorf("5xx message = %q, want sanitized message", body.Message)
					}
				}
			}
		})
	}
}

// ── TestUnmatch_GetByIDReceivesCorrectMatchID ────────────────────────────────

func TestUnmatch_GetByIDReceivesCorrectMatchID(t *testing.T) {
	t.Parallel()

	const (
		wantMatchID = "exact-match-id"
		userID      = "user-a"
	)

	var gotMatchID string

	h := &MatchesHandler{
		matchRepo: &fakeMatchStore{
			getByIDFunc: func(_ context.Context, matchID string) (*model.Match, error) {
				gotMatchID = matchID
				return &model.Match{
					ID:      wantMatchID,
					UserAID: userID,
					UserBID: "user-b",
				}, nil
			},
			unmatchFunc: func(_ context.Context, _, _ string) error {
				return nil
			},
		},
	}

	req := newUnmatchRequest(userID, wantMatchID)
	rec := httptest.NewRecorder()

	h.Unmatch(rec, req)

	if rec.Code != http.StatusNoContent {
		t.Fatalf("status = %d, want %d", rec.Code, http.StatusNoContent)
	}
	if gotMatchID != wantMatchID {
		t.Errorf("GetByID called with %q, want %q", gotMatchID, wantMatchID)
	}
}

// ── sentinel for unexpected DB errors ────────────────────────────────────────

// errInternalForTest simulates an unexpected database error in fake stores.
// Named sentinel keeps tests free of magic string literals.
type unexpectedDBError struct{}

func (e unexpectedDBError) Error() string { return "unexpected db failure" }

var errInternalForTest = unexpectedDBError{}
