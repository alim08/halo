# Quickstart: Halo (Universal Backend)

This quickstart is intended for the planned monorepo layout described in [specs/001-halo-functional-spec/plan.md](plan.md).

## Prereqs

- Go 1.22+
- Docker (for Postgres + Redis)
- Node 20+ (frontend; optional for backend-only work)

## Local services

Run Postgres + Redis via docker-compose (recommended) or equivalent.

Environment variables (backend):

- `HALO_DATABASE_URL=postgres://...`
- `HALO_REDIS_URL=redis://...`
- `HALO_JWT_SIGNING_KEY=...`
- `HALO_MEDIA_SIGNER_KEY_ID=...` (CloudFront key pair id)
- `HALO_MEDIA_SIGNER_PRIVATE_KEY_PEM=...`
- `HALO_S3_BUCKET=...`
- `HALO_CLOUDFRONT_DOMAIN=...`

## Migrations

- Migrations live in `backend/migrations/`.
- Apply with the chosen migration tool (e.g., `goose`/`tern`).

## Run the API

From repo root:

- `cd backend`
- `go run ./cmd/api`

Expected:

- HTTP JSON API on `http://localhost:8080`
- OpenAPI contract reference: [specs/001-halo-functional-spec/contracts/openapi.yaml](contracts/openapi.yaml)

## Sanity checks (MVP)

- Register + login returns `access_token` usable in `Authorization: Bearer ...`.
- Onboarding `PUT /v1/me/profile` can be called repeatedly to resume progress.
- Discovery `GET /v1/discovery` returns text-only cards (no photo URLs/tokens).
- Connect creates a match on mutual connect.
- Sending messages acks with server message ID + timestamp; client can reconcile optimistic messages.
- Match profile `GET /v1/matches/{matchId}/profile` returns only the single allowed photo variant URL.

## End-to-End Verification Checklist

### US1: Onboarding

- [ ] `POST /v1/auth/register` → 201 with `access_token`
- [ ] `POST /v1/auth/login` → 200 with `access_token`
- [ ] `GET /v1/me` → 200 with `is_onboarded: false`
- [ ] `PUT /v1/me/profile` with partial data → 200 (saved but not onboarded)
- [ ] Restart client, `GET /v1/me` → previous data preserved (resumability)
- [ ] `PUT /v1/me/profile` with all required fields → 200 with `is_onboarded: true`
- [ ] `GET /v1/discovery` → 200 (now accessible)

### US2: Blind Discovery

- [ ] `GET /v1/discovery` → cards have `card_id`, `age`, `location`, `vibe_tags`, `prompt_answers` ONLY
- [ ] Inspect response: **no** `photo`, `email`, `password_hash`, `score`, or internal fields
- [ ] `POST /v1/discovery/{cardId}/pass` → 204
- [ ] `POST /v1/discovery/{cardId}/connect` → 200 with `status: "intent_recorded"`
- [ ] Mutual connect → 200 with `status: "matched"` and `match_id`

### US3: Chat + Sparks

- [ ] `GET /v1/matches` → includes the new match
- [ ] `GET /v1/matches/{matchId}/sparks` → array of ≥3 sparks with `label` + `suggested_message`
- [ ] `POST /v1/matches/{matchId}/messages` with `client_message_id` → 201 with `message.id` + `created_at`
- [ ] `GET /v1/matches/{matchId}/messages` → returns sent messages in order
- [ ] WebSocket `GET /v1/ws` → upgrade succeeds; receives `new_message` events in real-time

### US4: Secure Reveal

- [ ] `GET /v1/matches/{matchId}/profile` → `current_connection_level: 1`, `photo.variant: "blur_heavy"`
- [ ] Exchange messages reciprocally past level 2 threshold (10 total, 3 each)
- [ ] `GET /v1/matches/{matchId}/profile` → `current_connection_level: 2`, `photo.variant: "blur_med"`
- [ ] Continue exchanging → level 3(25/8) → `blur_light`, level 4(45/15) → `blur_light`, level 5(70/25) → `clear`
- [ ] Verify `photo.url` is a signed URL with `Expires` param ≤ 15 minutes from now
- [ ] `POST /v1/me/photos/upload-url` → 200 with `upload_url`, `object_key`, `expires_at`

### US5: Privacy & Security

- [ ] Discovery payload: no email, password_hash, scores, photo URLs, or internal IDs
- [ ] Attempt to access match as non-participant → 403
- [ ] Attempt to access chat as non-participant → 403
- [ ] 5xx error responses: message is always `"an internal error occurred"` (no stack traces)
- [ ] Auth endpoints: rapid fire > 20 requests → 429 with `Retry-After` header
- [ ] Discovery endpoints: rapid fire > 60 requests → 429
- [ ] Media URLs: `expires_at` is ≤ 15 minutes in the future
- [ ] Audit logs: structured JSON with `request_id`, `actor_id`, `resource`, `status_code`, `duration_ms`

### Cross-Cutting

- [ ] All error responses match `{ "error": { "code": "...", "message": "..." } }` schema
- [ ] `X-Request-ID` header present in all responses
- [ ] CORS headers present for configured origins
- [ ] Security headers present: `X-Content-Type-Options`, `X-Frame-Options`, `Strict-Transport-Security`

## Realtime

- WebSocket endpoint: `GET /v1/ws` with Bearer token.
- Server publishes message events via Redis Pub/Sub so multiple API instances can fan out.
