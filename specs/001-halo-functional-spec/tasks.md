---

description: "Executable task list for Halo Core Experience (MVP)"
---

# Tasks: Halo Core Experience (MVP)

**Input**: Design documents from `/specs/001-halo-functional-spec/`

- plan: [specs/001-halo-functional-spec/plan.md](plan.md)
- spec: [specs/001-halo-functional-spec/spec.md](spec.md)
- research: [specs/001-halo-functional-spec/research.md](research.md)
- data model: [specs/001-halo-functional-spec/data-model.md](data-model.md)
- API contract: [specs/001-halo-functional-spec/contracts/openapi.yaml](contracts/openapi.yaml)

**Goal**: Implement Halo’s MVP with a reusable, client-agnostic Go backend (Handler → Service → Repository) that can later be ported to gRPC/mobile without rewriting business logic.

**Format**: `- [ ] T### [P?] [US#?] Description with file path`

- **[P]** = parallelizable (different files; no dependency on incomplete work)
- **[US#]** label is required only inside User Story phases

---

## Phase 1: Setup (Shared Infrastructure)

- [ ] T001 Create backend directory skeleton per plan in backend/cmd/api/main.go
- [ ] T002 [P] Create backend package skeleton directories in backend/internal/{handler,service,repository,auth,media,ws,model}/
- [ ] T003 Initialize Go module in backend/go.mod (set `module` to `halo/backend` for now)
- [ ] T004 [P] Add Go tooling config in backend/.gitignore and backend/README.md
- [ ] T005 Scaffold Next.js App Router project in frontend/ (create frontend/package.json, frontend/app/layout.tsx, frontend/app/page.tsx)
- [ ] T006 [P] Configure Tailwind in frontend/tailwind.config.ts and frontend/app/globals.css
- [ ] T007 [P] Add PWA minimum assets in frontend/public/manifest.json
- [ ] T008 [P] Add basic service worker + registration in frontend/public/sw.js and frontend/src/lib/registerServiceWorker.ts

---

## Phase 2: Foundational (Blocking Prerequisites)

**⚠️ CRITICAL**: No user story work should begin until this phase is complete.

- [ ] T009 Implement env config loader in backend/internal/config/config.go
- [ ] T010 [P] Implement structured JSON error type + helpers in backend/internal/handler/httputil/errors.go
- [ ] T011 [P] Implement JSON encode/decode helpers with size limits in backend/internal/handler/httputil/json.go
- [ ] T012 Implement request-id middleware in backend/internal/handler/middleware/request_id.go
- [ ] T013 Implement auth context middleware wiring in backend/internal/auth/middleware.go
- [ ] T014 Implement password hashing helpers in backend/internal/auth/password.go
- [ ] T015 Implement JWT sign/verify in backend/internal/auth/jwt.go
- [ ] T016 Implement Postgres connection + health check in backend/internal/repository/db.go
- [ ] T017 Implement Redis client init in backend/internal/repository/redis.go
- [ ] T018 Create base domain models in backend/internal/model/{user.go,match.go,message.go,photo.go}
- [ ] T019 Implement router wiring in backend/internal/handler/router.go
- [ ] T020 Implement server startup + graceful shutdown in backend/cmd/api/main.go
- [ ] T021 Define initial DB migrations (users, connection_intents, matches, messages, user_photos) in backend/migrations/0001_init.sql
- [ ] T022 [P] Add migration runner notes + local compose placeholder in backend/README.md
- [ ] T023 Implement OpenAPI-serving (static file) endpoint in backend/internal/handler/openapi_handler.go (serves specs/001-halo-functional-spec/contracts/openapi.yaml)

**Checkpoint**: API boots locally; DB + Redis connectivity are proven; error + auth middleware exists.

---

## Phase 3: User Story 1 — Complete Values Onboarding Wizard (Priority: P1) 🎯 MVP

**Goal**: New users can register/login, complete onboarding (resumable), and become eligible for discovery.

**Independent Test**: Register, log in, `PUT /v1/me/profile` step-by-step, restart client, resume, complete, then `GET /v1/discovery` succeeds.

### Backend

- [ ] T024 [P] [US1] Implement user repository (create/get/update) in backend/internal/repository/user_repository.go
- [ ] T025 [P] [US1] Implement auth service (register/login) in backend/internal/service/auth_service.go
- [ ] T026 [P] [US1] Implement profile service (upsert, validate, onboarded) in backend/internal/service/profile_service.go
- [ ] T027 [P] [US1] Implement auth handlers in backend/internal/handler/auth_handler.go
- [ ] T028 [P] [US1] Implement me/profile handlers in backend/internal/handler/me_handler.go
- [ ] T029 [US1] Enforce 18+ validation + required onboarding fields in backend/internal/service/profile_validation.go
- [ ] T030 [US1] Ensure onboarding resumability by storing partial progress in users.profile_data (JSONB) via backend/internal/repository/user_repository.go

### Frontend

- [ ] T031 [P] [US1] Create API client wrapper with Bearer auth in frontend/src/lib/api.ts
- [ ] T032 [P] [US1] Create auth pages in frontend/app/(auth)/login/page.tsx and frontend/app/(auth)/register/page.tsx
- [ ] T033 [P] [US1] Create onboarding wizard route in frontend/app/onboarding/page.tsx
- [ ] T034 [P] [US1] Implement card-based onboarding wizard UI in frontend/src/components/onboarding/OnboardingWizard.tsx
- [ ] T035 [US1] Persist/resume onboarding by calling `GET /v1/me` + `PUT /v1/me/profile` in frontend/src/components/onboarding/useOnboarding.ts
- [ ] T036 [US1] Block access to discovery when not onboarded via frontend/src/middleware.ts

**Checkpoint**: US1 is fully functional end-to-end.

---

## Phase 4: User Story 2 — Browse Blind Discovery Feed (Priority: P1)

**Goal**: Onboarded users can browse a vertical card stack with Pass/Connect actions; cards are text-only with no photos.

**Independent Test**: Complete onboarding, open discovery, verify cards render text-only; Pass/Connect moves to next card; no image URLs are present in payload.

### Backend

- [ ] T037 [P] [US2] Implement discovery repository queries (candidate selection) in backend/internal/repository/discovery_repository.go
- [ ] T038 [P] [US2] Implement matching/ranking service (server-only scoring) in backend/internal/service/matching_service.go (do NOT expose scores)
- [ ] T039 [P] [US2] Implement discovery service (text-only response shaping) in backend/internal/service/discovery_service.go
- [ ] T040 [P] [US2] Implement discovery handlers in backend/internal/handler/discovery_handler.go
- [ ] T041 [US2] Enforce “no photos in discovery” at the handler response schema level in backend/internal/handler/discovery_handler.go
- [ ] T042 [P] [US2] Implement connection intent repository in backend/internal/repository/connection_intent_repository.go
- [ ] T043 [P] [US2] Implement connect/pass service in backend/internal/service/connection_intent_service.go

### Frontend

- [ ] T044 [P] [US2] Create discovery page shell in frontend/app/discovery/page.tsx
- [ ] T045 [P] [US2] Implement discovery card component (text-only) in frontend/src/components/discovery/DiscoveryCard.tsx
- [ ] T046 [US2] Implement vertical card stack interaction in frontend/src/components/discovery/DiscoveryStack.tsx
- [ ] T047 [US2] Wire Pass/Connect actions to API in frontend/src/components/discovery/useDiscovery.ts

**Checkpoint**: US2 works without any image access in discovery.

---

## Phase 5: User Story 3 — Start Meaningful Chats with Sparks (Priority: P1)

**Goal**: Matched users can chat 1:1; Sparks suggest meaningful starters; sending is optimistic and reconciles after server ack.

**Independent Test**: Create mutual connect → match, open chat, view Sparks, tap Spark (prefills composer), send message, see immediate render + later ack.

### Backend

- [ ] T048 [P] [US3] Implement match repository in backend/internal/repository/match_repository.go
- [ ] T049 [US3] Create match on mutual connect in backend/internal/service/connection_intent_service.go
- [ ] T050 [P] [US3] Implement message repository in backend/internal/repository/message_repository.go
- [ ] T051 [P] [US3] Implement chat service (send/list, authz) in backend/internal/service/chat_service.go
- [ ] T052 [P] [US3] Implement sparks service (tag/prompt mapping + fallback) in backend/internal/service/sparks_service.go
- [ ] T053 [P] [US3] Implement matches + chat handlers in backend/internal/handler/matches_handler.go and backend/internal/handler/chat_handler.go
- [ ] T054 [US3] Add Redis hot cache (last 50) write/read path in backend/internal/service/chat_cache.go
- [ ] T055 [P] [US3] Implement WebSocket hub core in backend/internal/ws/hub.go
- [ ] T056 [P] [US3] Implement WS auth + endpoint handler in backend/internal/handler/ws_handler.go
- [ ] T057 [US3] Implement Redis Pub/Sub fanout for multi-instance WS delivery in backend/internal/ws/pubsub.go
- [ ] T058 [US3] Ensure send-message response includes client_message_id echo + server timestamp in backend/internal/handler/chat_handler.go

### Frontend

- [ ] T059 [P] [US3] Create matches list page in frontend/app/matches/page.tsx
- [ ] T060 [P] [US3] Create match chat page route in frontend/app/matches/[matchId]/page.tsx
- [ ] T061 [P] [US3] Implement messages list + pagination UI in frontend/src/components/chat/MessageList.tsx
- [ ] T062 [P] [US3] Implement composer with optimistic send + reconcile in frontend/src/components/chat/MessageComposer.tsx
- [ ] T063 [P] [US3] Implement Sparks UI (prefill composer) in frontend/src/components/chat/SparksBar.tsx
- [ ] T064 [US3] Implement WS client + event handling in frontend/src/lib/ws.ts
- [ ] T065 [US3] Wire chat screen to WS updates + REST fallback in frontend/src/components/chat/useChat.ts

**Checkpoint**: US3 chat feels real-time and reconciles reliably.

---

## Phase 6: User Story 4 — Progress Secure Reveal via Connection Level (Priority: P2)

**Goal**: In match context, partner photo clarifies as reciprocal message thresholds are reached; server strictly gates variant access.

**Independent Test**: In a match, exchange messages reciprocally; verify level increases monotonically and photo URL changes from heavy blur → clear only at level 5.

### Backend

- [ ] T066 [P] [US4] Implement photo repository (store variant keys/status) in backend/internal/repository/photo_repository.go
- [ ] T067 [P] [US4] Implement media signing interface + CloudFront signer in backend/internal/media/signer.go
- [ ] T068 [P] [US4] Implement Secure Reveal variant selection logic in backend/internal/service/secure_reveal_service.go
- [ ] T069 [US4] Update chat send flow to increment match counters + level progression in backend/internal/service/connection_level.go
- [ ] T070 [P] [US4] Implement match profile endpoint handler in backend/internal/handler/match_profile_handler.go
- [ ] T071 [US4] Enforce server-only single-variant URL issuance in backend/internal/service/secure_reveal_service.go (never return higher variants)
- [ ] T072 [P] [US4] Implement upload-url endpoint (presigned S3 PUT) in backend/internal/handler/photo_upload_handler.go
- [ ] T073 [P] [US4] Define S3 object key format + metadata expectations in backend/internal/service/photo_upload_service.go

### Variant generation worker (background)

- [ ] T074 [P] [US4] Create Lambda image variant generator skeleton in infra/lambda/secure-reveal/main.go
- [ ] T075 [US4] Document S3 event wiring + output key conventions in infra/lambda/secure-reveal/README.md

### Frontend

- [ ] T076 [P] [US4] Implement SecureImage component in frontend/src/components/media/SecureImage.tsx
- [ ] T077 [US4] Display connection level + progress UI in frontend/src/components/match/ConnectionLevelBar.tsx
- [ ] T078 [US4] Fetch match profile + photo URL on chat open in frontend/src/components/chat/useMatchProfile.ts
- [ ] T079 [US4] Re-fetch match profile when level changes (WS event or post-send refresh) in frontend/src/components/chat/useMatchProfile.ts

**Checkpoint**: Secure Reveal is enforced server-side and updates as chat deepens.

---

## Phase 7: User Story 5 — Protect Privacy and Secret Sauce (Priority: P3)

**Goal**: Prevent PII exposure in discovery; protect photos via server-side gating; keep matching algorithm opaque (no scores/rules in responses).

**Independent Test**: Inspect discovery payloads for PII/photos (none); attempt to fetch clear photos before required level (denied or returns only allowed variant); verify no scoring details leak.

- [ ] T080 [P] [US5] Add field-level response shaping for discovery in backend/internal/service/discovery_service.go (explicit allowlist)
- [ ] T081 [P] [US5] Add authz checks for match membership on all match/chat endpoints in backend/internal/service/authorization.go
- [ ] T082 [US5] Add audit logging (request_id + actor_id + resource) in backend/internal/observability/audit.go
- [ ] T083 [US5] Ensure errors never leak internals in backend/internal/handler/httputil/errors.go
- [ ] T084 [US5] Add rate limiting middleware for discovery + auth endpoints in backend/internal/handler/middleware/rate_limit.go
- [ ] T085 [US5] Ensure media URLs are short-lived and only generated per request in backend/internal/media/signer.go

**Checkpoint**: Privacy constraints are enforced by default.

---

## Phase 8: Polish & Cross-Cutting Concerns

- [ ] T086 [P] Update API docs and examples in backend/README.md
- [ ] T087 [P] Align OpenAPI schemas with final implementation in specs/001-halo-functional-spec/contracts/openapi.yaml
- [ ] T088 Add end-to-end manual verification checklist in specs/001-halo-functional-spec/quickstart.md
- [ ] T089 Performance pass on discovery query + indexes in backend/migrations/0002_discovery_indexes.sql
- [ ] T090 Security hardening: CORS + security headers in backend/internal/handler/middleware/security_headers.go

---

## Dependencies & Execution Order

### Phase Dependencies

- Setup (Phase 1) → blocks Foundational
- Foundational (Phase 2) → blocks all user stories
- US1 (Phase 3) → should be completed before US2 (discovery eligibility)
- US2 (Phase 4) → should be completed before US3 (needs matches)
- US3 (Phase 5) → should be completed before US4 (Secure Reveal needs chat progression)
- US4 (Phase 6) → can be developed alongside US3 once message persistence exists, but shipping depends on it
- US5 (Phase 7) → cross-cutting; can start earlier but final verification comes after US2/US4
- Polish (Phase 8) → after core user stories

### User Story Dependency Graph

- US1 → US2 → US3 → US4
- US5 applies across US2–US4 (privacy, media gating, algorithm isolation)

---

## Parallel Execution Examples (per User Story)

### US1 parallel examples

- Auth backend in backend/internal/service/auth_service.go
- Profile validation backend in backend/internal/service/profile_validation.go
- Onboarding UI in frontend/src/components/onboarding/OnboardingWizard.tsx

### US3 parallel examples

- WS hub in backend/internal/ws/hub.go
- Chat service in backend/internal/service/chat_service.go
- Chat UI in frontend/src/components/chat/MessageList.tsx

### US4 parallel examples

- Media signing in backend/internal/media/signer.go
- SecureImage UI in frontend/src/components/media/SecureImage.tsx
- Lambda skeleton in infra/lambda/secure-reveal/main.go

---

## Implementation Strategy

### MVP First (P1 only)

1. Phase 1–2: Setup + Foundational
2. Phase 3: US1 onboarding (eligibility gating)
3. Phase 4: US2 blind discovery (text-only)
4. Phase 5: US3 chat + Sparks
5. Stop and validate P1 stories end-to-end

### Incremental Delivery

- Add US4 Secure Reveal next (P2), then ship privacy hardening (US5) + polish.
