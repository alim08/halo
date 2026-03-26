# Halo Backend (Go API)

Client-agnostic HTTP JSON API for Halo.

## Stack

- **Language**: Go 1.22+
- **Router**: [chi](https://github.com/go-chi/chi)
- **Database**: PostgreSQL (`pgx`)
- **Cache / Pub-Sub**: Redis (`go-redis`)
- **Media**: AWS S3 + CloudFront (signed URLs)
- **WebSockets**: `nhooyr.io/websocket`

## Directory layout

```
backend/
├── cmd/api/main.go        # Server entry point
├── internal/
│   ├── handler/            # HTTP JSON handlers (transport layer)
│   │   ├── httputil/       # JSON + error helpers
│   │   └── middleware/     # Request-ID, rate-limit, CORS
│   ├── service/            # Pure business logic (no net/http)
│   ├── repository/         # SQL queries (pgx)
│   ├── auth/               # JWT, password hashing, middleware
│   ├── media/              # Signed URL issuance + variant selection
│   ├── ws/                 # WebSocket hub + connection registry
│   ├── model/              # Domain types (User, Match, Message…)
│   └── config/             # Env config loader
├── migrations/             # SQL migration files
└── tests/
    ├── contract/           # API contract tests
    └── integration/        # Integration tests (real DB/Redis)
```

## Prerequisites

- Go 1.22+
- Docker (Postgres + Redis)

## Running locally

```sh
# 1. Start dependencies
docker compose up -d

# 2. Run migrations
#    Using goose (recommended):
#    goose -dir migrations postgres "$HALO_DATABASE_URL" up
#
#    Or apply manually:
#    psql "$HALO_DATABASE_URL" -f migrations/0001_init.sql

# 3. Set environment variables
export HALO_DATABASE_URL="postgres://halo:halo@localhost:5432/halo?sslmode=disable"
export HALO_REDIS_URL="redis://localhost:6379"
export HALO_JWT_SIGNING_KEY="change-me-in-production"

# 4. Start the API
cd backend
go run ./cmd/api
```

Expected: HTTP JSON API on `http://localhost:8080`

## Docker Compose (local dev)

Create a `docker-compose.yml` at the repo root:

```yaml
version: "3.9"
services:
  postgres:
    image: postgres:16-alpine
    environment:
      POSTGRES_USER: halo
      POSTGRES_PASSWORD: halo
      POSTGRES_DB: halo
    ports:
      - "5432:5432"
    volumes:
      - pgdata:/var/lib/postgresql/data

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"

volumes:
  pgdata:
```

## Migrations

Migration files live in `backend/migrations/` and are numbered sequentially:

- `0001_init.sql` — Creates users, connection_intents, matches, messages, user_photos tables

To apply migrations manually:

```sh
psql "$HALO_DATABASE_URL" -f backend/migrations/0001_init.sql
```

For automated migration management, consider [goose](https://github.com/pressly/goose):

```sh
go install github.com/pressly/goose/v3/cmd/goose@latest
goose -dir backend/migrations postgres "$HALO_DATABASE_URL" up
```

## Environment variables

| Variable | Description | Required |
|----------|-------------|----------|
| `HALO_PORT` | HTTP server port (default: 8080) | No |
| `HALO_DATABASE_URL` | Postgres connection string | **Yes** |
| `HALO_REDIS_URL` | Redis connection string (default: redis://localhost:6379) | No |
| `HALO_JWT_SIGNING_KEY` | HMAC key for JWT tokens | **Yes** |
| `HALO_JWT_ACCESS_EXPIRY` | Access token TTL (default: 15m) | No |
| `HALO_JWT_REFRESH_EXPIRY` | Refresh token TTL (default: 168h) | No |
| `HALO_MEDIA_SIGNER_KEY_ID` | CloudFront key-pair ID | No |
| `HALO_MEDIA_SIGNER_PRIVATE_KEY_PEM` | CloudFront private key (PEM) | No |
| `HALO_S3_BUCKET` | S3 bucket for media | No |
| `HALO_CLOUDFRONT_DOMAIN` | CloudFront distribution domain | No |
| `HALO_MEDIA_URL_EXPIRY` | Signed URL TTL (default: 15m) | No |

## API contract

See [specs/001-halo-functional-spec/contracts/openapi.yaml](../specs/001-halo-functional-spec/contracts/openapi.yaml).

## API endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/healthz` | No | Health check |
| POST | `/v1/auth/register` | No | Register (rate-limited: 20/min) |
| POST | `/v1/auth/login` | No | Login (rate-limited: 20/min) |
| GET | `/v1/me` | Bearer | Get current user |
| PUT | `/v1/me/profile` | Bearer | Upsert profile/onboarding |
| GET | `/v1/discovery` | Bearer | Blind discovery feed (rate-limited: 60/min) |
| POST | `/v1/discovery/{cardId}/pass` | Bearer | Pass on card (rate-limited) |
| POST | `/v1/discovery/{cardId}/connect` | Bearer | Connect on card (rate-limited) |
| GET | `/v1/matches` | Bearer | List matches |
| GET | `/v1/matches/{matchId}/sparks` | Bearer | Get Spark suggestions |
| GET | `/v1/matches/{matchId}/messages` | Bearer | List messages (paginated) |
| POST | `/v1/matches/{matchId}/messages` | Bearer | Send message |
| GET | `/v1/matches/{matchId}/profile` | Bearer | Match partner profile + Secure Reveal photo |
| POST | `/v1/me/photos/upload-url` | Bearer | Request presigned upload URL |
| GET | `/v1/ws` | Bearer | WebSocket (real-time chat) |
| GET | `/openapi.yaml` | No | OpenAPI spec |

## Security features

- **Authentication**: JWT Bearer tokens (HS256, 15min access, 7d refresh)
- **Authorization**: Centralized authz service; match participants verified on every match/chat request
- **Rate limiting**: Per-IP token bucket on auth (20 req/min) and discovery (60 req/min) endpoints
- **Error sanitization**: 5xx errors return generic messages; 4xx errors are scrubbed for SQL/internal patterns
- **Audit logging**: Structured JSON audit events on every request (request_id, actor_id, resource, status, duration)
- **Media security**: Signed CloudFront URLs with max 15-minute expiry; generated per-request, never cached
- **Discovery privacy**: Response struct is an allowlist (no photo URLs, no scores, no PII); runtime sanitizer as defense-in-depth
- **CORS / security headers**: Configurable origin allowlist + standard security headers
