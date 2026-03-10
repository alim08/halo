# halo Development Guidelines

Auto-generated from all feature plans. Last updated: 2026-03-02

## Active Technologies
- PostgreSQL (source of truth) + Redis (chat cache + Pub/Sub) (001-halo-functional-spec)
- Go 1.22+ (backend); TypeScript (frontend; Next.js App Router) + chi (router); pgx (Postgres via database/sql); go-redis (Redis); nhooyr.io/websocket (WebSockets) (001-halo-functional-spec)
- PostgreSQL (source of truth); Redis (chat cache + Pub/Sub); S3 + CloudFront (media) (001-halo-functional-spec)
- Go 1.22+ (backend); TypeScript (frontend; Next.js App Router) + chi (routing); pgx (Postgres via database/sql); go-redis (Redis); nhooyr.io/websocket (WebSockets); Next.js + Tailwind (001-halo-functional-spec)
- PostgreSQL (source of truth); Redis (chat cache + Pub/Sub); S3 + CloudFront (media variants + signed URLs) (001-halo-functional-spec)
- Go 1.22+ (backend), TypeScript (Next.js frontend) + `chi` router; PostgreSQL driver `pgx`; Redis client `go-redis`; OpenAPI tooling (design-time) (001-halo-functional-spec)
- PostgreSQL (source of truth), Redis (chat hot cache + Pub/Sub), S3 + CloudFront (media storage/delivery) (001-halo-functional-spec)

- (001-halo-functional-spec)

## Project Structure

```text
backend/
frontend/
tests/
```

## Commands

# Add commands for 

## Code Style

: Follow standard conventions

## Recent Changes
- 001-halo-functional-spec: Added Go 1.22+ (backend), TypeScript (Next.js frontend) + `chi` router; PostgreSQL driver `pgx`; Redis client `go-redis`; OpenAPI tooling (design-time)
- 001-halo-functional-spec: Added Go 1.22+ (backend); TypeScript (frontend; Next.js App Router) + chi (routing); pgx (Postgres via database/sql); go-redis (Redis); nhooyr.io/websocket (WebSockets); Next.js + Tailwind
- 001-halo-functional-spec: Added Go 1.22+ (backend); TypeScript (frontend; Next.js App Router) + chi (routing); pgx (Postgres via database/sql); go-redis (Redis); nhooyr.io/websocket (WebSockets); Next.js + Tailwind


<!-- MANUAL ADDITIONS START -->
<!-- MANUAL ADDITIONS END -->
