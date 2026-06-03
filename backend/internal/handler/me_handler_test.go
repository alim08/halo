package handler

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"reflect"
	"strings"
	"testing"

	"halo/backend/internal/service"
)

func TestGetProfileOptionsUsesValidationOptions(t *testing.T) {
	handler := NewMeHandler(nil)
	req := httptest.NewRequest(http.MethodGet, "/v1/profile/options", nil)
	rec := httptest.NewRecorder()

	handler.GetProfileOptions(rec, req)

	if rec.Code != http.StatusOK {
		t.Fatalf("status = %d, want %d", rec.Code, http.StatusOK)
	}

	contentType := rec.Header().Get("Content-Type")
	if !strings.HasPrefix(contentType, "application/json") {
		t.Fatalf("Content-Type = %q, want application/json", contentType)
	}

	var body ProfileOptionsResponse
	if err := json.NewDecoder(rec.Body).Decode(&body); err != nil {
		t.Fatalf("decode response body: %v", err)
	}

	if !reflect.DeepEqual(body.RaceEthnicity, service.AllowedRaceEthnicityOptions()) {
		t.Fatalf("race_ethnicity = %#v, want %#v", body.RaceEthnicity, service.AllowedRaceEthnicityOptions())
	}
	if body.RaceEthnicityExclusive != service.RaceEthnicityExclusiveOption() {
		t.Fatalf("race_ethnicity_exclusive = %q, want %q", body.RaceEthnicityExclusive, service.RaceEthnicityExclusiveOption())
	}
	if !reflect.DeepEqual(body.RaceEthnicityPreferences, service.AllowedRaceEthnicityPreferenceOptions()) {
		t.Fatalf("race_ethnicity_preferences = %#v, want %#v", body.RaceEthnicityPreferences, service.AllowedRaceEthnicityPreferenceOptions())
	}
	if body.RaceEthnicityPreferenceExclusive != service.RaceEthnicityPreferenceExclusiveOption() {
		t.Fatalf("race_ethnicity_preference_exclusive = %q, want %q", body.RaceEthnicityPreferenceExclusive, service.RaceEthnicityPreferenceExclusiveOption())
	}
	if !reflect.DeepEqual(body.DefaultRaceEthnicityPreferences, service.DefaultRaceEthnicityPreferenceOptions()) {
		t.Fatalf("default_race_ethnicity_preferences = %#v, want %#v", body.DefaultRaceEthnicityPreferences, service.DefaultRaceEthnicityPreferenceOptions())
	}
}
