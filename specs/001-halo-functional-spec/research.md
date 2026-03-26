# Phase 0 Research: Halo Universal Backend

This document resolves the “NEEDS CLARIFICATION” items implied by the feature spec + constitution and locks down implementation decisions to keep the API reusable for a future mobile port.

## Decisions

### API Transport & Structure

- Decision: Build a standalone HTTP JSON API in Go with a strict Handler → Service → Repository layering.
- Rationale: Keeps transport concerns (JSON parsing, status codes, WebSockets) out of business logic, enabling a future gRPC transport without rewriting domain logic.
- Alternatives considered:
  - Putting business logic in handlers (rejected: transport-coupled; harder to port).
  - Framework-heavy HTTP stacks (rejected: violates “prefer stdlib” spirit; higher coupling).

### Router

- Decision: Use `github.com/go-chi/chi/v5` for routing + middleware composition.
- Rationale: Lightweight, idiomatic, fits constitution expectations.
- Alternatives considered:
  - Gin/Fiber (rejected: heavier; would require explicit justification).

### Database Access

- Decision: Use `pgx` with hand-written SQL (no heavy ORM) and repository methods that accept context and return domain models.
- Rationale: Predictable performance, explicit SQL, easier to audit for data minimization.
- Alternatives considered:
  - ORM (rejected: obscures queries; more difficult to reason about payload minimization).

### Auth Tokens (Web + Future Mobile)

- Decision: Use short-lived JWT access tokens (sent via `Authorization: Bearer <token>`) plus refresh tokens (opaque, stored server-side) for session continuity.
- Rationale: Mobile portability, stateless authorization on hot paths, refresh token rotation allows revocation.
- Alternatives considered:
  - Cookie-only sessions (rejected: not mobile-portable per constitution).
  - Fully opaque access tokens (viable, but adds lookup on every request; can be revisited if JWT revocation becomes a need).

### IDs

- Decision: Use UUIDs for user, match, message identifiers.
- Rationale: Avoids guessability and reduces accidental data leakage; simplifies sharding later.
- Alternatives considered:
  - Sequential integers (rejected: enumeration risk; less friendly for public identifiers).

### Secure Reveal: Variant Generation

- Decision: Store originals in S3; generate 4 derivatives (`_blur_heavy`, `_blur_med`, `_blur_light`, `_clear`) via S3 event → Lambda (or equivalent worker) and write back variant keys.
- Rationale: Offloads CPU-heavy image processing from the Go API; scales independently.
- Alternatives considered:
  - In-app background worker (viable for early MVP, but competes with API resources; higher operational risk under load).

### Secure Reveal: Media Access Enforcement

- Decision: The API issues signed CloudFront URLs for exactly one allowed variant based on `matches.current_connection_level` (shared per match).
- Rationale: Enforces “zero-trust media” and prevents clear-photo leakage via client-side hiding.
- Alternatives considered:
  - Returning multiple variant URLs and letting the client pick (rejected: violates constitution).

### Secure Reveal: Progress Tracking

- Decision: Maintain counters on `matches` (total counted message_count + per-user sent counters) updated transactionally when persisting a valid message.
- Rationale: Avoids expensive scans over the `messages` table; makes level progression deterministic and auditable.
- Alternatives considered:
  - Compute counts on read (rejected: slower; risk of inconsistent counting rules).

### Real-Time Chat

- Decision: WebSocket hub in Go to manage active connections; persist messages to Postgres immediately; push a serialized copy into a Redis List per match (last 50) for fast initial load.
- Rationale: Meets optimistic UX + durability requirements; Redis improves perceived performance.
- Alternatives considered:
  - Redis-only chat (rejected: not durable; violates “Postgres source of truth”).

### WebSocket Scaling

- Decision: Use Redis Pub/Sub channels per match for fanout across API instances.
- Rationale: Avoids sticky-session requirements and supports horizontal scaling.
- Alternatives considered:
  - Single-instance hub (rejected: not scalable; single point of failure).

### WebSocket Library

- Decision: Use a small, modern Go WebSocket library (e.g., `nhooyr.io/websocket`) behind an internal interface.
- Rationale: Stable API, good standards compliance; hiding behind an interface reduces lock-in.
- Alternatives considered:
  - Raw `net/http` upgrade handling (rejected: more error-prone for production WS behavior).

### Migrations

- Decision: Use a simple migration tool (`goose` or `tern`) and keep migrations versioned in `backend/migrations/`.
- Rationale: Repeatable local/dev/prod DB setup.
- Alternatives considered:
  - Manual SQL application (rejected: inconsistent environments).

## Notes / Constraints Confirmed

- Discovery feed payloads MUST NOT include photo URLs, variant identifiers, or any image access tokens.
- Matching scoring logic remains strictly inside the Go service layer; clients receive ordered results only.
- All responses are JSON only; errors are safe JSON (no internal details).
- Signed media URLs should be short-lived (target: 15 minutes) and only for authorized variants.
