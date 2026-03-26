"use client";

import type { ConnectionProgress } from "@/lib/api";

type ConnectionLevelBarProps = {
  currentLevel: number;
  progress: ConnectionProgress;
};

const LEVEL_LABELS = ["", "Silhouette", "Shape", "Soft focus", "Almost clear", "Full clarity"];
const MAX_LEVEL = 5;

/**
 * ConnectionLevelBar displays the current connection level and
 * progress toward the next level.
 *
 * Levels 1–5 map to photo blur variants:
 *   1 → blur_heavy, 2 → blur_med, 3–4 → blur_light, 5 → clear
 */
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
    <div className="rounded-lg bg-white p-3 shadow-sm">
      {/* Level indicator */}
      <div className="mb-2 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-gray-700">
            Connection Level
          </span>
          <span className="rounded-full bg-halo-primary/10 px-2 py-0.5 text-xs font-semibold text-halo-primary">
            {currentLevel}/{MAX_LEVEL}
          </span>
        </div>
        <span className="text-xs text-gray-500">
          {LEVEL_LABELS[currentLevel] || ""}
        </span>
      </div>

      {/* Progress bar */}
      <div className="mb-1.5 h-2 overflow-hidden rounded-full bg-gray-100">
        <div
          className="h-full rounded-full bg-gradient-to-r from-halo-primary to-halo-primary/70 transition-all duration-500"
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
              className={`h-2.5 w-2.5 rounded-full border-2 transition-colors ${
                isReached
                  ? "border-halo-primary bg-halo-primary"
                  : "border-gray-300 bg-white"
              }`}
              title={`Level ${level}: ${LEVEL_LABELS[level]}`}
            />
          );
        })}
      </div>

      {/* Progress text */}
      <p className="mt-2 text-center text-xs text-gray-500">
        {atMax ? (
          "Photo fully revealed! 🎉"
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
