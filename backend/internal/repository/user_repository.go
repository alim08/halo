package repository

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"

	"halo/backend/internal/model"
)

// ErrUserNotFound is returned when a user lookup yields no rows.
var ErrUserNotFound = errors.New("user not found")

// ErrEmailTaken is returned when attempting to register a duplicate email.
var ErrEmailTaken = errors.New("email already registered")

// UserRepository handles user persistence via PostgreSQL.
type UserRepository struct {
	pool *pgxpool.Pool
}

// NewUserRepository creates a new UserRepository.
func NewUserRepository(pool *pgxpool.Pool) *UserRepository {
	return &UserRepository{pool: pool}
}

// Create inserts a new user and returns the populated model.
func (r *UserRepository) Create(ctx context.Context, email, passwordHash string) (*model.User, error) {
	u := &model.User{}
	err := r.pool.QueryRow(ctx,
		`INSERT INTO users (email, password_hash, profile_data)
		 VALUES ($1, $2, '{}')
		 RETURNING id, email, password_hash, auth_provider, is_onboarded,
		           birthdate, COALESCE(coarse_location, ''), profile_data, created_at, updated_at`,
		email, passwordHash,
	).Scan(
		&u.ID, &u.Email, &u.PasswordHash, &u.AuthProvider, &u.IsOnboarded,
		&u.Birthdate, &u.CoarseLocation, &u.ProfileData, &u.CreatedAt, &u.UpdatedAt,
	)
	if err != nil {
		if isDuplicateKeyError(err) {
			return nil, ErrEmailTaken
		}
		return nil, fmt.Errorf("create user: %w", err)
	}
	return u, nil
}

// GetByID retrieves a user by primary key.
func (r *UserRepository) GetByID(ctx context.Context, id string) (*model.User, error) {
	u := &model.User{}
	err := r.pool.QueryRow(ctx,
		`SELECT id, email, password_hash, auth_provider, is_onboarded,
		        birthdate, COALESCE(coarse_location, ''), profile_data, created_at, updated_at
		 FROM users WHERE id = $1`, id,
	).Scan(
		&u.ID, &u.Email, &u.PasswordHash, &u.AuthProvider, &u.IsOnboarded,
		&u.Birthdate, &u.CoarseLocation, &u.ProfileData, &u.CreatedAt, &u.UpdatedAt,
	)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, ErrUserNotFound
		}
		return nil, fmt.Errorf("get user by id: %w", err)
	}
	return u, nil
}

// GetByEmail retrieves a user by email (case-insensitive via citext).
func (r *UserRepository) GetByEmail(ctx context.Context, email string) (*model.User, error) {
	u := &model.User{}
	err := r.pool.QueryRow(ctx,
		`SELECT id, email, password_hash, auth_provider, is_onboarded,
		        birthdate, COALESCE(coarse_location, ''), profile_data, created_at, updated_at
		 FROM users WHERE email = $1`, email,
	).Scan(
		&u.ID, &u.Email, &u.PasswordHash, &u.AuthProvider, &u.IsOnboarded,
		&u.Birthdate, &u.CoarseLocation, &u.ProfileData, &u.CreatedAt, &u.UpdatedAt,
	)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, ErrUserNotFound
		}
		return nil, fmt.Errorf("get user by email: %w", err)
	}
	return u, nil
}

// UpdateProfile updates the user's profile fields: birthdate, coarse_location,
// profile_data (JSONB), and recomputes is_onboarded based on completeness.
// This supports partial/resumable onboarding — profile_data is merged, not replaced.
func (r *UserRepository) UpdateProfile(ctx context.Context, id string, birthdate *time.Time, coarseLocation string, profileData json.RawMessage, isOnboarded bool) (*model.User, error) {
	u := &model.User{}
	err := r.pool.QueryRow(ctx,
		`UPDATE users
		 SET birthdate       = COALESCE($2, birthdate),
		     coarse_location = CASE WHEN $3 = '' THEN coarse_location ELSE $3 END,
		     profile_data    = CASE WHEN $4::jsonb IS NOT NULL THEN profile_data || $4::jsonb ELSE profile_data END,
		     is_onboarded    = $5
		 WHERE id = $1
		 RETURNING id, email, password_hash, auth_provider, is_onboarded,
		           birthdate, COALESCE(coarse_location, ''), profile_data, created_at, updated_at`,
		id, birthdate, coarseLocation, profileData, isOnboarded,
	).Scan(
		&u.ID, &u.Email, &u.PasswordHash, &u.AuthProvider, &u.IsOnboarded,
		&u.Birthdate, &u.CoarseLocation, &u.ProfileData, &u.CreatedAt, &u.UpdatedAt,
	)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, ErrUserNotFound
		}
		return nil, fmt.Errorf("update profile: %w", err)
	}
	return u, nil
}

// isDuplicateKeyError checks for Postgres unique violation (23505).
func isDuplicateKeyError(err error) bool {
	return err != nil && contains(err.Error(), "23505")
}

func contains(s, substr string) bool {
	return len(s) >= len(substr) && searchString(s, substr)
}

func searchString(s, substr string) bool {
	for i := 0; i <= len(s)-len(substr); i++ {
		if s[i:i+len(substr)] == substr {
			return true
		}
	}
	return false
}
