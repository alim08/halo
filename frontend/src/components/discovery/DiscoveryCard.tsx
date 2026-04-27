/**
 * Main DiscoveryCard orchestrator
 * Routes to different card layouts based on template selection
 * Transforms raw API data into template-specific formats
 */

"use client";

import { useMemo } from "react";
import { ClassicCard, ClassicCardData } from "./cardTypes/ClassicCard";
import { QuoteCard, QuoteCardData } from "./cardTypes/QuoteCard";
import { LifestyleCard, LifestyleCardData } from "./cardTypes/LifestyleCard";
import { CardLayoutType } from "@/lib/cardTemplates";
import { getLifestyleBadges } from "@/lib/cardTemplates";

/**
 * Raw discovery card data from API
 */
export type DiscoveryCardData = {
  card_id: string;
  age: number;
  location: string;
  vibe_tags: string[];
  prompt_answers: { question: string; answer: string }[];
  profile_data?: Record<string, any>;
  layout_type?: CardLayoutType;
};

type DiscoveryCardProps = {
  card: DiscoveryCardData;
  templateType: CardLayoutType;
  onPass: () => void;
  onConnect: () => void;
};

/**
 * Select best answer for quote card (longest non-trivial answer)
 */
function selectStandoutPrompt(
  prompts: { question: string; answer: string }[]
): { question: string; answer: string } {
  if (prompts.length === 0) {
    return { question: "Getting to know them…", answer: "Check back soon!" };
  }

  return prompts.reduce((best, current) => {
    const bestLen = best.answer.length;
    const currentLen = current.answer.length;
    // Prefer answers between 20-150 characters (substantive but concise)
    const isBestIdeal = bestLen >= 20 && bestLen <= 150;
    const isCurrentIdeal = currentLen >= 20 && currentLen <= 150;

    if (isCurrentIdeal && !isBestIdeal) return current;
    if (!isCurrentIdeal && isBestIdeal) return best;
    if (currentLen > bestLen) return current;
    return best;
  });
}

/**
 * Generate quick snapshot lines from prompts
 */
function generateSnapshotLines(
  prompts: { question: string; answer: string }[]
): string[] {
  if (prompts.length === 0) {
    return ["Adventure seeker", "Still discovering", "Open to connection"];
  }

  return prompts.slice(0, 3).map((p) => {
    const answer = p.answer.slice(0, 40).trim();
    return answer.endsWith("...") ? answer : answer + (p.answer.length > 40 ? "…" : "");
  });
}

/**
 * Route to appropriate card component
 */
function renderCard(
  templateType: CardLayoutType,
  card: DiscoveryCardData,
  onPass: () => void,
  onConnect: () => void
) {
  const commonProps = { onPass, onConnect };

  switch (templateType) {
    case "classic":
      return (
        <ClassicCard
          data={{
            card_id: card.card_id,
            age: card.age,
            location: card.location,
            vibe_tags: card.vibe_tags,
            prompt_answers: card.prompt_answers,
          } as ClassicCardData}
          {...commonProps}
        />
      );

    case "quote":
      return (
        <QuoteCard
          data={{
            card_id: card.card_id,
            age: card.age,
            location: card.location,
            vibe_tags: card.vibe_tags,
            standout_prompt: selectStandoutPrompt(card.prompt_answers),
            additional_prompts: card.prompt_answers.slice(1, 2),
          } as QuoteCardData}
          {...commonProps}
        />
      );

    case "lifestyle":
      return (
        <LifestyleCard
          data={{
            card_id: card.card_id,
            age: card.age,
            location: card.location,
            vibe_tags: card.vibe_tags,
            lifestyle_badges: getLifestyleBadges(card.profile_data || {}),
            bio_prompt:
              card.prompt_answers.length > 0
                ? card.prompt_answers[0]
                : undefined,
          } as LifestyleCardData}
          {...commonProps}
        />
      );

    default:
      return (
        <ClassicCard
          data={{
            card_id: card.card_id,
            age: card.age,
            location: card.location,
            vibe_tags: card.vibe_tags,
            prompt_answers: card.prompt_answers,
          } as ClassicCardData}
          {...commonProps}
        />
      );
  }
}

export function DiscoveryCard({
  card,
  templateType,
  onPass,
  onConnect,
}: DiscoveryCardProps) {
  return useMemo(
    () => renderCard(templateType, card, onPass, onConnect),
    [templateType, card, onPass, onConnect]
  );
}
