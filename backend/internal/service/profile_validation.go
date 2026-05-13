package service

import (
	"encoding/json"
	"fmt"
	"regexp"
	"strings"
	"time"
	"unicode/utf8"
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

	today := now()
	age := ageInYears(birthdate, today)

	if age < 18 {
		return &ProfileValidationError{
			Field:   "birthdate",
			Message: "you must be at least 18 years old",
		}
	}

	return nil
}

var now = time.Now

// rawZipPattern matches a bare US ZIP code (12345 or 12345-6789) with no city/state context.
// We want stored locations to be human-readable ("Dania Beach, FL"), so we reject these
// even though the frontend autocomplete is the primary normalization layer.
var rawZipPattern = regexp.MustCompile(`^\d{5}(-\d{4})?$`)

// ValidateCoarseLocation enforces the maximum stored location length and rejects
// un-normalized inputs (bare ZIP codes) that bypassed the location autocomplete.
func ValidateCoarseLocation(coarseLocation string) error {
	if utf8.RuneCountInString(coarseLocation) > 200 {
		return &ProfileValidationError{
			Field:   "coarse_location",
			Message: "must be 200 characters or fewer",
		}
	}

	if rawZipPattern.MatchString(strings.TrimSpace(coarseLocation)) {
		return &ProfileValidationError{
			Field:   "coarse_location",
			Message: "select a city from the suggestions instead of entering a ZIP code",
		}
	}

	return nil
}

func ageInYears(birthdate *time.Time, today time.Time) int {
	age := today.Year() - birthdate.Year()

	// Adjust if birthday hasn't occurred yet this year.
	if today.Month() < birthdate.Month() ||
		(today.Month() == birthdate.Month() && today.Day() < birthdate.Day()) {
		age--
	}

	return age
}

// onboardingRequiredFields are the profile_data keys that must be present
// for a user to be considered fully onboarded.
var onboardingRequiredFields = []string{"race_ethnicity", "gender", "sexual_profile", "interested_in", "vibe", "relationship_intentions", "age_pref_min", "age_pref_max", "lifestyle_habits", "connection_style", "interests", "prompts"}

const raceEthnicityExclusiveOption = "Prefer not to say"
const raceEthnicityPreferenceExclusiveOption = "Open to all"

var allowedRaceEthnicityOptions = []string{
	"Asian",
	"Black/African",
	"Hispanic/Latino",
	"Middle Eastern/North African",
	"Pacific Islander",
	"White",
	"Other",
	raceEthnicityExclusiveOption,
}

var allowedRaceEthnicityPreferenceOptions = []string{
	raceEthnicityPreferenceExclusiveOption,
	"Asian",
	"Black/African",
	"Hispanic/Latino",
	"Middle Eastern/North African",
	"Pacific Islander",
	"White",
	"Other",
}

var allowedRaceEthnicityValues = stringSet(allowedRaceEthnicityOptions)
var allowedRaceEthnicityPreferenceValues = stringSet(allowedRaceEthnicityPreferenceOptions)
var defaultRaceEthnicityPreferenceOptions = []string{raceEthnicityPreferenceExclusiveOption}

// AllowedRaceEthnicityOptions returns the selectable race/ethnicity values in display order.
func AllowedRaceEthnicityOptions() []string {
	return append([]string(nil), allowedRaceEthnicityOptions...)
}

// RaceEthnicityExclusiveOption returns the mutually exclusive opt-out value.
func RaceEthnicityExclusiveOption() string {
	return raceEthnicityExclusiveOption
}

// AllowedRaceEthnicityPreferenceOptions returns the selectable preference values in display order.
func AllowedRaceEthnicityPreferenceOptions() []string {
	return append([]string(nil), allowedRaceEthnicityPreferenceOptions...)
}

// RaceEthnicityPreferenceExclusiveOption returns the mutually exclusive open preference value.
func RaceEthnicityPreferenceExclusiveOption() string {
	return raceEthnicityPreferenceExclusiveOption
}

// DefaultRaceEthnicityPreferenceOptions returns the default race/ethnicity preferences.
func DefaultRaceEthnicityPreferenceOptions() []string {
	return append([]string(nil), defaultRaceEthnicityPreferenceOptions...)
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
	if err := validateStringArrayField(obj, "race_ethnicity", allowedRaceEthnicityValues, raceEthnicityExclusiveOption); err != nil {
		return err
	}
	if err := validateStringArrayField(obj, "race_ethnicity_preferences", allowedRaceEthnicityPreferenceValues, raceEthnicityPreferenceExclusiveOption); err != nil {
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

func stringSet(values []string) map[string]struct{} {
	set := make(map[string]struct{}, len(values))
	for _, value := range values {
		set[value] = struct{}{}
	}
	return set
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

	if len(values) > 20 {
		return &ProfileValidationError{
			Field:   field,
			Message: "too many values",
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
