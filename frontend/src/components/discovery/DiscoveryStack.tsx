"use client";

import { useCallback, useState, useMemo } from "react";
import { DiscoveryCard, DiscoveryCardData } from "./DiscoveryCard";
import { useDiscovery } from "./useDiscovery";
import { CardTemplateSelector, CardLayoutType } from "@/lib/cardTemplates";
import { type ComparisonProfile } from "@/lib/api";

type DiscoveryStackProps = {
  currentUserProfile: ComparisonProfile | null;
};

export function DiscoveryStack({ currentUserProfile }: DiscoveryStackProps) {
  const {
    cards,
    currentUserProfile: profileFromHook,
    loading,
    error,
    actPass,
    actConnect,
    isEmpty,
  } = useDiscovery({ currentUserProfile });
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
      setMatchAlert("It's a match!");
      setTimeout(() => setMatchAlert(null), 3000);
    }
    advance();
  }, [cards, currentIndex, actConnect, advance]);

  if (loading && cards.length === 0) {
    return (
      <div className="text-center">
        <div className="mx-auto h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        <p className="mt-4 text-sm text-on-surface-variant">Finding people...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center">
        <p className="text-halo-error">{error}</p>
      </div>
    );
  }

  const currentCard: DiscoveryCardData | undefined = cards[currentIndex];
  if (!currentCard || isEmpty) {
    return (
      <div className="mx-auto max-w-sm rounded-4xl bg-halo-surface-container-low p-10 text-center shadow-ambient">
        <p className="font-serif text-xl font-semibold text-halo-on-surface">
          No more profiles to show
        </p>
        <p className="mt-2 text-sm text-halo-on-surface-variant">
          Check back later for new people.
        </p>
      </div>
    );
  }

  return (
    <div className="relative w-full max-w-md">
      {/* Match celebration overlay */}
      {matchAlert && (
        <div className="absolute inset-0 z-20 flex items-center justify-center rounded-4xl bg-gradient-to-r from-halo-primary to-halo-primary-container">
          <p className="font-serif text-3xl font-bold text-halo-on-primary">
            {matchAlert}
          </p>
        </div>
      )}

      <DiscoveryCard
        card={currentCard}
        templateType={currentTemplate}
        currentUserProfile={profileFromHook}
        onPass={handlePass}
        onConnect={handleConnect}
      />

      <p className="mt-4 text-center text-sm text-halo-on-surface-variant">
        {currentIndex + 1} / {cards.length}
      </p>
    </div>
  );
}
