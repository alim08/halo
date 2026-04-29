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
var onboardingRequiredFields = []string{"race_ethnicity", "gender", "sexual_profile", "interested_in", "vibe", "relationship_intentions", "age_pref_min", "age_pref_max", "lifestyle_habits", "connection_style", "interests", "prompts"}

var allowedRaceEthnicityValues = map[string]struct{}{
	"Asian":                        {},
	"Black/African":                {},
	"Hispanic/Latino":              {},
	"Middle Eastern/North African": {},
	"Pacific Islander":             {},
	"White":                        {},
	"Other":                        {},
	"Prefer not to say":            {},
}

var allowedRaceEthnicityPreferenceValues = map[string]struct{}{
	"Open to all":                  {},
	"Asian":                        {},
	"Black/African":                {},
	"Hispanic/Latino":              {},
	"Middle Eastern/North African": {},
	"Pacific Islander":             {},
	"White":                        {},
	"Other":                        {},
}

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
		found := ok && len(val) > 0 && string(val) != "null" && string(val) != "\"\"" && string(val) != "[]" && string(val) != "{}"
		if !found {
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

	if err := validateAgePreferences(obj); err != nil {
		return err
	}
	if err := validateStringArrayField(obj, "race_ethnicity", allowedRaceEthnicityValues, "Prefer not to say"); err != nil {
		return err
	}
	if err := validateStringArrayField(obj, "race_ethnicity_preferences", allowedRaceEthnicityPreferenceValues, "Open to all"); err != nil {
		return err
	}

	return nil
}

func validateAgePreferences(obj map[string]json.RawMessage) error {
	minRaw, hasMin := obj["age_pref_min"]
	maxRaw, hasMax := obj["age_pref_max"]
	if !hasMin && !hasMax {
		return nil
	}
	if !hasMin || !hasMax {
		return &ProfileValidationError{
			Field:   "age_preferences",
			Message: "age_pref_min and age_pref_max must be provided together",
		}
	}

	var minAge int
	if err := json.Unmarshal(minRaw, &minAge); err != nil {
		return &ProfileValidationError{
			Field:   "age_pref_min",
			Message: "must be a whole number",
		}
	}

	var maxAge int
	if err := json.Unmarshal(maxRaw, &maxAge); err != nil {
		return &ProfileValidationError{
			Field:   "age_pref_max",
			Message: "must be a whole number",
		}
	}

	if minAge < 18 {
		return &ProfileValidationError{
			Field:   "age_pref_min",
			Message: "must be at least 18",
		}
	}
	if maxAge > 99 {
		return &ProfileValidationError{
			Field:   "age_pref_max",
			Message: "must be 99 or younger",
		}
	}
	if minAge > maxAge {
		return &ProfileValidationError{
			Field:   "age_preferences",
			Message: "minimum age cannot exceed maximum age",
		}
	}

	return nil
}

func validateStringArrayField(obj map[string]json.RawMessage, field string, allowed map[string]struct{}, exclusiveOption string) error {
	raw, ok := obj[field]
	if !ok {
		return nil
	}

	var values []string
	if err := json.Unmarshal(raw, &values); err != nil {
		return &ProfileValidationError{
			Field:   field,
			Message: "must be an array of strings",
		}
	}

	for _, value := range values {
		if _, ok := allowed[value]; !ok {
			return &ProfileValidationError{
				Field:   field,
				Message: "contains an unsupported option",
			}
		}
	}

	if len(values) > 1 {
		for _, value := range values {
			if value == exclusiveOption {
				return &ProfileValidationError{
					Field:   field,
					Message: exclusiveOption + " cannot be combined with other options",
				}
			}
		}
	}

	return nil
}
