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

// FindCandidatesParams carries the viewer's profile attributes needed for
// SQL-level hard filtering. Zero/empty values disable their respective filters.
type FindCandidatesParams struct {
	// UserID is the requesting user's ID (always required).
	UserID string
	// Limit caps the number of returned rows (1–200).
	Limit int
	// ViewerGender is the viewer's own gender, normalized to "man" or "woman".
	// Empty means gender-based filtering is skipped.
	ViewerGender string
	// ViewerTargetGender is the gender the viewer is attracted to, normalized
	// to "man" or "woman". "everyone" or empty disables the outbound filter.
	ViewerTargetGender string
	// ViewerAgePrefMin / ViewerAgePrefMax are the viewer's preferred age range.
	// Both zero means the age-preference filter is skipped.
	ViewerAgePrefMin int
	ViewerAgePrefMax int
	// ViewerAge is the viewer's age in whole years.
	// Zero means the reciprocal age-preference filter is skipped.
	ViewerAge int
}

const (
	defaultDiscoveryLimit = 20
	maxDiscoveryLimit     = 200

	// activeWindowDays is the hard-filter cutoff for last_active_at.
	// Users inactive longer than this are not returned to discovery.
	activeWindowDays = 30
)

// FindCandidates returns onboarded users eligible to appear in the
// requesting user's discovery feed. Eligibility is determined by
// SQL-level hard filters (gender/seeking mutual fit, age-range mutual fit,
// recent activity) before scoring occurs in the service layer.
//
// Results are ordered randomly so the service layer's ranked scoring
// determines the final ordering the client sees.
func (r *DiscoveryRepository) FindCandidates(ctx context.Context, p FindCandidatesParams) ([]*model.User, error) {
	if p.Limit <= 0 || p.Limit > maxDiscoveryLimit {
		p.Limit = defaultDiscoveryLimit
	}

	rows, err := r.pool.Query(ctx, `
		SELECT u.id, u.email, u.auth_provider, u.is_onboarded,
		       u.birthdate, COALESCE(u.coarse_location, ''),
		       u.profile_data, u.last_active_at, u.created_at, u.updated_at
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

		  -- Hard filter: active within the last 30 days, or never recorded
		  -- (new users have NULL until their first authenticated request).
		  AND (
		      u.last_active_at IS NULL
		      OR u.last_active_at > NOW() - ($7::int * INTERVAL '1 day')
		  )

		  -- Hard filter: candidate is attracted to the viewer's gender.
		  -- Skipped when viewer gender is unknown ($2 = '').
		  AND (
		      $2 = ''
		      OR u.profile_data->>'interested_in' IS NULL
		      OR lower(u.profile_data->>'interested_in') IN ('everyone', 'all', '')
		      OR lower(u.profile_data->>'interested_in') = $2
		  )

		  -- Hard filter: viewer is attracted to the candidate's gender.
		  -- Skipped when viewer target gender is "everyone" or unknown ($3 = '').
		  AND (
		      $3 = '' OR $3 = 'everyone'
		      OR u.profile_data->>'gender' IS NULL
		      OR lower(u.profile_data->>'gender') = $3
		  )

		  -- Hard filter: candidate's age is within the viewer's preference range.
		  -- Skipped when viewer has not set age preferences ($4 = 0 OR $5 = 0).
		  AND (
		      $4 = 0 OR $5 = 0
		      OR u.birthdate IS NULL
		      OR EXTRACT(YEAR FROM AGE(NOW(), u.birthdate))::int BETWEEN $4 AND $5
		  )

		  -- Hard filter: viewer's age is within the candidate's preference range.
		  -- Skipped when viewer age is unknown ($6 = 0) or candidate has no preference.
		  AND (
		      $6 = 0
		      OR (u.profile_data->>'age_pref_min') IS NULL
		      OR $6::int >= (u.profile_data->>'age_pref_min')::int
		  )
		  AND (
		      $6 = 0
		      OR (u.profile_data->>'age_pref_max') IS NULL
		      OR $6::int <= (u.profile_data->>'age_pref_max')::int
		  )

		-- TODO: ORDER BY RANDOM() forces a full sort of every matching row.
		-- Acceptable at MVP scale; replace with TABLESAMPLE or a precomputed
		-- random ordering when active user count exceeds ~10k.
		ORDER BY RANDOM()
		LIMIT $8
	`, p.UserID,
		p.ViewerGender,
		p.ViewerTargetGender,
		p.ViewerAgePrefMin,
		p.ViewerAgePrefMax,
		p.ViewerAge,
		activeWindowDays,
		p.Limit,
	)
	if err != nil {
		return nil, fmt.Errorf("find candidates: %w", err)
	}
	defer rows.Close()

	var users []*model.User
	for rows.Next() {
		u := &model.User{}
		if err := rows.Scan(
			&u.ID, &u.Email, &u.AuthProvider, &u.IsOnboarded,
			&u.Birthdate, &u.CoarseLocation, &u.ProfileData, &u.LastActiveAt,
			&u.CreatedAt, &u.UpdatedAt,
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
