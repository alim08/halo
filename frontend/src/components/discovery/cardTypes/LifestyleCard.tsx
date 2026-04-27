/**
 * Card Type C: Lifestyle card
 * Visual lifestyle badges + one compelling prompt
 */

import { Heart, X } from "lucide-react";
import { LifestyleBadge } from "@/lib/cardTemplates";

export type LifestyleCardData = {
  card_id: string;
  age: number;
  location: string;
  vibe_tags: string[];
  lifestyle_badges: LifestyleBadge[];
  bio_prompt?: { question: string; answer: string };
};

type LifestyleCardProps = {
  data: LifestyleCardData;
  onPass: () => void;
  onConnect: () => void;
};

export function LifestyleCard({ data, onPass, onConnect }: LifestyleCardProps) {
  return (
    <div className="flex w-full max-w-sm flex-col rounded-2xl bg-white shadow-lg overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-500 to-blue-600 px-5 py-3">
        <p className="text-base font-semibold text-white">
          {data.age} · {data.location || "Somewhere nearby"}
        </p>
      </div>

      {/* Vibe tags */}
      {data.vibe_tags.length > 0 && (
        <div className="flex flex-wrap gap-2 px-5 pt-4">
          {data.vibe_tags.map((tag, i) => (
            <span
              key={`${tag}-${i}`}
              className="rounded-full bg-blue-50 px-3 py-1 text-xs font-medium text-blue-700"
            >
              {tag}
            </span>
          ))}
        </div>
      )}

      {/* Lifestyle badges grid */}
      <div className="flex-1 px-5 py-5">
        <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-3">
          Vibe Check
        </p>
        <div className="grid grid-cols-2 gap-3">
          {data.lifestyle_badges.map((badge, i) => (
            <div
              key={i}
              className="rounded-lg bg-gradient-to-br from-blue-50 to-blue-100/50 p-3 border border-blue-100"
            >
              <p className="text-2xl mb-1">{badge.emoji}</p>
              <p className="text-xs font-semibold text-gray-600">{badge.category}</p>
              <p className="text-xs text-gray-700 font-medium">{badge.value}</p>
            </div>
          ))}
        </div>

        {/* Bio prompt */}
        {data.bio_prompt && (
          <div className="mt-5 pt-4 border-t border-gray-100">
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-2">
              {data.bio_prompt.question}
            </p>
            <p className="text-sm text-gray-700">{data.bio_prompt.answer}</p>
          </div>
        )}
      </div>

      {/* Action buttons */}
      <div className="flex items-center justify-center gap-6 border-t px-5 py-4 bg-blue-50/20">
        <button
          onClick={onPass}
          aria-label="Pass"
          className="flex h-14 w-14 items-center justify-center rounded-full border-2 border-gray-300 text-gray-400 transition-all hover:border-red-400 hover:text-red-400 active:bg-red-50"
        >
          <X className="h-7 w-7" />
        </button>

        <button
          onClick={onConnect}
          aria-label="Connect"
          className="flex h-14 w-14 items-center justify-center rounded-full border-2 border-blue-500 text-blue-500 transition-all hover:bg-blue-500 hover:text-white active:bg-blue-600"
        >
          <Heart className="h-7 w-7" />
        </button>
      </div>
    </div>
  );
}
