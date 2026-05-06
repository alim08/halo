-- Halo MVP — Matchmaking improvements
-- Adds: users.last_active_at, matches.unmatched_at / unmatched_by,
-- and supporting indexes for the hard-filter discovery query.

-- ============================================================
-- users: activity tracking
-- ============================================================
ALTER TABLE users
    ADD COLUMN last_active_at TIMESTAMPTZ;

-- Partial index: only index users who have been active at least once.
-- Used by the discovery hard filter (last 30 days active).
CREATE INDEX idx_users_last_active_at
    ON users (last_active_at)
    WHERE last_active_at IS NOT NULL;

-- ============================================================
-- matches: soft-delete support
-- ============================================================
ALTER TABLE matches
    ADD COLUMN unmatched_at TIMESTAMPTZ,
    ADD COLUMN unmatched_by UUID REFERENCES users(id);

-- Partial index for active-match lookups (the common path).
-- Significantly cheaper than a full scan when most matches are active.
CREATE INDEX idx_matches_active_user_a
    ON matches (user_a_id)
    WHERE unmatched_at IS NULL;

CREATE INDEX idx_matches_active_user_b
    ON matches (user_b_id)
    WHERE unmatched_at IS NULL;
