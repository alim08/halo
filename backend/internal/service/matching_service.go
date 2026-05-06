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
// Scoring is deterministic and server-side only; it considers interest
// overlap (Jaccard), vibe match, prompt completeness, age proximity,
// location, and recency.
func (s *MatchingService) RankCandidates(viewer *model.User, candidates []*model.User) []ScoredCandidate {
	scored := make([]ScoredCandidate, 0, len(candidates))
	for _, c := range candidates {
		scored = append(scored, ScoredCandidate{User: c, Score: s.computeScore(viewer, c)})
	}

	// Insertion sort — candidate pool is small (≤200 after hard filters).
	for i := 1; i < len(scored); i++ {
		for j := i; j > 0 && scored[j].Score > scored[j-1].Score; j-- {
			scored[j], scored[j-1] = scored[j-1], scored[j]
		}
	}

	return scored
}

// computeScore returns a [0, 1] compatibility score.
//
// Weight breakdown:
//   - Interests Jaccard similarity:  35%
//   - Vibe string match:             10%
//   - Prompt completeness:           20%
//   - Age proximity:                 20%
//   - Location match:                 5%
//   - Recency (last_active_at):      10%
func (s *MatchingService) computeScore(viewer, candidate *model.User) float64 {
	vp := parseProfileData(viewer.ProfileData)
	cp := parseProfileData(candidate.ProfileData)

	score := 0.35*interestJaccard(vp, cp) +
		0.10*vibeMatch(vp, cp) +
		0.20*promptCompleteness(cp) +
		0.20*ageProximity(viewer.Birthdate, candidate.Birthdate) +
		0.05*locationMatch(viewer.CoarseLocation, candidate.CoarseLocation) +
		0.10*recencyScore(candidate.LastActiveAt)

	return score
}

// ── Profile data types ────────────────────────────────────────────────────────

// matchProfile holds the subset of profile_data fields used by the scoring algorithm.
type matchProfile struct {
	Vibe      string   `json:"vibe"`
	Tags      []string `json:"tags"`
	Interests []string `json:"interests"`
	Prompts   []prompt `json:"prompts"`
}

type prompt struct {
	Question string `json:"question"`
	Answer   string `json:"answer"`
}

func parseProfileData(raw json.RawMessage) matchProfile {
	var p matchProfile
	if raw != nil {
		_ = json.Unmarshal(raw, &p)
	}
	return p
}

// ── Scoring functions (all unexported) ───────────────────────────────────────

// interestJaccard computes |A∩B| / |A∪B| over the interests lists.
// Returns 0 when either or both lists are empty (undefined → 0 by convention).
func interestJaccard(a, b matchProfile) float64 {
	if len(a.Interests) == 0 || len(b.Interests) == 0 {
		return 0
	}

	setA := make(map[string]struct{}, len(a.Interests))
	for _, v := range a.Interests {
		setA[v] = struct{}{}
	}

	setB := make(map[string]struct{}, len(b.Interests))
	for _, v := range b.Interests {
		setB[v] = struct{}{}
	}

	var intersect int
	for v := range setB {
		if _, ok := setA[v]; ok {
			intersect++
		}
	}

	union := len(setA) + len(setB) - intersect
	if union == 0 {
		return 0
	}
	return float64(intersect) / float64(union)
}

// vibeMatch returns 1.0 when both users share the exact same vibe string,
// 0 otherwise (including when either vibe is empty).
func vibeMatch(a, b matchProfile) float64 {
	if a.Vibe != "" && a.Vibe == b.Vibe {
		return 1.0
	}
	return 0
}

// promptCompleteness returns 1.0 when the candidate has answered 3+ prompts.
// Partial credit: answered / 3.
func promptCompleteness(p matchProfile) float64 {
	answered := 0
	for _, pr := range p.Prompts {
		if pr.Answer != "" {
			answered++
		}
	}
	const fullPromptCount = 3
	if answered >= fullPromptCount {
		return 1.0
	}
	return float64(answered) / float64(fullPromptCount)
}

// ageProximity returns a [0, 1] score — same age = 1.0, 10+ years apart = 0.
// Returns 0.5 (neutral) when either birthdate is unknown.
func ageProximity(a, b *time.Time) float64 {
	if a == nil || b == nil {
		return 0.5
	}
	const hoursPerYear = 8766.0
	const maxAgeDiffYears = 10.0
	yearsA := time.Since(*a).Hours() / hoursPerYear
	yearsB := time.Since(*b).Hours() / hoursPerYear
	diff := math.Abs(yearsA - yearsB)
	if diff >= maxAgeDiffYears {
		return 0
	}
	return 1.0 - (diff / maxAgeDiffYears)
}

// locationMatch returns 1.0 on exact coarse_location string equality,
// 0.5 when either location is unknown, 0 on mismatch.
func locationMatch(a, b string) float64 {
	if a == "" || b == "" {
		return 0.5
	}
	if a == b {
		return 1.0
	}
	return 0
}

// recencyScore returns a step-bin score based on the candidate's last_active_at:
//
//	< 1 day  → 0.30
//	< 7 days → 0.20
//	< 30 days → 0.10
//	≥ 30 days or unknown → 0.0
//
// Step bins are intentionally coarse — the goal is "is this account live?",
// not real-time presence detection.
func recencyScore(lastActive *time.Time) float64 {
	if lastActive == nil {
		return 0
	}
	age := time.Since(*lastActive)
	switch {
	case age < 24*time.Hour:
		return 0.30
	case age < 7*24*time.Hour:
		return 0.20
	case age < 30*24*time.Hour:
		return 0.10
	default:
		return 0
	}
}
