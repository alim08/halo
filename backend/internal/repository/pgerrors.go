package repository

import (
	"errors"

	"github.com/jackc/pgx/v5/pgconn"
)

// PostgreSQL SQLSTATE codes we map to package-level sentinels.
// Reference: https://www.postgresql.org/docs/current/errcodes-appendix.html
const (
	pgCodeUniqueViolation = "23505"
)

// isUniqueViolation reports whether err is a PostgreSQL unique-constraint
// violation (SQLSTATE 23505). Uses errors.As against *pgconn.PgError rather
// than string matching so wrapped errors are detected reliably.
func isUniqueViolation(err error) bool {
	var pgErr *pgconn.PgError
	return errors.As(err, &pgErr) && pgErr.Code == pgCodeUniqueViolation
}
