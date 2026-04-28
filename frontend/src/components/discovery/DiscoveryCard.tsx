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

export function DiscoveryCard({ card, onPass, onConnect }: DiscoveryCardProps) {
  return (
    <div className="w-full rounded-4xl bg-halo-surface-container-low shadow-ambient-lg overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-halo-primary to-halo-primary-container px-6 py-5">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white/20">
            <span className="font-serif text-lg font-bold text-halo-on-primary">
              {card.age}
            </span>
          </div>
          <div>
            <p className="font-serif text-xl font-bold text-halo-on-primary">
              {card.location || "Somewhere nearby"}
            </p>
            <p className="text-sm text-halo-on-primary/70">
              Age {card.age}
            </p>
          </div>
        </div>
      </div>

      {/* Value chips */}
      {card.vibe_tags.length > 0 && (
        <div className="flex flex-wrap gap-2 px-6 pt-5">
          {card.vibe_tags.map((tag, i) => (
            <span
              key={`${tag || "tag"}-${i}`}
              className="rounded-full bg-halo-secondary-container px-4 py-1.5 text-sm font-medium text-halo-on-secondary-container"
            >
              {tag}
            </span>
          ))}
        </div>
      )}

      {/* Prompt answers */}
      <div className="space-y-4 px-6 py-5">
        {card.prompt_answers.map((pa, i) => (
          <div key={i}>
            <p className="font-serif text-sm font-semibold italic text-halo-on-surface-variant">
              {pa.question}
            </p>
            <p className="mt-1 leading-relaxed text-halo-on-surface">
              {pa.answer}
            </p>
          </div>
        ))}

        {card.prompt_answers.length === 0 && (
          <p className="font-serif italic text-halo-on-surface-variant">
            This person hasn&apos;t answered any prompts yet.
          </p>
        )}
      </div>

      {/* Action buttons */}
      <div className="flex items-center justify-center gap-8 px-6 pb-6">
        <button
          onClick={onPass}
          aria-label="Pass"
          className="flex h-16 w-16 min-h-touch min-w-touch items-center justify-center rounded-full bg-halo-surface-container text-halo-on-surface-variant transition-all hover:bg-halo-surface-container-highest hover:text-halo-error active:scale-95"
        >
          <X className="h-7 w-7" />
        </button>

        <button
          onClick={onConnect}
          aria-label="Connect"
          className="flex h-16 w-16 min-h-touch min-w-touch items-center justify-center rounded-full bg-gradient-to-r from-halo-primary to-halo-primary-container text-halo-on-primary shadow-ambient transition-all hover:shadow-ambient-lg active:scale-95"
        >
          <Heart className="h-7 w-7" />
        </button>
      </div>
    </div>
  );
}
