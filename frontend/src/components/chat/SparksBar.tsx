"use client";

import { useRef, useEffect } from "react";
import type { Spark } from "@/lib/api";

type SparksBarProps = {
  sparks: Spark[];
  onSelect: (text: string) => void;
};

export function SparksBar({ sparks, onSelect }: SparksBarProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollLeft = 0;
    }
  }, [sparks]);

  if (!sparks.length) return null;

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-3 lg:px-6">
      <p className="mb-2 text-xs font-semibold text-halo-on-surface-variant">
        Conversation Sparks
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
            className="min-h-touch shrink-0 rounded-full bg-halo-secondary-container px-4 py-2 text-sm font-medium text-halo-on-secondary-container transition-all hover:shadow-sm active:scale-95"
          >
            {spark.label}
          </button>
        ))}
      </div>
    </div>
  );
}
