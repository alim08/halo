package service

import (
	"context"
	"encoding/json"
	"fmt"
	"time"

	"github.com/redis/go-redis/v9"

	"halo/backend/internal/model"
)

// ChatCache provides Redis-backed hot caching of recent messages.
// Stores the last 50 messages per match as a Redis List.
type ChatCache struct {
	client *redis.Client
}

// NewChatCache creates a new ChatCache.
func NewChatCache(client *redis.Client) *ChatCache {
	return &ChatCache{client: client}
}

const (
	chatCachePrefix = "chat:messages:"
	chatCacheMax    = 50
	chatCacheTTL    = 24 * time.Hour
)

func chatKey(matchID string) string {
	return chatCachePrefix + matchID
}

// PushMessage adds a message to the head of the Redis list for the match.
// Trims the list to the last 50 entries and refreshes TTL.
func (c *ChatCache) PushMessage(ctx context.Context, matchID string, msg *model.Message) error {
	data, err := json.Marshal(msg)
	if err != nil {
		return fmt.Errorf("marshal message: %w", err)
	}

	key := chatKey(matchID)
	pipe := c.client.Pipeline()
	pipe.LPush(ctx, key, data)
	pipe.LTrim(ctx, key, 0, chatCacheMax-1)
	pipe.Expire(ctx, key, chatCacheTTL)

	if _, err := pipe.Exec(ctx); err != nil {
		return fmt.Errorf("push message to cache: %w", err)
	}

	return nil
}

// GetMessages retrieves the most recent messages from the cache.
// Returns nil if the cache key doesn't exist or is empty.
func (c *ChatCache) GetMessages(ctx context.Context, matchID string, limit int) ([]*model.Message, error) {
	if limit <= 0 || limit > chatCacheMax {
		limit = chatCacheMax
	}

	key := chatKey(matchID)
	results, err := c.client.LRange(ctx, key, 0, int64(limit-1)).Result()
	if err != nil {
		return nil, fmt.Errorf("get cached messages: %w", err)
	}

	if len(results) == 0 {
		return nil, nil
	}

	messages := make([]*model.Message, 0, len(results))
	for _, raw := range results {
		var msg model.Message
		if err := json.Unmarshal([]byte(raw), &msg); err != nil {
			continue // skip corrupted entries
		}
		messages = append(messages, &msg)
	}

	return messages, nil
}
