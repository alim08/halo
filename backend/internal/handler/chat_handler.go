package handler

import (
	"encoding/json"
	"errors"
	"log/slog"
	"net/http"
	"strconv"

	"github.com/go-chi/chi/v5"

	"halo/backend/internal/auth"
	"halo/backend/internal/handler/httputil"
	"halo/backend/internal/model"
	"halo/backend/internal/repository"
	"halo/backend/internal/service"
	"halo/backend/internal/ws"
)

// ChatHandler handles /v1/matches/{matchId}/messages endpoints.
type ChatHandler struct {
	chatService *service.ChatService
	hub         *ws.Hub
	pubsub      *ws.PubSub
}

// NewChatHandler creates a new ChatHandler.
func NewChatHandler(chatService *service.ChatService, hub *ws.Hub, pubsub *ws.PubSub) *ChatHandler {
	return &ChatHandler{chatService: chatService, hub: hub, pubsub: pubsub}
}

// sendMessageRequest matches the OpenAPI SendMessageRequest schema.
type sendMessageRequest struct {
	ClientMessageID string `json:"client_message_id"`
	Body            string `json:"body"`
}

// ListMessages handles GET /v1/matches/{matchId}/messages.
func (h *ChatHandler) ListMessages(w http.ResponseWriter, r *http.Request) {
	userID := auth.UserIDFromContext(r.Context())
	if userID == "" {
		httputil.Unauthorized(w, "not authenticated")
		return
	}

	matchID := matchIDFromRequest(r)
	if matchID == "" {
		httputil.BadRequest(w, "matchId is required")
		return
	}

	limit := 50
	if raw := r.URL.Query().Get("limit"); raw != "" {
		n, err := strconv.Atoi(raw)
		if err != nil || n < 1 {
			httputil.BadRequest(w, "limit must be a positive integer")
			return
		}
		if n > 100 {
			n = 100
		}
		limit = n
	}

	var before *string
	if b := r.URL.Query().Get("before"); b != "" {
		before = &b
	}

	messages, err := h.chatService.ListMessages(r.Context(), matchID, userID, limit, before)
	if err != nil {
		if errors.Is(err, repository.ErrMatchNotFound) {
			httputil.NotFound(w, "match not found")
			return
		}
		if errors.Is(err, service.ErrNotParticipant) {
			httputil.Forbidden(w, "not a participant")
			return
		}
		httputil.InternalError(w)
		return
	}

	if messages == nil {
		messages = make([]*model.Message, 0)
	}

	httputil.EncodeJSON(w, http.StatusOK, map[string]interface{}{
		"messages": messages,
	})
}

// SendMessage handles POST /v1/matches/{matchId}/messages.
// Response includes client_message_id echo + server timestamp for optimistic UI reconciliation.
func (h *ChatHandler) SendMessage(w http.ResponseWriter, r *http.Request) {
	userID := auth.UserIDFromContext(r.Context())
	if userID == "" {
		httputil.Unauthorized(w, "not authenticated")
		return
	}

	matchID := matchIDFromRequest(r)
	if matchID == "" {
		httputil.BadRequest(w, "matchId is required")
		return
	}

	var req sendMessageRequest
	if err := httputil.DecodeJSON(r, &req); err != nil {
		httputil.BadRequest(w, err.Error())
		return
	}

	if req.Body == "" {
		httputil.BadRequest(w, "body is required")
		return
	}

	result, err := h.chatService.SendMessage(r.Context(), &service.SendMessageRequest{
		MatchID:         matchID,
		SenderID:        userID,
		ClientMessageID: req.ClientMessageID,
		Body:            req.Body,
	})
	if err != nil {
		if errors.Is(err, service.ErrNotParticipant) {
			httputil.Forbidden(w, "not a participant")
			return
		}
		if errors.Is(err, repository.ErrMatchNotFound) {
			httputil.NotFound(w, "match not found")
			return
		}
		httputil.InternalError(w)
		return
	}

	// Broadcast new_message to both match participants.
	match, matchErr := h.chatService.GetMatch(r.Context(), matchID, userID)
	if matchErr == nil {
		recipients := []string{match.UserAID, match.UserBID}
		localBroadcast := false
		pubsubBroadcast := false

		if h.hub != nil {
			h.hub.BroadcastMessage(result.Message, recipients)
			localBroadcast = true
		}

		if h.pubsub != nil {
			payload, marshalErr := json.Marshal(map[string]interface{}{
				"match_id": result.Message.MatchID,
				"message":  result.Message,
			})
			if marshalErr != nil {
				slog.Warn("ws: marshal pubsub payload failed", "error", marshalErr)
			} else {
				event := ws.WSEvent{Type: "new_message", Payload: payload}
				if pubErr := h.pubsub.Publish(r.Context(), event, recipients); pubErr != nil {
					slog.Warn("ws: pubsub publish failed", "error", pubErr)
				} else {
					pubsubBroadcast = true
				}
			}
		}

		slog.Info("chat: message sent",
			"message_id", result.Message.ID,
			"match_id", result.Message.MatchID,
			"sender_id", result.Message.SenderID,
			"recipient_ids", recipients,
			"local_ws_broadcast", localBroadcast,
			"pubsub_broadcast", pubsubBroadcast,
		)
	} else {
		slog.Warn("ws: unable to resolve match recipients for broadcast", "match_id", matchID, "error", matchErr)
	}

	httputil.EncodeJSON(w, http.StatusCreated, result)
}

// matchIDFromRequest extracts the matchId URL param.
func matchIDFromRequest(r *http.Request) string {
	return chi.URLParam(r, "matchId")
}
