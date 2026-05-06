package service

import (
	"encoding/json"
	"testing"
	"time"

	"halo/backend/internal/model"
)

// ── interestJaccard ──────────────────────────────────────────────────────────

func TestInterestJaccard(t *testing.T) {
	t.Parallel()

	tests := []struct {
		name string
		a    []string
		b    []string
		want float64
	}{
		{
			name: "both empty returns 0",
			a:    nil,
			b:    nil,
			want: 0,
		},
		{
			name: "one empty returns 0",
			a:    []string{"hiking"},
			b:    nil,
			want: 0,
		},
		{
			name: "identical sets returns 1",
			a:    []string{"hiking", "cooking"},
			b:    []string{"hiking", "cooking"},
			want: 1.0,
		},
		{
			name: "completely disjoint returns 0",
			a:    []string{"hiking"},
			b:    []string{"gaming"},
			want: 0,
		},
		{
			name: "partial overlap",
			// |A∩B| = 1 (hiking), |A∪B| = 3 → 1/3
			a:    []string{"hiking", "cooking"},
			b:    []string{"hiking", "gaming"},
			want: 1.0 / 3.0,
		},
		{
			name: "order does not affect result",
			a:    []string{"a", "b", "c"},
			b:    []string{"c", "b", "d"},
			// |A∩B| = 2, |A∪B| = 4 → 0.5
			want: 0.5,
		},
		{
			name: "single element in common",
			a:    []string{"x"},
			b:    []string{"x", "y"},
			// |A∩B| = 1, |A∪B| = 2 → 0.5
			want: 0.5,
		},
	}

	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			t.Parallel()
			a := matchProfile{Interests: tc.a}
			b := matchProfile{Interests: tc.b}
			got := interestJaccard(a, b)
			if !floatEqual(got, tc.want) {
				t.Errorf("interestJaccard = %.6f, want %.6f", got, tc.want)
			}
		})
	}
}

// ── recencyScore ─────────────────────────────────────────────────────────────

func TestRecencyScore(t *testing.T) {
	t.Parallel()

	now := time.Now()
	ago := func(d time.Duration) *time.Time { t := now.Add(-d); return &t }

	tests := []struct {
		name string
		last *time.Time
		want float64
	}{
		{"nil returns 0", nil, 0},
		{"just now", ago(time.Minute), 0.30},
		{"23 hours ago", ago(23 * time.Hour), 0.30},
		{"25 hours ago", ago(25 * time.Hour), 0.20},
		{"6 days ago", ago(6 * 24 * time.Hour), 0.20},
		{"8 days ago", ago(8 * 24 * time.Hour), 0.10},
		{"29 days ago", ago(29 * 24 * time.Hour), 0.10},
		{"31 days ago", ago(31 * 24 * time.Hour), 0},
		{"one year ago", ago(365 * 24 * time.Hour), 0},
	}

	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			t.Parallel()
			got := recencyScore(tc.last)
			if got != tc.want {
				t.Errorf("recencyScore = %.2f, want %.2f", got, tc.want)
			}
		})
	}
}

// ── vibeMatch ────────────────────────────────────────────────────────────────

func TestVibeMatch(t *testing.T) {
	t.Parallel()

	tests := []struct {
		name string
		a    string
		b    string
		want float64
	}{
		{"both empty", "", "", 0},
		{"one empty", "chill", "", 0},
		{"match", "chill", "chill", 1.0},
		{"mismatch", "chill", "adventurous", 0},
	}

	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			t.Parallel()
			got := vibeMatch(matchProfile{Vibe: tc.a}, matchProfile{Vibe: tc.b})
			if got != tc.want {
				t.Errorf("vibeMatch = %.2f, want %.2f", got, tc.want)
			}
		})
	}
}

// ── promptCompleteness ───────────────────────────────────────────────────────

func TestPromptCompleteness(t *testing.T) {
	t.Parallel()

	makePrompts := func(answers ...string) []prompt {
		ps := make([]prompt, len(answers))
		for i, a := range answers {
			ps[i] = prompt{Question: "q", Answer: a}
		}
		return ps
	}

	tests := []struct {
		name    string
		prompts []prompt
		want    float64
	}{
		{"none answered", makePrompts("", "", ""), 0},
		{"one answered", makePrompts("answer", "", ""), 1.0 / 3.0},
		{"two answered", makePrompts("a", "b", ""), 2.0 / 3.0},
		{"all three answered", makePrompts("a", "b", "c"), 1.0},
		{"more than three", makePrompts("a", "b", "c", "d"), 1.0},
		{"empty list", nil, 0},
	}

	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			t.Parallel()
			got := promptCompleteness(matchProfile{Prompts: tc.prompts})
			if !floatEqual(got, tc.want) {
				t.Errorf("promptCompleteness = %.6f, want %.6f", got, tc.want)
			}
		})
	}
}

// ── RankCandidates ordering ──────────────────────────────────────────────────

func TestRankCandidates_OrdersDescending(t *testing.T) {
	t.Parallel()

	svc := NewMatchingService()

	viewer := userWithProfile(t, "viewer", profileFields{
		interests:  []string{"hiking", "cooking"},
		vibe:       "chill",
		ageDaysAgo: 365 * 30, // 30 years old
		location:   "NYC",
	})

	// highMatch shares interests + vibe + location.
	highMatch := userWithProfile(t, "high", profileFields{
		interests:  []string{"hiking", "cooking"},
		vibe:       "chill",
		ageDaysAgo: 365 * 28,
		location:   "NYC",
	})
	// lowMatch shares nothing.
	lowMatch := userWithProfile(t, "low", profileFields{
		interests:  []string{"gaming"},
		vibe:       "adventurous",
		ageDaysAgo: 365 * 55,
		location:   "LA",
	})

	ranked := svc.RankCandidates(viewer, []*model.User{lowMatch, highMatch})

	if len(ranked) != 2 {
		t.Fatalf("ranked len = %d, want 2", len(ranked))
	}
	if ranked[0].User.ID != "high" {
		t.Errorf("first candidate = %q, want %q", ranked[0].User.ID, "high")
	}
	if ranked[0].Score <= ranked[1].Score {
		t.Errorf("scores not descending: %.4f >= %.4f", ranked[0].Score, ranked[1].Score)
	}
}

func TestRankCandidates_EmptyReturnsEmpty(t *testing.T) {
	t.Parallel()
	svc := NewMatchingService()
	viewer := &model.User{ID: "v"}
	got := svc.RankCandidates(viewer, nil)
	if len(got) != 0 {
		t.Errorf("len = %d, want 0", len(got))
	}
}

// ── Helpers ──────────────────────────────────────────────────────────────────

// floatEqual reports whether a and b are within a small epsilon.
func floatEqual(a, b float64) bool {
	const epsilon = 1e-9
	return a-b < epsilon && b-a < epsilon
}

type profileFields struct {
	interests  []string
	vibe       string
	ageDaysAgo int // days ago from now
	location   string
}

func userWithProfile(t *testing.T, id string, f profileFields) *model.User {
	t.Helper()

	type profileJSON struct {
		Interests []string `json:"interests"`
		Vibe      string   `json:"vibe"`
	}

	raw, err := json.Marshal(profileJSON{Interests: f.interests, Vibe: f.vibe})
	if err != nil {
		t.Fatalf("marshal profile: %v", err)
	}

	var birthdate *time.Time
	if f.ageDaysAgo > 0 {
		bd := time.Now().AddDate(0, 0, -f.ageDaysAgo)
		birthdate = &bd
	}

	return &model.User{
		ID:             id,
		ProfileData:    raw,
		Birthdate:      birthdate,
		CoarseLocation: f.location,
	}
}
