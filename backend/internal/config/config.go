package config

import (
	"fmt"
	"os"
	"strconv"
	"time"
)

// Config holds all environment-based configuration for the Halo API.
type Config struct {
	Port        int
	DatabaseURL string
	RedisURL    string

	JWT JWTConfig

	Media MediaConfig
}

// JWTConfig holds JWT-related settings.
type JWTConfig struct {
	SigningKey     string
	AccessExpiry  time.Duration
	RefreshExpiry time.Duration
}

// MediaConfig holds S3/CloudFront media settings.
type MediaConfig struct {
	S3Bucket            string
	CloudFrontDomain    string
	SignerKeyID         string
	SignerPrivateKeyPEM string
	URLExpiry           time.Duration
}

// Load reads configuration from environment variables.
// Returns an error if any required variable is missing.
func Load() (*Config, error) {
	port := envInt("HALO_PORT", 8080)

	dbURL, err := envRequired("HALO_DATABASE_URL")
	if err != nil {
		return nil, err
	}

	redisURL := envDefault("HALO_REDIS_URL", "redis://localhost:6379")

	jwtKey, err := envRequired("HALO_JWT_SIGNING_KEY")
	if err != nil {
		return nil, err
	}

	accessExpiry := envDuration("HALO_JWT_ACCESS_EXPIRY", 15*time.Minute)
	refreshExpiry := envDuration("HALO_JWT_REFRESH_EXPIRY", 7*24*time.Hour)

	return &Config{
		Port:        port,
		DatabaseURL: dbURL,
		RedisURL:    redisURL,
		JWT: JWTConfig{
			SigningKey:     jwtKey,
			AccessExpiry:  accessExpiry,
			RefreshExpiry: refreshExpiry,
		},
		Media: MediaConfig{
			S3Bucket:            envDefault("HALO_S3_BUCKET", ""),
			CloudFrontDomain:    envDefault("HALO_CLOUDFRONT_DOMAIN", ""),
			SignerKeyID:         envDefault("HALO_MEDIA_SIGNER_KEY_ID", ""),
			SignerPrivateKeyPEM: envDefault("HALO_MEDIA_SIGNER_PRIVATE_KEY_PEM", ""),
			URLExpiry:           envDuration("HALO_MEDIA_URL_EXPIRY", 15*time.Minute),
		},
	}, nil
}

func envRequired(key string) (string, error) {
	v := os.Getenv(key)
	if v == "" {
		return "", fmt.Errorf("required env var %s is not set", key)
	}
	return v, nil
}

func envDefault(key, fallback string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return fallback
}

func envInt(key string, fallback int) int {
	if v := os.Getenv(key); v != "" {
		if n, err := strconv.Atoi(v); err == nil {
			return n
		}
	}
	return fallback
}

func envDuration(key string, fallback time.Duration) time.Duration {
	if v := os.Getenv(key); v != "" {
		if d, err := time.ParseDuration(v); err == nil {
			return d
		}
	}
	return fallback
}
