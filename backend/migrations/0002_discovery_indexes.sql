-- Halo MVP — Discovery & Performance Indexes
-- Complements 0001_init.sql with targeted indexes for high-traffic queries.

-- ============================================================
-- Discovery: faster candidate exclusion via connection_intents
-- ============================================================
-- The discovery query uses NOT EXISTS (from_user_id, to_user_id).
-- The unique constraint already provides a composite index on
-- (from_user_id, to_user_id), but ensure it is leveraged.
-- Explicitly add a covering index if the planner anti-joins
-- are slow on large tables.
CREATE INDEX IF NOT EXISTS idx_connection_intents_from_to
    ON connection_intents (from_user_id, to_user_id);

-- ============================================================
-- Discovery: faster onboarded user scan
-- ============================================================
-- Partial index on is_onboarded = TRUE so the discovery query
-- only scans eligible users.
CREATE INDEX IF NOT EXISTS idx_users_onboarded
    ON users (id)
    WHERE is_onboarded = TRUE;

-- ============================================================
-- Matches: faster participant lookup for chat authz
-- ============================================================
-- The match participant check queries (user_a_id, user_b_id).
-- Composite indexes help authz checks on both sides.
CREATE INDEX IF NOT EXISTS idx_matches_user_a_b
    ON matches (user_a_id, user_b_id);

-- ============================================================
-- Messages: faster "before" cursor pagination
-- ============================================================
-- The chat list query paginate by (match_id, created_at DESC).
-- The existing idx_messages_match_timeline covers this.
-- Add a partial index for client_message_id lookup (reconciliation).
CREATE INDEX IF NOT EXISTS idx_messages_client_msg_id
    ON messages (match_id, client_message_id)
    WHERE client_message_id IS NOT NULL;

-- ============================================================
-- User photos: faster primary photo lookup per user
-- ============================================================
-- Partial index for "get primary photo by user" queries.
CREATE INDEX IF NOT EXISTS idx_user_photos_user_primary_ready
    ON user_photos (user_id)
    WHERE is_primary = TRUE AND processing_status = 'ready';

-- ============================================================
-- Matches: faster "list by user" for matches page
-- ============================================================
-- Cover both sides of the match lookup + order by last_message_at.
CREATE INDEX IF NOT EXISTS idx_matches_user_a_last_msg
    ON matches (user_a_id, last_message_at DESC NULLS LAST);

CREATE INDEX IF NOT EXISTS idx_matches_user_b_last_msg
    ON matches (user_b_id, last_message_at DESC NULLS LAST);
