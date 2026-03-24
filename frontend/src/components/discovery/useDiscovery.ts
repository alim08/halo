"use client";

import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/api";
import { DiscoveryCardData } from "./DiscoveryCard";

type ConnectResult = {
  status: "intent_recorded" | "matched";
  match_id?: string;
};

/**
 * useDiscovery fetches and manages the discovery card stack.
 * Provides actions for Pass and Connect that call the API.
 */
export function useDiscovery() {
  const [cards, setCards] = useState<DiscoveryCardData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isEmpty, setIsEmpty] = useState(false);

  const fetchCards = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const resp = await api.discovery.getFeed();
      if (resp.cards.length === 0) {
        setIsEmpty(true);
      } else {
        setCards(resp.cards);
        setIsEmpty(false);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load cards");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCards();
  }, [fetchCards]);

  const actPass = useCallback(async (cardId: string) => {
    try {
      await api.discovery.pass(cardId);
    } catch {
      // Silently handle — card already advanced.
    }
  }, []);

  const actConnect = useCallback(async (cardId: string): Promise<ConnectResult | null> => {
    try {
      return await api.discovery.connect(cardId);
    } catch {
      return null;
    }
  }, []);

  return { cards, loading, error, isEmpty, actPass, actConnect, refetch: fetchCards };
}
