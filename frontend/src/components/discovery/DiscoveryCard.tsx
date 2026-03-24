"use client";

import { Heart, X } from "lucide-react";

export type DiscoveryCardData = {
  card_id: string;
  age: number;
  location: string;
  vibe_tags: string[];
  prompt_answers: { question: string; answer: string }[];
};

type DiscoveryCardProps = {
  card: DiscoveryCardData;
  onPass: () => void;
  onConnect: () => void;
};

/**
 * DiscoveryCard renders a text-only profile card.
 * Constitution: NO photos, NO image URLs, NO blur variants.
 * Only text content is shown — vibe tags, prompts, age, location.
 */
export function DiscoveryCard({ card, onPass, onConnect }: DiscoveryCardProps) {
  return (
    <div className="flex w-full max-w-sm flex-col rounded-2xl bg-white shadow-lg">
      {/* Header: age & location */}
      <div className="rounded-t-2xl bg-gradient-to-r from-halo-primary to-halo-secondary px-5 py-4">
        <p className="text-lg font-bold text-white">
          {card.age} · {card.location || "Somewhere nearby"}
        </p>
      </div>

      {/* Vibe tags */}
      {card.vibe_tags.length > 0 && (
        <div className="flex flex-wrap gap-2 px-5 pt-4">
          {card.vibe_tags.map((tag, i) => (
            <span
              key={`${tag || "tag"}-${i}`}
              className="rounded-full bg-halo-primary/10 px-3 py-1 text-xs font-medium text-halo-primary"
            >
              {tag}
            </span>
          ))}
        </div>
      )}

      {/* Prompt answers */}
      <div className="flex-1 space-y-3 px-5 py-4">
        {card.prompt_answers.map((pa, i) => (
          <div key={i}>
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">
              {pa.question}
            </p>
            <p className="mt-1 text-sm text-gray-700">{pa.answer}</p>
          </div>
        ))}

        {card.prompt_answers.length === 0 && (
          <p className="text-sm italic text-gray-400">
            This person hasn&apos;t answered any prompts yet.
          </p>
        )}
      </div>

      {/* Action buttons — 44px touch targets */}
      <div className="flex items-center justify-center gap-6 border-t px-5 py-4">
        <button
          onClick={onPass}
          aria-label="Pass"
          className="flex h-14 w-14 min-h-touch min-w-touch items-center justify-center rounded-full border-2 border-gray-300 text-gray-400 transition-colors hover:border-red-400 hover:text-red-400 active:bg-red-50"
        >
          <X className="h-7 w-7" />
        </button>

        <button
          onClick={onConnect}
          aria-label="Connect"
          className="flex h-14 w-14 min-h-touch min-w-touch items-center justify-center rounded-full border-2 border-halo-primary text-halo-primary transition-colors hover:bg-halo-primary hover:text-white active:bg-halo-primary/90"
        >
          <Heart className="h-7 w-7" />
        </button>
      </div>
    </div>
  );
}
