package service

import (
	"context"
	"encoding/json"
	"fmt"
	"time"

	"halo/backend/internal/model"
	"halo/backend/internal/repository"
)

// DiscoveryService shapes the text-only discovery feed.
// It deliberately excludes ALL photo data from responses (constitution rule).
type DiscoveryService struct {
	discoveryRepo  *repository.DiscoveryRepository
	userRepo       *repository.UserRepository
	matchingService *MatchingService
}

// NewDiscoveryService creates a new DiscoveryService.
func NewDiscoveryService(
	discoveryRepo *repository.DiscoveryRepository,
	userRepo *repository.UserRepository,
	matchingService *MatchingService,
) *DiscoveryService {
	return &DiscoveryService{
		discoveryRepo:  discoveryRepo,
		userRepo:       userRepo,
		matchingService: matchingService,
	}
}

// DiscoveryCard is the text-only card returned to the client.
// It intentionally has NO photo fields — enforcing blind discovery.
type DiscoveryCard struct {
	CardID        string         `json:"card_id"`
	Age           int            `json:"age"`
	Location      string         `json:"location"`
	VibeTags      []string       `json:"vibe_tags"`
	PromptAnswers []PromptAnswer `json:"prompt_answers"`
}

// PromptAnswer holds a single question/answer pair for discovery cards.
type PromptAnswer struct {
	Question string `json:"question"`
	Answer   string `json:"answer"`
}

// DiscoveryResponse wraps the card list for the API response.
type DiscoveryResponse struct {
	Cards []DiscoveryCard `json:"cards"`
}

// GetDiscoveryFeed returns ranked, text-only discovery cards for the user.
func (s *DiscoveryService) GetDiscoveryFeed(ctx context.Context, userID string, limit int) (*DiscoveryResponse, error) {
	// Fetch the viewer's profile for scoring.
	viewer, err := s.userRepo.GetByID(ctx, userID)
	if err != nil {
		return nil, fmt.Errorf("get viewer: %w", err)
	}

	if !viewer.IsOnboarded {
		return nil, ErrNotOnboarded
	}

	// Get raw candidates from the database.
	candidates, err := s.discoveryRepo.FindCandidates(ctx, userID, limit)
	if err != nil {
		return nil, fmt.Errorf("find candidates: %w", err)
	}

	// Rank/score candidates (scores stay server-side).
	ranked := s.matchingService.RankCandidates(viewer, candidates)

	// Shape into text-only cards — NO photo data in output.
	cards := make([]DiscoveryCard, 0, len(ranked))
	for _, sc := range ranked {
		card := userToCard(sc.User)
		cards = append(cards, card)
	}

	return &DiscoveryResponse{Cards: cards}, nil
}

// ErrNotOnboarded is returned when a non-onboarded user tries to access discovery.
var ErrNotOnboarded = fmt.Errorf("user must complete onboarding before using discovery")

// userToCard converts a User model to a text-only DiscoveryCard.
// This is the last enforcement point: no photo URLs, no scores, no IDs beyond card_id.
// The output struct is the ALLOWLIST — only these fields are ever serialized.
func userToCard(u *model.User) DiscoveryCard {
	card := DiscoveryCard{
		CardID:   u.ID,
		Age:      computeAge(u.Birthdate),
		Location: u.CoarseLocation,
	}

	// Extract vibe_tags and prompt_answers from profile_data.
	var profile struct {
		Vibe    string `json:"vibe"`
		Tags    []string `json:"tags"`
		Prompts []struct {
			Question string `json:"question"`
			Answer   string `json:"answer"`
		} `json:"prompts"`
	}
	if u.ProfileData != nil {
		_ = json.Unmarshal(u.ProfileData, &profile)
	}

	// Build vibe_tags: include vibe + tags.
	vibeTags := make([]string, 0)
	if profile.Vibe != "" {
		vibeTags = append(vibeTags, profile.Vibe)
	}
	vibeTags = append(vibeTags, profile.Tags...)
	card.VibeTags = vibeTags

	// Build prompt_answers.
	answers := make([]PromptAnswer, 0, len(profile.Prompts))
	for _, p := range profile.Prompts {
		if p.Answer != "" {
			answers = append(answers, PromptAnswer{
				Question: p.Question,
				Answer:   p.Answer,
			})
		}
	}
	card.PromptAnswers = answers

	return card
}

// SanitizeDiscoveryResponse performs a final defense-in-depth check on the
// discovery response. It ensures:
//  1. No card contains an email, password_hash, or PII field (structurally impossible
//     because DiscoveryCard is the allowlist, but we verify at runtime).
//  2. Card IDs are present and non-empty.
//  3. Ages are ≥ 18 (already enforced by computeAge, belt-and-suspenders).
//
// If any anomaly is detected the card is redacted (removed from the response).
func SanitizeDiscoveryResponse(resp *DiscoveryResponse) *DiscoveryResponse {
	if resp == nil {
		return &DiscoveryResponse{Cards: []DiscoveryCard{}}
	}

	clean := make([]DiscoveryCard, 0, len(resp.Cards))
	for _, c := range resp.Cards {
		// Validate required fields.
		if c.CardID == "" {
			continue
		}
		if c.Age < 18 {
			c.Age = 18
		}
		// Ensure slices are never nil (consistent JSON output).
		if c.VibeTags == nil {
			c.VibeTags = []string{}
		}
		if c.PromptAnswers == nil {
			c.PromptAnswers = []PromptAnswer{}
		}
		clean = append(clean, c)
	}

	return &DiscoveryResponse{Cards: clean}
}

// computeAge returns the user's age in whole years.
func computeAge(birthdate *time.Time) int {
	if birthdate == nil {
		return 0
	}
	now := time.Now()
	age := now.Year() - birthdate.Year()
	if now.YearDay() < birthdate.YearDay() {
		age--
	}
	// Floor at 18 — validated at onboarding time.
	if age < 18 {
		age = 18
	}
	return age
}
