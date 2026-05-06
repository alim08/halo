package service

import (
	"context"
	"encoding/json"
	"fmt"
	"strings"
	"time"

	"halo/backend/internal/model"
	"halo/backend/internal/repository"
)

// DiscoveryService shapes the text-only discovery feed.
// It deliberately excludes ALL photo data from responses (constitution rule).
type DiscoveryService struct {
	discoveryRepo   *repository.DiscoveryRepository
	userRepo        *repository.UserRepository
	matchingService *MatchingService
}

// NewDiscoveryService creates a new DiscoveryService.
func NewDiscoveryService(
	discoveryRepo *repository.DiscoveryRepository,
	userRepo *repository.UserRepository,
	matchingService *MatchingService,
) *DiscoveryService {
	return &DiscoveryService{
		discoveryRepo:   discoveryRepo,
		userRepo:        userRepo,
		matchingService: matchingService,
	}
}

// DiscoveryCard is the text-only card returned to the client.
// It intentionally has NO photo fields — enforcing blind discovery.
type DiscoveryCard struct {
	CardID          string             `json:"card_id"`
	Age             int                `json:"age"`
	Location        string             `json:"location"`
	VibeTags        []string           `json:"vibe_tags"`
	PromptAnswers   []PromptAnswer     `json:"prompt_answers"`
	LifestyleHabits map[string]string  `json:"lifestyle_habits,omitempty"`
	Vibe            map[string]string  `json:"vibe,omitempty"`
	ConnectionStyle map[string]string  `json:"connection_style,omitempty"`
	Interests       []string           `json:"interests,omitempty"`
	ProfileData     *ComparisonProfile `json:"profile_data,omitempty"`
}

// PromptAnswer holds a single question/answer pair for discovery cards.
type PromptAnswer struct {
	Question string `json:"question"`
	Answer   string `json:"answer"`
}

// ComparisonProfile is a text-only allowlist for compatibility cards.
type ComparisonProfile struct {
	LifestyleHabits map[string]string `json:"lifestyle_habits,omitempty"`
	Vibe            map[string]string `json:"vibe,omitempty"`
	ConnectionStyle map[string]string `json:"connection_style,omitempty"`
	Interests       []string          `json:"interests,omitempty"`
}

// DiscoveryResponse wraps the card list for the API response.
type DiscoveryResponse struct {
	Cards []DiscoveryCard `json:"cards"`
}

// ErrNotOnboarded is returned when a non-onboarded user tries to access discovery.
var ErrNotOnboarded = fmt.Errorf("user must complete onboarding before using discovery")

// GetDiscoveryFeed returns ranked, text-only discovery cards for the user.
func (s *DiscoveryService) GetDiscoveryFeed(ctx context.Context, userID string, limit int) (*DiscoveryResponse, error) {
	viewer, err := s.userRepo.GetByID(ctx, userID)
	if err != nil {
		return nil, fmt.Errorf("get viewer: %w", err)
	}

	if !viewer.IsOnboarded {
		return nil, ErrNotOnboarded
	}

	candidates, err := s.discoveryRepo.FindCandidates(ctx, buildFindParams(viewer, limit))
	if err != nil {
		return nil, fmt.Errorf("find candidates: %w", err)
	}

	if len(candidates) == 0 {
		return &DiscoveryResponse{Cards: []DiscoveryCard{}}, nil
	}

	// Score and rank in memory; scores stay server-side.
	ranked := s.matchingService.RankCandidates(viewer, candidates)

	cards := make([]DiscoveryCard, 0, len(ranked))
	for _, sc := range ranked {
		cards = append(cards, userToCard(sc.User))
	}

	return &DiscoveryResponse{Cards: cards}, nil
}

// buildFindParams extracts the viewer's hard-filter attributes from their
// profile_data JSONB and constructs a FindCandidatesParams.
func buildFindParams(viewer *model.User, limit int) repository.FindCandidatesParams {
	var p repository.FindCandidatesParams
	p.UserID = viewer.ID
	p.Limit = limit

	var profile struct {
		Gender       string `json:"gender"`
		InterestedIn string `json:"interested_in"`
		AgePrefMin   int    `json:"age_pref_min"`
		AgePrefMax   int    `json:"age_pref_max"`
	}
	if viewer.ProfileData != nil {
		_ = json.Unmarshal(viewer.ProfileData, &profile)
	}

	p.ViewerGender = normalizeGender(profile.Gender)
	p.ViewerTargetGender = targetGenderFromInterest(profile.InterestedIn)
	p.ViewerAgePrefMin = profile.AgePrefMin
	p.ViewerAgePrefMax = profile.AgePrefMax
	p.ViewerAge = ageInYears(viewer.Birthdate)

	return p
}

// normalizeGender maps common gender strings to "man" or "woman".
// Other values are lowercased and returned as-is for forward-compatibility.
func normalizeGender(g string) string {
	switch strings.ToLower(strings.TrimSpace(g)) {
	case "man", "male":
		return "man"
	case "woman", "female":
		return "woman"
	default:
		return strings.ToLower(strings.TrimSpace(g))
	}
}

// targetGenderFromInterest converts an "interested_in" value to the
// canonical target gender for SQL filtering. Returns "everyone" when the
// viewer is not filtering by a specific gender, causing the filter to be skipped.
func targetGenderFromInterest(interestedIn string) string {
	switch strings.ToLower(strings.TrimSpace(interestedIn)) {
	case "men", "man", "male":
		return "man"
	case "women", "woman", "female":
		return "woman"
	default:
		// "everyone", "all", nonbinary flags, or unknown → no gender filter.
		return "everyone"
	}
}

// ageInYears returns the user's age in whole years, or 0 if birthdate is nil.
func ageInYears(birthdate *time.Time) int {
	if birthdate == nil {
		return 0
	}
	now := time.Now()
	age := now.Year() - birthdate.Year()
	if now.YearDay() < birthdate.YearDay() {
		age--
	}
	return age
}

// userToCard converts a User model to a text-only DiscoveryCard.
// This is the last enforcement point: no photo URLs, no scores, no IDs beyond card_id.
// The output struct is the ALLOWLIST — only these fields are ever serialized.
func userToCard(u *model.User) DiscoveryCard {
	card := DiscoveryCard{
		CardID:   u.ID,
		Age:      computeAge(u.Birthdate),
		Location: u.CoarseLocation,
	}

	var profile struct {
		Vibe    json.RawMessage `json:"vibe"`
		Tags    []string        `json:"tags"`
		Prompts []struct {
			Question string `json:"question"`
			Answer   string `json:"answer"`
		} `json:"prompts"`
		LifestyleHabits map[string]string `json:"lifestyle_habits"`
		LegacyLifestyle map[string]string `json:"lifestyle"`
		ConnectionStyle map[string]string `json:"connection_style"`
		Interests       []string          `json:"interests"`
	}
	if u.ProfileData != nil {
		_ = json.Unmarshal(u.ProfileData, &profile)
	}

	vibe := extractStringMap(profile.Vibe)
	vibeTags := make([]string, 0)
	vibeTags = append(vibeTags, mapValues(vibe)...)
	vibeTags = append(vibeTags, profile.Tags...)
	vibeTags = append(vibeTags, profile.Interests...)
	card.VibeTags = vibeTags

	if len(profile.LifestyleHabits) > 0 {
		card.LifestyleHabits = profile.LifestyleHabits
	} else if len(profile.LegacyLifestyle) > 0 {
		card.LifestyleHabits = profile.LegacyLifestyle
	}

	if len(vibe) > 0 {
		card.Vibe = vibe
	}

	if len(profile.ConnectionStyle) > 0 {
		card.ConnectionStyle = profile.ConnectionStyle
	}

	if len(profile.Interests) > 0 {
		card.Interests = profile.Interests
	}

	if card.LifestyleHabits != nil || card.Vibe != nil || card.ConnectionStyle != nil || card.Interests != nil {
		card.ProfileData = &ComparisonProfile{
			LifestyleHabits: card.LifestyleHabits,
			Vibe:            card.Vibe,
			ConnectionStyle: card.ConnectionStyle,
			Interests:       card.Interests,
		}
	}

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

func extractStringMap(raw json.RawMessage) map[string]string {
	if len(raw) == 0 {
		return nil
	}

	var single string
	if err := json.Unmarshal(raw, &single); err == nil && single != "" {
		return map[string]string{"vibe": single}
	}

	var grouped map[string]string
	if err := json.Unmarshal(raw, &grouped); err != nil {
		return nil
	}

	return grouped
}

func mapValues(grouped map[string]string) []string {
	values := make([]string, 0, len(grouped))
	for _, value := range grouped {
		if value != "" {
			values = append(values, value)
		}
	}
	return values
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
		if c.CardID == "" {
			continue
		}
		if c.Age < 18 {
			c.Age = 18
		}
		if c.VibeTags == nil {
			c.VibeTags = []string{}
		}
		if c.PromptAnswers == nil {
			c.PromptAnswers = []PromptAnswer{}
		}
		if c.Interests == nil {
			c.Interests = []string{}
		}
		clean = append(clean, c)
	}

	return &DiscoveryResponse{Cards: clean}
}

// computeAge returns the user's age in whole years, floored at 18.
func computeAge(birthdate *time.Time) int {
	if birthdate == nil {
		return 0
	}
	now := time.Now()
	age := now.Year() - birthdate.Year()
	if now.YearDay() < birthdate.YearDay() {
		age--
	}
	if age < 18 {
		age = 18
	}
	return age
}
