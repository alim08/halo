"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { api, ChatMessage, Spark } from "@/lib/api";
import { HaloWS, NewMessagePayload } from "@/lib/ws";

/**
 * useChat manages chat state for a single match.
 *
 * - Loads messages via REST (with cursor pagination)
 * - Receives real-time messages via WebSocket
 * - Sends messages via REST with optimistic updates
 * - Reconciles pending messages using client_message_id
 * - Loads conversation sparks
 */
export function useChat(matchId: string, currentUserId: string) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [sparks, setSparks] = useState<Spark[]>([]);
  const [composerText, setComposerText] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);

  const wsRef = useRef<HaloWS | null>(null);
  const seenIds = useRef(new Set<string>());
  const pendingSeq = useRef(0);

  const generateClientMessageID = useCallback(() => {
    if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
      return crypto.randomUUID();
    }

    // Fallback UUIDv4 generator for older environments.
    return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
      const r = (Math.random() * 16) | 0;
      const v = c === "x" ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
  }, []);

  // Merge latest server messages with any still-pending optimistic messages.
  const syncLatestMessages = useCallback(async () => {
    const res = await api.chat.listMessages(matchId, 50);
    const serverMsgs = res.messages ?? [];
    serverMsgs.forEach((m) => seenIds.current.add(m.id));

    setMessages((prev) => {
      const pending = prev.filter((m) => m.id.startsWith("pending-"));

      // Keep only pending messages that are not yet represented by server data.
      const unresolvedPending = pending.filter((p) =>
        !serverMsgs.some(
          (s) =>
            s.sender_id === p.sender_id &&
            !!s.client_message_id &&
            s.client_message_id === p.client_message_id
        )
      );

      return [...unresolvedPending, ...serverMsgs];
    });
  }, [matchId]);

  // ── Initial data fetch ─────────────────────────────────────────────
  useEffect(() => {
    if (!matchId || !currentUserId) return;

    let cancelled = false;

    async function fetchInitial() {
      setLoading(true);
      setError(null);

      try {
        const [msgRes, sparksRes] = await Promise.all([
          api.chat.listMessages(matchId),
          api.matches.getSparks(matchId).catch(() => ({ sparks: [] })),
        ]);

        if (cancelled) return;

        // messages come newest-first from server
        const msgs = msgRes.messages ?? [];
        msgs.forEach((m) => seenIds.current.add(m.id));
        setMessages(msgs);
        setHasMore(msgs.length >= 30); // page size = 30
        setSparks(sparksRes.sparks ?? []);
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to load chat");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetchInitial();

    return () => {
      cancelled = true;
    };
  }, [matchId, currentUserId]);

  // ── WebSocket connection ───────────────────────────────────────────
  useEffect(() => {
    if (!matchId || !currentUserId) return;

    const token = localStorage.getItem("halo_access_token");
    if (!token) return;

    const ws = new HaloWS(token);
    wsRef.current = ws;
    ws.connect();

    const unsub = ws.on<NewMessagePayload>("new_message", (payload) => {
      // Be tolerant: backend may emit either wrapped payload
      // { match_id, message } or raw message object.
      const maybeWrapped = payload as unknown as {
        match_id?: string;
        message?: ChatMessage;
      };
      const incoming = maybeWrapped.message ?? (payload as unknown as ChatMessage);
      const incomingMatchID = maybeWrapped.match_id ?? incoming?.match_id;

      if (!incoming || incomingMatchID !== matchId) return;

      setMessages((prev) => {
        // Reconcile: if this is our own message, replace the pending one
        if (
          incoming.sender_id === currentUserId &&
          incoming.client_message_id
        ) {
          const pendingIdx = prev.findIndex(
            (m) =>
              m.id.startsWith("pending-") &&
              m.client_message_id === incoming.client_message_id
          );
          if (pendingIdx !== -1) {
            const next = [...prev];
            next[pendingIdx] = incoming;
            return next;
          }
        }

        // De-duplicate by server id
        if (seenIds.current.has(incoming.id)) return prev;
        seenIds.current.add(incoming.id);

        // Prepend (newest-first order)
        return [incoming, ...prev];
      });
    });

    return () => {
      unsub();
      ws.dispose();
      wsRef.current = null;
    };
  }, [matchId, currentUserId]);

  // Periodic server sync provides reliable cross-user updates even when
  // websocket delivery is unavailable or delayed.
  useEffect(() => {
    if (!matchId || !currentUserId) return;

    const timer = window.setInterval(() => {
      syncLatestMessages().catch(() => {
        // Silent retry on next interval.
      });
    }, 3000);

    return () => window.clearInterval(timer);
  }, [matchId, currentUserId, syncLatestMessages]);

  // ── Send message (optimistic) ──────────────────────────────────────
  const sendMessage = useCallback(async () => {
    const body = composerText.trim();
    if (!body) return false;

    pendingSeq.current += 1;
    const clientMessageId = generateClientMessageID();

    const pendingMsg: ChatMessage = {
      id: `pending-${clientMessageId}`,
      match_id: matchId,
      sender_id: currentUserId,
      client_message_id: clientMessageId,
      body,
      created_at: new Date().toISOString(),
    };

    // Add optimistic message (newest-first → prepend)
    setMessages((prev) => [pendingMsg, ...prev]);
    setComposerText("");

    try {
      const res = await api.chat.sendMessage(matchId, clientMessageId, body);

      // Reconcile: replace the pending with server version
      setMessages((prev) =>
        prev.map((m) =>
          m.id === `pending-${clientMessageId}` ? res.message : m
        )
      );
      seenIds.current.add(res.message.id);

      // Pull latest server truth to keep both participants in sync.
      syncLatestMessages().catch(() => {
        // Best-effort sync.
      });

      return true;
    } catch {
      // Mark as failed — remove the pending message
      setMessages((prev) =>
        prev.filter((m) => m.id !== `pending-${clientMessageId}`)
      );
      setError("Failed to send message. Please try again.");
      return false;
    }
  }, [composerText, matchId, currentUserId, generateClientMessageID, syncLatestMessages]);

  // ── Load more (cursor pagination) ─────────────────────────────────
  const loadMore = useCallback(async () => {
    if (!hasMore || loading) return;

    // Find the oldest non-pending message
    const realMessages = messages.filter((m) => !m.id.startsWith("pending-"));
    const oldest = realMessages[realMessages.length - 1];
    if (!oldest) return;

    setLoading(true);
    try {
      const res = await api.chat.listMessages(matchId, 30, oldest.created_at);
      const older = (res.messages ?? []).filter(
        (m) => !seenIds.current.has(m.id)
      );
      older.forEach((m) => seenIds.current.add(m.id));

      setMessages((prev) => [...prev, ...older]);
      setHasMore(older.length >= 30);
    } catch {
      // Silently fail on pagination — user can retry
    } finally {
      setLoading(false);
    }
  }, [matchId, messages, hasMore, loading]);

  return {
    messages,
    loading,
    error,
    sendMessage,
    sparks,
    composerText,
    setComposerText,
    loadMore,
    hasMore,
  };
}
