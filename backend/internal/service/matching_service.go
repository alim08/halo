package service

import (
	"encoding/json"
	"math"
	"time"

	"halo/backend/internal/model"
)

// MatchingService computes compatibility scores for discovery ranking.
// Scores are server-only and MUST NEVER be exposed in API responses.
type MatchingService struct{}

// NewMatchingService creates a new MatchingService.
func NewMatchingService() *MatchingService {
	return &MatchingService{}
}

// ScoredCandidate pairs a user with their internal compatibility score.
// The Score field is strictly for internal ordering and MUST NOT be serialized.
type ScoredCandidate struct {
	User  *model.User
	Score float64
}

// RankCandidates scores and sorts candidates by descending compatibility.
// The scoring algorithm considers vibe overlap, prompt completeness, age
// proximity, and location match – all computed server-side only.
func (s *MatchingService) RankCandidates(viewer *model.User, candidates []*model.User) []ScoredCandidate {
	scored := make([]ScoredCandidate, 0, len(candidates))
	for _, c := range candidates {
		score := s.computeScore(viewer, c)
		scored = append(scored, ScoredCandidate{User: c, Score: score})
	}

	// Sort descending by score (simple insertion sort – candidate list is small).
	for i := 1; i < len(scored); i++ {
		for j := i; j > 0 && scored[j].Score > scored[j-1].Score; j-- {
			scored[j], scored[j-1] = scored[j-1], scored[j]
		}
	}

	return scored
}

// computeScore produces a server-only compatibility score.
// Factors: vibe overlap (40%), prompt completeness (20%), age proximity (20%),
// location match (20%).
func (s *MatchingService) computeScore(viewer, candidate *model.User) float64 {
	var score float64

	viewerProfile := parseProfileData(viewer.ProfileData)
	candidateProfile := parseProfileData(candidate.ProfileData)

	// Vibe overlap — 40% weight.
	score += 0.4 * vibeOverlap(viewerProfile, candidateProfile)

	// Prompt completeness — 20% weight.
	score += 0.2 * promptCompleteness(candidateProfile)

	// Age proximity — 20% weight.
	score += 0.2 * ageProximity(viewer.Birthdate, candidate.Birthdate)

	// Location match — 20% weight.
	score += 0.2 * locationMatch(viewer.CoarseLocation, candidate.CoarseLocation)

	return score
}

// ── Internal helpers (all unexported) ────────────────────

type profileMap struct {
	Vibe    string   `json:"vibe"`
	Tags    []string `json:"tags"`
	Prompts []prompt `json:"prompts"`
}

type prompt struct {
	Question string `json:"question"`
	Answer   string `json:"answer"`
}

func parseProfileData(raw json.RawMessage) profileMap {
	var p profileMap
	if raw != nil {
		_ = json.Unmarshal(raw, &p)
	}
	return p
}

// vibeOverlap returns 1.0 if vibes match, 0.5 for tag overlap > 0, else 0.
func vibeOverlap(a, b profileMap) float64 {
	if a.Vibe != "" && a.Vibe == b.Vibe {
		return 1.0
	}

	// Fall back to tag overlap.
	if len(a.Tags) == 0 || len(b.Tags) == 0 {
		return 0
	}
	tagSet := make(map[string]struct{}, len(a.Tags))
	for _, t := range a.Tags {
		tagSet[t] = struct{}{}
	}
	overlap := 0
	for _, t := range b.Tags {
		if _, ok := tagSet[t]; ok {
			overlap++
		}
	}
	if overlap == 0 {
		return 0
	}
	// Jaccard-ish: overlap / max(len_a, len_b).
	maxLen := len(a.Tags)
	if len(b.Tags) > maxLen {
		maxLen = len(b.Tags)
	}
	return float64(overlap) / float64(maxLen)
}

// promptCompleteness returns 1.0 if candidate has 3+ prompts answered,
// partial credit for fewer.
func promptCompleteness(p profileMap) float64 {
	answered := 0
	for _, pr := range p.Prompts {
		if pr.Answer != "" {
			answered++
		}
	}
	if answered >= 3 {
		return 1.0
	}
	return float64(answered) / 3.0
}

// ageProximity returns a 0-1 score based on how close in age the two users are.
// Same age = 1.0, 10+ years apart = 0.
func ageProximity(a, b *time.Time) float64 {
	if a == nil || b == nil {
		return 0.5 // neutral if unknown
	}
	yearsA := time.Since(*a).Hours() / 8766
	yearsB := time.Since(*b).Hours() / 8766
	diff := math.Abs(yearsA - yearsB)
	if diff >= 10 {
		return 0
	}
	return 1.0 - (diff / 10.0)
}

// locationMatch returns 1.0 if locations match, 0 otherwise.
func locationMatch(a, b string) float64 {
	if a == "" || b == "" {
		return 0.5 // neutral if unknown
	}
	if a == b {
		return 1.0
	}
	return 0
}
