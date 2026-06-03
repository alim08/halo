package service

import (
	"encoding/json"
	"strings"
	"testing"
	"time"
)

func TestValidateBirthdate(t *testing.T) {
	tests := []struct {
		name      string
		today     time.Time
		birthdate *time.Time
		wantErr   bool
	}{
		{
			name:      "nil passes",
			today:     time.Date(2026, time.May, 9, 12, 0, 0, 0, time.UTC),
			birthdate: nil,
			wantErr:   false,
		},
		{
			name:      "age 17 rejects",
			today:     time.Date(2026, time.May, 9, 12, 0, 0, 0, time.UTC),
			birthdate: ptrTime(time.Date(2008, time.May, 10, 0, 0, 0, 0, time.UTC)),
			wantErr:   true,
		},
		{
			name:      "exact 18th birthday today passes",
			today:     time.Date(2026, time.May, 9, 12, 0, 0, 0, time.UTC),
			birthdate: ptrTime(time.Date(2008, time.May, 9, 0, 0, 0, 0, time.UTC)),
			wantErr:   false,
		},
		{
			name:      "day before 18th birthday rejects",
			today:     time.Date(2026, time.May, 8, 12, 0, 0, 0, time.UTC),
			birthdate: ptrTime(time.Date(2008, time.May, 9, 0, 0, 0, 0, time.UTC)),
			wantErr:   true,
		},
		{
			name:      "mar 2 non-leap birthdate on mar 1 leap year rejects",
			today:     time.Date(2024, time.March, 1, 12, 0, 0, 0, time.UTC),
			birthdate: ptrTime(time.Date(2006, time.March, 2, 0, 0, 0, 0, time.UTC)),
			wantErr:   true,
		},
		{
			name:      "mar 1 leap-year birthdate on mar 1 non-leap year passes",
			today:     time.Date(2026, time.March, 1, 12, 0, 0, 0, time.UTC),
			birthdate: ptrTime(time.Date(2008, time.March, 1, 0, 0, 0, 0, time.UTC)),
			wantErr:   false,
		},
	}

	for _, tc := range tests {
		tc := tc
		t.Run(tc.name, func(t *testing.T) {
			t.Parallel()

			err := ValidateBirthdate(tc.birthdate, tc.today)
			if tc.wantErr && err == nil {
				t.Fatal("ValidateBirthdate() error = nil, want error")
			}
			if !tc.wantErr && err != nil {
				t.Fatalf("ValidateBirthdate() error = %v, want nil", err)
			}
		})
	}
}

func ptrTime(t time.Time) *time.Time {
	return &t
}

func TestValidateCoarseLocation(t *testing.T) {
	tests := []struct {
		name           string
		coarseLocation string
		wantErr        bool
	}{
		{
			name:           "empty passes",
			coarseLocation: "",
			wantErr:        false,
		},
		{
			name:           "exactly 200 characters passes",
			coarseLocation: strings.Repeat("a", 200),
			wantErr:        false,
		},
		{
			name:           "over 200 characters rejects",
			coarseLocation: strings.Repeat("a", 201),
			wantErr:        true,
		},
		{
			name:           "200 multi-byte runes passes",
			coarseLocation: strings.Repeat("東", 200),
			wantErr:        false,
		},
		{
			name:           "201 multi-byte runes rejects",
			coarseLocation: strings.Repeat("東", 201),
			wantErr:        true,
		},
		{
			name:           "bare ZIP rejects",
			coarseLocation: "33004",
			wantErr:        true,
		},
		{
			name:           "ZIP+4 rejects",
			coarseLocation: "33004-1234",
			wantErr:        true,
		},
		{
			name:           "ZIP surrounded by whitespace rejects",
			coarseLocation: "  33004  ",
			wantErr:        true,
		},
		{
			name:           "city with ZIP-like substring passes",
			coarseLocation: "Dania Beach, FL 33004",
			wantErr:        false,
		},
	}

	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			err := ValidateCoarseLocation(tc.coarseLocation)
			if tc.wantErr && err == nil {
				t.Fatal("ValidateCoarseLocation() error = nil, want error")
			}
			if !tc.wantErr && err != nil {
				t.Fatalf("ValidateCoarseLocation() error = %v, want nil", err)
			}
		})
	}
}

func TestAgeInYearsHandlesLeapYearDayMismatch(t *testing.T) {
	birthdate := time.Date(2006, time.March, 2, 0, 0, 0, 0, time.UTC)
	today := time.Date(2024, time.March, 1, 12, 0, 0, 0, time.UTC)

	if got := ageInYears(&birthdate, today); got != 17 {
		t.Fatalf("ageInYears() = %d, want 17", got)
	}
}

func TestValidateProfileDataAgePreferences(t *testing.T) {
	tests := []struct {
		name    string
		raw     string
		wantErr bool
	}{
		{
			name:    "valid age preferences",
			raw:     `{"age_pref_min":25,"age_pref_max":35}`,
			wantErr: false,
		},
		{
			name:    "minimum under 18",
			raw:     `{"age_pref_min":17,"age_pref_max":35}`,
			wantErr: true,
		},
		{
			name:    "maximum over 99",
			raw:     `{"age_pref_min":25,"age_pref_max":100}`,
			wantErr: true,
		},
		{
			name:    "minimum above maximum",
			raw:     `{"age_pref_min":40,"age_pref_max":35}`,
			wantErr: true,
		},
		{
			name:    "must be provided together",
			raw:     `{"age_pref_min":25}`,
			wantErr: true,
		},
	}

	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			err := ValidateProfileData(json.RawMessage(tc.raw))
			if tc.wantErr && err == nil {
				t.Fatal("ValidateProfileData() error = nil, want error")
			}
			if !tc.wantErr && err != nil {
				t.Fatalf("ValidateProfileData() error = %v, want nil", err)
			}
		})
	}
}

func TestValidateProfileDataRaceEthnicity(t *testing.T) {
	tests := []struct {
		name    string
		raw     string
		wantErr bool
	}{
		{
			name:    "valid self identification",
			raw:     `{"race_ethnicity":["Asian","White"]}`,
			wantErr: false,
		},
		{
			name:    "prefer not to say is exclusive",
			raw:     `{"race_ethnicity":["Asian","Prefer not to say"]}`,
			wantErr: true,
		},
		{
			name:    "unsupported self identification",
			raw:     `{"race_ethnicity":["Unsupported"]}`,
			wantErr: true,
		},
		{
			name:    "too many self identification values",
			raw:     `{"race_ethnicity":` + jsonArrayWithRepeatedValue("Asian", 21) + `}`,
			wantErr: true,
		},
		{
			name:    "valid open preference",
			raw:     `{"race_ethnicity_preferences":["Open to all"]}`,
			wantErr: false,
		},
		{
			name:    "open to all is exclusive",
			raw:     `{"race_ethnicity_preferences":["Open to all","Asian"]}`,
			wantErr: true,
		},
		{
			name:    "unsupported preference",
			raw:     `{"race_ethnicity_preferences":["Prefer not to say"]}`,
			wantErr: true,
		},
		{
			name:    "too many preference values",
			raw:     `{"race_ethnicity_preferences":` + jsonArrayWithRepeatedValue("Asian", 21) + `}`,
			wantErr: true,
		},
	}

	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			err := ValidateProfileData(json.RawMessage(tc.raw))
			if tc.wantErr && err == nil {
				t.Fatal("ValidateProfileData() error = nil, want error")
			}
			if !tc.wantErr && err != nil {
				t.Fatalf("ValidateProfileData() error = %v, want nil", err)
			}
		})
	}
}

func jsonArrayWithRepeatedValue(value string, count int) string {
	values := make([]string, count)
	for i := range values {
		values[i] = value
	}

	raw, _ := json.Marshal(values)
	return string(raw)
}

func TestCheckOnboardingCompleteRequiresAgePreferences(t *testing.T) {
	birthdate := time.Date(1990, time.January, 1, 0, 0, 0, 0, time.UTC)
	base := map[string]any{
		"gender":                  "Woman",
		"race_ethnicity":          []string{"Prefer not to say"},
		"sexual_profile":          "Straight",
		"interested_in":           []string{"Man"},
		"vibe":                    map[string]string{"energy_level": "Moderate"},
		"relationship_intentions": []string{"Long-term partner"},
		"lifestyle_habits":        map[string]string{"drinking": "Socially"},
		"connection_style":        map[string]string{"communication_style": "Direct"},
		"interests":               []string{"Cooking"},
		"prompts":                 []map[string]string{{"prompt_id": "p1", "question": "Q", "answer": "A"}},
	}

	rawMissingAgePrefs, err := json.Marshal(base)
	if err != nil {
		t.Fatalf("marshal profile: %v", err)
	}
	if CheckOnboardingComplete(&birthdate, "Austin, TX", rawMissingAgePrefs) {
		t.Fatal("CheckOnboardingComplete() = true without age preferences, want false")
	}

	base["age_pref_min"] = 25
	base["age_pref_max"] = 35
	rawComplete, err := json.Marshal(base)
	if err != nil {
		t.Fatalf("marshal profile: %v", err)
	}
	if !CheckOnboardingComplete(&birthdate, "Austin, TX", rawComplete) {
		t.Fatal("CheckOnboardingComplete() = false with age preferences, want true")
	}
}

func TestCheckOnboardingCompleteRequiresRaceEthnicity(t *testing.T) {
	birthdate := time.Date(1990, time.January, 1, 0, 0, 0, 0, time.UTC)
	profile := map[string]any{
		"gender":                  "Woman",
		"sexual_profile":          "Straight",
		"interested_in":           []string{"Man"},
		"vibe":                    map[string]string{"energy_level": "Moderate"},
		"relationship_intentions": []string{"Long-term partner"},
		"age_pref_min":            25,
		"age_pref_max":            35,
		"lifestyle_habits":        map[string]string{"drinking": "Socially"},
		"connection_style":        map[string]string{"communication_style": "Direct"},
		"interests":               []string{"Cooking"},
		"prompts":                 []map[string]string{{"prompt_id": "p1", "question": "Q", "answer": "A"}},
	}

	rawMissingRace, err := json.Marshal(profile)
	if err != nil {
		t.Fatalf("marshal profile: %v", err)
	}
	if CheckOnboardingComplete(&birthdate, "Austin, TX", rawMissingRace) {
		t.Fatal("CheckOnboardingComplete() = true without race_ethnicity, want false")
	}

	profile["race_ethnicity"] = []string{"Prefer not to say"}
	rawComplete, err := json.Marshal(profile)
	if err != nil {
		t.Fatalf("marshal profile: %v", err)
	}
	if !CheckOnboardingComplete(&birthdate, "Austin, TX", rawComplete) {
		t.Fatal("CheckOnboardingComplete() = false with race_ethnicity, want true")
	}
}
