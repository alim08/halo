package model

import "time"

// Photo represents the user_photos table.
type Photo struct {
	ID               string    `json:"id"`
	UserID           string    `json:"user_id"`
	IsPrimary        bool      `json:"is_primary"`
	OriginalKey      string    `json:"-"` // never expose raw keys
	BlurHeavyKey     *string   `json:"-"`
	BlurMedKey       *string   `json:"-"`
	BlurLightKey     *string   `json:"-"`
	ClearKey         *string   `json:"-"`
	ProcessingStatus string    `json:"processing_status"` // pending | ready | failed
	CreatedAt        time.Time `json:"created_at"`
	UpdatedAt        time.Time `json:"updated_at"`
}

// VariantKey returns the S3 object key for the given blur variant.
// Returns nil if the variant is not yet generated.
func (p *Photo) VariantKey(variant string) *string {
	switch variant {
	case "blur_heavy":
		return p.BlurHeavyKey
	case "blur_med":
		return p.BlurMedKey
	case "blur_light":
		return p.BlurLightKey
	case "clear":
		return p.ClearKey
	default:
		return nil
	}
}

// VariantForLevel maps a connection level (1-5) to the appropriate blur variant.
func VariantForLevel(level int) string {
	switch {
	case level <= 1:
		return "blur_heavy"
	case level == 2:
		return "blur_med"
	case level == 3:
		return "blur_light"
	case level == 4:
		return "blur_light"
	case level >= 5:
		return "clear"
	default:
		return "blur_heavy"
	}
}
