package service

import (
	"context"
	"encoding/json"
	"fmt"
	"time"

	"halo/backend/internal/model"
	"halo/backend/internal/repository"
)

// ChatService handles messaging: send, list, authorization checks.
type ChatService struct {
	msgRepo      *repository.MessageRepository
	matchRepo    *repository.MatchRepository
	cache        *ChatCache
	levelService *ConnectionLevelService
}

// NewChatService creates a new ChatService.
// cache may be nil if Redis caching is not available.
// levelService may be nil if connection level progression is not enabled.
func NewChatService(
	msgRepo *repository.MessageRepository,
	matchRepo *repository.MatchRepository,
	cache *ChatCache,
	levelService *ConnectionLevelService,
) *ChatService {
	return &ChatService{
		msgRepo:      msgRepo,
		matchRepo:    matchRepo,
		cache:        cache,
		levelService: levelService,
	}
}

// SendMessageRequest is the input for sending a message.
type SendMessageRequest struct {
	MatchID         string `json:"match_id"`
	SenderID        string `json:"sender_id"`
	ClientMessageID string `json:"client_message_id"`
	Body            string `json:"body"`
}

// SendMessageResponse wraps the persisted message for the API response.
// Includes client_message_id echo for optimistic UI reconciliation.
type SendMessageResponse struct {
	Message *model.Message `json:"message"`
}

// ErrNotParticipant is returned when the user is not part of the match.
var ErrNotParticipant = fmt.Errorf("user is not a participant in this match")

// SendMessage persists a message, increments match counters, and caches.
func (s *ChatService) SendMessage(ctx context.Context, req *SendMessageRequest) (*SendMessageResponse, error) {
	if req.Body == "" {
		return nil, fmt.Errorf("message body cannot be empty")
	}

	// Authorization: verify the sender is part of this match.
	isParticipant, err := s.matchRepo.IsParticipant(ctx, req.MatchID, req.SenderID)
	if err != nil {
		return nil, fmt.Errorf("check participant: %w", err)
	}
	if !isParticipant {
		return nil, ErrNotParticipant
	}

	// Persist to Postgres.
	msg, err := s.msgRepo.Create(ctx, req.MatchID, req.SenderID, req.ClientMessageID, req.Body)
	if err != nil {
		return nil, fmt.Errorf("create message: %w", err)
	}

	// Increment match counters (message_count, sender-specific counted_sent).
	if err := s.matchRepo.IncrementMessageCount(ctx, req.MatchID, req.SenderID); err != nil {
		// Log but don't fail the send — counter is best-effort.
		fmt.Printf("warning: increment message count failed: %v\n", err)
	}

	// Check for connection level progression (best-effort).
	if s.levelService != nil {
		_, _, levelErr := s.levelService.CheckAndUpdateLevel(ctx, req.MatchID)
		if levelErr != nil {
			fmt.Printf("warning: connection level check failed: %v\n", levelErr)
		}
	}

	// Push to Redis hot cache (best-effort).
	if s.cache != nil {
		_ = s.cache.PushMessage(ctx, req.MatchID, msg)
	}

	return &SendMessageResponse{Message: msg}, nil
}

// ListMessages returns messages for a match with pagination.
// Tries Redis cache first for recent messages, falls back to Postgres.
func (s *ChatService) ListMessages(ctx context.Context, matchID, userID string, limit int, before *string) ([]*model.Message, error) {
	// Authorization.
	isParticipant, err := s.matchRepo.IsParticipant(ctx, matchID, userID)
	if err != nil {
		return nil, fmt.Errorf("check participant: %w", err)
	}
	if !isParticipant {
		return nil, ErrNotParticipant
	}

	// Try Redis cache for initial load (no cursor = most recent).
	if before == nil && s.cache != nil {
		cached, err := s.cache.GetMessages(ctx, matchID, limit)
		if err == nil && len(cached) > 0 {
			return cached, nil
		}
	}

	// Fall back to Postgres.
	return s.msgRepo.ListByMatch(ctx, matchID, limit, before)
}

// GetMatch retrieves a match and verifies the user is a participant.
func (s *ChatService) GetMatch(ctx context.Context, matchID, userID string) (*model.Match, error) {
	match, err := s.matchRepo.GetByID(ctx, matchID)
	if err != nil {
		return nil, err
	}

	if match.UserAID != userID && match.UserBID != userID {
		return nil, ErrNotParticipant
	}

	return match, nil
}

// ListMatches returns all matches for a user.
func (s *ChatService) ListMatches(ctx context.Context, userID string, limit int, cursor *string) ([]*model.Match, error) {
	return s.matchRepo.ListByUser(ctx, userID, limit, cursor)
}

// MatchSummary is the JSON shape for the match list response.
type MatchSummary struct {
	MatchID                string      `json:"match_id"`
	Partner                UserPublic  `json:"partner"`
	CurrentConnectionLevel int         `json:"current_connection_level"`
	LastMessageAt          *time.Time  `json:"last_message_at"`
}

// UserPublic is the public-facing user info in match/chat contexts.
type UserPublic struct {
	DisplayName string   `json:"display_name"`
	Age         int      `json:"age"`
	Location    string   `json:"location"`
	VibeTags    []string `json:"vibe_tags,omitempty"`
}

// BuildMatchSummary constructs a MatchSummary from a Match + partner User.
func BuildMatchSummary(match *model.Match, partner *model.User) MatchSummary {
	pub := BuildUserPublic(partner)
	return MatchSummary{
		MatchID:                match.ID,
		Partner:                pub,
		CurrentConnectionLevel: match.CurrentConnectionLevel,
		LastMessageAt:          match.LastMessageAt,
	}
}

// BuildUserPublic extracts public profile info from a User model.
func BuildUserPublic(u *model.User) UserPublic {
	pub := UserPublic{
		Location: u.CoarseLocation,
	}

	// Compute age.
	if u.Birthdate != nil {
		now := time.Now()
		age := now.Year() - u.Birthdate.Year()
		if now.YearDay() < u.Birthdate.YearDay() {
			age--
		}
		pub.Age = age
	}

	// Extract display_name and vibe_tags from profile_data.
	var profile struct {
		DisplayName string   `json:"display_name"`
		Vibe        string   `json:"vibe"`
		Tags        []string `json:"tags"`
	}
	if u.ProfileData != nil {
		_ = json.Unmarshal(u.ProfileData, &profile)
	}

	pub.DisplayName = profile.DisplayName
	if pub.DisplayName == "" {
		pub.DisplayName = "Anonymous"
	}

	vibeTags := make([]string, 0)
	if profile.Vibe != "" {
		vibeTags = append(vibeTags, profile.Vibe)
	}
	vibeTags = append(vibeTags, profile.Tags...)
	pub.VibeTags = vibeTags

	return pub
}
