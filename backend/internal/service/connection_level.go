package service

import (
	"context"
	"fmt"

	"halo/backend/internal/repository"
)

// Connection level thresholds from the data model spec.
// Level progression is monotonic: can only increase.
//
// | Next Level | Total Exchanged (counted) | Min Sent by Each User |
// |-----------:|---------------------------:|----------------------:|
// |          2 |                         10 |                     3 |
// |          3 |                         25 |                     8 |
// |          4 |                         45 |                    15 |
// |          5 |                         70 |                    25 |

type levelThreshold struct {
	level          int
	totalRequired  int
	minEachUserReq int
}

var thresholds = []levelThreshold{
	{level: 2, totalRequired: 10, minEachUserReq: 3},
	{level: 3, totalRequired: 25, minEachUserReq: 8},
	{level: 4, totalRequired: 45, minEachUserReq: 15},
	{level: 5, totalRequired: 70, minEachUserReq: 25},
}

// nextLevelTotalRequired returns the total messages needed to reach the next
// level. Returns nil if already at max level.
func nextLevelTotalRequired(currentLevel int) *int {
	for _, t := range thresholds {
		if t.level == currentLevel+1 {
			return &t.totalRequired
		}
	}
	return nil // already at max
}

// ComputeConnectionLevel determines the highest achievable connection level
// given the total exchanged count and per-user sent counts.
func ComputeConnectionLevel(totalExchanged, userASent, userBSent int) int {
	level := 1
	minSent := userASent
	if userBSent < minSent {
		minSent = userBSent
	}

	for _, t := range thresholds {
		if totalExchanged >= t.totalRequired && minSent >= t.minEachUserReq {
			level = t.level
		}
	}
	return level
}

// ConnectionLevelService handles connection level progression.
type ConnectionLevelService struct {
	matchRepo *repository.MatchRepository
}

// NewConnectionLevelService creates a new ConnectionLevelService.
func NewConnectionLevelService(matchRepo *repository.MatchRepository) *ConnectionLevelService {
	return &ConnectionLevelService{matchRepo: matchRepo}
}

// CheckAndUpdateLevel evaluates the current match state and upgrades the
// connection level if the thresholds are met. Returns the new level (which
// may be unchanged) and whether a level-up occurred.
func (s *ConnectionLevelService) CheckAndUpdateLevel(ctx context.Context, matchID string) (newLevel int, leveledUp bool, err error) {
	// Fetch current match state.
	match, err := s.matchRepo.GetByID(ctx, matchID)
	if err != nil {
		return 0, false, fmt.Errorf("get match for level check: %w", err)
	}

	// Compute the highest achievable level.
	computed := ComputeConnectionLevel(
		match.MessageCount,
		match.UserACountedSent,
		match.UserBCountedSent,
	)

	// Level is monotonic — only increase.
	if computed <= match.CurrentConnectionLevel {
		return match.CurrentConnectionLevel, false, nil
	}

	// Upgrade the level.
	if err := s.matchRepo.UpdateConnectionLevel(ctx, matchID, computed); err != nil {
		return 0, false, fmt.Errorf("update connection level: %w", err)
	}

	return computed, true, nil
}
