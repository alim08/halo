package service

import (
	"encoding/json"
	"testing"
	"time"
)

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
