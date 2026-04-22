package handler

import (
	"net/http"
	"time"

	"github.com/go-chi/chi/v5"
	chimw "github.com/go-chi/chi/v5/middleware"

	"halo/backend/internal/auth"
	"halo/backend/internal/handler/middleware"
	"halo/backend/internal/observability"
)

// Deps holds all handler dependencies injected from main.
type Deps struct {
	JWTService          *auth.JWTService
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
	authLimiter := middleware.NewRateLimiter(20, 5, time.Minute)      // 20 req/min for auth
	discoveryLimiter := middleware.NewRateLimiter(60, 15, time.Minute) // 60 req/min for discovery

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

		r.Get("/v1/me", deps.MeHandler.GetMe)
		r.Put("/v1/me/profile", deps.MeHandler.UpsertProfile)

		// Discovery endpoints (Phase 4) — rate-limited.
		r.Group(func(r chi.Router) {
			r.Use(discoveryLimiter.Middleware)
			r.Get("/v1/discovery", deps.DiscoveryHandler.GetFeed)
			r.Post("/v1/discovery/{cardId}/pass", deps.DiscoveryHandler.Pass)
			r.Post("/v1/discovery/{cardId}/connect", deps.DiscoveryHandler.Connect)
		})

		// Match + chat endpoints (Phase 5).
		r.Get("/v1/matches", deps.MatchesHandler.ListMatches)
		r.Get("/v1/matches/{matchId}/sparks", deps.MatchesHandler.GetSparks)
		r.Get("/v1/matches/{matchId}/messages", deps.ChatHandler.ListMessages)
		r.Post("/v1/matches/{matchId}/messages", deps.ChatHandler.SendMessage)

		// WebSocket endpoint (Phase 5).
		r.Get("/v1/ws", deps.WSHandler.ServeHTTP)

		// Match profile + Secure Reveal (Phase 6).
		r.Get("/v1/matches/{matchId}/profile", deps.MatchProfileHandler.GetProfile)

		// Photo upload (Phase 6).
		r.Post("/v1/me/photos/upload-url", deps.PhotoUploadHandler.CreateUploadURL)
	})

	return r
}
