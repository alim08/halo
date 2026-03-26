package repository

import (
	"context"
	"fmt"

	"github.com/jackc/pgx/v5/pgxpool"

	"halo/backend/internal/model"
)

// DiscoveryRepository fetches candidate profiles for the discovery feed.
type DiscoveryRepository struct {
	pool *pgxpool.Pool
}

// NewDiscoveryRepository creates a new DiscoveryRepository.
func NewDiscoveryRepository(pool *pgxpool.Pool) *DiscoveryRepository {
	return &DiscoveryRepository{pool: pool}
}

// FindCandidates returns onboarded users that the requesting user has NOT
// already interacted with (no existing connection_intent or match).
// Results are ordered randomly – the service layer applies scoring.
func (r *DiscoveryRepository) FindCandidates(ctx context.Context, userID string, limit int) ([]*model.User, error) {
	if limit <= 0 || limit > 50 {
		limit = 20
	}

	rows, err := r.pool.Query(ctx, `
		SELECT u.id, u.email, u.password_hash, u.auth_provider, u.is_onboarded,
		       u.birthdate, COALESCE(u.coarse_location, ''), u.profile_data, u.created_at, u.updated_at
		FROM users u
		WHERE u.id != $1
		  AND u.is_onboarded = TRUE
		  -- Exclude users the requester has already actioned (pass or connect).
		  AND NOT EXISTS (
		      SELECT 1 FROM connection_intents ci
		      WHERE ci.from_user_id = $1 AND ci.to_user_id = u.id
		  )
		  -- Exclude users who are already matched with the requester.
		  AND NOT EXISTS (
		      SELECT 1 FROM matches m
		      WHERE (m.user_a_id = $1 AND m.user_b_id = u.id)
		         OR (m.user_a_id = u.id AND m.user_b_id = $1)
		  )
		ORDER BY RANDOM()
		LIMIT $2
	`, userID, limit)
	if err != nil {
		return nil, fmt.Errorf("find candidates: %w", err)
	}
	defer rows.Close()

	var users []*model.User
	for rows.Next() {
		u := &model.User{}
		if err := rows.Scan(
			&u.ID, &u.Email, &u.PasswordHash, &u.AuthProvider, &u.IsOnboarded,
			&u.Birthdate, &u.CoarseLocation, &u.ProfileData, &u.CreatedAt, &u.UpdatedAt,
		); err != nil {
			return nil, fmt.Errorf("scan candidate: %w", err)
		}
		users = append(users, u)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("rows iteration: %w", err)
	}

	return users, nil
}
