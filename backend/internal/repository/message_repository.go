package repository

import (
	"context"
	"errors"
	"fmt"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"

	"halo/backend/internal/model"
)

// ErrMessageNotFound is returned when a message is not found.
var ErrMessageNotFound = errors.New("message not found")

// MessageRepository handles message persistence in PostgreSQL.
type MessageRepository struct {
	pool *pgxpool.Pool
}

// NewMessageRepository creates a new MessageRepository.
func NewMessageRepository(pool *pgxpool.Pool) *MessageRepository {
	return &MessageRepository{pool: pool}
}

// Create inserts a new message and returns the populated model with server-assigned ID and timestamp.
func (r *MessageRepository) Create(ctx context.Context, matchID, senderID, clientMessageID, body string) (*model.Message, error) {
	m := &model.Message{}
	var cmID *string
	if clientMessageID != "" {
		cmID = &clientMessageID
	}

	err := r.pool.QueryRow(ctx,
		`INSERT INTO messages (match_id, sender_id, client_message_id, body)
		 VALUES ($1, $2, $3, $4)
		 RETURNING id, match_id, sender_id, client_message_id, body, created_at`,
		matchID, senderID, cmID, body,
	).Scan(&m.ID, &m.MatchID, &m.SenderID, &m.ClientMessageID, &m.Body, &m.CreatedAt)
	if err != nil {
		return nil, fmt.Errorf("create message: %w", err)
	}
	return m, nil
}

// ListByMatch returns messages for a match, ordered by created_at descending.
// Supports cursor-based pagination via the `before` timestamp.
func (r *MessageRepository) ListByMatch(ctx context.Context, matchID string, limit int, before *string) ([]*model.Message, error) {
	if limit <= 0 || limit > 100 {
		limit = 50
	}

	var rows pgx.Rows
	var err error

	if before != nil && *before != "" {
		rows, err = r.pool.Query(ctx,
			`SELECT id, match_id, sender_id, client_message_id, body, created_at
			 FROM messages
			 WHERE match_id = $1 AND created_at < $3::timestamptz
			 ORDER BY created_at DESC
			 LIMIT $2`,
			matchID, limit, *before,
		)
	} else {
		rows, err = r.pool.Query(ctx,
			`SELECT id, match_id, sender_id, client_message_id, body, created_at
			 FROM messages
			 WHERE match_id = $1
			 ORDER BY created_at DESC
			 LIMIT $2`,
			matchID, limit,
		)
	}
	if err != nil {
		return nil, fmt.Errorf("list messages: %w", err)
	}
	defer rows.Close()

	var messages []*model.Message
	for rows.Next() {
		m := &model.Message{}
		if err := rows.Scan(&m.ID, &m.MatchID, &m.SenderID, &m.ClientMessageID, &m.Body, &m.CreatedAt); err != nil {
			return nil, fmt.Errorf("scan message: %w", err)
		}
		messages = append(messages, m)
	}
	return messages, rows.Err()
}
