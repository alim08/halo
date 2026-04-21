"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { api, MatchProfileResponse } from "@/lib/api";
import { HaloWS } from "@/lib/ws";

/**
 * useMatchProfile fetches and manages the match partner profile,
 * including the Secure Reveal photo variant and connection level.
 *
 * Re-fetches when:
 * - matchId or currentUserId changes (mount / navigation)
 * - A "level_changed" WebSocket event arrives for this match
 * - refreshProfile() is called manually (e.g., after sending a message)
 */
export function useMatchProfile(matchId: string, currentUserId: string) {
  const [profile, setProfile] = useState<MatchProfileResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const prevLevelRef = useRef<number>(0);

  // ── Fetch profile ──────────────────────────────────────────
  const fetchProfile = useCallback(async () => {
    if (!matchId) return;

    try {
      const data = await api.matches.getProfile(matchId);
      setProfile(data);
      setError(null);

      // Detect level change
      if (prevLevelRef.current > 0 && data.current_connection_level > prevLevelRef.current) {
        // Level increased — the photo variant URL has changed
      }
      prevLevelRef.current = data.current_connection_level;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load profile");
    } finally {
      setLoading(false);
    }
  }, [matchId]);

  // ── Initial fetch ──────────────────────────────────────────
  useEffect(() => {
    if (!matchId || !currentUserId) return;
    setLoading(true);
    fetchProfile();
  }, [matchId, currentUserId, fetchProfile]);

  // ── WebSocket: re-fetch on level_changed or new_message ───
  useEffect(() => {
    if (!matchId || !currentUserId) return;

    const token = localStorage.getItem("halo_access_token");
    if (!token) return;

    const ws = new HaloWS(token);
    ws.connect();

    // Re-fetch profile when a level change event is received
    const unsubLevel = ws.on("match_created", (payload: unknown) => {
      // The WS may broadcast level changes as match events
      const p = payload as { match_id?: string };
      if (p.match_id === matchId) {
        fetchProfile();
      }
    });

    // Also re-fetch on new messages (level may have changed)
    const unsubMsg = ws.on("new_message", (payload: unknown) => {
      const p = payload as { match_id?: string };
      if (p.match_id === matchId) {
        // Debounce: delay 500ms to let level update first
        setTimeout(() => fetchProfile(), 500);
      }
    });

    return () => {
      unsubLevel();
      unsubMsg();
      ws.dispose();
    };
  }, [matchId, currentUserId, fetchProfile]);

  // ── Manual refresh (call after sending a message) ──────────
  useEffect(() => {
    if (!matchId || !currentUserId) return;

    const timer = window.setInterval(() => {
      fetchProfile().catch(() => {
        // Silent retry on next interval.
      });
    }, 3000);

    return () => window.clearInterval(timer);
  }, [matchId, currentUserId, fetchProfile]);

  const refreshProfile = useCallback(() => {
    fetchProfile();
  }, [fetchProfile]);

  return {
    profile,
    loading,
    error,
    refreshProfile,
  };
}
