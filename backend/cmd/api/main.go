package main

import (
	"context"
	"fmt"
	"log/slog"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"halo/backend/internal/auth"
	"halo/backend/internal/config"
	"halo/backend/internal/handler"
	"halo/backend/internal/media"
	"halo/backend/internal/repository"
	"halo/backend/internal/service"
	"halo/backend/internal/ws"
)

func main() {
	if err := run(); err != nil {
		fmt.Fprintf(os.Stderr, "error: %v\n", err)
		os.Exit(1)
	}
}

func run() error {
	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()

	logger := slog.New(slog.NewJSONHandler(os.Stdout, &slog.HandlerOptions{Level: slog.LevelInfo}))
	slog.SetDefault(logger)

	// ── Load config ──────────────────────────────────────────
	cfg, err := config.Load()
	if err != nil {
		return fmt.Errorf("load config: %w", err)
	}

	// ── Connect Postgres ─────────────────────────────────────
	dbPool, err := repository.NewPostgresPool(ctx, cfg.DatabaseURL)
	if err != nil {
		return fmt.Errorf("connect postgres: %w", err)
	}
	defer dbPool.Close()
	slog.Info("postgres connected")

	// ── Connect Redis ────────────────────────────────────────
	redisClient, err := repository.NewRedisClient(ctx, cfg.RedisURL)
	if err != nil {
		return fmt.Errorf("connect redis: %w", err)
	}
	defer redisClient.Close()
	slog.Info("redis connected")

	// ── JWT service ──────────────────────────────────────────
	jwtService := auth.NewJWTService(
		cfg.JWT.SigningKey,
		cfg.JWT.AccessExpiry,
		cfg.JWT.RefreshExpiry,
	)

	// ── Repositories ─────────────────────────────────────────
	userRepo := repository.NewUserRepository(dbPool)
	discoveryRepo := repository.NewDiscoveryRepository(dbPool)
	intentRepo := repository.NewConnectionIntentRepository(dbPool)
	matchRepo := repository.NewMatchRepository(dbPool)
	msgRepo := repository.NewMessageRepository(dbPool)
	photoRepo := repository.NewPhotoRepository(dbPool)

	// ── WebSocket hub + Pub/Sub ──────────────────────────────
	wsHub := ws.NewHub()
	wsPubSub := ws.NewPubSub(redisClient, wsHub)
	go wsPubSub.Subscribe(ctx)

	// ── Services ─────────────────────────────────────────────
	authService := service.NewAuthService(userRepo, jwtService)
	profileService := service.NewProfileService(userRepo)
	matchingService := service.NewMatchingService()
	discoveryService := service.NewDiscoveryService(discoveryRepo, userRepo, matchingService)
	intentService := service.NewConnectionIntentService(intentRepo, matchRepo)
	chatCache := service.NewChatCache(redisClient)
	levelService := service.NewConnectionLevelService(matchRepo)
	chatService := service.NewChatService(msgRepo, matchRepo, chatCache, levelService)
	sparksService := service.NewSparksService(userRepo, matchRepo)
	authzService := service.NewAuthorizationService(matchRepo, userRepo)
	_ = authzService // Available for authorization middleware; handlers currently inline authz checks.

	// ── Media services (Phase 6) ────────────────────────────
	mediaSigner, err := media.NewCloudFrontSigner(
		cfg.Media.CloudFrontDomain,
		cfg.Media.SignerKeyID,
		cfg.Media.SignerPrivateKeyPEM,
		cfg.Media.URLExpiry,
	)
	if err != nil {
		slog.Warn("media signer init failed, Secure Reveal will use dev mode", "error", err)
		mediaSigner = &media.DevSigner{}
	}
	secureRevealService := service.NewSecureRevealService(photoRepo, matchRepo, mediaSigner)
	photoUploadService := service.NewPhotoUploadService(photoRepo, cfg.Media.S3Bucket, cfg.Media.URLExpiry)

	// ── Handlers ─────────────────────────────────────────────
	authHandler := handler.NewAuthHandler(authService)
	meHandler := handler.NewMeHandler(profileService)
	discoveryHandler := handler.NewDiscoveryHandler(discoveryService, intentService)
	matchesHandler := handler.NewMatchesHandler(chatService, sparksService, userRepo)
	chatHandler := handler.NewChatHandler(chatService, wsHub, wsPubSub)
	wsHandler := handler.NewWSHandler(wsHub, jwtService)
	matchProfileHandler := handler.NewMatchProfileHandler(secureRevealService, chatService, userRepo)
	photoUploadHandler := handler.NewPhotoUploadHandler(photoUploadService)

	// ── Build router ─────────────────────────────────────────
	router := handler.NewRouter(handler.Deps{
		JWTService:          jwtService,
		AuthHandler:         authHandler,
		MeHandler:           meHandler,
		DiscoveryHandler:    discoveryHandler,
		MatchesHandler:      matchesHandler,
		ChatHandler:         chatHandler,
		WSHandler:           wsHandler,
		MatchProfileHandler: matchProfileHandler,
		PhotoUploadHandler:  photoUploadHandler,
	})

	// Wire OpenAPI endpoint.
	openAPIPath := "specs/001-halo-functional-spec/contracts/openapi.yaml"
	router.Get("/openapi.yaml", handler.NewOpenAPIHandler(openAPIPath).ServeHTTP)

	// ── HTTP server ──────────────────────────────────────────
	srv := &http.Server{
		Addr:         fmt.Sprintf(":%d", cfg.Port),
		Handler:      router,
		ReadTimeout:  10 * time.Second,
		WriteTimeout: 30 * time.Second,
		IdleTimeout:  60 * time.Second,
	}

	// ── Graceful shutdown ────────────────────────────────────
	errCh := make(chan error, 1)
	go func() {
		slog.Info("halo-api listening", "port", cfg.Port)
		if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			errCh <- err
		}
		close(errCh)
	}()

	// Wait for interrupt signal.
	sigCh := make(chan os.Signal, 1)
	signal.Notify(sigCh, syscall.SIGINT, syscall.SIGTERM)

	select {
	case sig := <-sigCh:
		slog.Info("received signal, shutting down", "signal", sig)
	case err := <-errCh:
		return fmt.Errorf("server error: %w", err)
	}

	// Give in-flight requests up to 15 seconds to complete.
	shutdownCtx, shutdownCancel := context.WithTimeout(ctx, 15*time.Second)
	defer shutdownCancel()

	if err := srv.Shutdown(shutdownCtx); err != nil {
		return fmt.Errorf("shutdown: %w", err)
	}

	slog.Info("halo-api stopped")
	return nil
}
