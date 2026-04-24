package service

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"time"

	"halo/backend/internal/repository"
)

// ProfileService handles profile upserts and onboarding status.
type ProfileService struct {
	userRepo *repository.UserRepository
}

// NewProfileService creates a new ProfileService.
func NewProfileService(userRepo *repository.UserRepository) *ProfileService {
	return &ProfileService{userRepo: userRepo}
}

// UpsertProfileRequest represents the fields a client can update.
type UpsertProfileRequest struct {
	Birthdate      *time.Time      `json:"birthdate,omitempty"`
	CoarseLocation string          `json:"coarse_location,omitempty"`
	ProfileData    json.RawMessage `json:"profile_data,omitempty"`
}

// MeResponse is the JSON response for GET /v1/me and PUT /v1/me/profile.
type MeResponse struct {
	ID             string          `json:"id"`
	IsOnboarded    bool            `json:"is_onboarded"`
	CoarseLocation string          `json:"coarse_location,omitempty"`
	ProfileData    json.RawMessage `json:"profile_data"`
}

// GetMe retrieves the current user's profile data.
func (s *ProfileService) GetMe(ctx context.Context, userID string) (*MeResponse, error) {
	user, err := s.userRepo.GetByID(ctx, userID)
	if err != nil {
		if errors.Is(err, repository.ErrUserNotFound) {
			return nil, ErrUserNotFound
		}
		return nil, fmt.Errorf("get user: %w", err)
	}

	return &MeResponse{
		ID:             user.ID,
		IsOnboarded:    user.IsOnboarded,
		CoarseLocation: user.CoarseLocation,
		ProfileData:    user.ProfileData,
	}, nil
}

// UpsertProfile validates and updates the user's profile data.
// It supports partial updates (resumable onboarding) by merging profile_data
// rather than replacing it.
func (s *ProfileService) UpsertProfile(ctx context.Context, userID string, req *UpsertProfileRequest) (*MeResponse, error) {
	// Validate birthdate (18+ rule).
	if err := ValidateBirthdate(req.Birthdate); err != nil {
		return nil, err
	}

	// Validate profile_data structure.
	if err := ValidateProfileData(req.ProfileData); err != nil {
		return nil, err
	}

	// Fetch current user to compute merged state for onboarding check.
	current, err := s.userRepo.GetByID(ctx, userID)
	if err != nil {
		if errors.Is(err, repository.ErrUserNotFound) {
			return nil, ErrUserNotFound
		}
		return nil, fmt.Errorf("get user: %w", err)
	}

	// Determine effective values after this update.
	effectiveBirthdate := current.Birthdate
	if req.Birthdate != nil {
		effectiveBirthdate = req.Birthdate
	}

	effectiveLocation := current.CoarseLocation
	if req.CoarseLocation != "" {
		effectiveLocation = req.CoarseLocation
	}

	effectiveProfileData := mergeJSON(current.ProfileData, req.ProfileData)

	// Check whether onboarding is now complete.
	fmt.Printf("[Profile] Checking onboarding: birthdate=%v, location=%q, updating with new data\\n", 
		effectiveBirthdate, effectiveLocation)
	isOnboarded := CheckOnboardingComplete(effectiveBirthdate, effectiveLocation, effectiveProfileData)
	fmt.Printf("[Profile] Onboarding complete? %v\\n", isOnboarded)

	// Persist.
	user, err := s.userRepo.UpdateProfile(ctx, userID, req.Birthdate, req.CoarseLocation, req.ProfileData, isOnboarded)
	if err != nil {
		return nil, fmt.Errorf("update profile: %w", err)
	}

	return &MeResponse{
		ID:             user.ID,
		IsOnboarded:    user.IsOnboarded,
		CoarseLocation: user.CoarseLocation,
		ProfileData:    user.ProfileData,
	}, nil
}

// mergeJSON produces the result of overlaying patch onto base.
// Both must be JSON objects. If patch is empty/nil, returns base unchanged.
func mergeJSON(base, patch json.RawMessage) json.RawMessage {
	if len(patch) == 0 {
		return base
	}
	if len(base) == 0 {
		return patch
	}

	var baseMap map[string]json.RawMessage
	var patchMap map[string]json.RawMessage

	if err := json.Unmarshal(base, &baseMap); err != nil {
		return patch
	}
	if err := json.Unmarshal(patch, &patchMap); err != nil {
		return base
	}

	for k, v := range patchMap {
		baseMap[k] = v
	}

	merged, err := json.Marshal(baseMap)
	if err != nil {
		return base
	}
	return merged
}

// ErrUserNotFound is a sentinel for user not found in the service layer.
var ErrUserNotFound = errors.New("user not found")
