/**
 * Card Type B: Quote card
 * One standout quote/answer displayed prominently with minimal context
 */

import { Heart, X } from "lucide-react";

export type QuoteCardData = {
  card_id: string;
  age: number;
  location: string;
  vibe_tags: string[];
  standout_prompt: { question: string; answer: string };
  additional_prompts?: { question: string; answer: string }[];
};

type QuoteCardProps = {
  data: QuoteCardData;
  onPass: () => void;
  onConnect: () => void;
};

export function QuoteCard({ data, onPass, onConnect }: QuoteCardProps) {
  return (
    <div className="flex w-full max-w-sm flex-col rounded-2xl bg-white shadow-lg overflow-hidden">
      {/* Header: age & location */}
      <div className="bg-gradient-to-r from-halo-primary/80 to-halo-secondary/80 px-5 py-3">
        <p className="text-base font-semibold text-white">
          {data.age} · {data.location || "Somewhere nearby"}
        </p>
      </div>

      {/* Standout quote section */}
      <div className="flex-1 flex flex-col justify-center px-5 py-8 bg-gradient-to-br from-halo-primary/5 to-halo-secondary/5">
        <p className="text-xs font-semibold uppercase tracking-widest text-halo-primary/70 mb-3">
          {data.standout_prompt.question}
        </p>
        <p className="text-2xl font-semibold text-gray-900 leading-tight italic">
          "{data.standout_prompt.answer}"
        </p>
      </div>

      {/* Vibe tags */}
      {data.vibe_tags.length > 0 && (
        <div className="flex flex-wrap gap-2 px-5 pt-3 pb-2">
          {data.vibe_tags.map((tag, i) => (
            <span
              key={`${tag}-${i}`}
              className="rounded-full bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-600"
            >
              {tag}
            </span>
          ))}
        </div>
      )}

      {/* Additional prompts (condensed) */}
      {data.additional_prompts && data.additional_prompts.length > 0 && (
        <div className="px-5 py-3 space-y-2 bg-gray-50/50">
          {data.additional_prompts.slice(0, 1).map((pa, i) => (
            <div key={i}>
              <p className="text-xs font-semibold text-gray-400">
                {pa.question}
              </p>
              <p className="text-xs text-gray-600 line-clamp-2">{pa.answer}</p>
            </div>
          ))}
        </div>
      )}

      {/* Action buttons */}
      <div className="flex items-center justify-center gap-6 border-t px-5 py-4">
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
          className="flex h-14 w-14 items-center justify-center rounded-full border-2 border-halo-primary text-halo-primary transition-all hover:bg-halo-primary hover:text-white active:bg-halo-primary/90"
        >
          <Heart className="h-7 w-7" />
        </button>
      </div>
    </div>
  );
}
