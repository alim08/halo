# Phase 1 Data Model (PostgreSQL): Halo MVP

This schema is designed to satisfy the functional spec + constitution while keeping the API reusable for future native clients.

## Conventions

- Primary keys are UUIDs (`uuid`), generated server-side.
- `created_at` and `updated_at` are `timestamptz`.
- Postgres is the source of truth; Redis is only for hot chat cache.

## Entities & Tables

### `users`

Purpose: auth identity + flexible profile payload (values/tags/prompts) via JSONB for schema evolution.

Fields:

- `id` (uuid, PK)
- `email` (citext or text, unique, nullable if supporting phone later)
- `password_hash` (text)
- `auth_provider` (text, default `'password'`)
- `is_onboarded` (bool, default false)
- `birthdate` (date) — enforce 18+ at write time
- `coarse_location` (text) — e.g., “Austin, TX” (no precise location)
- `profile_data` (jsonb, default `{}`)
  - expected keys (not enforced at DB layer):
    - `vibe`: `{ energy_level, life_pace, ... }`
    - `tags`: `[{ type: 'value'|'interest', label: string }]`
    - `prompts`: `[{ prompt_id, question, answer }]`
- `created_at`, `updated_at`

Indexes:

- unique index on `email`

Notes:

- Discovery responses MUST NOT include contact info fields.

### `connection_intents`

Purpose: record Pass/Connect actions; creates a `match` on mutual connect.

Fields:

- `id` (uuid, PK)
- `from_user_id` (uuid, FK → users.id)
- `to_user_id` (uuid, FK → users.id)
- `intent` (text) — `'pass' | 'connect'`
- `created_at`

Constraints:

- unique(`from_user_id`, `to_user_id`) to prevent duplicates

### `matches`

Purpose: durable relationship enabling messaging + Secure Reveal.

Required fields (per spec request):

- `id` (uuid, PK)
- `user_a_id` (uuid, FK → users.id)
- `user_b_id` (uuid, FK → users.id)
- `current_connection_level` (int, not null, default 1) — range 1..5
- `message_count` (int, not null, default 0) — *counted* messages (see counting rules)

Recommended additional fields (for efficient reciprocity + UX):

- `user_a_counted_sent` (int, not null, default 0)
- `user_b_counted_sent` (int, not null, default 0)
- `last_message_at` (timestamptz, nullable)
- `created_at`, `updated_at`

Constraints:

- check: `current_connection_level between 1 and 5`
- check: counts are non-negative
- unique pair constraint (canonical ordering):
  - enforce `user_a_id < user_b_id` at write time, plus unique(`user_a_id`, `user_b_id`)

State transitions:

- `current_connection_level` is monotonic: can only increase.

### `messages`

Purpose: chat messages (cold storage source of truth).

Fields:

- `id` (uuid, PK)
- `match_id` (uuid, FK → matches.id)
- `sender_id` (uuid, FK → users.id)
- `client_message_id` (uuid, nullable) — used for optimistic UI reconciliation
- `body` (text, not null)
- `created_at` (timestamptz, not null)

Indexes:

- index on (`match_id`, `created_at` desc) for timeline paging
- index on `created_at` (per spec request; supports history scrolling)

Counting rules (Secure Reveal):

- Count only non-empty, user-sent messages.
- Exclude system events (typing indicators, delivery receipts, join/leave).
- Edits/deletes: define policy in service; simplest MVP is to *not* decrement counts once a counted message is persisted.

### `user_photos`

Purpose: store photo variant keys and allow server-side gating.

Fields:

- `id` (uuid, PK)
- `user_id` (uuid, FK → users.id)
- `is_primary` (bool, default true)
- `original_key` (text, not null)
- `blur_heavy_key` (text, nullable)
- `blur_med_key` (text, nullable)
- `blur_light_key` (text, nullable)
- `clear_key` (text, nullable)
- `processing_status` (text, default `'pending'`) — `'pending' | 'ready' | 'failed'`
- `created_at`, `updated_at`

Indexes:

- index on (`user_id`, `is_primary`)

Notes:

- The API MUST NEVER return a clear (or higher-level) key/url unless the requester is authorized by match level.

## Secure Reveal Thresholds (Domain Rules)

Level progression thresholds (from spec):

| Next Level | Total Exchanged (counted) | Minimum Sent by Each User |
|-----------:|---------------------------:|---------------------------:|
| 2          | 10                         | 3                          |
| 3          | 25                         | 8                          |
| 4          | 45                         | 15                         |
| 5          | 70                         | 25                         |

Implementation note:

- On each persisted counted message, update `matches.message_count` and the appropriate per-user counter.
- Then compute the highest attainable level given the thresholds and update `current_connection_level` if it increases.
- This logic MUST live in the Go service layer.
