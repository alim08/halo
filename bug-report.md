# Bug Report

## Run Metadata

- Repo Root: `/Users/jspags/Projects/halo`
- Run Timestamp (UTC): 2026-03-24T12:00:00Z

## Severity Criteria

| Severity | Definition |
| -------- | ---------- |
| Critical | Exploitable in production. Data loss, corruption, or unauthorized access likely. |
| High     | Significant defect in a core flow. Realistic exploitation or failure. |
| Medium   | Degrades quality, performance, or security posture. Not immediately exploitable. |
| Low      | Code quality or maintainability issue. No direct user or security impact. |

## Issue Summary

- Total Issues: 34
- Critical: 2
- High: 8
- Medium: 14
- Low: 10

## Findings

### Critical

#### [C-001] Audit middleware always logs "anonymous" -- context key type mismatch

- **Domain:** Architecture
- **File:** `backend/internal/observability/audit.go`
- **Line(s):** 128-135
- **Description:** `actorFromContext` defines its own `type authContextKey string` with value `"user_id"`, but the auth package defines a separate unexported type of the same shape in `backend/internal/auth/middleware.go:11`. Go context keys are compared by type+value -- since these are different named types in different packages, the lookup **always fails** and every authenticated request is logged as `"anonymous"`.
- **Evidence:** `type authContextKey string; const userIDKey authContextKey = "user_id"` in audit.go vs. separate `type authContextKey string` in auth/middleware.go.
- **Impact:** The entire audit trail is useless for security investigations. No request can be attributed to a user.
- **Suggested Next Step:** Use the existing exported `auth.UserIDFromContext(ctx)` function in `actorFromContext` instead of reimplementing context key extraction.

#### [C-002] Refresh tokens generated but never stored or validated

- **Domain:** Security
- **File:** `backend/internal/service/auth_service.go`
- **Line(s):** 86-88
- **Description:** `GenerateRefreshToken()` produces a random hex string returned to the client, but no storage (DB table, Redis) and no `/v1/auth/refresh` endpoint exist. Comment at `backend/internal/auth/jwt.go:56` says "The caller is responsible for storing the token server-side" but no caller does.
- **Evidence:** `refreshToken, err := s.jwt.GenerateRefreshToken()` -- token is returned in the login response but never persisted.
- **Impact:** Users are forced to re-login every 15 minutes when the access token expires. The refresh token in the response misleads clients into thinking refresh is supported.
- **Suggested Next Step:** Either implement refresh token storage (DB table) + `/v1/auth/refresh` endpoint, or remove refresh token from the auth response until implemented.

### High

#### [H-001] WebSocket token passed in query string -- credential leakage

- **Domain:** Security
- **File:** `frontend/src/lib/ws.ts`; `backend/internal/handler/ws_handler.go`
- **Line(s):** ws.ts:60; ws_handler.go:33-43
- **Description:** JWT access tokens are passed as URL query parameters for WebSocket connections. Query parameters are logged in web server access logs, proxy logs, and browser history.
- **Evidence:** `const url = \`${this.baseUrl}/v1/ws?token=${encodeURIComponent(this.token)}\``
- **Impact:** Full authentication credentials exposed in server logs and potentially via HTTP Referer headers.
- **Suggested Next Step:** Pass the token via the WebSocket subprotocol header or as the first message after connection upgrade.

#### [H-002] WebSocket origin validation disabled (InsecureSkipVerify)

- **Domain:** Security
- **File:** `backend/internal/handler/ws_handler.go`
- **Line(s):** 48
- **Description:** `InsecureSkipVerify: true` disables origin checking on WebSocket upgrade, allowing any website to open a WebSocket connection on behalf of an authenticated user.
- **Evidence:** `websocket.AcceptOptions{InsecureSkipVerify: true}`
- **Impact:** Cross-site WebSocket hijacking -- an attacker's page can connect to `/v1/ws` and receive all real-time messages for the victim.
- **Suggested Next Step:** Set `InsecureSkipVerify: false` and configure `OriginPatterns` from an environment variable.

#### [H-003] N+1 query in ListMatches handler

- **Domain:** Performance
- **File:** `backend/internal/handler/matches_handler.go`
- **Line(s):** 73-78
- **Description:** For each match, `h.userRepo.GetByID(r.Context(), partnerID)` is called individually, producing one DB query per match.
- **Evidence:** Loop calling `GetByID` inside the match list iteration.
- **Impact:** With 100 matches, this produces 101 queries. Latency scales linearly with match count.
- **Suggested Next Step:** Batch-fetch partner users with a single `WHERE id IN (...)` query.

#### [H-004] Duplicate WebSocket connections per chat page

- **Domain:** Performance
- **File:** `frontend/src/components/chat/useChat.ts`; `frontend/src/components/chat/useMatchProfile.ts`
- **Line(s):** useChat.ts:105-159; useMatchProfile.ts:51-83
- **Description:** `useChat` and `useMatchProfile` each independently create their own `HaloWS` instance. On the chat page, both are active, resulting in two simultaneous WebSocket connections per user.
- **Evidence:** Both hooks call `new HaloWS(...)` and `.connect()` independently.
- **Impact:** Doubles server WebSocket load and client resources per chat page visit.
- **Suggested Next Step:** Lift the WebSocket connection to a shared context provider or singleton.

#### [H-005] No token refresh logic in frontend

- **Domain:** Error Handling
- **File:** `frontend/src/lib/api.ts`
- **Line(s):** 77-84
- **Description:** The `refresh_token` is stored in localStorage but never used. On 401, the token is cleared and the user is silently logged out with no refresh attempt.
- **Evidence:** `localStorage.setItem(REFRESH_KEY, refreshToken)` -- stored but never read for refresh.
- **Impact:** Users are forced to re-login every 15 minutes (access token lifetime). Blocks tied to C-002.
- **Suggested Next Step:** Implement a token refresh interceptor in `request()` that catches 401s, calls the refresh endpoint, and retries.

#### [H-006] Matches cursor pagination uses inconsistent sort key

- **Domain:** Performance
- **File:** `backend/internal/repository/match_repository.go`
- **Line(s):** 82-83
- **Description:** Cursor filter uses `created_at` (`WHERE created_at < ...`) but sort order uses `COALESCE(last_message_at, created_at)`. The cursor and sort key mismatch causes matches to be skipped or duplicated during pagination.
- **Evidence:** `AND created_at < (SELECT created_at FROM matches WHERE id = $3)` vs `ORDER BY COALESCE(last_message_at, created_at) DESC`
- **Impact:** Users may see duplicate matches or miss matches when paginating through their list.
- **Suggested Next Step:** Base the cursor on the same sort key: `COALESCE(last_message_at, created_at)`.

#### [H-007] Handler directly depends on repository (layering violation)

- **Domain:** Architecture
- **File:** `backend/internal/handler/matches_handler.go`; `backend/internal/handler/match_profile_handler.go`; `backend/internal/handler/chat_handler.go`
- **Line(s):** matches_handler.go:19; match_profile_handler.go:19; chat_handler.go:12
- **Description:** Handlers directly import and use `repository.UserRepository` and check `repository.ErrMatchNotFound`, breaking the handler->service->repository layering contract.
- **Evidence:** `userRepo *repository.UserRepository` field in handler structs.
- **Impact:** Tight coupling between presentation and data layers; refactoring the repository requires changing handlers.
- **Suggested Next Step:** Move partner resolution into the service layer; wrap repository errors as service-layer errors.

#### [H-008] Zero automated tests in the entire repository

- **Domain:** Code Quality
- **File:** `backend/tests/contract/doc.go`; `backend/tests/integration/doc.go`
- **Line(s):** N/A (empty placeholder files)
- **Description:** No test files exist anywhere in the repository. The test directories contain only empty `doc.go` package declarations. No frontend test framework is configured.
- **Evidence:** Zero `*_test.go`, `*.test.*`, or `*.spec.*` files found. No jest/vitest/playwright in package.json.
- **Impact:** No automated regression protection. Any change can introduce bugs with zero detection.
- **Suggested Next Step:** See test-plan.md for prioritized test suite recommendations.

### Medium

#### [M-001] CORS hardcoded to localhost only

- **Domain:** Configuration
- **File:** `backend/internal/handler/middleware/security_headers.go`
- **Line(s):** 56-57
- **Description:** `AllowedOrigins: []string{"http://localhost:3000"}` is hardcoded. Production deployment will either break or prompt a hurried misconfiguration.
- **Evidence:** Hardcoded origin string with no environment variable override.
- **Impact:** Frontend will fail in any non-localhost environment.
- **Suggested Next Step:** Read allowed origins from `HALO_CORS_ORIGINS` environment variable.

#### [M-002] Docker Compose exposes DB/Redis on all interfaces with default credentials

- **Domain:** Configuration
- **File:** `docker-compose.yml`
- **Line(s):** 4-9, 15-16
- **Description:** PostgreSQL (`halo`/`halo`) and Redis (no auth) are bound to `0.0.0.0` on standard ports.
- **Evidence:** `POSTGRES_PASSWORD: halo`, `ports: - "5432:5432"`, `ports: - "6379:6379"`
- **Impact:** On any shared network, both services are accessible without meaningful authentication.
- **Suggested Next Step:** Bind to `127.0.0.1`, add `requirepass` to Redis, use env var references for credentials.

#### [M-003] Onboarding step advances before save completes

- **Domain:** Error Handling
- **File:** `frontend/src/components/onboarding/useOnboarding.ts`
- **Line(s):** 134-139
- **Description:** `nextStep` calls `saveProgress(partial)` (async, not awaited) and immediately calls `setStep(s + 1)`. If the save fails, the user sees the next step but data was not persisted.
- **Evidence:** Fire-and-forget `saveProgress` call before `setStep`.
- **Impact:** Users may lose onboarding progress silently.
- **Suggested Next Step:** `await saveProgress(partial)` and only advance on success.

#### [M-004] 3-second unconditional polling in useChat

- **Domain:** Performance
- **File:** `frontend/src/components/chat/useChat.ts`
- **Line(s):** 163-173
- **Description:** A `setInterval` polls `syncLatestMessages()` every 3 seconds even when the WebSocket is connected and delivering messages in real time.
- **Evidence:** `setInterval(syncLatestMessages, 3000)` with no WebSocket status check.
- **Impact:** ~20 unnecessary API requests/user/minute. Scales poorly with concurrent users.
- **Suggested Next Step:** Only poll as a fallback when WebSocket is disconnected, or increase interval to 30s+.

#### [M-005] No React error boundary

- **Domain:** Error Handling
- **File:** `frontend/app/layout.tsx`
- **Line(s):** N/A (missing)
- **Description:** No error boundary wraps the application. An unhandled render error crashes the entire app with a white screen.
- **Evidence:** No `error.tsx` file or `ErrorBoundary` component in the component tree.
- **Impact:** Any component exception takes down the entire UI.
- **Suggested Next Step:** Add a root-level `error.tsx` (Next.js convention) or React `ErrorBoundary`.

#### [M-006] Frontend middleware is dead code

- **Domain:** Code Quality
- **File:** `frontend/middleware.ts`
- **Line(s):** 46-54
- **Description:** The middleware checks for a `halo_session` cookie, but auth tokens are stored in localStorage. The `if (!hasSession)` branch falls through to `NextResponse.next()` regardless.
- **Evidence:** Both branches return `NextResponse.next()`.
- **Impact:** Provides false sense of server-side route protection. No actual effect on requests.
- **Suggested Next Step:** Either set a session cookie on login so the middleware can redirect, or remove the middleware.

#### [M-007] Discovery query fetches password_hash for all candidates

- **Domain:** Security
- **File:** `backend/internal/repository/discovery_repository.go`
- **Line(s):** 31-32
- **Description:** `SELECT u.id, u.email, u.password_hash, ...` fetches sensitive fields for every discovery candidate. While excluded from JSON serialization, they transit through application memory.
- **Evidence:** `password_hash` in the SELECT column list.
- **Impact:** Violates principle of least privilege. A logging mistake or future code change could leak hashes.
- **Suggested Next Step:** Remove `email` and `password_hash` from the discovery SELECT; create a dedicated scan struct.

#### [M-008] No message body length limit

- **Domain:** Security
- **File:** `backend/internal/handler/chat_handler.go`; `backend/migrations/0001_init.sql`
- **Line(s):** chat_handler.go:114-117; 0001_init.sql:70
- **Description:** Chat messages are validated only for non-emptiness. No maximum length check in handler, service, or database schema.
- **Evidence:** `if req.Body == ""` is the only validation. `body TEXT NOT NULL` with no CHECK constraint.
- **Impact:** Users can send arbitrarily large messages (up to 1MB body limit), causing storage bloat.
- **Suggested Next Step:** Add `CHECK (length(body) <= 5000)` in migration and validate max length in handler.

#### [M-009] Tokens stored in localStorage -- XSS exposure

- **Domain:** Security
- **File:** `frontend/src/lib/api.ts`
- **Line(s):** 77-84
- **Description:** Both access and refresh tokens are stored in `localStorage`, accessible to any JavaScript running on the page.
- **Evidence:** `localStorage.setItem(TOKEN_KEY, accessToken)`
- **Impact:** Any XSS vulnerability allows token theft via `localStorage.getItem()`.
- **Suggested Next Step:** Store tokens in httpOnly, Secure, SameSite=Strict cookies set by the backend.

#### [M-010] .env.example uses sslmode=disable for database

- **Domain:** Configuration
- **File:** `.env.example`
- **Line(s):** 1
- **Description:** `sslmode=disable` in the example connection string normalizes unencrypted database traffic.
- **Evidence:** `HALO_DATABASE_URL=postgres://halo:halo@localhost:5432/halo?sslmode=disable`
- **Impact:** If copied to production without modification, database traffic is unencrypted.
- **Suggested Next Step:** Add a comment warning to use `sslmode=require` or `sslmode=verify-full` in production.

#### [M-011] Discovery query uses ORDER BY RANDOM() -- full table scan

- **Domain:** Performance
- **File:** `backend/internal/repository/discovery_repository.go`
- **Line(s):** 47
- **Description:** `ORDER BY RANDOM()` forces PostgreSQL to scan and sort all matching rows.
- **Evidence:** `ORDER BY RANDOM()` in the discovery candidates query.
- **Impact:** Latency degrades significantly with 100K+ users.
- **Suggested Next Step:** Use `TABLESAMPLE`, random offset, or pre-computed ordering.

#### [M-012] SendMessage + IncrementMessageCount not in a transaction

- **Domain:** Error Handling
- **File:** `backend/internal/service/chat_service.go`
- **Line(s):** 71-78
- **Description:** Message insert and match counter increment are separate DB operations. If the increment fails, the counter drifts.
- **Evidence:** Sequential `SendMessage` then `IncrementMessageCount` calls with no transaction wrapper. Increment failure is logged and ignored.
- **Impact:** Connection level progression could be delayed or incorrect.
- **Suggested Next Step:** Wrap in a DB transaction or combine into a single SQL statement.

#### [M-013] React 18 paired with Next.js 15 -- version mismatch

- **Domain:** Dependencies
- **File:** `frontend/package.json`
- **Line(s):** N/A
- **Description:** Next.js 15.5+ expects React 19, but the project uses React 18.3. May cause compatibility warnings or subtle bugs.
- **Evidence:** `"next": "15.x"` with `"react": "^18.3"`
- **Impact:** Potential runtime incompatibilities as Next.js 15 features depend on React 19.
- **Suggested Next Step:** Upgrade to React 19 or pin Next.js to 14.x.

#### [M-014] user_photos allows multiple is_primary=TRUE per user

- **Domain:** Code Quality
- **File:** `backend/migrations/0001_init.sql`
- **Line(s):** 80-92
- **Description:** No unique partial index enforces at most one primary photo per user. `GetPrimaryByUser` uses `ORDER BY created_at DESC LIMIT 1` as a workaround.
- **Evidence:** Missing `CREATE UNIQUE INDEX ON user_photos (user_id) WHERE is_primary = TRUE`.
- **Impact:** Data integrity issue -- multiple primary photos per user possible.
- **Suggested Next Step:** Add a unique partial index on `(user_id) WHERE is_primary = TRUE`.

### Low

#### [L-001] In-memory rate limiter -- not distributed

- **Domain:** Configuration
- **File:** `backend/internal/handler/middleware/rate_limit.go`
- **Line(s):** 14-19
- **Description:** Rate limiter uses an in-memory map. Multiple API instances behind a load balancer each have independent buckets.
- **Evidence:** `type RateLimiter struct { clients map[string]*client ... }`
- **Impact:** Rate limits effectively multiplied by instance count.
- **Suggested Next Step:** Use Redis-based distributed rate limiting.

#### [L-002] Rate limiter cleanup goroutine has no shutdown mechanism

- **Domain:** Performance
- **File:** `backend/internal/handler/middleware/rate_limit.go`
- **Line(s):** 42, 98-112
- **Description:** `go rl.cleanup()` starts a goroutine with `time.NewTicker` in an infinite loop with no context or stop channel.
- **Evidence:** Infinite loop with no `ctx.Done()` or stop signal.
- **Impact:** Minor goroutine leak (2 goroutines). Problematic if rate limiters are created dynamically.
- **Suggested Next Step:** Accept a `context.Context` and select on `ctx.Done()`.

#### [L-003] Unused AuthorizationService

- **Domain:** Code Quality
- **File:** `backend/cmd/api/main.go`
- **Line(s):** 89
- **Description:** `authzService` is created but immediately discarded with `_ = authzService`.
- **Evidence:** `_ = authzService`
- **Impact:** Dead code.
- **Suggested Next Step:** Remove until needed or wire into handlers.

#### [L-004] Unused HealthCheck functions

- **Domain:** Code Quality
- **File:** `backend/internal/repository/db.go`; `backend/internal/repository/redis.go`
- **Line(s):** db.go:37; redis.go:30
- **Description:** `HealthCheckPostgres` and `HealthCheckRedis` are defined but never called. `/healthz` returns a static response.
- **Evidence:** No callers found in the codebase.
- **Impact:** Dead code; false sense of health monitoring.
- **Suggested Next Step:** Wire into the health check endpoint or remove.

#### [L-005] fmt.Printf used instead of structured logger

- **Domain:** Code Quality
- **File:** `backend/internal/service/chat_service.go`
- **Line(s):** 79, 86
- **Description:** `fmt.Printf("warning: ...")` bypasses the `slog` JSON logger used everywhere else.
- **Evidence:** `fmt.Printf("warning: increment message count failed: %v\n", err)`
- **Impact:** These warnings are invisible to log aggregation systems.
- **Suggested Next Step:** Replace with `slog.Warn(...)`.

#### [L-006] isDuplicateKeyError uses string matching instead of pgx error code

- **Domain:** Code Quality
- **File:** `backend/internal/repository/user_repository.go`
- **Line(s):** 123-138
- **Description:** Custom string-matching functions check for "23505" substring in error message text instead of using the typed `*pgconn.PgError` code field.
- **Evidence:** Custom `contains`/`searchString` functions.
- **Impact:** Fragile; could break if error wrapping changes message format.
- **Suggested Next Step:** Use `errors.As(err, &pgErr)` and check `pgErr.Code == "23505"`.

#### [L-007] truncate function corrupts multi-byte characters

- **Domain:** Code Quality
- **File:** `backend/internal/service/sparks_service.go`
- **Line(s):** 151-156
- **Description:** `s[:maxLen-1]` slices by byte index, which can split multi-byte UTF-8 characters (emoji, CJK).
- **Evidence:** Byte-based slicing: `s[:maxLen-1] + "..."`
- **Impact:** Corrupted text in spark prompts for non-ASCII content.
- **Suggested Next Step:** Use `[]rune(s)` for character-aware truncation.

#### [L-008] PubSub directly accesses Hub's unexported fields

- **Domain:** Architecture
- **File:** `backend/internal/ws/pubsub.go`
- **Line(s):** 82-86
- **Description:** PubSub directly accesses `hub.mu` and `hub.conns` private fields.
- **Evidence:** `ps.hub.mu.RLock()` and `ps.hub.conns[uid]`
- **Impact:** Tight coupling; changes to Hub internals break PubSub.
- **Suggested Next Step:** Add a `SendToUsers` method to Hub.

#### [L-009] Missing PWA icons referenced in manifest

- **Domain:** Configuration
- **File:** `frontend/public/manifest.json`
- **Line(s):** 11-20
- **Description:** Manifest references `/icons/icon-192.png` and `/icons/icon-512.png` but no such files exist.
- **Evidence:** Missing icon files.
- **Impact:** PWA install prompt will fail or show broken icons.
- **Suggested Next Step:** Add the referenced icon files or remove from manifest.

#### [L-010] generate-jwt-secret.sh uses macOS-only sed syntax

- **Domain:** Configuration
- **File:** `scripts/generate-jwt-secret.sh`
- **Line(s):** N/A
- **Description:** `sed -i ''` is macOS-specific and will fail on Linux.
- **Evidence:** macOS `sed -i ''` syntax.
- **Impact:** Script fails on Linux development environments.
- **Suggested Next Step:** Use `sed -i.bak` (portable) or detect OS.

## Positive Patterns (Preserve These)

1. **Parameterized queries everywhere** -- All SQL uses `$1, $2, ...` placeholders. Zero SQL injection risk.
2. **JWT algorithm pinning** -- `auth/jwt.go:68` verifies `t.Method.(*jwt.SigningMethodHMAC)`, preventing algorithm confusion attacks.
3. **Error message sanitization** -- `httputil/errors.go:69-88` strips SQL errors, stack traces, and internal paths from responses.
4. **Request body size limits** -- `httputil/json.go:22` caps bodies at 1MB via `MaxBytesReader`.
5. **Comprehensive security headers** -- HSTS, X-Frame-Options DENY, CSP, X-Content-Type-Options nosniff.
6. **bcrypt cost 12** -- Appropriate cost factor for password hashing.
7. **Discovery card allowlist pattern** -- `DiscoveryCard` struct prevents PII leakage via structural serialization control.
8. **Authorization checks at service layer** -- Match participant verification enforced in service, not just handler.
9. **Signed media URLs with 15-minute hard cap** -- Prevents long-lived media URL exposure.
10. **Graceful shutdown with timeouts** -- Read/Write/Idle timeouts and 15-second graceful shutdown configured.
11. **Structured JSON logging via slog** -- Consistent structured logging (except L-005).
12. **.gitignore correctly excludes `.env`** -- With `.env.example` whitelisted.

## Analysis Coverage

| Analysis Domain    | Status      | Files Reviewed | Notes |
| ------------------ | ----------- | -------------- | ----- |
| Code Quality       | ✅ Complete | 48             | All .go and .ts/.tsx source files |
| Security           | ✅ Complete | 48             | OWASP Top 10 + secrets scan + Go-specific |
| Performance        | ✅ Complete | 48             | Query patterns, WebSocket, polling |
| Error Handling     | ✅ Complete | 48             | All I/O paths reviewed |
| Architecture       | ✅ Complete | 48             | Module mapping, layering, coupling |
| Dependencies       | ✅ Complete | 4              | package.json, go.mod, lock files |
| License Compliance | ✅ Complete | 4              | All deps use permissive licenses (MIT, BSD, Apache 2.0) |
| Configuration      | ✅ Complete | 12             | docker-compose, .env, scripts, manifests |
| Documentation      | ✅ Complete | 6              | README files, quickstart, OpenAPI spec |
