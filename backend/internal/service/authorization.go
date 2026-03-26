package service

import (
	"context"
	"fmt"

	"halo/backend/internal/model"
	"halo/backend/internal/repository"
)

// AuthorizationService centralises authorization checks for match/chat
// resources. Every protected endpoint should call one of these methods
// before proceeding.
type AuthorizationService struct {
	matchRepo *repository.MatchRepository
	userRepo  *repository.UserRepository
}

// NewAuthorizationService creates a new AuthorizationService.
func NewAuthorizationService(
	matchRepo *repository.MatchRepository,
	userRepo *repository.UserRepository,
) *AuthorizationService {
	return &AuthorizationService{
		matchRepo: matchRepo,
		userRepo:  userRepo,
	}
}

// ErrUnauthorized is returned when authentication is required.
var ErrUnauthorized = fmt.Errorf("authentication required")

// ErrForbiddenMatch is returned when the user is not in the match.
var ErrForbiddenMatch = fmt.Errorf("user is not a participant in this match")

// RequireAuthenticated verifies a userID was extracted from the auth token.
func RequireAuthenticated(userID string) error {
	if userID == "" {
		return ErrUnauthorized
	}
	return nil
}

// RequireMatchParticipant verifies the user is a participant in the match.
// Returns the match model for further use.
func (s *AuthorizationService) RequireMatchParticipant(
	ctx context.Context,
	matchID, userID string,
) (*model.Match, error) {
	match, err := s.matchRepo.GetByID(ctx, matchID)
	if err != nil {
		return nil, err
	}

	if match.UserAID != userID && match.UserBID != userID {
		return nil, ErrForbiddenMatch
	}

	return match, nil
}

// RequireOnboarded verifies the user has completed onboarding.
func (s *AuthorizationService) RequireOnboarded(ctx context.Context, userID string) (*model.User, error) {
	user, err := s.userRepo.GetByID(ctx, userID)
	if err != nil {
		return nil, fmt.Errorf("get user: %w", err)
	}

	if !user.IsOnboarded {
		return nil, ErrNotOnboarded
	}

	return user, nil
}
