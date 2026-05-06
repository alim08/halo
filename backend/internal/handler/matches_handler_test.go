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
	"halo/backend/internal/service"
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

type fakeUserStore struct {
	getByIDFunc  func(ctx context.Context, id string) (*model.User, error)
	getByIDsFunc func(ctx context.Context, ids []string) ([]*model.User, error)
	// callCount records GetByIDs invocations so tests can assert that
	// ListMatches issues exactly one bulk lookup (no N+1 regressions).
	getByIDsCalls int
	lastIDsArg    []string
}

func (f *fakeUserStore) GetByID(ctx context.Context, id string) (*model.User, error) {
	if f.getByIDFunc != nil {
		return f.getByIDFunc(ctx, id)
	}
	return nil, nil
}

func (f *fakeUserStore) GetByIDs(ctx context.Context, ids []string) ([]*model.User, error) {
	f.getByIDsCalls++
	f.lastIDsArg = ids
	if f.getByIDsFunc != nil {
		return f.getByIDsFunc(ctx, ids)
	}
	return nil, nil
}

type fakeChatLister struct {
	listFunc      func(ctx context.Context, userID string, limit int, cursor *string) ([]*model.Match, error)
	gotLimit      int
	gotCursor     *string
	gotUserID     string
}

func (f *fakeChatLister) ListMatches(ctx context.Context, userID string, limit int, cursor *string) ([]*model.Match, error) {
	f.gotUserID = userID
	f.gotLimit = limit
	f.gotCursor = cursor
	if f.listFunc != nil {
		return f.listFunc(ctx, userID, limit, cursor)
	}
	return nil, nil
}

type fakeSparksGetter struct {
	getFunc func(ctx context.Context, matchID, userID string) (*service.SparksResponse, error)
}

func (f *fakeSparksGetter) GetSparks(ctx context.Context, matchID, userID string) (*service.SparksResponse, error) {
	return f.getFunc(ctx, matchID, userID)
}

// ── helpers ───────────────────────────────────────────────────────────────────

// newRequestWithAuth creates a request with optional auth and chi URL params populated.
func newRequestWithAuth(method, target, userID string, urlParams map[string]string) *http.Request {
	req := httptest.NewRequest(method, target, nil)

	rctx := chi.NewRouteContext()
	for k, v := range urlParams {
		rctx.URLParams.Add(k, v)
	}
	ctx := context.WithValue(req.Context(), chi.RouteCtxKey, rctx)

	if userID != "" {
		ctx = auth.NewContextWithUserID(ctx, userID)
	}
	return req.WithContext(ctx)
}

func newUnmatchRequest(userID, matchID string) *http.Request {
	return newRequestWithAuth(http.MethodDelete, "/v1/matches/"+matchID, userID, map[string]string{"matchId": matchID})
}

func newListMatchesRequest(userID, query string) *http.Request {
	target := "/v1/matches"
	if query != "" {
		target += "?" + query
	}
	return newRequestWithAuth(http.MethodGet, target, userID, nil)
}

func newGetSparksRequest(userID, matchID string) *http.Request {
	return newRequestWithAuth(http.MethodGet, "/v1/matches/"+matchID+"/sparks", userID, map[string]string{"matchId": matchID})
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
			name:    "match not found returns 404",
			userID:  userA,
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
			name:    "GetByID unexpected error returns 500 with sanitized body",
			userID:  userA,
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
			name:    "user not a participant returns 403",
			userID:  "other-user",
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
			name:    "already unmatched returns 204 idempotent",
			userID:  userA,
			matchID: matchID,
			matchStore: &fakeMatchStore{
				getByIDFunc: func(_ context.Context, _ string) (*model.Match, error) {
					return unmatchedMatch, nil
				},
			},
			wantStatus: http.StatusNoContent,
		},
		{
			name:    "valid participant unmatch succeeds with 204",
			userID:  userA,
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
			name:    "user_b also valid participant can unmatch",
			userID:  userB,
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
			name:    "concurrent unmatch race returns 204",
			userID:  userA,
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
			name:    "Unmatch unexpected error returns 500 with sanitized body",
			userID:  userA,
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

// ── TestListMatches ───────────────────────────────────────────────────────────

func TestListMatches(t *testing.T) {
	t.Parallel()

	const viewerID = "viewer-id"
	const partnerA = "partner-a"
	const partnerB = "partner-b"

	makeMatch := func(id, partner string) *model.Match {
		// viewer is always user_a here so PartnerID(viewerID) == partner.
		return &model.Match{ID: id, UserAID: viewerID, UserBID: partner}
	}
	makeUser := func(id string) *model.User {
		return &model.User{ID: id, ProfileData: json.RawMessage(`{"display_name":"X"}`)}
	}

	tests := []struct {
		name        string
		userID      string
		query       string
		chatLister  *fakeChatLister
		userStore   *fakeUserStore
		wantStatus  int
		wantCode    string
		wantLimit   int     // 0 = don't check
		wantMatches int     // matches returned in response
		wantCursor  string  // expected next_cursor; "" = absent
		assertFunc  func(t *testing.T, cl *fakeChatLister, us *fakeUserStore)
	}{
		{
			name:       "missing auth returns 401",
			userID:     "",
			chatLister: &fakeChatLister{},
			userStore:  &fakeUserStore{},
			wantStatus: http.StatusUnauthorized,
			wantCode:   "unauthorized",
		},
		{
			name:       "limit=abc returns 400",
			userID:     viewerID,
			query:      "limit=abc",
			chatLister: &fakeChatLister{},
			userStore:  &fakeUserStore{},
			wantStatus: http.StatusBadRequest,
			wantCode:   "bad_request",
		},
		{
			name:       "limit=0 returns 400",
			userID:     viewerID,
			query:      "limit=0",
			chatLister: &fakeChatLister{},
			userStore:  &fakeUserStore{},
			wantStatus: http.StatusBadRequest,
			wantCode:   "bad_request",
		},
		{
			name:   "default limit is 50",
			userID: viewerID,
			chatLister: &fakeChatLister{
				listFunc: func(_ context.Context, _ string, _ int, _ *string) ([]*model.Match, error) {
					return nil, nil
				},
			},
			userStore:  &fakeUserStore{},
			wantStatus: http.StatusOK,
			wantLimit:  50,
		},
		{
			name:   "limit=200 clamps to 100",
			userID: viewerID,
			query:  "limit=200",
			chatLister: &fakeChatLister{
				listFunc: func(_ context.Context, _ string, _ int, _ *string) ([]*model.Match, error) {
					return nil, nil
				},
			},
			userStore:  &fakeUserStore{},
			wantStatus: http.StatusOK,
			wantLimit:  100,
		},
		{
			name:   "cursor passed through to service",
			userID: viewerID,
			query:  "cursor=cur-1",
			chatLister: &fakeChatLister{
				listFunc: func(_ context.Context, _ string, _ int, _ *string) ([]*model.Match, error) {
					return nil, nil
				},
			},
			userStore:  &fakeUserStore{},
			wantStatus: http.StatusOK,
			assertFunc: func(t *testing.T, cl *fakeChatLister, _ *fakeUserStore) {
				t.Helper()
				if cl.gotCursor == nil || *cl.gotCursor != "cur-1" {
					t.Errorf("cursor passed = %v, want cur-1", cl.gotCursor)
				}
			},
		},
		{
			name:   "service unexpected error returns 500 sanitized",
			userID: viewerID,
			chatLister: &fakeChatLister{
				listFunc: func(_ context.Context, _ string, _ int, _ *string) ([]*model.Match, error) {
					return nil, errInternalForTest
				},
			},
			userStore:  &fakeUserStore{},
			wantStatus: http.StatusInternalServerError,
			wantCode:   "internal_error",
		},
		{
			name:   "stale cursor returns empty page (200)",
			userID: viewerID,
			query:  "cursor=stale-cursor",
			chatLister: &fakeChatLister{
				listFunc: func(_ context.Context, _ string, _ int, _ *string) ([]*model.Match, error) {
					return nil, repository.ErrMatchNotFound
				},
			},
			userStore:   &fakeUserStore{},
			wantStatus:  http.StatusOK,
			wantMatches: 0,
		},
		{
			name:   "single bulk lookup for partners (no N+1)",
			userID: viewerID,
			chatLister: &fakeChatLister{
				listFunc: func(_ context.Context, _ string, _ int, _ *string) ([]*model.Match, error) {
					return []*model.Match{
						makeMatch("m1", partnerA),
						makeMatch("m2", partnerB),
						makeMatch("m3", partnerA), // duplicate partner
					}, nil
				},
			},
			userStore: &fakeUserStore{
				getByIDsFunc: func(_ context.Context, ids []string) ([]*model.User, error) {
					out := make([]*model.User, 0, len(ids))
					for _, id := range ids {
						out = append(out, makeUser(id))
					}
					return out, nil
				},
			},
			wantStatus:  http.StatusOK,
			wantMatches: 3,
			assertFunc: func(t *testing.T, _ *fakeChatLister, us *fakeUserStore) {
				t.Helper()
				if us.getByIDsCalls != 1 {
					t.Errorf("GetByIDs called %d times, want exactly 1 (no N+1)", us.getByIDsCalls)
				}
				// Duplicate partner_a should be deduped before the bulk fetch.
				if len(us.lastIDsArg) != 2 {
					t.Errorf("partner ids passed to GetByIDs = %d, want 2 (deduped)", len(us.lastIDsArg))
				}
			},
		},
		{
			name:   "missing partner is skipped (logged warn, not 500)",
			userID: viewerID,
			chatLister: &fakeChatLister{
				listFunc: func(_ context.Context, _ string, _ int, _ *string) ([]*model.Match, error) {
					return []*model.Match{
						makeMatch("m1", partnerA),
						makeMatch("m2", partnerB),
					}, nil
				},
			},
			userStore: &fakeUserStore{
				getByIDsFunc: func(_ context.Context, _ []string) ([]*model.User, error) {
					// Only partnerA exists; partnerB row is missing.
					return []*model.User{makeUser(partnerA)}, nil
				},
			},
			wantStatus:  http.StatusOK,
			wantMatches: 1,
		},
		{
			name:   "GetByIDs error returns 500 sanitized",
			userID: viewerID,
			chatLister: &fakeChatLister{
				listFunc: func(_ context.Context, _ string, _ int, _ *string) ([]*model.Match, error) {
					return []*model.Match{makeMatch("m1", partnerA)}, nil
				},
			},
			userStore: &fakeUserStore{
				getByIDsFunc: func(_ context.Context, _ []string) ([]*model.User, error) {
					return nil, errInternalForTest
				},
			},
			wantStatus: http.StatusInternalServerError,
			wantCode:   "internal_error",
		},
		{
			name:   "next_cursor set when page is full",
			userID: viewerID,
			query:  "limit=2",
			chatLister: &fakeChatLister{
				listFunc: func(_ context.Context, _ string, _ int, _ *string) ([]*model.Match, error) {
					return []*model.Match{
						makeMatch("m1", partnerA),
						makeMatch("m2", partnerB),
					}, nil
				},
			},
			userStore: &fakeUserStore{
				getByIDsFunc: func(_ context.Context, ids []string) ([]*model.User, error) {
					out := make([]*model.User, 0, len(ids))
					for _, id := range ids {
						out = append(out, makeUser(id))
					}
					return out, nil
				},
			},
			wantStatus:  http.StatusOK,
			wantMatches: 2,
			wantCursor:  "m2",
		},
		{
			name:   "next_cursor absent when page is short",
			userID: viewerID,
			query:  "limit=10",
			chatLister: &fakeChatLister{
				listFunc: func(_ context.Context, _ string, _ int, _ *string) ([]*model.Match, error) {
					return []*model.Match{makeMatch("m1", partnerA)}, nil
				},
			},
			userStore: &fakeUserStore{
				getByIDsFunc: func(_ context.Context, _ []string) ([]*model.User, error) {
					return []*model.User{makeUser(partnerA)}, nil
				},
			},
			wantStatus:  http.StatusOK,
			wantMatches: 1,
		},
	}

	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			t.Parallel()

			h := &MatchesHandler{
				chatService: tc.chatLister,
				userRepo:    tc.userStore,
			}

			req := newListMatchesRequest(tc.userID, tc.query)
			rec := httptest.NewRecorder()
			h.ListMatches(rec, req)

			if rec.Code != tc.wantStatus {
				t.Fatalf("status = %d, want %d (body=%s)", rec.Code, tc.wantStatus, rec.Body.String())
			}
			if tc.wantCode != "" {
				body := decodeErrorBody(t, rec)
				if body.Code != tc.wantCode {
					t.Errorf("error.code = %q, want %q", body.Code, tc.wantCode)
				}
				if rec.Code >= 500 && body.Message != "an internal error occurred" {
					t.Errorf("5xx message = %q, want sanitized message", body.Message)
				}
				return
			}

			if tc.wantLimit != 0 && tc.chatLister.gotLimit != tc.wantLimit {
				t.Errorf("service limit = %d, want %d", tc.chatLister.gotLimit, tc.wantLimit)
			}

			// Decode success body for further assertions.
			var resp listMatchesResponse
			if err := json.Unmarshal(rec.Body.Bytes(), &resp); err != nil {
				t.Fatalf("decode response: %v (body=%s)", err, rec.Body.String())
			}
			if got := len(resp.Matches); got != tc.wantMatches {
				t.Errorf("matches len = %d, want %d", got, tc.wantMatches)
			}
			if resp.NextCursor != tc.wantCursor {
				t.Errorf("next_cursor = %q, want %q", resp.NextCursor, tc.wantCursor)
			}

			if tc.assertFunc != nil {
				tc.assertFunc(t, tc.chatLister, tc.userStore)
			}
		})
	}
}

// ── TestGetSparks ─────────────────────────────────────────────────────────────

func TestGetSparks(t *testing.T) {
	t.Parallel()

	const viewerID = "viewer-id"
	const matchID = "match-1"

	tests := []struct {
		name       string
		userID     string
		matchID    string
		sparks     *fakeSparksGetter
		wantStatus int
		wantCode   string
	}{
		{
			name:       "missing auth returns 401",
			userID:     "",
			matchID:    matchID,
			sparks:     &fakeSparksGetter{},
			wantStatus: http.StatusUnauthorized,
			wantCode:   "unauthorized",
		},
		{
			name:       "missing matchId returns 400",
			userID:     viewerID,
			matchID:    "",
			sparks:     &fakeSparksGetter{},
			wantStatus: http.StatusBadRequest,
			wantCode:   "bad_request",
		},
		{
			name:    "match not found returns 404",
			userID:  viewerID,
			matchID: matchID,
			sparks: &fakeSparksGetter{
				getFunc: func(_ context.Context, _, _ string) (*service.SparksResponse, error) {
					return nil, repository.ErrMatchNotFound
				},
			},
			wantStatus: http.StatusNotFound,
			wantCode:   "not_found",
		},
		{
			name:    "not a participant returns 403",
			userID:  viewerID,
			matchID: matchID,
			sparks: &fakeSparksGetter{
				getFunc: func(_ context.Context, _, _ string) (*service.SparksResponse, error) {
					return nil, service.ErrNotParticipant
				},
			},
			wantStatus: http.StatusForbidden,
			wantCode:   "forbidden",
		},
		{
			name:    "service unexpected error returns 500 sanitized",
			userID:  viewerID,
			matchID: matchID,
			sparks: &fakeSparksGetter{
				getFunc: func(_ context.Context, _, _ string) (*service.SparksResponse, error) {
					return nil, errInternalForTest
				},
			},
			wantStatus: http.StatusInternalServerError,
			wantCode:   "internal_error",
		},
		{
			name:    "success returns 200 with sparks payload",
			userID:  viewerID,
			matchID: matchID,
			sparks: &fakeSparksGetter{
				getFunc: func(_ context.Context, _, _ string) (*service.SparksResponse, error) {
					return &service.SparksResponse{Sparks: []service.Spark{
						{ID: "s1", Label: "L", SuggestedMessage: "M"},
					}}, nil
				},
			},
			wantStatus: http.StatusOK,
		},
	}

	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			t.Parallel()

			h := &MatchesHandler{sparksService: tc.sparks}

			req := newGetSparksRequest(tc.userID, tc.matchID)
			rec := httptest.NewRecorder()
			h.GetSparks(rec, req)

			if rec.Code != tc.wantStatus {
				t.Fatalf("status = %d, want %d (body=%s)", rec.Code, tc.wantStatus, rec.Body.String())
			}
			if tc.wantCode != "" {
				body := decodeErrorBody(t, rec)
				if body.Code != tc.wantCode {
					t.Errorf("error.code = %q, want %q", body.Code, tc.wantCode)
				}
				if rec.Code >= 500 && body.Message != "an internal error occurred" {
					t.Errorf("5xx message = %q, want sanitized message", body.Message)
				}
				return
			}

			var resp service.SparksResponse
			if err := json.Unmarshal(rec.Body.Bytes(), &resp); err != nil {
				t.Fatalf("decode response: %v", err)
			}
			if len(resp.Sparks) == 0 {
				t.Errorf("sparks empty, want at least 1")
			}
		})
	}
}

// ── sentinel for unexpected DB errors ────────────────────────────────────────

// errInternalForTest simulates an unexpected database error in fake stores.
// Named sentinel keeps tests free of magic string literals.
type unexpectedDBError struct{}

func (e unexpectedDBError) Error() string { return "unexpected db failure" }

var errInternalForTest = unexpectedDBError{}
