package repository

import (
	"context"
	"errors"
	"fmt"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"

	"halo/backend/internal/model"
)

// ErrMatchNotFound is returned when a match lookup yields no rows.
var ErrMatchNotFound = errors.New("match not found")

// MatchRepository handles match persistence.
type MatchRepository struct {
	pool *pgxpool.Pool
}

// NewMatchRepository creates a new MatchRepository.
func NewMatchRepository(pool *pgxpool.Pool) *MatchRepository {
	return &MatchRepository{pool: pool}
}

// CreateMatch inserts a new match between two users.
// user_a_id MUST be < user_b_id (canonical ordering).
func (r *MatchRepository) CreateMatch(ctx context.Context, userAID, userBID string) (string, error) {
	var matchID string
	err := r.pool.QueryRow(ctx,
		`INSERT INTO matches (user_a_id, user_b_id)
		 VALUES ($1, $2)
		 ON CONFLICT (user_a_id, user_b_id) DO UPDATE SET updated_at = NOW()
		 RETURNING id`,
		userAID, userBID,
	).Scan(&matchID)
	if err != nil {
		return "", fmt.Errorf("create match: %w", err)
	}
	return matchID, nil
}

// GetByID retrieves a match by its primary key.
func (r *MatchRepository) GetByID(ctx context.Context, matchID string) (*model.Match, error) {
	m := &model.Match{}
	err := r.pool.QueryRow(ctx,
		`SELECT id, user_a_id, user_b_id, current_connection_level,
		        message_count, user_a_counted_sent, user_b_counted_sent,
		        last_message_at, created_at, updated_at
		 FROM matches WHERE id = $1`, matchID,
	).Scan(
		&m.ID, &m.UserAID, &m.UserBID, &m.CurrentConnectionLevel,
		&m.MessageCount, &m.UserACountedSent, &m.UserBCountedSent,
		&m.LastMessageAt, &m.CreatedAt, &m.UpdatedAt,
	)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, ErrMatchNotFound
		}
		return nil, fmt.Errorf("get match by id: %w", err)
	}
	return m, nil
}

// ListByUser returns all matches for a given user, ordered by most recent activity.
func (r *MatchRepository) ListByUser(ctx context.Context, userID string, limit int, cursor *string) ([]*model.Match, error) {
	if limit <= 0 || limit > 100 {
		limit = 50
	}

	var rows pgx.Rows
	var err error

	if cursor != nil && *cursor != "" {
		rows, err = r.pool.Query(ctx,
			`SELECT id, user_a_id, user_b_id, current_connection_level,
			        message_count, user_a_counted_sent, user_b_counted_sent,
			        last_message_at, created_at, updated_at
			 FROM matches
			 WHERE (user_a_id = $1 OR user_b_id = $1)
			   AND created_at < (SELECT created_at FROM matches WHERE id = $3)
			 ORDER BY COALESCE(last_message_at, created_at) DESC
			 LIMIT $2`,
			userID, limit, *cursor,
		)
	} else {
		rows, err = r.pool.Query(ctx,
			`SELECT id, user_a_id, user_b_id, current_connection_level,
			        message_count, user_a_counted_sent, user_b_counted_sent,
			        last_message_at, created_at, updated_at
			 FROM matches
			 WHERE user_a_id = $1 OR user_b_id = $1
			 ORDER BY COALESCE(last_message_at, created_at) DESC
			 LIMIT $2`,
			userID, limit,
		)
	}
	if err != nil {
		return nil, fmt.Errorf("list matches: %w", err)
	}
	defer rows.Close()

	var matches []*model.Match
	for rows.Next() {
		m := &model.Match{}
		if err := rows.Scan(
			&m.ID, &m.UserAID, &m.UserBID, &m.CurrentConnectionLevel,
			&m.MessageCount, &m.UserACountedSent, &m.UserBCountedSent,
			&m.LastMessageAt, &m.CreatedAt, &m.UpdatedAt,
		); err != nil {
			return nil, fmt.Errorf("scan match: %w", err)
		}
		matches = append(matches, m)
	}
	return matches, rows.Err()
}

// IsParticipant checks that the user is part of the match.
func (r *MatchRepository) IsParticipant(ctx context.Context, matchID, userID string) (bool, error) {
	var exists bool
	err := r.pool.QueryRow(ctx,
		`SELECT EXISTS(
			SELECT 1 FROM matches
			WHERE id = $1 AND (user_a_id = $2 OR user_b_id = $2)
		)`, matchID, userID,
	).Scan(&exists)
	if err != nil {
		return false, fmt.Errorf("check participant: %w", err)
	}
	return exists, nil
}

// IncrementMessageCount atomically increments the message counter and
// the sender-specific counted_sent counter.
func (r *MatchRepository) IncrementMessageCount(ctx context.Context, matchID, senderID string) error {
	_, err := r.pool.Exec(ctx,
		`UPDATE matches SET
			message_count = message_count + 1,
			user_a_counted_sent = CASE WHEN user_a_id = $2 THEN user_a_counted_sent + 1 ELSE user_a_counted_sent END,
			user_b_counted_sent = CASE WHEN user_b_id = $2 THEN user_b_counted_sent + 1 ELSE user_b_counted_sent END,
			last_message_at = NOW()
		 WHERE id = $1`,
		matchID, senderID,
	)
	if err != nil {
		return fmt.Errorf("increment message count: %w", err)
	}
	return nil
}

// UpdateConnectionLevel sets the connection level for a match.
// Level is monotonic — this should only be called with a higher value.
func (r *MatchRepository) UpdateConnectionLevel(ctx context.Context, matchID string, level int) error {
	_, err := r.pool.Exec(ctx,
		`UPDATE matches SET
			current_connection_level = $2,
			updated_at = NOW()
		 WHERE id = $1 AND current_connection_level < $2`,
		matchID, level,
	)
	if err != nil {
		return fmt.Errorf("update connection level: %w", err)
	}
	return nil
}
