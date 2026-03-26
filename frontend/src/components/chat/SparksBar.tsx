"use client";

import { useRef, useEffect } from "react";
import type { Spark } from "@/lib/api";

type SparksBarProps = {
  sparks: Spark[];
  onSelect: (text: string) => void;
};

/**
 * SparksBar renders a horizontal scrollable row of conversation-starter pills.
 * Tapping a spark pre-fills the message composer.
 */
export function SparksBar({ sparks, onSelect }: SparksBarProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to start on mount
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollLeft = 0;
    }
  }, [sparks]);

  if (!sparks.length) return null;

  return (
    <div className="border-b bg-gray-50 px-4 py-2">
      <p className="mb-1 text-xs font-medium text-gray-500">
        Conversation Sparks ✨
      </p>
      <div
        ref={scrollRef}
        className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide"
      >
        {sparks.map((spark) => (
          <button
            key={spark.id}
            type="button"
            onClick={() => onSelect(spark.suggested_message)}
            className="min-h-touch shrink-0 rounded-full border border-halo-primary/30 bg-white px-3 py-1.5 text-sm text-halo-primary transition-colors hover:bg-halo-primary/10 active:bg-halo-primary/20"
          >
            {spark.label}
          </button>
        ))}
      </div>
    </div>
  );
}
