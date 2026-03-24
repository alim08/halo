package repository

import (
	"context"
	"errors"
	"fmt"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"

	"halo/backend/internal/model"
)

// ErrIntentAlreadyExists is returned when a user has already actioned a profile.
var ErrIntentAlreadyExists = errors.New("connection intent already exists")

// ErrIntentNotFound is returned when a referenced intent/user doesn't exist.
var ErrIntentNotFound = errors.New("connection intent not found")

// ConnectionIntentRepository handles connection_intents persistence.
type ConnectionIntentRepository struct {
	pool *pgxpool.Pool
}

// NewConnectionIntentRepository creates a new ConnectionIntentRepository.
func NewConnectionIntentRepository(pool *pgxpool.Pool) *ConnectionIntentRepository {
	return &ConnectionIntentRepository{pool: pool}
}

// Create inserts a connection intent (pass or connect).
// Returns ErrIntentAlreadyExists if the from→to pair already has an intent.
func (r *ConnectionIntentRepository) Create(ctx context.Context, fromUserID, toUserID, intent string) (*model.ConnectionIntent, error) {
	ci := &model.ConnectionIntent{}
	err := r.pool.QueryRow(ctx,
		`INSERT INTO connection_intents (from_user_id, to_user_id, intent)
		 VALUES ($1, $2, $3)
		 RETURNING id, from_user_id, to_user_id, intent, created_at`,
		fromUserID, toUserID, intent,
	).Scan(&ci.ID, &ci.FromUserID, &ci.ToUserID, &ci.Intent, &ci.CreatedAt)
	if err != nil {
		if isDuplicateKeyError(err) {
			return nil, ErrIntentAlreadyExists
		}
		return nil, fmt.Errorf("create connection intent: %w", err)
	}
	return ci, nil
}

// FindMutualConnect checks whether the target user has already sent a
// "connect" intent toward the requesting user.
func (r *ConnectionIntentRepository) FindMutualConnect(ctx context.Context, fromUserID, toUserID string) (*model.ConnectionIntent, error) {
	ci := &model.ConnectionIntent{}
	err := r.pool.QueryRow(ctx,
		`SELECT id, from_user_id, to_user_id, intent, created_at
		 FROM connection_intents
		 WHERE from_user_id = $1 AND to_user_id = $2 AND intent = 'connect'`,
		toUserID, fromUserID,
	).Scan(&ci.ID, &ci.FromUserID, &ci.ToUserID, &ci.Intent, &ci.CreatedAt)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, nil // no mutual intent, not an error
		}
		return nil, fmt.Errorf("find mutual connect: %w", err)
	}
	return ci, nil
}

// UserExists checks whether a user ID exists in the users table.
func (r *ConnectionIntentRepository) UserExists(ctx context.Context, userID string) (bool, error) {
	var exists bool
	err := r.pool.QueryRow(ctx,
		`SELECT EXISTS(SELECT 1 FROM users WHERE id = $1)`, userID,
	).Scan(&exists)
	if err != nil {
		return false, fmt.Errorf("check user exists: %w", err)
	}
	return exists, nil
}
