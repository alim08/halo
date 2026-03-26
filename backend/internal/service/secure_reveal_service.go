package service

import (
	"context"
	"errors"
	"fmt"
	"time"

	"halo/backend/internal/media"
	"halo/backend/internal/model"
	"halo/backend/internal/repository"
)

// SecureRevealService handles variant selection and signed URL issuance.
// It enforces that only the single variant allowed by the match's
// current_connection_level is ever returned.
type SecureRevealService struct {
	photoRepo *repository.PhotoRepository
	matchRepo *repository.MatchRepository
	signer    media.Signer
}

// NewSecureRevealService creates a new SecureRevealService.
func NewSecureRevealService(
	photoRepo *repository.PhotoRepository,
	matchRepo *repository.MatchRepository,
	signer media.Signer,
) *SecureRevealService {
	return &SecureRevealService{
		photoRepo: photoRepo,
		matchRepo: matchRepo,
		signer:    signer,
	}
}

// ErrNoPhoto is returned when a user has no primary photo.
var ErrNoPhoto = errors.New("user has no primary photo")

// ErrPhotoNotReady is returned when photo variants haven't been generated yet.
var ErrPhotoNotReady = errors.New("photo variants are not ready")

// PhotoVariantResponse holds the signed URL for exactly one variant.
type PhotoVariantResponse struct {
	Variant   string    `json:"variant"`
	URL       string    `json:"url"`
	ExpiresAt time.Time `json:"expires_at"`
}

// GetAllowedVariant returns a signed URL for the single photo variant
// allowed by the match's connection level. The server MUST NOT return
// a higher-level variant than the current_connection_level permits.
func (s *SecureRevealService) GetAllowedVariant(
	ctx context.Context,
	matchID, requestingUserID string,
) (*PhotoVariantResponse, error) {
	// 1. Verify the user is a participant and get the match.
	match, err := s.matchRepo.GetByID(ctx, matchID)
	if err != nil {
		return nil, fmt.Errorf("get match: %w", err)
	}

	if match.UserAID != requestingUserID && match.UserBID != requestingUserID {
		return nil, ErrNotParticipant
	}

	// 2. Determine the partner.
	partnerID := match.PartnerID(requestingUserID)

	// 3. Get the partner's primary photo.
	photo, err := s.photoRepo.GetPrimaryByUser(ctx, partnerID)
	if err != nil {
		if errors.Is(err, repository.ErrPhotoNotFound) {
			return nil, ErrNoPhoto
		}
		return nil, fmt.Errorf("get partner photo: %w", err)
	}

	// 4. Enforce: only allow the variant for the CURRENT connection level.
	if photo.ProcessingStatus != "ready" {
		return nil, ErrPhotoNotReady
	}

	variant := model.VariantForLevel(match.CurrentConnectionLevel)
	variantKey := photo.VariantKey(variant)
	if variantKey == nil {
		return nil, ErrPhotoNotReady
	}

	// 5. Sign the URL — only for this single variant.
	signedURL, expiresAt, err := s.signer.SignURL(*variantKey)
	if err != nil {
		return nil, fmt.Errorf("sign url: %w", err)
	}

	return &PhotoVariantResponse{
		Variant:   variant,
		URL:       signedURL,
		ExpiresAt: expiresAt,
	}, nil
}

// MatchProfileResponse is the full profile response for a match partner.
type MatchProfileResponse struct {
	MatchID                string                `json:"match_id"`
	Partner                UserPublic            `json:"partner"`
	CurrentConnectionLevel int                   `json:"current_connection_level"`
	Progress               ConnectionProgress    `json:"progress"`
	Photo                  *PhotoVariantResponse `json:"photo"`
}

// ConnectionProgress tracks progress toward the next connection level.
type ConnectionProgress struct {
	TotalExchangedCounted    int  `json:"total_exchanged_counted"`
	MinEachUserRequired      int  `json:"min_each_user_required"`
	NextLevelTotalRequired   *int `json:"next_level_total_required"`
}

// GetMatchProfile returns the full match profile including partner info,
// connection progress, and the allowed photo variant URL.
func (s *SecureRevealService) GetMatchProfile(
	ctx context.Context,
	matchID, requestingUserID string,
	partner *model.User,
) (*MatchProfileResponse, error) {
	// Get match.
	match, err := s.matchRepo.GetByID(ctx, matchID)
	if err != nil {
		return nil, fmt.Errorf("get match: %w", err)
	}

	if match.UserAID != requestingUserID && match.UserBID != requestingUserID {
		return nil, ErrNotParticipant
	}

	// Build progress.
	progress := buildProgress(match)

	// Get the allowed photo variant (best-effort; photo may not exist).
	var photoResp *PhotoVariantResponse
	variant, err := s.GetAllowedVariant(ctx, matchID, requestingUserID)
	if err == nil {
		photoResp = variant
	}

	return &MatchProfileResponse{
		MatchID:                match.ID,
		Partner:                BuildUserPublic(partner),
		CurrentConnectionLevel: match.CurrentConnectionLevel,
		Progress:               progress,
		Photo:                  photoResp,
	}, nil
}

// buildProgress computes the connection progress for a match.
func buildProgress(match *model.Match) ConnectionProgress {
	level := match.CurrentConnectionLevel
	minSent := minOf(match.UserACountedSent, match.UserBCountedSent)

	p := ConnectionProgress{
		TotalExchangedCounted: match.MessageCount,
		MinEachUserRequired:   minSent,
	}

	// Compute next level threshold.
	nextThreshold := nextLevelTotalRequired(level)
	p.NextLevelTotalRequired = nextThreshold

	return p
}

func minOf(a, b int) int {
	if a < b {
		return a
	}
	return b
}
