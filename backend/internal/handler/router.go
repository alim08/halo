package handler

import (
	"net/http"
	"time"

	"github.com/go-chi/chi/v5"
	chimw "github.com/go-chi/chi/v5/middleware"

	"halo/backend/internal/auth"
	"halo/backend/internal/handler/middleware"
	"halo/backend/internal/observability"
	"halo/backend/internal/repository"
)

// Deps holds all handler dependencies injected from main.
type Deps struct {
	JWTService          *auth.JWTService
	UserRepo            *repository.UserRepository
	AuthHandler         *AuthHandler
	MeHandler           *MeHandler
	DiscoveryHandler    *DiscoveryHandler
	MatchesHandler      *MatchesHandler
	ChatHandler         *ChatHandler
	WSHandler           *WSHandler
	MatchProfileHandler *MatchProfileHandler
	PhotoUploadHandler  *PhotoUploadHandler
	LocationHandler     *LocationHandler
}

// NewRouter sets up the chi router with global middleware and route groups.
func NewRouter(deps Deps) chi.Router {
	r := chi.NewRouter()

	// Global middleware stack.
	r.Use(chimw.Recoverer)
	r.Use(chimw.RealIP)
	r.Use(middleware.RequestID)
	r.Use(middleware.SecurityHeaders)
	r.Use(middleware.CORS(middleware.DefaultCORSConfig()))
	r.Use(observability.AuditMiddleware)

	// Rate limiters.
	// authLimiter is keyed per-IP (no user is logged in yet on these routes).
	// chatLimiter / messageLimiter / discoveryLimiter are applied via
	// MiddlewareByUser below so concurrent users behind the same NAT each
	// get their own bucket.
	authLimiter := middleware.NewRateLimiter(20, 5, time.Minute)         // 20 req/min for auth
	discoveryLimiter := middleware.NewRateLimiter(60, 15, time.Minute)    // 60 req/min for discovery
	chatLimiter := middleware.NewRateLimiter(120, 30, time.Minute)        // 120 req/min for match/chat reads + unmatch
	messageLimiter := middleware.NewRateLimiter(60, 10, time.Minute)      // 60 req/min for outbound messages
	photoUploadLimiter := middleware.NewRateLimiter(10, 5, time.Minute)   // 10 req/min for upload-url issuance

	// Health check (unauthenticated).
	r.Get("/healthz", func(w http.ResponseWriter, _ *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusOK)
		_, _ = w.Write([]byte(`{"status":"ok"}`))
	})

	// Public routes (no auth required, rate-limited).
	r.Group(func(r chi.Router) {
		r.Use(authLimiter.Middleware)
		r.Post("/v1/auth/register", deps.AuthHandler.Register)
		r.Post("/v1/auth/login", deps.AuthHandler.Login)
	})

	// Public location routes (no auth, separate from auth limiter).
	r.Get("/v1/locations/search", deps.LocationHandler.SearchLocations)
	r.Get("/v1/locations/reverse-geocode", deps.LocationHandler.ReverseGeocode)

	// Protected routes (require valid Bearer token).
	r.Group(func(r chi.Router) {
		r.Use(auth.Middleware(deps.JWTService))
		r.Use(middleware.TouchLastActive(deps.UserRepo))

		r.Get("/v1/me", deps.MeHandler.GetMe)
		r.Put("/v1/me/profile", deps.MeHandler.UpsertProfile)

		// Discovery endpoints (Phase 4) — rate-limited per user.
		r.Group(func(r chi.Router) {
			r.Use(discoveryLimiter.MiddlewareByUser)
			r.Get("/v1/discovery", deps.DiscoveryHandler.GetFeed)
			r.Post("/v1/discovery/{cardId}/pass", deps.DiscoveryHandler.Pass)
			r.Post("/v1/discovery/{cardId}/connect", deps.DiscoveryHandler.Connect)
		})

		// Match + chat endpoints (Phase 5 + MVP matchmaking) — rate-limited per user.
		// Outbound message POST gets a tighter limit since it's the highest-cost
		// write path (DB insert + counter increment + cache push + ws fanout).
		r.Group(func(r chi.Router) {
			r.Use(chatLimiter.MiddlewareByUser)
			r.Get("/v1/matches", deps.MatchesHandler.ListMatches)
			r.Delete("/v1/matches/{matchId}", deps.MatchesHandler.Unmatch)
			r.Get("/v1/matches/{matchId}/sparks", deps.MatchesHandler.GetSparks)
			r.Get("/v1/matches/{matchId}/messages", deps.ChatHandler.ListMessages)
			r.Get("/v1/matches/{matchId}/profile", deps.MatchProfileHandler.GetProfile)
		})
		r.Group(func(r chi.Router) {
			r.Use(messageLimiter.MiddlewareByUser)
			r.Post("/v1/matches/{matchId}/messages", deps.ChatHandler.SendMessage)
		})

		// WebSocket endpoint (Phase 5).
		// Not rate-limited at the HTTP layer — the connection is long-lived
		// and per-message limits should be enforced at the message handler.
		r.Get("/v1/ws", deps.WSHandler.ServeHTTP)

		// Photo upload (Phase 6) — tight limit; signed URL issuance is expensive.
		r.Group(func(r chi.Router) {
			r.Use(photoUploadLimiter.MiddlewareByUser)
			r.Post("/v1/me/photos/upload-url", deps.PhotoUploadHandler.CreateUploadURL)
		})
	})

	return r
}
