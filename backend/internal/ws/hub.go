package ws

import (
	"encoding/json"
	"log/slog"
	"sync"

	"halo/backend/internal/model"
)

// Hub manages active WebSocket connections and broadcasts messages.
type Hub struct {
	mu    sync.RWMutex
	conns map[string]map[*Conn]struct{} // userID → set of connections
}

// NewHub creates a new Hub.
func NewHub() *Hub {
	return &Hub{
		conns: make(map[string]map[*Conn]struct{}),
	}
}

// Register adds a connection to the hub.
func (h *Hub) Register(conn *Conn) {
	h.mu.Lock()
	defer h.mu.Unlock()

	if h.conns[conn.UserID] == nil {
		h.conns[conn.UserID] = make(map[*Conn]struct{})
	}
	h.conns[conn.UserID][conn] = struct{}{}
	slog.Info("ws: connection registered", "user_id", conn.UserID)
}

// Unregister removes a connection from the hub.
func (h *Hub) Unregister(conn *Conn) {
	h.mu.Lock()
	defer h.mu.Unlock()

	if set, ok := h.conns[conn.UserID]; ok {
		delete(set, conn)
		if len(set) == 0 {
			delete(h.conns, conn.UserID)
		}
	}
	slog.Info("ws: connection unregistered", "user_id", conn.UserID)
}

// WSEvent is the envelope sent over WebSocket connections.
type WSEvent struct {
	Type    string          `json:"type"` // "new_message", "match_created", etc.
	Payload json.RawMessage `json:"payload"`
}

// BroadcastMessage sends a new message event to all connections of the
// specified user IDs (typically both participants of a match).
func (h *Hub) BroadcastMessage(msg *model.Message, recipientUserIDs []string) {
	payload, err := json.Marshal(map[string]interface{}{
		"match_id": msg.MatchID,
		"message":  msg,
	})
	if err != nil {
		slog.Error("ws: marshal message", "error", err)
		return
	}

	event := WSEvent{
		Type:    "new_message",
		Payload: payload,
	}
	eventData, err := json.Marshal(event)
	if err != nil {
		slog.Error("ws: marshal event", "error", err)
		return
	}

	h.mu.RLock()
	defer h.mu.RUnlock()

	for _, uid := range recipientUserIDs {
		if set, ok := h.conns[uid]; ok {
			for conn := range set {
				conn.Send(eventData)
			}
		}
	}
}

// BroadcastMatchCreated notifies both users that a new match was created.
func (h *Hub) BroadcastMatchCreated(matchID string, userIDs []string) {
	payload, _ := json.Marshal(map[string]string{"match_id": matchID})
	event := WSEvent{
		Type:    "match_created",
		Payload: payload,
	}
	eventData, _ := json.Marshal(event)

	h.mu.RLock()
	defer h.mu.RUnlock()

	for _, uid := range userIDs {
		if set, ok := h.conns[uid]; ok {
			for conn := range set {
				conn.Send(eventData)
			}
		}
	}
}

// Conn represents a single WebSocket connection.
type Conn struct {
	UserID string
	sendCh chan []byte
}

// NewConn creates a new Conn with a buffered send channel.
func NewConn(userID string) *Conn {
	return &Conn{
		UserID: userID,
		sendCh: make(chan []byte, 64),
	}
}

// Send queues a message for delivery. Non-blocking — drops if buffer is full.
func (c *Conn) Send(data []byte) {
	select {
	case c.sendCh <- data:
	default:
		slog.Warn("ws: send buffer full, dropping message", "user_id", c.UserID)
	}
}

// SendCh returns the send channel for reading outbound messages.
func (c *Conn) SendCh() <-chan []byte {
	return c.sendCh
}
