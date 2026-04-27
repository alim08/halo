/**
 * API client wrapper with Bearer token auth.
 * All requests go through this module so auth is handled automatically.
 */

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080";

type RequestOptions = {
  method?: string;
  body?: unknown;
  headers?: Record<string, string>;
};

class ApiError extends Error {
  status: number;
  code: string;

  constructor(status: number, code: string, message: string) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
  }
}

async function request<T>(path: string, opts: RequestOptions = {}): Promise<T> {
  const { method = "GET", body, headers = {} } = opts;

  const token = getAccessToken();
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  if (body) {
    headers["Content-Type"] = "application/json";
  }

  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!res.ok) {
    let code = "unknown";
    let message = "An error occurred";

    try {
      const errBody = await res.json();
      code = errBody.error?.code || code;
      message = errBody.error?.message || message;
    } catch {
      // response body wasn't JSON
    }

    // If 401, clear stored token (expired or invalid).
    if (res.status === 401) {
      clearAuth();
    }

    throw new ApiError(res.status, code, message);
  }

  // 204 No Content
  if (res.status === 204) {
    return undefined as T;
  }

  return res.json();
}

// ── Token helpers ────────────────────────────────────────

const TOKEN_KEY = "halo_access_token";
const REFRESH_KEY = "halo_refresh_token";

export function getAccessToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(TOKEN_KEY);
}

export function setAuth(accessToken: string, refreshToken: string): void {
  localStorage.setItem(TOKEN_KEY, accessToken);
  localStorage.setItem(REFRESH_KEY, refreshToken);
}

export function clearAuth(): void {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(REFRESH_KEY);
}

export function isAuthenticated(): boolean {
  return !!getAccessToken();
}

// ── Typed API methods ────────────────────────────────────

export type AuthResponse = {
  access_token: string;
  token_type: string;
  expires_in_seconds: number;
  refresh_token: string;
};

export type MeResponse = {
  id: string;
  is_onboarded: boolean;
  coarse_location?: string;
  profile_data: Record<string, unknown>;
};

export type ComparisonProfile = {
  lifestyle_habits?: Record<string, unknown>;
  lifestyle?: Record<string, unknown>;
  vibe?: Record<string, unknown>;
  connection_style?: Record<string, unknown>;
  connection?: Record<string, unknown>;
  interests?: string[];
};

export type DiscoveryCard = {
  card_id: string;
  age: number;
  location: string;
  vibe_tags: string[];
  prompt_answers: { question: string; answer: string }[];
  lifestyle_habits?: Record<string, unknown>;
  vibe?: Record<string, unknown>;
  connection_style?: Record<string, unknown>;
  interests?: string[];
  profile_data?: ComparisonProfile;
};

export type DiscoveryResponse = {
  cards: DiscoveryCard[];
};

export type ConnectResponse = {
  status: "intent_recorded" | "matched";
  match_id?: string;
};

export type UserPublic = {
  display_name: string;
  age: number;
  location: string;
  vibe_tags?: string[];
};

export type MatchSummary = {
  match_id: string;
  partner: UserPublic;
  current_connection_level: number;
  last_message_at: string | null;
};

export type ListMatchesResponse = {
  matches: MatchSummary[];
  next_cursor?: string;
};

export type Spark = {
  id: string;
  label: string;
  suggested_message: string;
};

export type SparksResponse = {
  sparks: Spark[];
};

export type ChatMessage = {
  id: string;
  match_id: string;
  sender_id: string;
  client_message_id?: string;
  body: string;
  created_at: string;
};

export type ListMessagesResponse = {
  messages: ChatMessage[];
};

export type SendMessageResponse = {
  message: ChatMessage;
};

// ── Phase 6: Secure Reveal types ─────────────────────────

export type PhotoVariant = {
  variant: "blur_heavy" | "blur_med" | "blur_light" | "clear";
  url: string;
  expires_at: string;
};

export type ConnectionProgress = {
  total_exchanged_counted: number;
  min_each_user_required: number;
  next_level_total_required: number | null;
};

export type MatchProfileResponse = {
  match_id: string;
  partner: UserPublic;
  current_connection_level: number;
  progress: ConnectionProgress;
  photo: PhotoVariant | null;
};

export type CreateUploadUrlRequest = {
  content_type: "image/jpeg" | "image/png" | "image/webp";
};

export type CreateUploadUrlResponse = {
  upload_url: string;
  object_key: string;
  expires_at: string;
};

export const api = {
  auth: {
    register(email: string, password: string) {
      return request<AuthResponse>("/v1/auth/register", {
        method: "POST",
        body: { email, password },
      });
    },
    login(email: string, password: string) {
      return request<AuthResponse>("/v1/auth/login", {
        method: "POST",
        body: { email, password },
      });
    },
  },

  me: {
    get() {
      return request<MeResponse>("/v1/me");
    },
    updateProfile(data: {
      birthdate?: string;
      coarse_location?: string;
      profile_data?: Record<string, unknown>;
    }) {
      return request<MeResponse>("/v1/me/profile", {
        method: "PUT",
        body: data,
      });
    },
  },

  discovery: {
    getFeed(limit = 20) {
      return request<DiscoveryResponse>(`/v1/discovery?limit=${limit}`);
    },
    pass(cardId: string) {
      return request<void>(`/v1/discovery/${cardId}/pass`, { method: "POST" });
    },
    connect(cardId: string) {
      return request<ConnectResponse>(`/v1/discovery/${cardId}/connect`, {
        method: "POST",
      });
    },
  },

  matches: {
    list(limit = 50, cursor?: string) {
      let url = `/v1/matches?limit=${limit}`;
      if (cursor) url += `&cursor=${cursor}`;
      return request<ListMatchesResponse>(url);
    },
    getSparks(matchId: string) {
      return request<SparksResponse>(`/v1/matches/${matchId}/sparks`);
    },
    getProfile(matchId: string) {
      return request<MatchProfileResponse>(`/v1/matches/${matchId}/profile`);
    },
  },

  chat: {
    listMessages(matchId: string, limit = 50, before?: string) {
      let url = `/v1/matches/${matchId}/messages?limit=${limit}`;
      if (before) url += `&before=${encodeURIComponent(before)}`;
      return request<ListMessagesResponse>(url);
    },
    sendMessage(matchId: string, clientMessageId: string, body: string) {
      return request<SendMessageResponse>(
        `/v1/matches/${matchId}/messages`,
        {
          method: "POST",
          body: { client_message_id: clientMessageId, body },
        }
      );
    },
  },

  photos: {
    createUploadUrl(contentType: CreateUploadUrlRequest["content_type"]) {
      return request<CreateUploadUrlResponse>("/v1/me/photos/upload-url", {
        method: "POST",
        body: { content_type: contentType },
      });
    },
  },
};
