# Halo

Halo is a monorepo for a values-first dating app MVP.

- Backend: Go API (chi, PostgreSQL, Redis, WebSockets)
- Frontend: Next.js App Router + TypeScript + Tailwind
- Infra: Lambda skeleton for Secure Reveal image variants

## Monorepo Structure

- [backend](backend)
- [frontend](frontend)
- [infra/lambda/secure-reveal](infra/lambda/secure-reveal)
- [specs/001-halo-functional-spec](specs/001-halo-functional-spec)
- [scripts](scripts)

## Prerequisites

Install these first:

1. Docker Desktop (for PostgreSQL and Redis)
2. Go 1.22+
3. Node.js 20+
4. npm
5. OpenSSL (usually preinstalled on macOS)

## Local Startup (End-to-End)

Run from repo root: [README.md](README.md)

### 1) Start local services (Postgres + Redis)

Have Dokcer Desktop running in background.

```bash
docker compose up -d
docker compose ps
```

Expected containers:

- postgres on 5432
- redis on 6379

### 2) Prepare environment variables

Copy env template if needed:

```bash
cp .env.example .env
```

Generate a secure JWT signing key into .env:

```bash
./scripts/generate-jwt-secret.sh
```

Required keys in [.env](.env):

- HALO_DATABASE_URL
- HALO_REDIS_URL
- HALO_JWT_SIGNING_KEY
- HALO_PORT

### 3) Apply database migrations

```bash
docker compose exec -T postgres psql -U halo -d halo < backend/migrations/0001_init.sql
docker compose exec -T postgres psql -U halo -d halo < backend/migrations/0002_discovery_indexes.sql
```

Optional verification:

```bash
docker compose exec postgres psql -U halo -d halo -c "\\dt"
```

### 4) Start backend API

Recommended (auto-loads .env):

```bash
./scripts/start-backend.sh
```

Expected logs include:

- postgres connected
- redis connected
- halo-api listening on port 8080

### 5) Start frontend

In a second terminal:

```bash
cd frontend
npm install
npm run dev
```

Open:

- http://localhost:3000

### 6) Basic smoke test

1. Open homepage and click Create account or Log in.
2. Register/login and continue onboarding.
3. Reach discovery.

## Helper Scripts

- [scripts/generate-jwt-secret.sh](scripts/generate-jwt-secret.sh)
  - Creates and stores a strong HALO_JWT_SIGNING_KEY in .env
- [scripts/start-backend.sh](scripts/start-backend.sh)
  - Loads .env and runs the backend API

## Troubleshooting

### Port 8080 already in use

Symptom:

- bind: address already in use

Fix:

```bash
lsof -nP -iTCP:8080 -sTCP:LISTEN
kill <PID>
```

Then restart backend.

### Next.js runtime chunk error (example: Cannot find module ./778.js)

Cause:

- stale .next artifacts after dependency/version changes

Fix:

```bash
cd frontend
pkill -f "next dev" || true
rm -rf .next
npm install
npm run dev
```

### Env var missing errors

If running backend manually with go run, load env first:

```bash
set -a
source .env
set +a
cd backend
go run ./cmd/api
```

## Cloud Dependencies: Next Steps for Production

Local development works without AWS media infrastructure, but full Secure Reveal in production needs the following.

### 1) AWS S3 bucket for originals + variants

Purpose:

- store uploaded original photos
- store generated variant images

Target key format:

- originals: photos/{userID}/originals/{photoID}.{ext}
- variants: photos/{userID}/variants/{photoID}_{variant}.webp

Actions:

1. Create bucket with block-public-access enabled.
2. Add lifecycle and encryption policies.
3. Configure IAM permissions for API signer and Lambda.

### 2) CloudFront distribution for media delivery

Purpose:

- serve private media via signed URLs

Actions:

1. Create distribution with S3 as origin.
2. Enable trusted key groups or key pair signing model.
3. Store signer private key securely (do not commit in repo).

Environment keys:

- HALO_CLOUDFRONT_DOMAIN
- HALO_MEDIA_SIGNER_KEY_ID
- HALO_MEDIA_SIGNER_PRIVATE_KEY_PEM
- HALO_MEDIA_URL_EXPIRY

### 3) Lambda for variant generation

Code scaffold:

- [infra/lambda/secure-reveal/main.go](infra/lambda/secure-reveal/main.go)
- [infra/lambda/secure-reveal/README.md](infra/lambda/secure-reveal/README.md)

Actions:

1. Build and deploy Lambda.
2. Trigger on S3 ObjectCreated for originals path.
3. Generate blur_heavy, blur_med, blur_light, clear variants.
4. Update user_photos row to processing_status=ready and set variant keys.

### 4) Secrets and config management

Move sensitive values out of plain env files in production:

1. Store secrets in AWS Secrets Manager or SSM Parameter Store.
2. Inject secrets into runtime environment (ECS/EKS/EC2/Lambda).
3. Rotate JWT signing key and CloudFront signing key on a schedule.

### 5) Production networking and security

Recommended:

1. API behind HTTPS reverse proxy/load balancer.
2. Strict CORS allowlist for frontend domain.
3. WAF/rate limits at edge + app layer.
4. Monitoring/alerts on 5xx, latency, and auth failures.

### 6) CI/CD and release flow

Recommended pipeline:

1. Backend build and tests
2. Frontend build and tests
3. Security audit checks
4. Migration apply step (with rollback strategy)
5. Deploy backend, frontend, and Lambda

## Additional References

- Backend setup and API details: [backend/README.md](backend/README.md)
- Frontend quick note: [frontend/README.md](frontend/README.md)
- Functional quickstart checklist: [specs/001-halo-functional-spec/quickstart.md](specs/001-halo-functional-spec/quickstart.md)
- OpenAPI contract: [specs/001-halo-functional-spec/contracts/openapi.yaml](specs/001-halo-functional-spec/contracts/openapi.yaml)
