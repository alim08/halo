package repository

import (
	"context"
	"errors"
	"fmt"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"

	"halo/backend/internal/model"
)

// ErrPhotoNotFound is returned when a photo lookup yields no rows.
var ErrPhotoNotFound = errors.New("photo not found")

// PhotoRepository handles user_photos persistence.
type PhotoRepository struct {
	pool *pgxpool.Pool
}

// NewPhotoRepository creates a new PhotoRepository.
func NewPhotoRepository(pool *pgxpool.Pool) *PhotoRepository {
	return &PhotoRepository{pool: pool}
}

// Create inserts a new photo record (original uploaded, variants pending).
func (r *PhotoRepository) Create(ctx context.Context, userID, originalKey, contentType string, isPrimary bool) (*model.Photo, error) {
	p := &model.Photo{}
	err := r.pool.QueryRow(ctx,
		`INSERT INTO user_photos (user_id, original_key, is_primary, processing_status)
		 VALUES ($1, $2, $3, 'pending')
		 RETURNING id, user_id, is_primary, original_key,
		           blur_heavy_key, blur_med_key, blur_light_key, clear_key,
		           processing_status, created_at, updated_at`,
		userID, originalKey, isPrimary,
	).Scan(
		&p.ID, &p.UserID, &p.IsPrimary, &p.OriginalKey,
		&p.BlurHeavyKey, &p.BlurMedKey, &p.BlurLightKey, &p.ClearKey,
		&p.ProcessingStatus, &p.CreatedAt, &p.UpdatedAt,
	)
	if err != nil {
		return nil, fmt.Errorf("create photo: %w", err)
	}
	return p, nil
}

// GetPrimaryByUser returns the primary photo for a user, if it exists.
func (r *PhotoRepository) GetPrimaryByUser(ctx context.Context, userID string) (*model.Photo, error) {
	p := &model.Photo{}
	err := r.pool.QueryRow(ctx,
		`SELECT id, user_id, is_primary, original_key,
		        blur_heavy_key, blur_med_key, blur_light_key, clear_key,
		        processing_status, created_at, updated_at
		 FROM user_photos
		 WHERE user_id = $1 AND is_primary = true
		 ORDER BY created_at DESC
		 LIMIT 1`, userID,
	).Scan(
		&p.ID, &p.UserID, &p.IsPrimary, &p.OriginalKey,
		&p.BlurHeavyKey, &p.BlurMedKey, &p.BlurLightKey, &p.ClearKey,
		&p.ProcessingStatus, &p.CreatedAt, &p.UpdatedAt,
	)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, ErrPhotoNotFound
		}
		return nil, fmt.Errorf("get primary photo: %w", err)
	}
	return p, nil
}

// GetByID retrieves a photo by its primary key.
func (r *PhotoRepository) GetByID(ctx context.Context, id string) (*model.Photo, error) {
	p := &model.Photo{}
	err := r.pool.QueryRow(ctx,
		`SELECT id, user_id, is_primary, original_key,
		        blur_heavy_key, blur_med_key, blur_light_key, clear_key,
		        processing_status, created_at, updated_at
		 FROM user_photos WHERE id = $1`, id,
	).Scan(
		&p.ID, &p.UserID, &p.IsPrimary, &p.OriginalKey,
		&p.BlurHeavyKey, &p.BlurMedKey, &p.BlurLightKey, &p.ClearKey,
		&p.ProcessingStatus, &p.CreatedAt, &p.UpdatedAt,
	)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, ErrPhotoNotFound
		}
		return nil, fmt.Errorf("get photo by id: %w", err)
	}
	return p, nil
}

// UpdateVariants sets the variant keys and marks the photo as ready.
// Called by the Lambda variant generator after processing.
func (r *PhotoRepository) UpdateVariants(ctx context.Context, photoID string, blurHeavy, blurMed, blurLight, clear string) error {
	tag, err := r.pool.Exec(ctx,
		`UPDATE user_photos SET
			blur_heavy_key = $2,
			blur_med_key = $3,
			blur_light_key = $4,
			clear_key = $5,
			processing_status = 'ready',
			updated_at = NOW()
		 WHERE id = $1`,
		photoID, blurHeavy, blurMed, blurLight, clear,
	)
	if err != nil {
		return fmt.Errorf("update variants: %w", err)
	}
	if tag.RowsAffected() == 0 {
		return ErrPhotoNotFound
	}
	return nil
}

// MarkFailed sets the processing status to 'failed'.
func (r *PhotoRepository) MarkFailed(ctx context.Context, photoID string) error {
	_, err := r.pool.Exec(ctx,
		`UPDATE user_photos SET processing_status = 'failed', updated_at = NOW()
		 WHERE id = $1`, photoID,
	)
	if err != nil {
		return fmt.Errorf("mark photo failed: %w", err)
	}
	return nil
}
