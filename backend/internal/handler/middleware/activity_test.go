package middleware

import (
	"context"
	"errors"
	"net/http"
	"net/http/httptest"
	"sync"
	"sync/atomic"
	"testing"
	"time"

	"halo/backend/internal/auth"
)

// ── fakes ─────────────────────────────────────────────────────────────────────

// countingUpdater records the number of TouchLastActive calls and the
// last user ID seen. It is goroutine-safe and replaces the channel-based
// fake whose double-close would panic on a second call.
type countingUpdater struct {
	mu         sync.Mutex
	calls      atomic.Int32
	lastUserID string
	err        error
	// hold blocks the call until released; nil = return immediately.
	hold chan struct{}
}

func (u *countingUpdater) TouchLastActive(_ context.Context, userID string) error {
	u.calls.Add(1)
	u.mu.Lock()
	u.lastUserID = userID
	u.mu.Unlock()
	if u.hold != nil {
		<-u.hold
	}
	return u.err
}

func (u *countingUpdater) callCount() int32  { return u.calls.Load() }
func (u *countingUpdater) lastID() string {
	u.mu.Lock()
	defer u.mu.Unlock()
	return u.lastUserID
}

// waitForCalls polls until callCount >= want or the deadline expires.
// Returns true if the count was reached.
func waitForCalls(u *countingUpdater, want int32, deadline time.Duration) bool {
	end := time.Now().Add(deadline)
	for time.Now().Before(end) {
		if u.callCount() >= want {
			return true
		}
		time.Sleep(2 * time.Millisecond)
	}
	return u.callCount() >= want
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

			updater := &countingUpdater{err: tc.updaterErr}
			mw := TouchLastActive(updater)

			nextCalled := false
			next := http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
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
				if !waitForCalls(updater, 1, 250*time.Millisecond) {
					t.Fatal("TouchLastActive goroutine did not fire within deadline")
				}
				return
			}
			// Negative case: assert no goroutine fired even after a deadline,
			// not just "right now" (which has a timing race against a recently
			// spawned goroutine).
			time.Sleep(50 * time.Millisecond)
			if got := updater.callCount(); got != 0 {
				t.Errorf("TouchLastActive called %d times, want 0", got)
			}
		})
	}
}

// ── TestTouchLastActiveMiddleware_UserIDPassedToUpdater ───────────────────────

func TestTouchLastActiveMiddleware_UserIDPassedToUpdater(t *testing.T) {
	t.Parallel()

	const wantUserID = "specific-user-id"

	updater := &countingUpdater{}
	mw := TouchLastActive(updater)

	next := http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
		w.WriteHeader(http.StatusOK)
	})

	req := httptest.NewRequest(http.MethodGet, "/", nil)
	req = req.WithContext(auth.NewContextWithUserID(req.Context(), wantUserID))
	rec := httptest.NewRecorder()

	mw(next).ServeHTTP(rec, req)

	if !waitForCalls(updater, 1, 250*time.Millisecond) {
		t.Fatal("goroutine did not fire within deadline")
	}
	if got := updater.lastID(); got != wantUserID {
		t.Errorf("TouchLastActive called with userID %q, want %q", got, wantUserID)
	}
}

// ── TestTouchLastActiveMiddleware_DedupsPerUser ───────────────────────────────

// Verifies the in-flight de-duplication that bounds goroutine count to
// one per user. Without it, a burst of N concurrent requests for the same
// user would spawn N goroutines.
func TestTouchLastActiveMiddleware_DedupsPerUser(t *testing.T) {
	t.Parallel()

	const userID = "burst-user-id"
	const burst = 25

	hold := make(chan struct{})
	updater := &countingUpdater{hold: hold}
	mw := TouchLastActive(updater)

	next := http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
		w.WriteHeader(http.StatusOK)
	})

	var wg sync.WaitGroup
	for i := 0; i < burst; i++ {
		wg.Add(1)
		go func() {
			defer wg.Done()
			req := httptest.NewRequest(http.MethodGet, "/", nil)
			req = req.WithContext(auth.NewContextWithUserID(req.Context(), userID))
			mw(next).ServeHTTP(httptest.NewRecorder(), req)
		}()
	}
	wg.Wait()

	// Wait for the one goroutine that won the race to land in TouchLastActive.
	if !waitForCalls(updater, 1, 250*time.Millisecond) {
		t.Fatal("no TouchLastActive goroutine fired")
	}
	// Hold the in-flight call long enough to assert the dedup window held.
	time.Sleep(20 * time.Millisecond)
	if got := updater.callCount(); got != 1 {
		t.Errorf("TouchLastActive fired %d times for one user under burst, want exactly 1", got)
	}
	close(hold)
}
