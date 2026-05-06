package service

import (
	"encoding/json"
	"testing"
	"time"

	"halo/backend/internal/model"
	"halo/backend/internal/repository"
)

// ── normalizeGender ───────────────────────────────────────────────────────────

func TestNormalizeGender(t *testing.T) {
	t.Parallel()

	tests := []struct {
		name  string
		input string
		want  string
	}{
		{"man passes through", "man", "man"},
		{"male maps to man", "male", "man"},
		{"Man uppercased maps to man", "Man", "man"},
		{"MALE all-caps maps to man", "MALE", "man"},
		{"woman passes through", "woman", "woman"},
		{"female maps to woman", "female", "woman"},
		{"Woman uppercased maps to woman", "Woman", "woman"},
		{"FEMALE all-caps maps to woman", "FEMALE", "woman"},
		{"empty string returns empty", "", ""},
		{"unknown value lowercased", "NonBinary", "nonbinary"},
		{"other lowercased", "Other", "other"},
		{"leading and trailing spaces trimmed", "  man  ", "man"},
	}

	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			t.Parallel()

			got := normalizeGender(tc.input)

			if got != tc.want {
				t.Errorf("normalizeGender(%q) = %q, want %q", tc.input, got, tc.want)
			}
		})
	}
}

// ── targetGenderFromInterest ──────────────────────────────────────────────────

func TestTargetGenderFromInterest(t *testing.T) {
	t.Parallel()

	tests := []struct {
		name  string
		input string
		want  string
	}{
		{"men maps to man", "men", "man"},
		{"man maps to man", "man", "man"},
		{"male maps to man", "male", "man"},
		{"Men uppercased maps to man", "Men", "man"},
		{"women maps to woman", "women", "woman"},
		{"woman maps to woman", "woman", "woman"},
		{"female maps to woman", "female", "woman"},
		{"Women uppercased maps to woman", "Women", "woman"},
		{"everyone returns everyone", "everyone", "everyone"},
		{"all returns everyone", "all", "everyone"},
		{"empty string returns everyone", "", "everyone"},
		{"nonbinary returns everyone", "nonbinary", "everyone"},
		{"queer returns everyone", "queer", "everyone"},
		{"spaces trimmed before matching", "  men  ", "man"},
	}

	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			t.Parallel()

			got := targetGenderFromInterest(tc.input)

			if got != tc.want {
				t.Errorf("targetGenderFromInterest(%q) = %q, want %q", tc.input, got, tc.want)
			}
		})
	}
}

// ── ageInYears ────────────────────────────────────────────────────────────────

func TestAgeInYears(t *testing.T) {
	t.Parallel()

	now := time.Now()

	// sameCalendarDayYearsAgo returns a birthdate that is exactly N calendar
	// years ago from today. Since AddDate(-N,0,0) preserves month and day,
	// now.YearDay() == birthdate.YearDay(), so the birthday has already
	// occurred this year and no subtraction happens.
	sameCalendarDayYearsAgo := func(years int) *time.Time {
		bd := now.AddDate(-years, 0, 0)
		return &bd
	}

	// birthdayTomorrowYearsAgo returns a birthdate whose birthday falls
	// one day after today in the current year, so the age is years-1.
	birthdayTomorrowYearsAgo := func(years int) *time.Time {
		bd := now.AddDate(-years, 0, 1)
		return &bd
	}

	tests := []struct {
		name      string
		birthdate *time.Time
		want      int
	}{
		{"nil returns 0", nil, 0},
		// 2001 is not a leap year, so May 5 2001 and May 5 2026 share the same
		// YearDay (125), and the birthday is considered to have occurred this year.
		{"25 years ago same day returns 25", sameCalendarDayYearsAgo(25), 25},
		// birthdayTomorrowYearsAgo(25): born May 6, 2001 — birthday hasn't arrived yet.
		{"birthday is tomorrow returns age minus one", birthdayTomorrowYearsAgo(25), 24},
	}

	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			t.Parallel()

			got := ageInYears(tc.birthdate)

			if got != tc.want {
				t.Errorf("ageInYears = %d, want %d", got, tc.want)
			}
		})
	}
}

// ── buildFindParams ───────────────────────────────────────────────────────────

func TestBuildFindParams(t *testing.T) {
	t.Parallel()

	now := time.Now()
	birthdatePtr := func(d time.Duration) *time.Time { bd := now.Add(d); return &bd }

	makeViewer := func(id string, profileJSON string, birthdate *time.Time) *model.User {
		return &model.User{
			ID:          id,
			ProfileData: json.RawMessage(profileJSON),
			Birthdate:   birthdate,
		}
	}

	tests := []struct {
		name   string
		viewer *model.User
		limit  int
		check  func(t *testing.T, p repository.FindCandidatesParams)
	}{
		{
			name:   "nil profile_data produces zero params",
			viewer: &model.User{ID: "u1", ProfileData: nil},
			limit:  20,
			check: func(t *testing.T, p repository.FindCandidatesParams) {
				t.Helper()
				if p.ViewerGender != "" {
					t.Errorf("ViewerGender = %q, want empty", p.ViewerGender)
				}
				if p.ViewerTargetGender != "everyone" {
					t.Errorf("ViewerTargetGender = %q, want everyone", p.ViewerTargetGender)
				}
				if p.ViewerAgePrefMin != 0 || p.ViewerAgePrefMax != 0 {
					t.Errorf("age prefs = (%d,%d), want (0,0)", p.ViewerAgePrefMin, p.ViewerAgePrefMax)
				}
				if p.ViewerAge != 0 {
					t.Errorf("ViewerAge = %d, want 0", p.ViewerAge)
				}
			},
		},
		{
			name: "gender and interested_in are normalized",
			viewer: makeViewer("u2",
				`{"gender":"male","interested_in":"women"}`,
				nil,
			),
			limit: 10,
			check: func(t *testing.T, p repository.FindCandidatesParams) {
				t.Helper()
				if p.ViewerGender != "man" {
					t.Errorf("ViewerGender = %q, want man", p.ViewerGender)
				}
				if p.ViewerTargetGender != "woman" {
					t.Errorf("ViewerTargetGender = %q, want woman", p.ViewerTargetGender)
				}
			},
		},
		{
			name: "age preferences are read from profile_data",
			viewer: makeViewer("u3",
				`{"age_pref_min":22,"age_pref_max":30}`,
				nil,
			),
			limit: 15,
			check: func(t *testing.T, p repository.FindCandidatesParams) {
				t.Helper()
				if p.ViewerAgePrefMin != 22 {
					t.Errorf("ViewerAgePrefMin = %d, want 22", p.ViewerAgePrefMin)
				}
				if p.ViewerAgePrefMax != 30 {
					t.Errorf("ViewerAgePrefMax = %d, want 30", p.ViewerAgePrefMax)
				}
			},
		},
		{
			name: "viewer age computed from birthdate",
			viewer: makeViewer("u4",
				`{}`,
				birthdatePtr(-25*365*24*time.Hour),
			),
			limit: 20,
			check: func(t *testing.T, p repository.FindCandidatesParams) {
				t.Helper()
				// Allow ±1 year for leap-year imprecision from duration arithmetic.
				if p.ViewerAge < 24 || p.ViewerAge > 26 {
					t.Errorf("ViewerAge = %d, want ~25", p.ViewerAge)
				}
			},
		},
		{
			name: "everyone interested_in skips gender filter",
			viewer: makeViewer("u5",
				`{"interested_in":"everyone"}`,
				nil,
			),
			limit: 20,
			check: func(t *testing.T, p repository.FindCandidatesParams) {
				t.Helper()
				if p.ViewerTargetGender != "everyone" {
					t.Errorf("ViewerTargetGender = %q, want everyone", p.ViewerTargetGender)
				}
			},
		},
		{
			name:   "limit propagated to params",
			viewer: &model.User{ID: "u6"},
			limit:  42,
			check: func(t *testing.T, p repository.FindCandidatesParams) {
				t.Helper()
				if p.Limit != 42 {
					t.Errorf("Limit = %d, want 42", p.Limit)
				}
			},
		},
		{
			name:   "user id propagated to params",
			viewer: &model.User{ID: "abc-123"},
			limit:  20,
			check: func(t *testing.T, p repository.FindCandidatesParams) {
				t.Helper()
				if p.UserID != "abc-123" {
					t.Errorf("UserID = %q, want abc-123", p.UserID)
				}
			},
		},
	}

	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			t.Parallel()

			got := buildFindParams(tc.viewer, tc.limit)

			tc.check(t, got)
		})
	}
}

// ── SanitizeDiscoveryResponse ─────────────────────────────────────────────────

func TestSanitizeDiscoveryResponse(t *testing.T) {
	t.Parallel()

	tests := []struct {
		name      string
		input     *DiscoveryResponse
		wantLen   int
		checkCard func(t *testing.T, c DiscoveryCard)
	}{
		{
			name:    "nil input returns empty cards slice",
			input:   nil,
			wantLen: 0,
		},
		{
			name:    "empty response passes through",
			input:   &DiscoveryResponse{Cards: []DiscoveryCard{}},
			wantLen: 0,
		},
		{
			name: "card with empty CardID is removed",
			input: &DiscoveryResponse{Cards: []DiscoveryCard{
				{CardID: "", Age: 25},
			}},
			wantLen: 0,
		},
		{
			name: "valid card passes through",
			input: &DiscoveryResponse{Cards: []DiscoveryCard{
				{CardID: "u1", Age: 25},
			}},
			wantLen: 1,
		},
		{
			name: "card with age under 18 is floored to 18",
			input: &DiscoveryResponse{Cards: []DiscoveryCard{
				{CardID: "u2", Age: 15},
			}},
			wantLen: 1,
			checkCard: func(t *testing.T, c DiscoveryCard) {
				t.Helper()
				if c.Age != 18 {
					t.Errorf("Age = %d, want 18", c.Age)
				}
			},
		},
		{
			name: "nil VibeTags replaced with empty slice",
			input: &DiscoveryResponse{Cards: []DiscoveryCard{
				{CardID: "u3", Age: 22, VibeTags: nil},
			}},
			wantLen: 1,
			checkCard: func(t *testing.T, c DiscoveryCard) {
				t.Helper()
				if c.VibeTags == nil {
					t.Error("VibeTags is nil, want empty slice")
				}
			},
		},
		{
			name: "nil PromptAnswers replaced with empty slice",
			input: &DiscoveryResponse{Cards: []DiscoveryCard{
				{CardID: "u4", Age: 22, PromptAnswers: nil},
			}},
			wantLen: 1,
			checkCard: func(t *testing.T, c DiscoveryCard) {
				t.Helper()
				if c.PromptAnswers == nil {
					t.Error("PromptAnswers is nil, want empty slice")
				}
			},
		},
		{
			name: "nil Interests replaced with empty slice",
			input: &DiscoveryResponse{Cards: []DiscoveryCard{
				{CardID: "u5", Age: 22, Interests: nil},
			}},
			wantLen: 1,
			checkCard: func(t *testing.T, c DiscoveryCard) {
				t.Helper()
				if c.Interests == nil {
					t.Error("Interests is nil, want empty slice")
				}
			},
		},
		{
			name: "invalid card among valid cards — only valid passes",
			input: &DiscoveryResponse{Cards: []DiscoveryCard{
				{CardID: "u6", Age: 25},
				{CardID: "", Age: 30},
				{CardID: "u7", Age: 28},
			}},
			wantLen: 2,
		},
	}

	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			t.Parallel()

			got := SanitizeDiscoveryResponse(tc.input)

			if len(got.Cards) != tc.wantLen {
				t.Fatalf("len(cards) = %d, want %d", len(got.Cards), tc.wantLen)
			}

			if tc.checkCard != nil && len(got.Cards) > 0 {
				tc.checkCard(t, got.Cards[0])
			}
		})
	}
}
