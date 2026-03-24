/**
 * ws.ts — WebSocket client for real-time events.
 *
 * Connects to /v1/ws with a Bearer token, auto-reconnects with
 * exponential back-off, and dispatches typed events.
 */

export type WSEventType = "new_message" | "match_created";

export interface WSEvent<T = unknown> {
  type: WSEventType;
  payload: T;
}

export interface NewMessagePayload {
  match_id: string;
  message: {
    id: string;
    match_id: string;
    sender_id: string;
    body: string;
    client_message_id?: string;
    created_at: string;
  };
}

export interface MatchCreatedPayload {
  match_id: string;
  other_user_id: string;
}

type Listener<T = unknown> = (payload: T) => void;

const BASE_RECONNECT_MS = 1000;
const MAX_RECONNECT_MS = 30000;

export class HaloWS {
  private ws: WebSocket | null = null;
  private token: string;
  private baseUrl: string;
  private listeners = new Map<WSEventType, Set<Listener>>();
  private reconnectAttempt = 0;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private disposed = false;

  constructor(token: string) {
    this.token = token;
    const httpBase =
      process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080";
    // Convert http(s) -> ws(s)
    this.baseUrl = httpBase
      .replace(/^https:/, "wss:")
      .replace(/^http:/, "ws:");
  }

  /** Connect to the WebSocket server. */
  connect(): void {
    if (this.disposed) return;

    const url = `${this.baseUrl}/v1/ws?token=${encodeURIComponent(this.token)}`;

    try {
      this.ws = new WebSocket(url);
    } catch {
      this.scheduleReconnect();
      return;
    }

    this.ws.onopen = () => {
      this.reconnectAttempt = 0;
    };

    this.ws.onmessage = (event) => {
      try {
        const parsed: WSEvent = JSON.parse(event.data as string);
        this.emit(parsed.type, parsed.payload);
      } catch {
        // Ignore unparseable frames
      }
    };

    this.ws.onclose = () => {
      if (!this.disposed) {
        this.scheduleReconnect();
      }
    };

    this.ws.onerror = () => {
      // onclose will fire after onerror, triggering reconnect
      this.ws?.close();
    };
  }

  /** Register an event listener. Returns an unsubscribe function. */
  on<T = unknown>(type: WSEventType, listener: Listener<T>): () => void {
    if (!this.listeners.has(type)) {
      this.listeners.set(type, new Set());
    }
    const set = this.listeners.get(type)!;
    const wrapped = listener as Listener;
    set.add(wrapped);

    return () => {
      set.delete(wrapped);
    };
  }

  /** Close the connection and prevent reconnection. */
  dispose(): void {
    this.disposed = true;
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
    }
    this.ws?.close();
    this.listeners.clear();
  }

  private emit(type: WSEventType, payload: unknown): void {
    const set = this.listeners.get(type);
    if (set) {
      set.forEach((fn) => fn(payload));
    }
  }

  private scheduleReconnect(): void {
    if (this.disposed) return;

    const delay = Math.min(
      BASE_RECONNECT_MS * 2 ** this.reconnectAttempt,
      MAX_RECONNECT_MS
    );
    this.reconnectAttempt++;

    this.reconnectTimer = setTimeout(() => {
      this.connect();
    }, delay);
  }
}
