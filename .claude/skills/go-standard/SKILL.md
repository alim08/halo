---
name: go-standard
description: >-
  Go coding standards for the halo repo. Codifies the halo/backend module
  layout, the chi + pgx + go-redis + slog + JWT stack, the httputil error
  envelope and sanitization contract, the auth/request-ID context plumbing,
  the hand-written-SQL repository pattern, sentinel-error conventions, and
  stdlib-only test style. Load whenever editing Go code under
  /Users/jspags/Projects/halo/backend/.
---

# Halo Go Standards

## 0. Scope

This skill documents the Go conventions for `halo/backend`. It
encodes how this repo actually does things and the patterns that new
code must match.

When generic Go advice and this file disagree, **this file wins** —
it's describing a real, shipped codebase.

---

## 1. Module Facts

| Fact                | Value                                                  |
| ------------------- | ------------------------------------------------------ |
| Module path         | `halo/backend`                                         |
| Go version          | `1.24.0` (toolchain `go1.24.5`)                        |
| Backend root        | `/Users/jspags/Projects/halo/backend/`                 |
| Entrypoint          | `backend/cmd/api/main.go`                              |
| Migrations          | Raw SQL files in `backend/migrations/` (numbered)      |
| Local dev deps      | `docker compose up -d` (Postgres 16, Redis 7)          |
| Env prefix          | `HALO_*` (e.g., `HALO_DATABASE_URL`, `HALO_PORT`)      |

**Top-level layout:**

```
backend/
├── cmd/api/main.go              # single entrypoint; run() helper
├── internal/
│   ├── auth/                    # JWT, password hashing, auth middleware
│   ├── config/                  # env loader → Config struct
│   ├── handler/                 # chi handlers, one file per feature
│   │   ├── middleware/          # request_id, security_headers, rate_limit
│   │   └── httputil/            # error envelope + JSON helpers
│   ├── media/                   # CloudFront signing
│   ├── model/                   # domain types (User, Match, Message, Photo)
│   ├── observability/           # audit logger
│   ├── repository/              # pgx queries + redis client
│   ├── service/                 # business logic
│   └── ws/                      # WebSocket hub + pubsub
├── migrations/                  # 0001_*.sql, 0002_*.sql, ...
└── tests/
    ├── contract/                # OpenAPI contract tests
    └── integration/             # integration suites (require DB/Redis)
```

**Layered dependency direction (load-bearing):**

```
cmd/api ──► handler ──► service ──► repository ──► (DB / Redis)
                  │                       │
                  └── auth ──┐            └── model
                  └── ws    ─┴── observability
```

- `model` has no upward dependencies.
- `repository` imports `model`. **Never** imports `handler` or `service`.
- `service` imports `repository` and `model`. **Never** imports
  `handler` or `*http.Request`.
- `handler` imports `service`, `auth`, `httputil`, `middleware`. It is
  the only layer that touches `*http.Request` / `http.ResponseWriter`.

When introducing a new file, place it in the layer matching its
responsibility. **Do not import upward.**

---

## 2. Library Stack (Pinned)

Use these libraries; do not introduce alternatives without a tracked
discussion. Versions live in `backend/go.mod`.

| Concern        | Library                          | Notes                                           |
| -------------- | -------------------------------- | ----------------------------------------------- |
| HTTP router    | `github.com/go-chi/chi/v5`       | Single `handler.NewRouter(Deps)` entrypoint     |
| Postgres       | `github.com/jackc/pgx/v5`        | `pgxpool.Pool` injected; **no ORM**, hand-written SQL |
| Redis          | `github.com/redis/go-redis/v9`   | Cache + WS pubsub                               |
| WebSocket      | `nhooyr.io/websocket`            | Used by `internal/ws` and `handler/ws_handler.go` |
| JWT            | `github.com/golang-jwt/jwt/v5`   | Wrapped by `auth.JWTService`                    |
| Password hash  | `golang.org/x/crypto/bcrypt`     | Via `auth.HashPassword` / `auth.VerifyPassword` |
| UUID           | `github.com/google/uuid`         | Request IDs, primary keys                       |
| Logger         | `log/slog` (stdlib)              | JSON handler set as default in `main.run()`     |
| Concurrency    | `golang.org/x/sync` if needed    | No `errgroup` use yet — add explicitly when needed |

**Forbidden in new code without justification:**

- `testify`, `go-cmp`, `gomock` — current tests are **stdlib only**.
  If you genuinely need richer assertions, write a `_test.go` helper
  with `t.Helper()` first; only reach for testify if the helper would
  be substantial.
- ORMs: `gorm`, `ent`, `sqlx`. Hand-written pgx is the convention.
- `sqlc` — not yet wired in. If you add it, do so as a separate change
  with the migration path mapped out.
- Non-stdlib loggers (`zap`, `zerolog`, `logrus`).
- Any HTTP router other than chi.

---

## 3. Tooling and Pre-Commit (Aspirational)

The repo currently has **no** `.golangci.yml`, Makefile, pre-commit
config, or CI workflow. Treat the commands below as the gate **you
must pass locally** before declaring work done. If you add automation
for these, do it in a separate PR — don't bundle linter introduction
with feature work.

```bash
# from backend/
gofumpt -l -w .
goimports -l -w -local halo/backend .
go vet ./...
golangci-lint run ./...        # only if a config has been added
go test -race -covermode=atomic -coverprofile=cov.out ./...
govulncheck ./...
```

**Run-the-server commands (how the app starts in this repo):**

```bash
docker compose up -d                         # Postgres + Redis
./scripts/start-backend.sh                   # sources .env, go run ./cmd/api
goose -dir backend/migrations postgres "$HALO_DATABASE_URL" up   # manual
```

**Important caveats:**

- There is **no Dockerfile** for the backend. Don't claim
  containerized work works unless you've added one as part of the
  change.
- Migrations are **raw SQL files**, applied with `goose` from the host
  shell. There is no migration version table written by the
  application. Do not add automatic migration-on-startup logic without
  explicit approval.

---

## 4. Style

Standard Go style applies. The clarifications below are the ones that
matter for this repo:

### 4.1 Receivers

Single-letter receivers, applied uniformly **across the entire repo**:

| Type                                      | Receiver |
| ----------------------------------------- | -------- |
| `*FooHandler`                             | `h`      |
| `*FooService`                             | `s`      |
| `*FooRepository`                          | `r`      |
| `*JWTService`                             | `s`      |
| `*Hub`, `*PubSub`, `*Conn` (in `ws`)      | `h`, `p`, `c` |

Match what neighboring methods on the same type already use. Do not
introduce two-letter receivers.

### 4.2 File Naming

- One feature per file: `auth_handler.go`, `chat_service.go`,
  `user_repository.go`. Don't merge unrelated features into a single
  file just because they touch the same package.
- Tests sit next to the file they test, in the same package
  (`auth_handler.go` ↔ `auth_handler_test.go`). **No `_test` package
  for unit tests** in this repo today — keep that consistency unless
  you're explicitly converting to black-box tests.
- Each `internal/` package has a `doc.go` with the package comment.
  When you create a new package, create `doc.go` first.

### 4.3 Error Variables

Sentinel errors are package-level, named with the `Err` prefix, and
**grouped at the bottom of the file** that owns the operation that
returns them. Don't scatter them across files.

```go
// at the bottom of internal/repository/user_repository.go
var (
    ErrUserNotFound = errors.New("user not found")
    ErrEmailTaken   = errors.New("email already registered")
)
```

Service-layer sentinels live in the service file that returns them
(e.g. `service.ErrEmailTaken` in `service/auth_service.go`).
Handlers map them to HTTP responses with `errors.Is`.

### 4.4 Error Wrapping Prefixes

Wrap with a short, lowercase, **operation-style** prefix. Match the
existing repo voice:

```go
// ✅ matches the repo
return nil, fmt.Errorf("create user: %w", err)
return nil, fmt.Errorf("get user by email: %w", err)
return nil, fmt.Errorf("ping postgres: %w", err)

// ❌ — uppercased, "failed to" boilerplate, ends in punctuation
return nil, fmt.Errorf("Failed to create user: %w.", err)
```

### 4.5 No `init()`, No Globals

The repo has zero `func init()` functions and zero mutable
package-level state. Wiring lives in `cmd/api/main.go`'s `run()`
function:

```go
func main() {
    if err := run(); err != nil {
        fmt.Fprintf(os.Stderr, "error: %v\n", err)
        os.Exit(1)
    }
}

func run() error {
    ctx, cancel := context.WithCancel(context.Background())
    defer cancel()
    // ... load config, open pgxpool, build handlers, mount router ...
    return nil
}
```

When you add a new dependency, plumb it through `run()` and into the
relevant handler/service/repo constructor. **Do not** add a global, a
package-level singleton, or an `init()` function.

---

## 5. HTTP Layer Rules

### 5.1 Routing

All routes are mounted in `internal/handler/router.go` via
`NewRouter(deps Deps)`. When you add an endpoint:

1. Add the handler method (`*FooHandler.Bar`) in the relevant
   `*_handler.go` file.
2. Wire the handler into `Deps` (`handler/router.go`'s `Deps` struct).
3. Construct it in `cmd/api/main.go`'s `run()` and pass it through
   `handler.Deps{...}`.
4. Mount the route inside `NewRouter` in the **right `r.Group`** —
   public, rate-limited auth, or authenticated.

The middleware stack order (router.go) is load-bearing:
`Recoverer → RealIP → RequestID → SecurityHeaders → Audit`. Do not
reorder these without a written reason.

### 5.2 Request Decoding

**Always** decode JSON via `httputil.DecodeJSON`:

```go
import "halo/backend/internal/handler/httputil"

var req registerRequest
if err := httputil.DecodeJSON(r, &req); err != nil {
    httputil.BadRequest(w, err.Error())
    return
}
```

`DecodeJSON` already enforces a 1 MB body limit and
`DisallowUnknownFields`. **Never** call `json.NewDecoder` directly in
a handler.

### 5.3 Error Responses (Non-Negotiable)

Every error response goes through `httputil`, never raw
`http.Error` and never raw `json.Encode` of a custom error shape.
Use the helpers:

```go
httputil.BadRequest(w, message)
httputil.Unauthorized(w, message)
httputil.Forbidden(w, message)
httputil.NotFound(w, message)
httputil.Conflict(w, message)
httputil.TooManyRequests(w, message)
httputil.InternalError(w)            // no message — always sanitized
```

Why: `httputil.WriteError` runs every message through
`SanitizeErrorMessage`, which:

- Returns `"an internal error occurred"` for any 5xx.
- Strips messages containing SQL/driver artifacts, file paths, panic
  traces, secret keywords, etc., and replaces them with a generic
  4xx string.

**Anti-pattern — refuse to emit:**

```go
// ❌ leaks internals
http.Error(w, err.Error(), http.StatusInternalServerError)

// ❌ leaks internals via custom shape
json.NewEncoder(w).Encode(map[string]string{"error": err.Error()})
```

When mapping a service-layer sentinel to HTTP, use `errors.Is`:

```go
result, err := h.authService.Register(r.Context(), req.Email, req.Password)
if err != nil {
    if errors.Is(err, service.ErrEmailTaken) {
        httputil.Conflict(w, "email already registered")
        return
    }
    httputil.InternalError(w)
    return
}
```

The 5xx fallback should be `InternalError(w)` — not
`BadRequest(w, err.Error())`. The latter leaks internals through the
sanitizer's escape hatch when the message happens not to match an
unsafe pattern.

### 5.4 Response Encoding

```go
httputil.EncodeJSON(w, http.StatusCreated, result)
```

Never `json.NewEncoder(w).Encode(...)` directly in a handler. Status
codes go through the helper so future changes (envelope shape,
content-type) are centralized.

### 5.5 Context Plumbing

Two values cross every authenticated request boundary, and both are
extracted via package-level helpers — **never** read the raw context
key:

| Value         | Set by                                         | Read by                                  |
| ------------- | ---------------------------------------------- | ---------------------------------------- |
| User ID       | `auth.Middleware` (in `internal/auth/middleware.go`) | `auth.UserIDFromContext(ctx)`     |
| Request ID    | `middleware.RequestID` (in `handler/middleware/request_id.go`) | `middleware.GetRequestID(ctx)` |

```go
import (
    "halo/backend/internal/auth"
    "halo/backend/internal/handler/middleware"
)

func (h *MeHandler) GetMe(w http.ResponseWriter, r *http.Request) {
    userID := auth.UserIDFromContext(r.Context())
    if userID == "" {
        httputil.Unauthorized(w, "missing authorization")
        return
    }
    // ...
}
```

The context key types (`authContextKey`, `contextKey`) are unexported
and intentionally not equal across packages. Do **not** add a new
context value without a named, unexported key type and an exported
getter. Document it in the same file.

### 5.6 Auth WebSocket Caveat

`auth.Middleware` allows the auth token to come from the
`?token=` query parameter **only on `/v1/ws`** (browser WS clients
can't set custom Authorization headers). When you add WebSocket
endpoints, mount them under that path or extend the allow-list inside
`auth.Middleware` — don't replicate the query-param shortcut elsewhere.

---

## 6. Repository Layer Rules

### 6.1 Hand-Written SQL via pgx

Every repository takes a `*pgxpool.Pool` and exposes methods that
accept `ctx context.Context` first:

```go
type UserRepository struct {
    pool *pgxpool.Pool
}

func NewUserRepository(pool *pgxpool.Pool) *UserRepository {
    return &UserRepository{pool: pool}
}

func (r *UserRepository) Create(ctx context.Context, email, hash string) (*model.User, error) {
    u := &model.User{}
    err := r.pool.QueryRow(ctx,
        `INSERT INTO users (...)
         VALUES (...)
         RETURNING ...`,
        email, hash,
    ).Scan(&u.ID, &u.Email /* ... */)
    if err != nil {
        if isDuplicateKeyError(err) {
            return nil, ErrEmailTaken
        }
        return nil, fmt.Errorf("create user: %w", err)
    }
    return u, nil
}
```

Rules:

- **Always** pass `ctx` as the first argument to every pgx call.
- Use `RETURNING` clauses to populate the model in a single round-trip
  rather than `SELECT` after `INSERT`/`UPDATE`.
- Map known driver errors to package sentinels at the boundary:
  - `errors.Is(err, pgx.ErrNoRows)` → return the package's
    `ErrXxxNotFound`.
  - PG SQLSTATE `23505` (unique violation) → return `ErrXxxTaken` /
    similar; existing helper is `isDuplicateKeyError(err)` in
    `internal/repository/user_repository.go`. Reuse or move it to a
    shared `pgerrors.go` if used in 2+ places.
- Wrap everything else with `fmt.Errorf("operation: %w", err)`.

### 6.2 No Ad-Hoc Transactions Yet

The repo has no transaction abstraction today. Multi-statement
operations are rare. If you need one:

1. Add a `WithTx(ctx, fn func(tx pgx.Tx) error) error` helper on the
   repository that owns the dominant table.
2. Pass `pgx.Tx` (which satisfies the same `Query`/`QueryRow`/`Exec`
   surface as `*pgxpool.Pool`) explicitly into helper methods rather
   than building a parallel "Tx-aware" repo type.

Don't add a global "DB" type that wraps both `*pgxpool.Pool` and
`pgx.Tx` until you have at least 2 real callers.

### 6.3 No Business Logic in Repositories

A repository method does **one** SQL operation (or a tightly-scoped
set of related ones — read-then-conditional-update inside a tx).
Decision logic, validation, and orchestration belong in `service/`.

---

## 7. Service Layer Rules

- A service constructor takes its repository(ies) and any other
  collaborators (JWT, hub, signer) — **never** `*pgxpool.Pool`,
  `*http.Request`, or `*chi.Mux`.
- Methods take `ctx context.Context` first.
- Validation errors return service-level sentinels
  (`service.ErrInvalidCredentials`, etc.) so the handler can map them
  with `errors.Is`. The sentinel lives in the same file as the method.
- When wrapping a repository error, do not lose the wrap — **don't**
  do `return errors.New("create user failed")`. Do
  `return fmt.Errorf("register: %w", err)` so the chain stays inspect-
  able.

---

## 8. Logging

- `log/slog` only. JSON handler is set as default in `main.run()`.
- Use **`slog.LogAttrs`** with typed `slog.String/Int/Time` attrs in
  hot paths and audit/observability code (matches what
  `observability/audit.go` does today). Use the simpler key-value
  `slog.InfoContext(ctx, "msg", "k", v)` form for ad-hoc logs.
- **Always pass `ctx`** to `slog.LogAttrs` / `slog.InfoContext` so the
  request ID and any future correlation values can be attached.
- Audit-worthy actions (auth events, profile changes, match decisions,
  message send/redact) call `observability.LogAuditEvent`. Wire the
  call at the **service** layer or in dedicated audit middleware —
  not inside the handler body — so HTTP refactors don't drop audits.
- **Never log secrets, JWTs, or password hashes.** The error
  sanitizer in `httputil` is for client output; logs are a separate
  surface and you are responsible for them.
- **Never `fmt.Println` / `log.Print*`.** They bypass the JSON
  handler and produce unstructured noise.

---

## 9. Concurrency

### 9.1 Background Goroutines from `main.run()`

Today, exactly one background goroutine is spawned from `run()`:

```go
wsPubSub := ws.NewPubSub(redisClient, wsHub)
go wsPubSub.Subscribe(ctx)
```

It exits when `ctx` is canceled by signal handling. **Every new
background goroutine spawned from `run()` must follow the same
contract:**

1. Take `ctx context.Context` as a parameter.
2. Block on `<-ctx.Done()` somewhere in its select loop.
3. Be spawned **after** signal handling sets up `ctx`, **before** the
   server starts.
4. Be added to a documented shutdown order if the order matters
   (e.g., drain WS pubsub before closing the redis client).

If you spawn more than one or two such goroutines, switch to
`golang.org/x/sync/errgroup` so that a panic or error in one tears
the rest down. Until then, plain `go` + ctx cancellation is fine.

### 9.2 The WebSocket Hub

`internal/ws/hub.go` uses `sync.RWMutex` to guard the
`map[userID]map[*Conn]struct{}` store:

- All map mutations take `h.mu.Lock()` / `defer h.mu.Unlock()` on the
  same line.
- Reads use `h.mu.RLock()` / `defer h.mu.RUnlock()`.
- Do **not** add per-connection goroutines that write back into the
  hub without going through the locked methods.

### 9.3 Race Detector

Run `go test -race ./...` for any change to `internal/ws/`,
`internal/repository/` (transaction additions), or anything new
that spawns a goroutine. The race-detector requirement applies even
when no race is suspected.

---

## 10. Testing (Halo Conventions)

The repo's testing style is intentionally minimal. Stay there until
the team explicitly chooses otherwise.

### 10.1 Style

- **Same-package** tests (`package handler`, not `package handler_test`).
- **stdlib only** for assertions: `t.Errorf`, `t.Fatalf`, direct
  comparisons. No `testify`, no `go-cmp`, no `gomock`, no testify
  suite.
- **Table-driven** with `t.Run(tc.name, ...)`:

```go
func TestLocationHandlerBadRequestErrorsAreJSON(t *testing.T) {
    handler := NewLocationHandler()
    tests := []struct {
        name        string
        requestPath string
        handle      func(http.ResponseWriter, *http.Request)
        wantMessage string
    }{
        {
            name:        "missing search query",
            requestPath: "/v1/locations/search",
            handle:      handler.SearchLocations,
            wantMessage: "Query parameter 'q' is required",
        },
    }
    for _, tc := range tests {
        t.Run(tc.name, func(t *testing.T) {
            req := httptest.NewRequest(http.MethodGet, tc.requestPath, nil)
            rec := httptest.NewRecorder()
            tc.handle(rec, req)
            if rec.Code != http.StatusBadRequest {
                t.Fatalf("status = %d, want %d", rec.Code, http.StatusBadRequest)
            }
            // ...
        })
    }
}
```

### 10.2 HTTP Handler Tests

- `httptest.NewRequest` + `httptest.NewRecorder`. Don't spin up a real
  server unless the test exercises chi middleware order or graceful
  shutdown.
- Inject the handler's dependencies as fakes — hand-written struct
  types implementing the same method set, defined in the test file.
- When you need an authenticated request, build the context manually:

```go
ctx := context.WithValue(req.Context(), /* auth context key — call the helper */)
req = req.WithContext(ctx)
```

  Today there is no public test helper to set the user-ID context
  value. If you need one repeatedly, add one to `internal/auth/`
  guarded by a `// for tests only` comment, exported from a
  `_test_helpers.go` file in the `auth` package.

### 10.3 Integration / Contract Tests

- Live in `backend/tests/integration/` and `backend/tests/contract/`.
- Today these are mostly stubs (`doc.go`). When you fill them in:
  - Gate with a build tag: `//go:build integration` at the top of the
    file, run via `go test -tags=integration ./backend/tests/...`.
  - Use `httptest.NewServer(handler.NewRouter(deps))` for HTTP
    integration tests.
  - For DB integration tests, **do not** assume a Postgres is
    available. Either skip when `HALO_DATABASE_URL` is unset
    (`t.Skip`) or use `testcontainers-go` (introduce as a separate
    PR).
- Don't put integration tests next to the source files — the absence
  of build tags means they'd run on every `go test ./...`.

### 10.4 Helpers and Cleanup

- Mark every assertion helper with `t.Helper()`.
- Use `t.Cleanup(...)` for fixture teardown — never bare `defer` in
  setup helpers, since cleanup must run after subtests.
- `t.TempDir()` for any filesystem fixtures.
- `t.Setenv` is acceptable; it is **incompatible with `t.Parallel()`**
  in the same test, so don't combine them.

### 10.5 What NOT to Test Through HTTP

Service-layer logic gets a service-level test, not a handler test.
Repository SQL gets an integration test against a real Postgres
(when those are wired up), not a unit test. Don't compose three
layers of fakes to "unit test the handler" when the value of the
test is exercising the SQL.

---

## 11. Migrations

- Files: `backend/migrations/NNNN_<description>.sql`. Increment `NNNN`
  monotonically; never edit a merged migration.
- One logical schema change per file. Splitting indexes from table
  creation (as `0001_init.sql` and `0002_discovery_indexes.sql`
  already do) is fine — split when an index needs to come after data
  is loaded, or when a future revert needs to be granular.
- The repo has **no embedded migration runner**. Migrations are run
  manually via `goose` from the host. Don't add automatic-on-startup
  migration logic without a written approval and a rollout plan.

---

## 12. Anti-Patterns

Refuse to emit any of the following in this repo:

1. **Bypassing `httputil`** for error or JSON responses. Always go
   through `httputil.{BadRequest,Conflict,...}` and
   `httputil.EncodeJSON`.
2. **Reading raw context keys.** Always use
   `auth.UserIDFromContext(ctx)` / `middleware.GetRequestID(ctx)`.
3. **`http.Error(w, err.Error(), 500)`** or any pattern that pipes a
   raw `error.Error()` into a 5xx response — `SanitizeErrorMessage`
   exists precisely to prevent this.
4. **Adding a new package-level mutable global** anywhere under
   `internal/`. The repo is at zero today; keep it there.
5. **Adding `func init()`** without an explicit comment justifying it
   and consensus that `run()` cannot host the same logic.
6. **`logrus`/`zap`/`zerolog`** imports. Use `log/slog`.
7. **`gorm`/`ent`/`sqlc`/`sqlx`** imports. Use hand-written pgx.
8. **Swallowed pgx errors** that don't go through the
   `errors.Is(err, pgx.ErrNoRows)` / `isDuplicateKeyError(err)` →
   sentinel mapping pattern.
9. **`time.Sleep` in tests.** Use channels, `t.Context()` (Go 1.24+),
   or fakes that control time.
10. **Logging the request body, JWTs, password hashes, or refresh
    tokens.** Even at debug level. Even "temporarily."

---

## 13. Pre-Commit Checklist

Every Go change to `halo/backend` must verify:

- [ ] New / changed handlers route ALL error responses through
      `httputil` and ALL JSON responses through `httputil.EncodeJSON`.
- [ ] Request body decoding uses `httputil.DecodeJSON`.
- [ ] Auth-required handlers read user ID via
      `auth.UserIDFromContext` (never raw context keys).
- [ ] New repository methods take `ctx` first, return `*Model, error`,
      and map `pgx.ErrNoRows` / `23505` to package sentinels.
- [ ] New service errors that handlers must distinguish are exported
      sentinels (`Err*`) at the bottom of the service file.
- [ ] No new `init()`, no new package-level mutable globals.
- [ ] No new logger imports — `log/slog` only.
- [ ] New goroutines spawned from `main.run()` honor `ctx.Done()`.
- [ ] Tests are same-package, stdlib-only, table-driven.
- [ ] Integration tests have a `//go:build integration` tag.
- [ ] `go test -race ./...` passes.
- [ ] If linter / formatter configs exist, they pass:
      `gofumpt -l . == ∅`, `goimports -l -local halo/backend . == ∅`,
      `go vet ./...`, `golangci-lint run ./...`.
- [ ] Migrations are net-new files with the next `NNNN` number;
      no edits to merged migrations.
- [ ] No new env vars introduced without an entry in `.env.example`
      and a default in `internal/config/config.go`.

---

## 14. Testing Handoff

When implementation work is complete, generate a **Testing Handoff
Prompt** for a separate testing agent. The testing agent has no prior
context — the handoff must be fully self-contained. Output this block
verbatim at the end of your final implementation message, filling in
every section:

```
---BEGIN TESTING HANDOFF---

## What Changed
- [Every file modified or created, one line each]
- [Every public function added or changed, with full signature]

## Why It Changed
- [The ticket, user request, or requirement that drove this change]
- [The business behavior now enabled or preserved]

## Behavioral Contract
- [For each changed function: what it MUST do, stated as inputs → outputs]
- [Invariants that must hold for any valid input]
- [Every error condition and what the caller should receive]

## Risk Areas
- [Edge cases the implementation considered but may have missed]
- [Integration points: external APIs, DB, filesystem, queues]
- [Concurrency or shared-state concerns]
- [Functions with cyclomatic complexity > 15 — these need deeper tests]

## Suggested Test Types
- [Stdlib table-driven test cases per behavior, with concrete inputs
  and expected outputs]
- [httptest-based handler tests if HTTP is involved]
- [Integration tests gated with //go:build integration if DB/Redis
  is involved]
- [Fuzz tests for any new parser, decoder, or validator]

## Halo-Specific Signals (must be filled in for any change in this repo)
- **HTTP envelope verification:** for every handler change, list which
  `httputil` helper(s) the new code calls and the status codes used.
  The testing agent must assert response shape
  `{error: {code, message, request_id}}` and that `request_id` is
  non-empty when the request had `X-Request-ID`.
- **Sanitization assertions:** for every new 5xx path, the testing
  agent must assert the response body never contains the raw
  `err.Error()` and matches `"an internal error occurred"`.
- **Sentinel-error mapping:** for each service sentinel introduced or
  consumed, list `(sentinel → expected HTTP status → expected
  response code string)`. Example:
  `(service.ErrEmailTaken → 409 → "conflict")`. The testing agent
  writes a table-driven test asserting each row.
- **Auth context cases:** for each authenticated handler, cover
  (a) missing Authorization header, (b) malformed header, (c) expired
  or invalid token, (d) valid token with the user ID visible to the
  handler via `auth.UserIDFromContext`.
- **Request-ID propagation:** if the handler emits structured logs or
  audit events, assert the request ID from the response
  `X-Request-ID` header appears in the log/audit record.
- **pgx error paths:** for every repository method, list
  `(input that triggers pgx.ErrNoRows → expected sentinel)` and
  `(input that triggers SQLSTATE 23505 → expected sentinel)`.
  Simulate via fake pool or against a real test DB.
- **WebSocket lifecycle:** for any change in `internal/ws/`, list the
  goroutines spawned per connection and the cancellation source for
  each. Note "must pass `go test -race`".
- **Migration smoke:** if the change includes a migration, run it
  forward against a fresh schema and assert the resulting tables and
  indexes exist (integration tag).
- **Audit-event coverage:** for every action that should produce an
  audit record (auth events, message send/redact, profile change,
  match decision, secure reveal), enumerate the expected
  `AuditEvent.Action` values. Assert each appears in `slog` output
  during the relevant flow.

---END TESTING HANDOFF---
```

**Rules:**

- **Describe behavior, not implementation.** The testing agent must
  not need to read your source code to write tests. If it does, the
  handoff is incomplete.
- **Include concrete examples.** Every behavioral contract entry has
  at least one example input and expected output — these become test
  cases directly.
- **Flag every boundary crossing.** Any new code that touches the
  pgx pool, Redis, the WebSocket hub, the JWT service, the audit
  logger, or the filesystem must appear in Risk Areas with the call
  sites named.
- **Match the repo test style.** Tests should be same-package,
  stdlib-only, table-driven, using `httptest` for HTTP and
  hand-written fakes for collaborators — not testify, not gomock,
  not go-cmp.

---

## 15. Reference Files

Canonical example files to read before changing related code:

- `backend/cmd/api/main.go` — `run()`, dependency injection,
  ctx-driven shutdown
- `backend/internal/handler/router.go` — middleware order, `Deps`
  struct, route group composition
- `backend/internal/handler/auth_handler.go` — handler → service
  sentinel-error mapping pattern
- `backend/internal/handler/httputil/errors.go` — error envelope and
  sanitizer
- `backend/internal/handler/httputil/json.go` — `DecodeJSON` /
  `EncodeJSON` helpers
- `backend/internal/auth/middleware.go` — context-key + getter
  pattern
- `backend/internal/handler/middleware/request_id.go` — request-ID
  middleware and getter
- `backend/internal/repository/user_repository.go` — pgx queries,
  sentinel mapping, `isDuplicateKeyError` helper
- `backend/internal/observability/audit.go` — `slog.LogAttrs` pattern
- `backend/internal/ws/hub.go` — RWMutex-guarded connection store
- `backend/README.md` and root `README.md` — repo orientation
  - `backend/internal/ws/hub.go` — RWMutex-guarded connection store
  - `backend/cmd/api/main.go` — `run()`, DI, ctx-driven shutdown
