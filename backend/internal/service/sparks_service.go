package service

import (
	"context"
	"encoding/json"
	"fmt"
	"strings"

	"halo/backend/internal/model"
	"halo/backend/internal/repository"
)

// SparksService generates conversation starter suggestions based on
// shared vibes, tags, and prompts between matched users.
type SparksService struct {
	userRepo  *repository.UserRepository
	matchRepo *repository.MatchRepository
}

// NewSparksService creates a new SparksService.
func NewSparksService(userRepo *repository.UserRepository, matchRepo *repository.MatchRepository) *SparksService {
	return &SparksService{userRepo: userRepo, matchRepo: matchRepo}
}

// Spark is a conversation starter suggestion.
type Spark struct {
	ID               string `json:"id"`
	Label            string `json:"label"`
	SuggestedMessage string `json:"suggested_message"`
}

// SparksResponse wraps the sparks array (minimum 3 per OpenAPI contract).
type SparksResponse struct {
	Sparks []Spark `json:"sparks"`
}

// GetSparks generates at least 3 spark suggestions for a match.
func (s *SparksService) GetSparks(ctx context.Context, matchID, userID string) (*SparksResponse, error) {
	// Authorization check.
	match, err := s.matchRepo.GetByID(ctx, matchID)
	if err != nil {
		return nil, err
	}
	if match.UserAID != userID && match.UserBID != userID {
		return nil, ErrNotParticipant
	}

	// Get both users' profiles.
	partnerID := match.PartnerID(userID)
	viewer, err := s.userRepo.GetByID(ctx, userID)
	if err != nil {
		return nil, fmt.Errorf("get viewer: %w", err)
	}
	partner, err := s.userRepo.GetByID(ctx, partnerID)
	if err != nil {
		return nil, fmt.Errorf("get partner: %w", err)
	}

	sparks := generateSparks(viewer, partner)
	return &SparksResponse{Sparks: sparks}, nil
}

type profileData struct {
	Vibe    map[string]string `json:"vibe"`
	Tags    []string          `json:"tags"`
	Prompts []struct {
		Question string `json:"question"`
		Answer   string `json:"answer"`
	} `json:"prompts"`
}

func parseProfile(u *model.User) profileData {
	var p profileData
	if u.ProfileData != nil {
		_ = json.Unmarshal(u.ProfileData, &p)
	}
	return p
}

// generateSparks creates personalized sparks based on profile overlap + fallbacks.
// Always returns at least 3 sparks.
func generateSparks(viewer, partner *model.User) []Spark {
	vp := parseProfile(viewer)
	pp := parseProfile(partner)

	sparks := make([]Spark, 0, 5)
	id := 1

	// 1. Shared vibe sparks (check all vibe categories).
	if vp.Vibe != nil && pp.Vibe != nil {
		for key, viewerValue := range vp.Vibe {
			if partnerValue, ok := pp.Vibe[key]; ok && viewerValue != "" && partnerValue == viewerValue {
				sparks = append(sparks, Spark{
					ID:               fmt.Sprintf("spark_%d", id),
					Label:            fmt.Sprintf("Shared %s: %s", formatVibeKey(key), viewerValue),
					SuggestedMessage: fmt.Sprintf("I noticed we're both %s — what does that mean to you?", viewerValue),
				})
				id++
				if len(sparks) >= 3 {
					break
				}
			}
		}
	}

	// 2. Shared tag sparks.
	viewerTags := make(map[string]struct{}, len(vp.Tags))
	for _, t := range vp.Tags {
		viewerTags[t] = struct{}{}
	}
	for _, t := range pp.Tags {
		if _, ok := viewerTags[t]; ok {
			sparks = append(sparks, Spark{
				ID:               fmt.Sprintf("spark_%d", id),
				Label:            fmt.Sprintf("You both like: %s", t),
				SuggestedMessage: fmt.Sprintf("I noticed we both enjoy %s — tell me more about that!", strings.ToLower(t)),
			})
			id++
			if len(sparks) >= 3 {
				break
			}
		}
	}

	// 3. Partner prompt-based sparks.
	for _, p := range pp.Prompts {
		if p.Answer != "" && len(sparks) < 5 {
			sparks = append(sparks, Spark{
				ID:               fmt.Sprintf("spark_%d", id),
				Label:            truncate(p.Question, 40),
				SuggestedMessage: fmt.Sprintf("I loved your answer to \"%s\" — %s. Can you tell me more?", truncate(p.Question, 50), truncate(p.Answer, 60)),
			})
			id++
		}
	}

	// 4. Fallback sparks to ensure minimum of 3.
	fallbacks := []Spark{
		{Label: "Deep question", SuggestedMessage: "What's something you're passionate about that most people don't know?"},
		{Label: "Adventure starter", SuggestedMessage: "If we could go anywhere right now, where would you take me?"},
		{Label: "Music taste", SuggestedMessage: "What song do you have on repeat right now?"},
		{Label: "Dream life", SuggestedMessage: "What does your ideal weekend look like?"},
		{Label: "Fun fact", SuggestedMessage: "Tell me a fun fact about yourself!"},
	}

	for _, fb := range fallbacks {
		if len(sparks) >= 3 {
			break
		}
		fb.ID = fmt.Sprintf("spark_%d", id)
		sparks = append(sparks, fb)
		id++
	}

	return sparks
}

func truncate(s string, maxLen int) string {
	if len(s) <= maxLen {
		return s
	}
	return s[:maxLen-1] + "…"
}

// formatVibeKey converts snake_case keys to Title Case (e.g., "energy_level" -> "Energy Level").
func formatVibeKey(key string) string {
	words := strings.Split(key, "_")
	for i, w := range words {
		if len(w) > 0 {
			words[i] = strings.ToUpper(w[:1]) + w[1:]
		}
	}
	return strings.Join(words, " ")
}
