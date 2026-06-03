package handler

import (
	"encoding/json"
	"errors"
	"net/http"
	"time"

	"halo/backend/internal/auth"
	"halo/backend/internal/handler/httputil"
	"halo/backend/internal/service"
)

// MeHandler handles /v1/me and /v1/me/profile endpoints.
type MeHandler struct {
	profileService *service.ProfileService
}

// NewMeHandler creates a new MeHandler.
func NewMeHandler(profileService *service.ProfileService) *MeHandler {
	return &MeHandler{profileService: profileService}
}

// ProfileOptionsResponse is the JSON response for GET /v1/profile/options.
type ProfileOptionsResponse struct {
	RaceEthnicity                    []string `json:"race_ethnicity"`
	RaceEthnicityExclusive           string   `json:"race_ethnicity_exclusive"`
	RaceEthnicityPreferences         []string `json:"race_ethnicity_preferences"`
	RaceEthnicityPreferenceExclusive string   `json:"race_ethnicity_preference_exclusive"`
	DefaultRaceEthnicityPreferences  []string `json:"default_race_ethnicity_preferences"`
}

// GetMe handles GET /v1/me.
func (h *MeHandler) GetMe(w http.ResponseWriter, r *http.Request) {
	userID := auth.UserIDFromContext(r.Context())
	if userID == "" {
		httputil.Unauthorized(w, "not authenticated")
		return
	}

	me, err := h.profileService.GetMe(r.Context(), userID)
	if err != nil {
		if errors.Is(err, service.ErrUserNotFound) {
			httputil.NotFound(w, "user not found")
			return
		}
		httputil.InternalError(w)
		return
	}

	httputil.EncodeJSON(w, http.StatusOK, me)
}

// GetProfileOptions handles GET /v1/profile/options.
func (h *MeHandler) GetProfileOptions(w http.ResponseWriter, _ *http.Request) {
	httputil.EncodeJSON(w, http.StatusOK, ProfileOptionsResponse{
		RaceEthnicity:                    service.AllowedRaceEthnicityOptions(),
		RaceEthnicityExclusive:           service.RaceEthnicityExclusiveOption(),
		RaceEthnicityPreferences:         service.AllowedRaceEthnicityPreferenceOptions(),
		RaceEthnicityPreferenceExclusive: service.RaceEthnicityPreferenceExclusiveOption(),
		DefaultRaceEthnicityPreferences:  service.DefaultRaceEthnicityPreferenceOptions(),
	})
}

// upsertProfileHTTPRequest is used only for JSON decoding since
// time.Time needs a custom format (date only, YYYY-MM-DD).
type upsertProfileHTTPRequest struct {
	Birthdate      *string         `json:"birthdate,omitempty"`
	CoarseLocation string          `json:"coarse_location,omitempty"`
	ProfileData    json.RawMessage `json:"profile_data,omitempty"`
}

// UpsertProfile handles PUT /v1/me/profile.
func (h *MeHandler) UpsertProfile(w http.ResponseWriter, r *http.Request) {
	userID := auth.UserIDFromContext(r.Context())
	if userID == "" {
		httputil.Unauthorized(w, "not authenticated")
		return
	}

	var raw upsertProfileHTTPRequest
	if err := httputil.DecodeJSON(r, &raw); err != nil {
		httputil.BadRequest(w, err.Error())
		return
	}

	// Parse birthdate from "YYYY-MM-DD" string.
	var birthdate *time.Time
	if raw.Birthdate != nil && *raw.Birthdate != "" {
		t, err := time.Parse("2006-01-02", *raw.Birthdate)
		if err != nil {
			httputil.BadRequest(w, "birthdate must be in YYYY-MM-DD format")
			return
		}
		birthdate = &t
	}

	req := &service.UpsertProfileRequest{
		Birthdate:      birthdate,
		CoarseLocation: raw.CoarseLocation,
		ProfileData:    raw.ProfileData,
	}

	me, err := h.profileService.UpsertProfile(r.Context(), userID, req)
	if err != nil {
		if errors.Is(err, service.ErrUserNotFound) {
			httputil.NotFound(w, "user not found")
			return
		}
		// Validation errors from profile_validation.go.
		var validErr *service.ProfileValidationError
		if errors.As(err, &validErr) {
			httputil.BadRequest(w, err.Error())
			return
		}
		httputil.InternalError(w)
		return
	}

	httputil.EncodeJSON(w, http.StatusOK, me)
}
