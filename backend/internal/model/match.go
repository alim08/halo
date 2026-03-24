package model

import "time"

// Match represents the matches table.
// user_a_id < user_b_id is enforced at write time (canonical ordering).
type Match struct {
	ID                     string     `json:"match_id"`
	UserAID                string     `json:"user_a_id"`
	UserBID                string     `json:"user_b_id"`
	CurrentConnectionLevel int        `json:"current_connection_level"`
	MessageCount           int        `json:"message_count"`
	UserACountedSent       int        `json:"-"`
	UserBCountedSent       int        `json:"-"`
	LastMessageAt          *time.Time `json:"last_message_at"`
	CreatedAt              time.Time  `json:"created_at"`
	UpdatedAt              time.Time  `json:"updated_at"`
}

// ConnectionIntent represents the connection_intents table.
type ConnectionIntent struct {
	ID         string    `json:"id"`
	FromUserID string    `json:"from_user_id"`
	ToUserID   string    `json:"to_user_id"`
	Intent     string    `json:"intent"` // "pass" | "connect"
	CreatedAt  time.Time `json:"created_at"`
}

// PartnerID returns the other user's ID given the current user.
func (m *Match) PartnerID(currentUserID string) string {
	if m.UserAID == currentUserID {
		return m.UserBID
	}
	return m.UserAID
}
