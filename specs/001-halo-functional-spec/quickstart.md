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

## Realtime

- WebSocket endpoint: `GET /v1/ws` with Bearer token.
- Server publishes message events via Redis Pub/Sub so multiple API instances can fan out.
