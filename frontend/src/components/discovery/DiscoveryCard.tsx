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
import {
  buildSplitScreenRows,
  SplitScreenCard,
  SplitScreenCardData,
} from "./cardTypes/SplitScreenCard";
import { BentoCard, BentoCardData } from "./cardTypes/BentoCard";
import { CardLayoutType } from "@/lib/cardTemplates";
import type { ComparisonProfile } from "@/lib/api";

/**
 * Raw discovery card data from API
 */
export type DiscoveryCardData = {
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
  layout_type?: CardLayoutType;
};

type DiscoveryCardProps = {
  card: DiscoveryCardData;
  templateType: CardLayoutType;
  currentUserProfile?: ComparisonProfile | null;
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

const JUNK_TEXT = new Set([
  "12",
  "n/a",
  "na",
  "none",
  "null",
  "test",
  "undefined",
  "yes1",
  "yuh",
]);

function isUsefulText(value: unknown, minLength = 3): value is string {
  if (typeof value !== "string") return false;

  const cleaned = value.trim();
  return cleaned.length >= minLength && !JUNK_TEXT.has(cleaned.toLowerCase());
}

function getLifestyleHabits(card: DiscoveryCardData): Record<string, unknown> {
  const profileLifestyle =
    card.profile_data?.lifestyle_habits ?? card.profile_data?.lifestyle;

  if (card.lifestyle_habits) return card.lifestyle_habits;
  if (profileLifestyle && typeof profileLifestyle === "object" && !Array.isArray(profileLifestyle)) {
    return profileLifestyle as Record<string, unknown>;
  }

  return {};
}

function getInterests(card: DiscoveryCardData): string[] {
  const profileInterests = card.profile_data?.interests;
  const source = card.interests?.length
    ? card.interests
    : Array.isArray(profileInterests)
      ? profileInterests
      : [];

  return source.filter((item): item is string => isUsefulText(item));
}

function hasValidPrompt(prompts: { question: string; answer: string }[]): boolean {
  return prompts.some((prompt) => isUsefulText(prompt.answer, 4) && /[a-z]/i.test(prompt.answer));
}

function hasUsefulLifestyleData(card: DiscoveryCardData): boolean {
  const lifestyle = getLifestyleHabits(card);
  const hasLifestyle = Object.values(lifestyle).some((value) => isUsefulText(value));

  return hasLifestyle || getInterests(card).length > 0 || hasValidPrompt(card.prompt_answers);
}

function hasEnoughBentoData(card: DiscoveryCardData): boolean {
  const lifestyle = getLifestyleHabits(card);
  const vibe = getProfileRecord(card.vibe ?? card.profile_data?.vibe);
  const interests = getInterests(card);

  const lifestyleCount = Object.keys(lifestyle).length;
  const vibeCount = Object.keys(vibe).length;
  const interestCount = interests.length;

  // Need at least 4 data points across all categories
  return lifestyleCount + vibeCount + interestCount >= 4;
}

function getProfileRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function getCandidateProfile(card: DiscoveryCardData): ComparisonProfile {
  return {
    ...(card.profile_data ?? {}),
    lifestyle_habits: getLifestyleHabits(card),
    vibe: getProfileRecord(card.vibe ?? card.profile_data?.vibe),
    connection_style: getProfileRecord(
      card.connection_style ?? card.profile_data?.connection_style
    ),
    interests: getInterests(card),
  };
}

/**
 * Route to appropriate card component
 */
function renderCard(
  templateType: CardLayoutType,
  card: DiscoveryCardData,
  currentUserProfile: ComparisonProfile | null | undefined,
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

    case "compatibility": {
      const candidateProfile = getCandidateProfile(card);
      const rows = buildSplitScreenRows(currentUserProfile, candidateProfile);

      if (rows.length < 2) {
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
      }

      return (
        <SplitScreenCard
          data={{
            card_id: card.card_id,
            age: card.age,
            location: card.location,
            currentUserProfile: currentUserProfile ?? {},
            candidateProfile,
          } as SplitScreenCardData}
          {...commonProps}
        />
      );
    }

    case "lifestyle":
      if (!hasUsefulLifestyleData(card)) {
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

      return (
        <LifestyleCard
          data={{
            card_id: card.card_id,
            age: card.age,
            location: card.location,
            lifestyle_habits: getLifestyleHabits(card),
            interests: getInterests(card),
            profile_data: card.profile_data,
            prompt_answers: card.prompt_answers,
          } as LifestyleCardData}
          {...commonProps}
        />
      );

    case "bento":
      if (!hasEnoughBentoData(card)) {
        // Fallback to Lifestyle or Classic if not enough bento data
        if (hasUsefulLifestyleData(card)) {
          return (
            <LifestyleCard
              data={{
                card_id: card.card_id,
                age: card.age,
                location: card.location,
                lifestyle_habits: getLifestyleHabits(card),
                interests: getInterests(card),
                profile_data: card.profile_data,
                prompt_answers: card.prompt_answers,
              } as LifestyleCardData}
              {...commonProps}
            />
          );
        }
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

      return (
        <BentoCard
          data={{
            card_id: card.card_id,
            age: card.age,
            location: card.location,
            interests: getInterests(card),
            lifestyle_habits: getLifestyleHabits(card),
            vibe: getProfileRecord(card.vibe ?? card.profile_data?.vibe),
            connection_style: getProfileRecord(
              card.connection_style ?? card.profile_data?.connection_style
            ),
            profile_data: card.profile_data,
          } as BentoCardData}
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
  currentUserProfile,
  onPass,
  onConnect,
}: DiscoveryCardProps) {
  return useMemo(
    () => renderCard(templateType, card, currentUserProfile, onPass, onConnect),
    [templateType, card, currentUserProfile, onPass, onConnect]
  );
}
