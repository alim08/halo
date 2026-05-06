-- Halo MVP — Matchmaking improvements
-- Adds: users.last_active_at, matches.unmatched_at / unmatched_by,
-- and supporting indexes for the hard-filter discovery query.
--
-- CREATE INDEX CONCURRENTLY cannot run inside a transaction, so this entire
-- migration runs without one (goose-style directive). ALTER TABLE statements
-- here only add nullable columns / a self-referential FK on the new column,
-- so non-transactional execution is safe.

-- +goose NO TRANSACTION

-- ============================================================
-- users: activity tracking
-- ============================================================
ALTER TABLE users
    ADD COLUMN IF NOT EXISTS last_active_at TIMESTAMPTZ;

-- Partial index: only index users who have been active at least once.
-- Used by the discovery hard filter (last 30 days active).
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_last_active_at
    ON users (last_active_at)
    WHERE last_active_at IS NOT NULL;

-- ============================================================
-- matches: soft-delete support
-- ============================================================
-- ON DELETE SET NULL on unmatched_by: preserve the audit trail (the row
-- still records that an unmatch happened) while allowing user account
-- deletion. The default NO ACTION would block deletion of any user who
-- has ever unmatched.
ALTER TABLE matches
    ADD COLUMN IF NOT EXISTS unmatched_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS unmatched_by UUID REFERENCES users(id) ON DELETE SET NULL;

-- Partial covering indexes for the active-match list query
-- (`WHERE unmatched_at IS NULL ORDER BY last_message_at DESC`).
-- Including last_message_at DESC NULLS LAST lets the planner satisfy
-- the ORDER BY directly from the index without a sort step.
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_matches_active_user_a
    ON matches (user_a_id, last_message_at DESC NULLS LAST)
    WHERE unmatched_at IS NULL;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_matches_active_user_b
    ON matches (user_b_id, last_message_at DESC NULLS LAST)
    WHERE unmatched_at IS NULL;
