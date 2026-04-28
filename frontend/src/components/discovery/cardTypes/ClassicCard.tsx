/**
 * Card Type A: Classic prompt-based card
 * Traditional multi-prompt layout with age/location header
 */

import { Heart, X } from "lucide-react";

export type ClassicCardData = {
  card_id: string;
  age: number;
  location: string;
  vibe_tags: string[];
  prompt_answers: { question: string; answer: string }[];
};

type ClassicCardProps = {
  data: ClassicCardData;
  onPass: () => void;
  onConnect: () => void;
};

export function ClassicCard({ data, onPass, onConnect }: ClassicCardProps) {
  return (
    <div className="flex w-full max-w-sm flex-col rounded-2xl bg-white shadow-lg overflow-hidden">
      {/* Header: age & location */}
      <div className="bg-gradient-to-r from-primary to-primary-container px-5 py-4">
        <p className="text-lg font-bold text-white">
          {data.age} · {data.location || "Somewhere nearby"}
        </p>
      </div>

      {/* Vibe tags */}
      {data.vibe_tags.length > 0 && (
        <div className="flex flex-wrap gap-2 px-5 pt-4">
          {data.vibe_tags.map((tag, i) => (
            <span
              key={`${tag}-${i}`}
              className="rounded-full bg-halo-primary/10 px-3 py-1 text-xs font-medium text-halo-primary"
            >
              {tag}
            </span>
          ))}
        </div>
      )}

      {/* Prompt answers */}
      <div className="flex-1 space-y-4 px-5 py-4">
        {data.prompt_answers.length > 0 ? (
          data.prompt_answers.map((pa, i) => (
            <div key={i}>
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">
                {pa.question}
              </p>
              <p className="mt-1.5 text-sm text-gray-700 leading-relaxed">{pa.answer}</p>
            </div>
          ))
        ) : (
          <p className="text-sm italic text-gray-400">
            This person hasn&apos;t answered any prompts yet.
          </p>
        )}
      </div>

      {/* Action buttons */}
      <div className="flex items-center justify-center gap-6 border-t px-5 py-4 bg-gray-50/30">
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
          className="flex h-14 w-14 items-center justify-center rounded-full border-2 border-primary text-primary transition-all hover:bg-primary hover:text-white active:bg-primary/90"
        >
          <Heart className="h-7 w-7" />
        </button>
      </div>
    </div>
  );
}
