"use client";

import { useCallback, useState } from "react";
import { DiscoveryCard, DiscoveryCardData } from "./DiscoveryCard";
import { useDiscovery } from "./useDiscovery";

/**
 * DiscoveryStack manages a vertical stack of discovery cards.
 * Shows one card at a time; swiping / tapping Pass/Connect advances to next.
 * When the stack runs out, fetches more cards automatically.
 */
export function DiscoveryStack() {
  const { cards, loading, error, actPass, actConnect, isEmpty } =
    useDiscovery();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [matchAlert, setMatchAlert] = useState<string | null>(null);

  const advance = useCallback(() => {
    setCurrentIndex((prev) => prev + 1);
  }, []);

  const handlePass = useCallback(async () => {
    const card = cards[currentIndex];
    if (!card) return;
    await actPass(card.card_id);
    advance();
  }, [cards, currentIndex, actPass, advance]);

  const handleConnect = useCallback(async () => {
    const card = cards[currentIndex];
    if (!card) return;
    const result = await actConnect(card.card_id);
    if (result?.status === "matched") {
      setMatchAlert("It's a match! 🎉");
      setTimeout(() => setMatchAlert(null), 3000);
    }
    advance();
  }, [cards, currentIndex, actConnect, advance]);

  // Loading state.
  if (loading && cards.length === 0) {
    console.log("[DiscoveryStack] Loading discovery cards...");
    return (
      <div className="text-center">
        <div className="mx-auto h-8 w-8 animate-spin rounded-full border-4 border-halo-primary border-t-transparent" />
        <p className="mt-4 text-sm text-gray-500">Finding people…</p>
      </div>
    );
  }

  // Error state.
  if (error) {
    console.log("[DiscoveryStack] Error state:", error);
    return (
      <div className="text-center">
        <p className="text-red-600">{error}</p>
      </div>
    );
  }

  // Empty state — no more candidates.
  const currentCard: DiscoveryCardData | undefined = cards[currentIndex];
  if (!currentCard || isEmpty) {
    console.log("[DiscoveryStack] 📭 Empty state - no more candidates or index out of range");
    return (
      <div className="text-center">
        <p className="text-lg font-semibold text-gray-600">
          No more profiles to show
        </p>
        <p className="mt-2 text-sm text-gray-400">
          Check back later for new people.
        </p>
      </div>
    );
  }

  return (
    <div className="relative w-full max-w-sm">
      {/* Match celebration overlay */}
      {matchAlert && (
        <div className="absolute inset-0 z-20 flex items-center justify-center rounded-2xl bg-halo-primary/90">
          <p className="text-2xl font-bold text-white">{matchAlert}</p>
        </div>
      )}

      {/* Current card */}
      <DiscoveryCard
        card={currentCard}
        onPass={handlePass}
        onConnect={handleConnect}
      />

      {/* Card counter */}
      <p className="mt-3 text-center text-xs text-gray-400">
        {currentIndex + 1} / {cards.length}
      </p>
    </div>
  );
}
