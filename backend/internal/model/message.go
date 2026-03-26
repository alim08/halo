package model

import "time"

// Message represents the messages table.
type Message struct {
	ID              string    `json:"id"`
	MatchID         string    `json:"match_id"`
	SenderID        string    `json:"sender_id"`
	ClientMessageID *string   `json:"client_message_id,omitempty"`
	Body            string    `json:"body"`
	CreatedAt       time.Time `json:"created_at"`
}
