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

// userColumns is the canonical SELECT/RETURNING column list for users.
// Centralized so a new column (e.g. last_active_at) is added in one place.
const userColumns = `id, email, password_hash, auth_provider, is_onboarded,
		birthdate, COALESCE(coarse_location, ''), profile_data,
		last_active_at, created_at, updated_at`

// scanUser scans a row in userColumns order into the supplied User.
func scanUser(row pgx.Row, u *model.User) error {
	return row.Scan(
		&u.ID, &u.Email, &u.PasswordHash, &u.AuthProvider, &u.IsOnboarded,
		&u.Birthdate, &u.CoarseLocation, &u.ProfileData,
		&u.LastActiveAt, &u.CreatedAt, &u.UpdatedAt,
	)
}

// Create inserts a new user and returns the populated model.
func (r *UserRepository) Create(ctx context.Context, email, passwordHash string) (*model.User, error) {
	u := &model.User{}
	err := scanUser(r.pool.QueryRow(ctx,
		`INSERT INTO users (email, password_hash, profile_data)
		 VALUES ($1, $2, '{}')
		 RETURNING `+userColumns,
		email, passwordHash,
	), u)
	if err != nil {
		if isUniqueViolation(err) {
			return nil, ErrEmailTaken
		}
		return nil, fmt.Errorf("create user: %w", err)
	}
	return u, nil
}

// GetByID retrieves a user by primary key.
func (r *UserRepository) GetByID(ctx context.Context, id string) (*model.User, error) {
	u := &model.User{}
	err := scanUser(r.pool.QueryRow(ctx,
		`SELECT `+userColumns+` FROM users WHERE id = $1`, id,
	), u)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, ErrUserNotFound
		}
		return nil, fmt.Errorf("get user by id: %w", err)
	}
	return u, nil
}

// GetByIDs retrieves users by a set of primary keys in a single round-trip.
// Order of returned users does NOT match the input order; callers that need
// ordering should index by ID. IDs not found are silently omitted (no error).
func (r *UserRepository) GetByIDs(ctx context.Context, ids []string) ([]*model.User, error) {
	if len(ids) == 0 {
		return nil, nil
	}
	rows, err := r.pool.Query(ctx,
		`SELECT `+userColumns+` FROM users WHERE id = ANY($1::uuid[])`, ids,
	)
	if err != nil {
		return nil, fmt.Errorf("get users by ids: %w", err)
	}
	defer rows.Close()

	users := make([]*model.User, 0, len(ids))
	for rows.Next() {
		u := &model.User{}
		if err := scanUser(rows, u); err != nil {
			return nil, fmt.Errorf("scan user: %w", err)
		}
		users = append(users, u)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("rows iteration: %w", err)
	}
	return users, nil
}

// GetByEmail retrieves a user by email (case-insensitive via citext).
func (r *UserRepository) GetByEmail(ctx context.Context, email string) (*model.User, error) {
	u := &model.User{}
	err := scanUser(r.pool.QueryRow(ctx,
		`SELECT `+userColumns+` FROM users WHERE email = $1`, email,
	), u)
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
	err := scanUser(r.pool.QueryRow(ctx,
		`UPDATE users
		 SET birthdate       = COALESCE($2, birthdate),
		     coarse_location = CASE WHEN $3 = '' THEN coarse_location ELSE $3 END,
		     profile_data    = CASE WHEN $4::jsonb IS NOT NULL THEN profile_data || $4::jsonb ELSE profile_data END,
		     is_onboarded    = $5
		 WHERE id = $1
		 RETURNING `+userColumns,
		id, birthdate, coarseLocation, profileData, isOnboarded,
	), u)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, ErrUserNotFound
		}
		return nil, fmt.Errorf("update profile: %w", err)
	}
	return u, nil
}

// TouchLastActive sets users.last_active_at to the current time.
// This is a best-effort call; callers may ignore the returned error.
func (r *UserRepository) TouchLastActive(ctx context.Context, userID string) error {
	_, err := r.pool.Exec(ctx,
		`UPDATE users SET last_active_at = NOW() WHERE id = $1`,
		userID,
	)
	if err != nil {
		return fmt.Errorf("touch last active: %w", err)
	}
	return nil
}
