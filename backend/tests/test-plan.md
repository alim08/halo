# Test Plan

## Metadata

- Generated: 2026-03-24T12:00:00Z
- Repo Root: `/Users/jspags/Projects/halo`
- Detected Test Framework(s): None (Go `testing` available via stdlib; no frontend test framework configured)
- Overall Test Quality Rating: None

## Existing Test Inventory

| Test File | Framework | Type | Approx. Test Count | Quality | Notes |
| --------- | --------- | ---- | ------------------ | ------- | ----- |
| `backend/tests/contract/doc.go` | N/A | N/A | 0 | N/A | Empty package placeholder |
| `backend/tests/integration/doc.go` | N/A | N/A | 0 | N/A | Empty package placeholder |

## Existing Test Quality Assessment

There are **zero tests** in the entire repository. The test directories contain only empty `doc.go` package declarations. No frontend test framework (Jest, Vitest, Playwright, etc.) is listed in `package.json` or configured anywhere.

## Coverage Gap Analysis

### Untested Components

| Component / Module | File(s) | Risk Level | Justification |
| ------------------ | ------- | ---------- | ------------- |
| Auth (JWT + password) | `backend/internal/auth/jwt.go`, `password.go`, `middleware.go` | Critical | Core security; token generation/validation, password hashing. See C-001, C-002. |
| Auth service (login/register) | `backend/internal/service/auth_service.go` | Critical | Registration, login, token issuance. See C-002. |
| Chat service | `backend/internal/service/chat_service.go` | High | Message sending, sparks, connection levels. See M-008, M-012. |
| Match repository | `backend/internal/repository/match_repository.go` | High | Cursor pagination bug. See H-006. |
| Discovery repository | `backend/internal/repository/discovery_repository.go` | High | Random ordering, sensitive data in SELECT. See M-007, M-011. |
| All HTTP handlers | `backend/internal/handler/*.go` | High | Request validation, auth enforcement, error responses. See H-003, H-007. |
| WebSocket hub + pubsub | `backend/internal/ws/hub.go`, `pubsub.go` | High | Real-time messaging, connection management. See H-002, L-008. |
| Matching service | `backend/internal/service/matching_service.go` | Medium | Compatibility scoring logic. |
| Sparks service | `backend/internal/service/sparks_service.go` | Medium | Prompt generation, truncation. See L-007. |
| Connection level service | `backend/internal/service/connection_level.go` | Medium | Level progression logic. See M-012. |
| Profile validation | `backend/internal/service/profile_validation.go` | Medium | Age validation, field requirements. |
| Secure reveal service | `backend/internal/service/secure_reveal_service.go` | Medium | Photo reveal logic. |
| Photo upload service | `backend/internal/service/photo_upload_service.go` | Medium | Upload URL generation. See M-011 (placeholder presign). |
| Rate limiter middleware | `backend/internal/handler/middleware/rate_limit.go` | Medium | Rate limiting logic. See L-001, L-002. |
| Frontend API client | `frontend/src/lib/api.ts` | High | Auth token management, request interceptors. See H-005, M-009. |
| Frontend useChat hook | `frontend/src/components/chat/useChat.ts` | High | WebSocket + polling. See H-004, M-004. |
| Frontend useOnboarding hook | `frontend/src/components/onboarding/useOnboarding.ts` | Medium | Step progression. See M-003. |
| Frontend useDiscovery hook | `frontend/src/components/discovery/useDiscovery.ts` | Medium | Swipe logic, candidate fetching. |
| Lambda secure-reveal | `infra/lambda/secure-reveal/main.go` | Medium | Photo reveal Lambda. |
| HTTP utility functions | `backend/internal/handler/httputil/json.go`, `errors.go` | Low | JSON decoding, error sanitization. |
| Config loading | `backend/internal/config/config.go` | Low | Env var parsing. See L-003 (backend). |

### Undertested Components

None -- all components have zero coverage.

## Recommended Test Suites

### Suite 1: Auth & JWT Unit Tests

- **Priority:** P0
- **Type:** unit
- **Target Component:** `backend/internal/auth/`
- **Framework:** Go `testing`
- **Justification:** Core security component. C-001 (audit context key mismatch) would be caught by a test that sets auth context and reads it back. C-002 (unused refresh tokens) would surface via integration test expecting token refresh.
- **Scenarios to Cover:**
  - JWT generation produces valid, parseable tokens
  - JWT validation rejects expired tokens
  - JWT validation rejects tokens with wrong signing method (algorithm confusion)
  - `UserIDFromContext` returns correct user ID from auth middleware context
  - `UserIDFromContext` returns empty string for unauthenticated context
  - Auth middleware sets context correctly for valid tokens
  - Auth middleware returns 401 for missing/invalid/expired tokens
  - Password hash roundtrip (hash then verify)
  - Password verify rejects wrong passwords
- **Estimated Test Count:** 12

### Suite 2: Chat Service Unit Tests

- **Priority:** P0
- **Type:** unit
- **Target Component:** `backend/internal/service/chat_service.go`
- **Framework:** Go `testing` with mock repository interfaces
- **Justification:** Critical user flow. M-008 (no message length limit), M-012 (non-transactional message+counter), L-005 (fmt.Printf).
- **Scenarios to Cover:**
  - SendMessage with valid input succeeds
  - SendMessage rejects empty body
  - SendMessage rejects body exceeding max length (once M-008 is fixed)
  - SendMessage by non-participant returns error
  - GetMessages returns paginated results
  - GetMessages by non-participant returns error
  - Connection level increments correctly after message threshold
  - Spark generation triggered at correct intervals
- **Estimated Test Count:** 10

### Suite 3: Handler Integration Tests

- **Priority:** P0
- **Type:** integration
- **Target Component:** `backend/internal/handler/`
- **Framework:** Go `testing` + `net/http/httptest`
- **Justification:** H-003 (N+1 in ListMatches), H-007 (handler-repository coupling), M-008 (no message validation). Validates full request/response cycle.
- **Scenarios to Cover:**
  - Auth endpoints: register, login, missing fields, duplicate email
  - Discovery endpoints: get candidates (authenticated), reject unauthenticated
  - Match endpoints: list matches, match detail, pagination correctness (H-006)
  - Chat endpoints: send message, get messages, authorization checks
  - Profile endpoints: get/update profile, photo upload initiation
  - Error responses: proper status codes, sanitized error messages
  - Rate limiting: requests within limit succeed, excess requests return 429
  - Security headers present on all responses
- **Estimated Test Count:** 30

### Suite 4: Repository Unit Tests

- **Priority:** P0
- **Type:** integration (requires test database)
- **Target Component:** `backend/internal/repository/`
- **Framework:** Go `testing` + test PostgreSQL (via testcontainers or docker)
- **Justification:** H-006 (cursor pagination bug), M-007 (discovery fetching password_hash), M-011 (ORDER BY RANDOM performance), M-014 (multiple primary photos).
- **Scenarios to Cover:**
  - User CRUD operations
  - Duplicate email handling (L-006)
  - Match creation and listing with correct pagination (H-006)
  - Match pagination returns no duplicates or gaps
  - Discovery candidates exclude already-seen users
  - Discovery candidates do NOT return password_hash (after M-007 fix)
  - Message creation and retrieval with cursor pagination
  - Connection intent creation (idempotency)
  - Photo CRUD, primary photo uniqueness (M-014)
- **Estimated Test Count:** 25

### Suite 5: WebSocket Hub & PubSub Tests

- **Priority:** P1
- **Type:** unit
- **Target Component:** `backend/internal/ws/hub.go`, `pubsub.go`
- **Framework:** Go `testing`
- **Justification:** H-002 (origin validation), L-008 (PubSub coupling to Hub internals). Real-time messaging is core UX.
- **Scenarios to Cover:**
  - Register/unregister connections
  - Send message to specific user
  - Broadcast match creation to both participants
  - Handle disconnection gracefully
  - PubSub delivers cross-instance messages
  - Send channel closed on unregister (L-005 backend)
- **Estimated Test Count:** 10

### Suite 6: Service Layer Business Logic Tests

- **Priority:** P1
- **Type:** unit
- **Target Component:** `backend/internal/service/`
- **Framework:** Go `testing` with mock repositories
- **Justification:** Covers matching algorithm, connection levels, profile validation, sparks generation. M-001 (DRY age computation), M-002 (DRY profile parsing), L-007 (truncation corruption).
- **Scenarios to Cover:**
  - Matching compatibility score computation
  - Connection level thresholds and progression
  - Profile validation: required fields, age limits, birthdate validation
  - Discovery service: candidate filtering, age/distance filters
  - Sparks service: prompt generation, multi-byte truncation (L-007)
  - Photo upload: presigned URL generation
  - Secure reveal: photo variant selection by connection level
  - Authorization service: participant checks
- **Estimated Test Count:** 20

### Suite 7: Frontend API Client Tests

- **Priority:** P1
- **Type:** unit
- **Target Component:** `frontend/src/lib/api.ts`
- **Framework:** Vitest (recommended for Next.js projects)
- **Justification:** H-005 (no token refresh), M-009 (localStorage token storage). Auth token lifecycle is critical.
- **Scenarios to Cover:**
  - Successful API request includes auth header
  - 401 response clears tokens and triggers logout
  - Token refresh flow (once H-005/C-002 are fixed)
  - Request retries after successful token refresh
  - Login stores tokens correctly
  - Logout clears all stored tokens
- **Estimated Test Count:** 8

### Suite 8: Frontend Hook Tests

- **Priority:** P1
- **Type:** unit
- **Target Component:** `frontend/src/components/`
- **Framework:** Vitest + React Testing Library
- **Justification:** M-003 (onboarding race condition), M-004 (excessive polling), H-004 (duplicate WS connections).
- **Scenarios to Cover:**
  - useOnboarding: step advances only after save completes (M-003)
  - useOnboarding: handles save failure gracefully
  - useChat: connects WebSocket, receives messages
  - useChat: polling disabled when WebSocket is connected (M-004)
  - useDiscovery: fetches candidates, handles swipe actions
  - useMatchProfile: fetches profile data for match partner
- **Estimated Test Count:** 12

### Suite 9: Contract Tests (OpenAPI Conformance)

- **Priority:** P2
- **Type:** integration
- **Target Component:** `backend/internal/handler/router.go` vs `specs/001-halo-functional-spec/contracts/openapi.yaml`
- **Framework:** Go `testing` + OpenAPI validator library
- **Justification:** Ensures API implementation matches the documented spec. Prevents spec drift.
- **Scenarios to Cover:**
  - All documented endpoints exist and accept documented methods
  - Request bodies conform to documented schemas
  - Response bodies conform to documented schemas
  - Error responses match documented error formats
  - Undocumented endpoints are flagged
- **Estimated Test Count:** 15

### Suite 10: Lambda Function Tests

- **Priority:** P2
- **Type:** unit
- **Target Component:** `infra/lambda/secure-reveal/main.go`
- **Framework:** Go `testing`
- **Justification:** Isolated Lambda with its own DB connection and business logic for secure photo reveals.
- **Scenarios to Cover:**
  - Valid reveal request returns correct photo variant
  - Unauthorized request returns 403
  - Non-existent match returns 404
  - Connection level determines correct blur variant
  - Database connection error handled gracefully
- **Estimated Test Count:** 8

## Suite Priority Definitions

| Priority | Definition |
| -------- | ---------- |
| P0       | Blocks production. Covers Critical/High findings or untested critical paths. |
| P1       | Should be implemented before next release. Covers Medium findings or core business logic. |
| P2       | Improves confidence. Covers Low findings or secondary paths. |
| P3       | Nice to have. Improves maintainability or documents behavior. |

## Summary

- Total Recommended Suites: 10
- Total Estimated New Tests: 150
- P0 Suites: 4
- P1 Suites: 4
- P2 Suites: 2
- P3 Suites: 0

**Implementation order:** Start with **Suite 1 (Auth)** and **Suite 4 (Repository)** -- these cover the two Critical findings (C-001 audit context key mismatch, C-002 refresh token gap) and the High pagination bug (H-006). Next, implement **Suite 3 (Handler Integration)** to validate the full request cycle including the N+1 query fix (H-003). Then proceed to **Suite 2 (Chat)** for the core messaging flow.

For the frontend, install **Vitest** and **React Testing Library** as dev dependencies (`npm install -D vitest @testing-library/react @testing-library/jest-dom jsdom`), then implement **Suite 7 (API Client)** first since it covers the auth token lifecycle, followed by **Suite 8 (Hooks)** for the onboarding and chat interaction logic.

The backend requires no additional test framework -- Go's built-in `testing` package with `net/http/httptest` is sufficient. For repository tests requiring a real database, consider `testcontainers-go` to spin up ephemeral PostgreSQL instances.
