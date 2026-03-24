-- Halo MVP — Initial Schema Migration
-- Applies: users, connection_intents, matches, messages, user_photos

-- Enable extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "citext";

-- ============================================================
-- users
-- ============================================================
CREATE TABLE users (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email           CITEXT NOT NULL UNIQUE,
    password_hash   TEXT NOT NULL,
    auth_provider   TEXT NOT NULL DEFAULT 'password',
    is_onboarded    BOOLEAN NOT NULL DEFAULT FALSE,
    birthdate       DATE,
    coarse_location TEXT,
    profile_data    JSONB NOT NULL DEFAULT '{}',
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- connection_intents
-- ============================================================
CREATE TABLE connection_intents (
    id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    from_user_id UUID NOT NULL REFERENCES users(id),
    to_user_id   UUID NOT NULL REFERENCES users(id),
    intent       TEXT NOT NULL CHECK (intent IN ('pass', 'connect')),
    created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT uq_connection_intent UNIQUE (from_user_id, to_user_id)
);

CREATE INDEX idx_connection_intents_to_user ON connection_intents (to_user_id, intent);

-- ============================================================
-- matches
-- ============================================================
CREATE TABLE matches (
    id                       UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_a_id                UUID NOT NULL REFERENCES users(id),
    user_b_id                UUID NOT NULL REFERENCES users(id),
    current_connection_level INT NOT NULL DEFAULT 1 CHECK (current_connection_level BETWEEN 1 AND 5),
    message_count            INT NOT NULL DEFAULT 0 CHECK (message_count >= 0),
    user_a_counted_sent      INT NOT NULL DEFAULT 0 CHECK (user_a_counted_sent >= 0),
    user_b_counted_sent      INT NOT NULL DEFAULT 0 CHECK (user_b_counted_sent >= 0),
    last_message_at          TIMESTAMPTZ,
    created_at               TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at               TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- Canonical ordering: user_a_id < user_b_id
    CONSTRAINT chk_canonical_order CHECK (user_a_id < user_b_id),
    CONSTRAINT uq_match_pair UNIQUE (user_a_id, user_b_id)
);

CREATE INDEX idx_matches_user_a ON matches (user_a_id);
CREATE INDEX idx_matches_user_b ON matches (user_b_id);

-- ============================================================
-- messages
-- ============================================================
CREATE TABLE messages (
    id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    match_id          UUID NOT NULL REFERENCES matches(id),
    sender_id         UUID NOT NULL REFERENCES users(id),
    client_message_id UUID,
    body              TEXT NOT NULL,
    created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_messages_match_timeline ON messages (match_id, created_at DESC);
CREATE INDEX idx_messages_created_at ON messages (created_at);

-- ============================================================
-- user_photos
-- ============================================================
CREATE TABLE user_photos (
    id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id           UUID NOT NULL REFERENCES users(id),
    is_primary        BOOLEAN NOT NULL DEFAULT TRUE,
    original_key      TEXT NOT NULL,
    blur_heavy_key    TEXT,
    blur_med_key      TEXT,
    blur_light_key    TEXT,
    clear_key         TEXT,
    processing_status TEXT NOT NULL DEFAULT 'pending' CHECK (processing_status IN ('pending', 'ready', 'failed')),
    created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_user_photos_user_primary ON user_photos (user_id, is_primary);

-- ============================================================
-- updated_at trigger function
-- ============================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_users_updated_at
    BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_matches_updated_at
    BEFORE UPDATE ON matches FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_user_photos_updated_at
    BEFORE UPDATE ON user_photos FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
