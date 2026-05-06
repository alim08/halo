package middleware

import (
	"context"
	"errors"
	"net/http"
	"net/http/httptest"
	"testing"

	"halo/backend/internal/auth"
)

// ── fake ──────────────────────────────────────────────────────────────────────

type fakeLastActiveUpdater struct {
	// done is closed by TouchLastActive when the goroutine fires.
	done chan struct{}
	err  error
}

func (f *fakeLastActiveUpdater) TouchLastActive(_ context.Context, _ string) error {
	defer close(f.done)
	return f.err
}

// ── TestTouchLastActiveMiddleware ─────────────────────────────────────────────

func TestTouchLastActiveMiddleware(t *testing.T) {
	t.Parallel()

	tests := []struct {
		name        string
		withUserID  bool
		updaterErr  error
		expectTouch bool
	}{
		{
			name:        "authenticated request triggers async update",
			withUserID:  true,
			updaterErr:  nil,
			expectTouch: true,
		},
		{
			name:        "unauthenticated request skips update",
			withUserID:  false,
			updaterErr:  nil,
			expectTouch: false,
		},
		{
			name:        "update error does not interrupt response",
			withUserID:  true,
			updaterErr:  errors.New("db pool exhausted"),
			expectTouch: true,
		},
	}

	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			t.Parallel()

			updater := &fakeLastActiveUpdater{
				done: make(chan struct{}),
				err:  tc.updaterErr,
			}

			mw := TouchLastActive(updater)

			nextCalled := false
			next := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
				nextCalled = true
				w.WriteHeader(http.StatusOK)
			})

			req := httptest.NewRequest(http.MethodGet, "/v1/me", nil)
			if tc.withUserID {
				req = req.WithContext(auth.NewContextWithUserID(req.Context(), "user-test-id"))
			}
			rec := httptest.NewRecorder()

			mw(next).ServeHTTP(rec, req)

			if !nextCalled {
				t.Error("next handler was not called")
			}
			if rec.Code != http.StatusOK {
				t.Fatalf("status = %d, want %d", rec.Code, http.StatusOK)
			}

			if tc.expectTouch {
				select {
				case <-updater.done:
					// goroutine fired correctly
				case <-t.Context().Done():
					t.Fatal("TouchLastActive goroutine did not fire within test deadline")
				}
			} else {
				select {
				case <-updater.done:
					t.Error("TouchLastActive was called but should not have been for unauthenticated request")
				default:
					// correct — no goroutine was spawned
				}
			}
		})
	}
}

// ── TestTouchLastActiveMiddleware_UserIDPassedToUpdater ───────────────────────

func TestTouchLastActiveMiddleware_UserIDPassedToUpdater(t *testing.T) {
	t.Parallel()

	const wantUserID = "specific-user-id"

	receivedUserID := make(chan string, 1)

	updater := &recordingUpdater{
		done:   make(chan struct{}),
		record: receivedUserID,
	}

	mw := TouchLastActive(updater)

	next := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
	})

	req := httptest.NewRequest(http.MethodGet, "/", nil)
	req = req.WithContext(auth.NewContextWithUserID(req.Context(), wantUserID))
	rec := httptest.NewRecorder()

	mw(next).ServeHTTP(rec, req)

	select {
	case <-updater.done:
	case <-t.Context().Done():
		t.Fatal("goroutine did not fire within test deadline")
	}

	gotUserID := <-receivedUserID
	if gotUserID != wantUserID {
		t.Errorf("TouchLastActive called with userID %q, want %q", gotUserID, wantUserID)
	}
}

type recordingUpdater struct {
	done   chan struct{}
	record chan<- string
}

func (r *recordingUpdater) TouchLastActive(_ context.Context, userID string) error {
	defer close(r.done)
	r.record <- userID
	return nil
}
