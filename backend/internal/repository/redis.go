package repository

import (
	"context"
	"fmt"

	"github.com/redis/go-redis/v9"
)

// NewRedisClient creates a new Redis client from the given URL.
// The url should be a valid Redis URL (e.g., "redis://localhost:6379").
func NewRedisClient(ctx context.Context, url string) (*redis.Client, error) {
	opts, err := redis.ParseURL(url)
	if err != nil {
		return nil, fmt.Errorf("parse redis url: %w", err)
	}

	client := redis.NewClient(opts)

	// Verify connectivity.
	if err := client.Ping(ctx).Err(); err != nil {
		_ = client.Close()
		return nil, fmt.Errorf("ping redis: %w", err)
	}

	return client, nil
}

// HealthCheckRedis verifies the Redis connection is alive.
func HealthCheckRedis(ctx context.Context, client *redis.Client) error {
	return client.Ping(ctx).Err()
}
