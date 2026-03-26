package ws

import (
	"context"
	"encoding/json"
	"log/slog"

	"github.com/redis/go-redis/v9"
)

const pubsubChannel = "halo:ws:events"

// PubSub enables multi-instance WebSocket event fanout via Redis Pub/Sub.
// When a message is sent on any API instance, it is published to Redis.
// Each instance subscribes and delivers to locally-connected WebSocket clients.
type PubSub struct {
	client *redis.Client
	hub    *Hub
}

// NewPubSub creates a new PubSub fanout.
func NewPubSub(client *redis.Client, hub *Hub) *PubSub {
	return &PubSub{client: client, hub: hub}
}

// pubsubMessage is the envelope published to Redis.
type pubsubMessage struct {
	RecipientIDs []string        `json:"recipient_ids"`
	Event        json.RawMessage `json:"event"`
}

// Publish sends an event to all instances via Redis Pub/Sub.
func (ps *PubSub) Publish(ctx context.Context, event WSEvent, recipientIDs []string) error {
	eventData, err := json.Marshal(event)
	if err != nil {
		return err
	}

	msg := pubsubMessage{
		RecipientIDs: recipientIDs,
		Event:        eventData,
	}
	data, err := json.Marshal(msg)
	if err != nil {
		return err
	}

	return ps.client.Publish(ctx, pubsubChannel, data).Err()
}

// Subscribe starts listening for events from other instances.
// Should be called in a goroutine. Blocks until the context is cancelled.
func (ps *PubSub) Subscribe(ctx context.Context) {
	sub := ps.client.Subscribe(ctx, pubsubChannel)
	defer sub.Close()

	ch := sub.Channel()
	slog.Info("ws: pubsub subscription started")

	for {
		select {
		case <-ctx.Done():
			slog.Info("ws: pubsub subscription stopped")
			return
		case redisMsg, ok := <-ch:
			if !ok {
				return
			}
			ps.handleMessage(redisMsg.Payload)
		}
	}
}

// handleMessage processes a single Pub/Sub message and delivers to local connections.
func (ps *PubSub) handleMessage(payload string) {
	var msg pubsubMessage
	if err := json.Unmarshal([]byte(payload), &msg); err != nil {
		slog.Error("ws: pubsub unmarshal", "error", err)
		return
	}

	ps.hub.mu.RLock()
	defer ps.hub.mu.RUnlock()

	for _, uid := range msg.RecipientIDs {
		if set, ok := ps.hub.conns[uid]; ok {
			for conn := range set {
				conn.Send(msg.Event)
			}
		}
	}
}
