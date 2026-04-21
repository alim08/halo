package service

import (
	"encoding/json"
	"fmt"
	"time"
)

// ProfileValidationError is a structured validation error.
type ProfileValidationError struct {
	Field   string `json:"field"`
	Message string `json:"message"`
}

func (e *ProfileValidationError) Error() string {
	return fmt.Sprintf("%s: %s", e.Field, e.Message)
}

// ValidateBirthdate enforces the 18+ rule.
func ValidateBirthdate(birthdate *time.Time) error {
	if birthdate == nil {
		return nil // birthdate is optional during partial onboarding
	}

	today := time.Now()
	age := today.Year() - birthdate.Year()

	// Adjust if birthday hasn't occurred yet this year.
	if today.YearDay() < birthdate.YearDay() {
		age--
	}

	if age < 18 {
		return &ProfileValidationError{
			Field:   "birthdate",
			Message: "you must be at least 18 years old",
		}
	}

	return nil
}

// onboardingRequiredFields are the profile_data keys that must be present
// for a user to be considered fully onboarded.
var onboardingRequiredFields = []string{"gender", "sexual_profile", "vibe", "tags", "prompts"}

// CheckOnboardingComplete determines whether a user has completed onboarding
// based on the required fields in their profile_data, plus birthdate and location.
func CheckOnboardingComplete(birthdate *time.Time, coarseLocation string, profileData json.RawMessage) bool {
	if birthdate == nil || coarseLocation == "" {
		return false
	}

	if len(profileData) == 0 {
		return false
	}

	var data map[string]json.RawMessage
	if err := json.Unmarshal(profileData, &data); err != nil {
		return false
	}

	for _, key := range onboardingRequiredFields {
		val, ok := data[key]
		if !ok || len(val) == 0 || string(val) == "null" || string(val) == "\"\"" || string(val) == "[]" || string(val) == "{}" {
			return false
		}
	}

	return true
}

// ValidateProfileData performs lightweight validation on the profile_data JSON.
// It must be a valid JSON object (not array, string, etc.).
func ValidateProfileData(raw json.RawMessage) error {
	if len(raw) == 0 {
		return nil // empty is allowed (partial onboarding)
	}

	var obj map[string]json.RawMessage
	if err := json.Unmarshal(raw, &obj); err != nil {
		return &ProfileValidationError{
			Field:   "profile_data",
			Message: "must be a JSON object",
		}
	}

	return nil
}
