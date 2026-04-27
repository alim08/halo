"use client";

import { useCallback, useState, useMemo } from "react";
import { DiscoveryCard, DiscoveryCardData } from "./DiscoveryCard";
import { useDiscovery } from "./useDiscovery";
import { CardTemplateSelector, CardLayoutType } from "@/lib/cardTemplates";

/**
 * DiscoveryStack manages a vertical stack of discovery cards.
 * Shows one card at a time; swiping / tapping Pass/Connect advances to next.
 * When the stack runs out, fetches more cards automatically.
 *
 * Uses CardTemplateSelector to vary card layouts and avoid repetition.
 */
export function DiscoveryStack() {
  const { cards, loading, error, actPass, actConnect, isEmpty } =
    useDiscovery();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [matchAlert, setMatchAlert] = useState<string | null>(null);

  // Initialize template selector
  const templateSelector = useMemo(() => new CardTemplateSelector(), []);

  // Determine template for current card
  const currentTemplate: CardLayoutType = useMemo(() => {
    return templateSelector.selectTemplate();
  }, [currentIndex, templateSelector]);

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
    return (
      <div className="text-center">
        <div className="mx-auto h-8 w-8 animate-spin rounded-full border-4 border-halo-primary border-t-transparent" />
        <p className="mt-4 text-sm text-gray-500">Finding people…</p>
      </div>
    );
  }

  // Error state.
  if (error) {
    return (
      <div className="text-center">
        <p className="text-red-600">{error}</p>
      </div>
    );
  }

  // Empty state — no more candidates.
  const currentCard: DiscoveryCardData | undefined = cards[currentIndex];
  if (!currentCard || isEmpty) {
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

      {/* Current card with dynamic template */}
      <DiscoveryCard
        card={currentCard}
        templateType={currentTemplate}
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
