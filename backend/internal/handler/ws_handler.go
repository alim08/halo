package handler

import (
	"context"
	"log/slog"
	"net/http"
	"time"

	"nhooyr.io/websocket"

	"halo/backend/internal/auth"
	"halo/backend/internal/ws"
)

// WSHandler handles WebSocket connections at /v1/ws.
type WSHandler struct {
	hub        *ws.Hub
	jwtService *auth.JWTService
}

// NewWSHandler creates a new WSHandler.
func NewWSHandler(hub *ws.Hub, jwtService *auth.JWTService) *WSHandler {
	return &WSHandler{hub: hub, jwtService: jwtService}
}

// ServeHTTP upgrades to WebSocket after authenticating via Bearer token.
// Supports token from Authorization header (preferred) or ?token= query param.
func (h *WSHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	// Authenticate: try header first, then query param.
	userID := auth.UserIDFromContext(r.Context())
	if userID == "" {
		// Fallback: token query param (for clients that can't set headers).
		token := r.URL.Query().Get("token")
		if token == "" {
			http.Error(w, "unauthorized", http.StatusUnauthorized)
			return
		}
		claims, err := h.jwtService.Verify(token)
		if err != nil {
			http.Error(w, "invalid token", http.StatusUnauthorized)
			return
		}
		userID = claims.UserID
	}

	// Accept WebSocket upgrade.
	wsConn, err := websocket.Accept(w, r, &websocket.AcceptOptions{
		InsecureSkipVerify: true, // Allow any origin in development.
	})
	if err != nil {
		slog.Error("ws: accept failed", "error", err)
		return
	}

	conn := ws.NewConn(userID)
	h.hub.Register(conn)
	defer func() {
		h.hub.Unregister(conn)
		wsConn.Close(websocket.StatusNormalClosure, "goodbye")
	}()

	ctx, cancel := context.WithCancel(r.Context())
	defer cancel()

	// Read pump: consume incoming messages (keepalive pongs, etc.).
	go func() {
		defer cancel()
		for {
			_, _, err := wsConn.Read(ctx)
			if err != nil {
				return
			}
			// We currently don't process inbound WS messages —
			// chat is sent via REST POST. This pump keeps the connection alive.
		}
	}()

	// Write pump: send outbound messages from the hub.
	for {
		select {
		case <-ctx.Done():
			return
		case data, ok := <-conn.SendCh():
			if !ok {
				return
			}
			writeCtx, writeCancel := context.WithTimeout(ctx, 5*time.Second)
			err := wsConn.Write(writeCtx, websocket.MessageText, data)
			writeCancel()
			if err != nil {
				slog.Warn("ws: write failed", "user_id", userID, "error", err)
				return
			}
		}
	}
}
