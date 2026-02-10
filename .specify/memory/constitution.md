<!--
Sync Impact Report

- Version change: 0.1.0 -> 0.2.0
- Modified principles: II, IV, V (business logic isolation; signed media URLs; chat optimistic UI)
- Added sections: Architecture & Delivery; Governance (filled)
- Removed sections: None
- Templates requiring updates:
	- ✅ .specify/templates/plan-template.md
	- ✅ .specify/templates/spec-template.md
	- ✅ .specify/templates/tasks-template.md
	- ⚠ pending: .specify/templates/commands/*.md (no command templates present in repo)
- Follow-up TODOs:
	- TODO(RATIFICATION_DATE): original adoption date is unknown; set when first ratified by maintainers.
-->

# Halo Constitution

## Core Principles

### I. Client-Agnostic JSON API (Non-Negotiable)
Halo’s backend MUST be a standalone, client-agnostic HTTP JSON API.

- The Go backend MUST NOT rely on Next.js for business logic, data validation rules, or authorization decisions.
- The backend MUST NOT return server-rendered HTML (or any HTML responses). All endpoints return JSON only.
- Authentication MUST work via stateless tokens sent in the `Authorization: Bearer <token>` header.
	- Acceptable: JWTs or opaque session tokens.
	- Cookies MAY be used as an additional transport for the Web client, but MUST NOT be the only supported transport.
- API behavior MUST be deterministic and documented so that Web PWA and future native iOS/Android clients behave identically.

Rationale: Halo targets a dual-client future; portability and clear API contracts prevent web-only coupling.

### II. Strict Stack Enforcement (No Surprise Tech)
Halo uses a deliberately narrow stack to maximize performance, predictability, and future client portability.

- Frontend MUST be Next.js (App Router) + TypeScript + Tailwind CSS.
- Frontend MUST implement PWA standards (at minimum: `manifest.json` and service worker behavior appropriate to the feature).
- Algorithm Isolation: The Matching Scoring System (compatibility logic) MUST reside 100% within the Go Service layer. It MUST never be duplicated in the frontend. The frontend only receives the results (e.g., a list of users), never the score or the scoring logic.
- Backend MUST be Go (Golang) and SHOULD prefer the Go standard library.
- Backend routing MUST use `chi` (or a similar lightweight router). Heavy frameworks (Gin/Fiber/etc.) require explicit justification with measured performance and operational tradeoffs.
- Data storage MUST be PostgreSQL for relational data (Users, Matches, Profile Tags) and Redis for hot chat cache + Pub/Sub.
- Media storage/delivery MUST use AWS S3 + CloudFront.
- All API endpoints MUST follow RESTful conventions and be structured to be OpenAPI/Swagger-ready.

Rationale: A strict stack reduces accidental complexity and supports a clean web → native migration path.

### III. Security & Privacy by Design (Default: Minimize)
Halo handles sensitive personal data. Security and privacy are requirements, not features.

- API responses MUST minimize data: return only what the current view needs.
- Discovery feed responses MUST NOT include PII (e.g., email, phone, precise location, internal identifiers, private photos).
- Authorization MUST be enforced server-side for every endpoint and every sensitive field.
- Sensitive data access MUST be auditable (structured logs with request IDs and actor/user IDs where applicable).

Rationale: Dating platforms are high-risk targets; minimizing exposed data reduces harm and breach impact.

### IV. Zero-Trust Media (Server-Controlled Visibility)
Media visibility MUST be enforced on the server, not “simulated” on the client.

- The frontend MUST NEVER receive a URL to an unblurred/clear photo unless the user’s Connection Level allows it.
- Image “blurring” MUST be implemented by serving different assets/variants from the server (e.g., blurred derivative), not via client-side CSS filters.
- Images MUST be served via signed URLs (CloudFront/S3) with a short expiration (e.g., 15 minutes) and MUST only be issued for assets the requester is authorized to access.

Rationale: Client-side hiding is not access control; server-side gating prevents trivial data exfiltration.

### V. Engineering Quality: Performance + Standards + UX
Halo is performance-sensitive and mobile-first; quality is enforced through standards.

- Go code MUST be `gofmt`-formatted and follow idiomatic error handling (`if err != nil` with explicit context).
- Backend MUST follow the Handler → Service → Repository pattern (separation of transport, business logic, persistence).
- Frontend MUST be mobile-first.
- Chat Optimistic UI: The frontend MUST implement optimistic updates for chat (messages appear immediately before server confirmation). The backend MUST support this by returning standard acknowledgment payloads (e.g., message ID, server timestamp, and delivery state) to reconcile client state.
- All touch targets MUST be at least 44px (minimum tappable area).
- Icons MUST use `lucide-react`.
- API changes MUST include contract updates and SHOULD include at least:
	- contract tests for endpoints touched, and
	- unit/integration tests for critical authorization/media-gating logic.

Rationale: Predictable code structure and UX rules reduce regressions and support fast iteration.

## Architecture & Delivery Constraints

### API Contract

- All backend responses MUST be JSON with a stable, documented schema.
- Errors MUST be returned as JSON and MUST NOT leak secrets or internal implementation details.
- Endpoints SHOULD be designed to be OpenAPI-ready (consistent request/response bodies, status codes, pagination patterns).

### Auth Portability

- Auth MUST work for non-browser clients using `Authorization: Bearer <token>`.
- Session and refresh behavior MUST be documented in the API contract.

### Data Access Patterns

- PostgreSQL is the source of truth for relational entities.
- Redis is permitted for:
	- hot caches (chat, presence, feed precomputations), and
	- Pub/Sub.

### Media

- Store and serve distinct asset variants (e.g., blurred vs clear) based on Connection Level.
- Never rely on client UI to “hide” clear media.

### Performance

- New endpoints MUST include basic performance considerations (query efficiency, pagination, caching strategy) in their design notes.
- Hot paths (discovery feed, chat) SHOULD include measured p95 latency before rollout when feasible.

## Development Workflow & Quality Gates

- Every feature plan MUST include a “Constitution Check” confirming compliance with Principles I–V.
- PRs MUST be reviewed for:
	- client-agnostic backend behavior (no Next.js coupling),
	- JSON-only responses,
	- token-based auth support,
	- zero-trust media enforcement,
	- data minimization in responses,
	- adherence to the stack constraints.
- Exceptions are allowed only when documented and time-boxed:
	- document the violation,
	- justify why it’s needed,
	- propose a rollback/removal plan,
	- and bump the constitution version if the exception becomes policy.

## Governance
<!-- Example: Constitution supersedes all other practices; Amendments require documentation, approval, migration plan -->

- This constitution supersedes local conventions, templates, and individual preferences.
- Amendments MUST be proposed as a PR that includes:
	- rationale,
	- the semantic version bump (MAJOR/MINOR/PATCH),
	- and any migration steps required for existing code.
- Versioning policy (SemVer for this document):
	- MAJOR: removes/redefines a principle or introduces backward-incompatible governance.
	- MINOR: adds a principle/section or materially expands requirements.
	- PATCH: clarifies language without changing meaning.
- Compliance review expectation:
	- feature specs/plans MUST reference and satisfy the constitution,
	- reviewers SHOULD request explicit “Constitution Check” confirmation for risky changes (auth, media, discovery feed, PII).

**Version**: 0.2.0 | **Ratified**: TODO(RATIFICATION_DATE): set on first formal adoption | **Last Amended**: 2026-02-09
