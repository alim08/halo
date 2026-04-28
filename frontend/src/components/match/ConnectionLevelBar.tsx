"use client";

import type { ConnectionProgress } from "@/lib/api";

type ConnectionLevelBarProps = {
  currentLevel: number;
  progress: ConnectionProgress;
};

const LEVEL_LABELS = ["", "Silhouette", "Shape", "Soft focus", "Almost clear", "Full clarity"];
const MAX_LEVEL = 5;

export function ConnectionLevelBar({
  currentLevel,
  progress,
}: ConnectionLevelBarProps) {
  const atMax = currentLevel >= MAX_LEVEL;
  const percentage = atMax
    ? 100
    : progress.next_level_total_required
    ? Math.min(
        100,
        Math.round(
          (progress.total_exchanged_counted / progress.next_level_total_required) * 100
        )
      )
    : 0;

  return (
    <div className="rounded-2xl bg-halo-surface-container-low p-4 shadow-sm">
      {/* Level indicator */}
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-halo-on-surface">
            Connection Level
          </span>
          <span className="rounded-full bg-halo-secondary-container px-2.5 py-0.5 text-xs font-semibold text-halo-on-secondary-container">
            {currentLevel}/{MAX_LEVEL}
          </span>
        </div>
        <span className="font-serif text-sm italic text-halo-on-surface-variant">
          {LEVEL_LABELS[currentLevel] || ""}
        </span>
      </div>

      {/* Progress bar */}
      <div className="mb-2 h-2 overflow-hidden rounded-full bg-halo-surface-container-high">
        <div
          className="h-full rounded-full bg-gradient-to-r from-halo-primary to-halo-primary-container transition-all duration-500"
          style={{ width: `${percentage}%` }}
        />
      </div>

      {/* Level dots */}
      <div className="flex justify-between px-0.5">
        {Array.from({ length: MAX_LEVEL }, (_, i) => {
          const level = i + 1;
          const isReached = level <= currentLevel;
          return (
            <div
              key={level}
              className={`h-3 w-3 rounded-full transition-colors ${
                isReached
                  ? "bg-gradient-to-r from-halo-primary to-halo-primary-container"
                  : "bg-halo-surface-container-high"
              }`}
              title={`Level ${level}: ${LEVEL_LABELS[level]}`}
            />
          );
        })}
      </div>

      {/* Progress text */}
      <p className="mt-3 text-center text-xs text-halo-on-surface-variant">
        {atMax ? (
          "Photo fully revealed!"
        ) : (
          <>
            {progress.total_exchanged_counted} messages exchanged
            {progress.next_level_total_required && (
              <> · {progress.next_level_total_required - progress.total_exchanged_counted} more to next reveal</>
            )}
          </>
        )}
      </p>
    </div>
  );
}
