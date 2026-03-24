package model

import (
	"encoding/json"
	"time"
)

// User represents the users table.
type User struct {
	ID              string          `json:"id"`
	Email           string          `json:"email"`
	PasswordHash    string          `json:"-"` // never serialize
	AuthProvider    string          `json:"auth_provider"`
	IsOnboarded     bool            `json:"is_onboarded"`
	Birthdate       *time.Time      `json:"birthdate,omitempty"`
	CoarseLocation  string          `json:"coarse_location,omitempty"`
	ProfileData     json.RawMessage `json:"profile_data"`
	CreatedAt       time.Time       `json:"created_at"`
	UpdatedAt       time.Time       `json:"updated_at"`
}
