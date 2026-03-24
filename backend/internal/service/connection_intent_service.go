package service

import (
	"context"
	"errors"
	"fmt"

	"halo/backend/internal/repository"
)

// ConnectionIntentService handles pass/connect actions and mutual-match detection.
type ConnectionIntentService struct {
	intentRepo *repository.ConnectionIntentRepository
	matchRepo  matchCreator
}

// matchCreator is a minimal interface so we can create matches without
// depending on the full match repository (which lives in Phase 5).
// In Phase 4 we use a direct SQL insert via the intent repo's pool.
type matchCreator interface {
	CreateMatch(ctx context.Context, userAID, userBID string) (string, error)
}

// NewConnectionIntentService creates a new ConnectionIntentService.
// matchRepo can be nil if match creation is not yet wired (Phase 5).
func NewConnectionIntentService(
	intentRepo *repository.ConnectionIntentRepository,
	matchRepo matchCreator,
) *ConnectionIntentService {
	return &ConnectionIntentService{
		intentRepo: intentRepo,
		matchRepo:  matchRepo,
	}
}

// ConnectResult is the response for a connect action.
type ConnectResult struct {
	Status  string `json:"status"`             // "intent_recorded" or "matched"
	MatchID string `json:"match_id,omitempty"` // present only when matched
}

// ErrTargetNotFound is returned when the target user ID does not exist.
var ErrTargetNotFound = fmt.Errorf("target user not found")

// Pass records a "pass" intent. Idempotent — re-passing is silently accepted.
func (s *ConnectionIntentService) Pass(ctx context.Context, fromUserID, toUserID string) error {
	// Verify target exists.
	exists, err := s.intentRepo.UserExists(ctx, toUserID)
	if err != nil {
		return fmt.Errorf("check target: %w", err)
	}
	if !exists {
		return ErrTargetNotFound
	}

	_, err = s.intentRepo.Create(ctx, fromUserID, toUserID, "pass")
	if err != nil {
		if errors.Is(err, repository.ErrIntentAlreadyExists) {
			return nil // idempotent
		}
		return fmt.Errorf("record pass: %w", err)
	}
	return nil
}

// Connect records a "connect" intent and checks for a mutual match.
// If the target has also connected with the requester, a match is created.
func (s *ConnectionIntentService) Connect(ctx context.Context, fromUserID, toUserID string) (*ConnectResult, error) {
	// Verify target exists.
	exists, err := s.intentRepo.UserExists(ctx, toUserID)
	if err != nil {
		return nil, fmt.Errorf("check target: %w", err)
	}
	if !exists {
		return nil, ErrTargetNotFound
	}

	_, err = s.intentRepo.Create(ctx, fromUserID, toUserID, "connect")
	if err != nil {
		if errors.Is(err, repository.ErrIntentAlreadyExists) {
			// Already actioned — check if mutual and already matched.
			return &ConnectResult{Status: "intent_recorded"}, nil
		}
		return nil, fmt.Errorf("record connect: %w", err)
	}

	// Check for mutual connect.
	mutual, err := s.intentRepo.FindMutualConnect(ctx, fromUserID, toUserID)
	if err != nil {
		return nil, fmt.Errorf("check mutual: %w", err)
	}

	if mutual != nil && s.matchRepo != nil {
		// Mutual connect! Create a match.
		// Canonical ordering: smaller UUID is user_a.
		userA, userB := fromUserID, toUserID
		if userA > userB {
			userA, userB = userB, userA
		}

		matchID, err := s.matchRepo.CreateMatch(ctx, userA, userB)
		if err != nil {
			// Match might already exist (race condition) — treat as success.
			return &ConnectResult{Status: "matched"}, nil
		}

		return &ConnectResult{
			Status:  "matched",
			MatchID: matchID,
		}, nil
	}

	return &ConnectResult{Status: "intent_recorded"}, nil
}
