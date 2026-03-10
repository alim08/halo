# Implementation Plan: Halo (Universal Backend + MVP Contracts)

**Branch**: `001-halo-functional-spec` | **Date**: 2026-03-02 | **Spec**: [specs/001-halo-functional-spec/spec.md](spec.md)
**Input**: Feature specification from [specs/001-halo-functional-spec/spec.md](spec.md)

**Note**: This template is filled in by the `/speckit.plan` command.

## Summary

Deliver a client-agnostic HTTP JSON API (“universal backend”) that supports:

- Values onboarding (persistable/resumable),
- blind discovery feed (text-only; no photo access),
- 1:1 chat with Sparks and optimistic reconciliation,
- Secure Reveal (server-enforced photo variant gating by shared, monotonic Connection Level),
- real-time delivery UX via WebSockets + Redis hot cache.

The backend is structured as Handler → Service → Repository so that transport can later swap to gRPC without rewriting business logic.

## Technical Context

<!--
  ACTION REQUIRED: Replace the content in this section with the technical details
  for the project. The structure here is presented in advisory capacity to guide
  the iteration process.
-->

**Language/Version**: Go 1.22+ (backend), TypeScript (Next.js frontend)  
**Primary Dependencies**: `chi` router; PostgreSQL driver `pgx`; Redis client `go-redis`; OpenAPI tooling (design-time)  
**Storage**: PostgreSQL (source of truth), Redis (chat hot cache + Pub/Sub), S3 + CloudFront (media storage/delivery)  
**Testing**: Go `testing` + `httptest`; integration via `testcontainers-go` (or docker-compose for local)  
**Target Platform**: Linux server (API), plus AWS-managed services (S3/CloudFront; optional Lambda for image variants)
**Project Type**: web application monorepo (backend + frontend)  
**Performance Goals**: discovery + chat history p95 < 200ms under warm cache; WebSocket fanout supports active chat sessions  
**Constraints**: strict data minimization (no PII in discovery); deterministic JSON contracts; signed media URLs with short expiry (~15 min)  
**Scale/Scope**: MVP; design for future native iOS/Android clients without API changes

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- PASS: Backend remains client-agnostic HTTP JSON (no Next.js-coupled business logic).
- PASS: Matching/compatibility scoring lives only in Go service layer; API returns ordered results only.
- PASS: API responses are JSON-only with safe JSON error bodies.
- PASS: Auth is Bearer-token compatible (`Authorization: Bearer <token>`), suitable for web and future native clients.
- PASS: Zero-trust media is enforced server-side via variant selection + short-lived signed URLs.
- PASS: Data minimization upheld: discovery contract returns text-only cards with no photo URLs/tokens/variant IDs.
- PASS: Stack constraints respected in design: Go + chi; Postgres + Redis; S3 + CloudFront; Next.js for frontend.
- PASS: Chat optimistic UX supported via `client_message_id` reconciliation in the contract.
- N/A (plan-only): mobile-first UI constraints are frontend implementation details, not changed here.

## Project Structure

### Documentation (this feature)

```text
specs/[###-feature]/
├── plan.md              # This file (/speckit.plan command output)
├── research.md          # Phase 0 output (/speckit.plan command)
├── data-model.md        # Phase 1 output (/speckit.plan command)
├── quickstart.md        # Phase 1 output (/speckit.plan command)
├── contracts/           # Phase 1 output (/speckit.plan command)
└── tasks.md             # Phase 2 output (/speckit.tasks command - NOT created by /speckit.plan)
```

### Source Code (repository root)
```text
backend/
frontend/
├── cmd/
│   └── api/
│       └── main.go
├── internal/
│   ├── handler/          # HTTP JSON handlers (transport layer)
│   ├── service/          # pure business logic (transport-agnostic)
│   ├── repository/       # SQL queries + persistence concerns
│   ├── auth/             # token verification, middleware, hashing
│   ├── media/            # signed URL issuance + variant selection
│   ├── ws/               # WebSocket hub + connection registry
│   └── model/            # domain types (User, Match, Message, etc.)
├── migrations/
└── tests/
    ├── contract/
    └── integration/

frontend/                 # Next.js App Router + TS + Tailwind (separate plan)
├── app/
├── src/
└── tests/
```

**Structure Decision**: Monorepo with `backend/` (Go API) and `frontend/` (Next.js). Backend enforces all business logic and authorization; the frontend is a thin client that consumes documented JSON contracts.

## Complexity Tracking

No constitution violations introduced by this plan.

## Phase 0 — Research (Output: [specs/001-halo-functional-spec/research.md](research.md))

Decisions to lock down before implementation:

- Auth token format (JWT vs opaque) and refresh strategy that works for web + future native clients.
- Media variant generation path (in-app worker vs S3-triggered Lambda) and where variant metadata is stored.
- WebSocket library choice and deployment constraints (sticky sessions vs stateless + Redis Pub/Sub).
- Postgres schema choices to enforce Secure Reveal progression efficiently (counters vs query-on-read).

## Phase 1 — Design & Contracts

**Outputs**:

- Data model: [specs/001-halo-functional-spec/data-model.md](data-model.md)
- API contracts: [specs/001-halo-functional-spec/contracts/openapi.yaml](contracts/openapi.yaml)
- Developer quickstart: [specs/001-halo-functional-spec/quickstart.md](quickstart.md)

**Design notes (key requirements mapping)**:

- Discovery feed responses are text-only and MUST NOT include any photo URLs/tokens/variant identifiers.
- Secure Reveal is enforced server-side: the backend issues only the photo variant URL permitted by the match’s shared `current_connection_level`.
- Frontend (web now, native later) uses a `SecureImage`-style component that re-fetches `GET /v1/matches/{matchId}/profile` when the level changes, so the client never caches or infers higher-level media.
- Connection Level is monotonic and shared per match; progression uses total exchanged message count plus per-user minimums.
- Chat supports optimistic UI reconciliation via `client_message_id` echoed back in the ack.
- Redis caches the last 50 messages per match (hot) while Postgres remains the source of truth (cold).

## Phase 2 — Implementation Planning (handled by `/speckit.tasks`)

This plan intentionally stops after Phase 1 design artifacts. Use `/speckit.tasks` to generate granular engineering tasks once the contracts and data model are approved.
