"use client";

import { useState, useEffect } from "react";
import type { PhotoVariant } from "@/lib/api";

type SecureImageProps = {
  photo: PhotoVariant | null;
  alt: string;
  className?: string;
  /** Fallback shown when no photo or loading failed */
  fallbackInitial?: string;
};

/**
 * SecureImage renders a server-gated photo variant.
 *
 * - Fetches the signed URL from the match profile response
 * - Only displays the variant allowed by the connection level
 * - Never caches or infers higher-level variants client-side
 * - Shows a placeholder when no photo is available
 */
export function SecureImage({
  photo,
  alt,
  className = "",
  fallbackInitial,
}: SecureImageProps) {
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState(false);

  // Reset state when photo URL changes (e.g., level-up re-fetch).
  useEffect(() => {
    setLoaded(false);
    setError(false);
  }, [photo?.url]);

  // No photo available — show placeholder.
  if (!photo || !photo.url || error) {
    return (
      <div
        className={`flex items-center justify-center bg-gradient-to-br from-halo-primary/20 to-halo-primary/40 ${className}`}
        role="img"
        aria-label={alt}
      >
        {fallbackInitial ? (
          <span className="text-2xl font-bold text-halo-primary/60">
            {fallbackInitial}
          </span>
        ) : (
          <svg
            className="h-12 w-12 text-halo-primary/30"
            fill="currentColor"
            viewBox="0 0 24 24"
          >
            <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
          </svg>
        )}
      </div>
    );
  }

  return (
    <div className={`relative overflow-hidden ${className}`}>
      {/* Loading shimmer */}
      {!loaded && (
        <div className="absolute inset-0 animate-pulse bg-gray-200" />
      )}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={photo.url}
        alt={alt}
        className={`h-full w-full object-cover transition-opacity duration-300 ${
          loaded ? "opacity-100" : "opacity-0"
        }`}
        onLoad={() => setLoaded(true)}
        onError={() => setError(true)}
      />
      {/* Variant badge (dev only — can be removed in production) */}
      <span className="absolute bottom-1 right-1 rounded bg-black/50 px-1.5 py-0.5 text-[10px] text-white">
        {photo.variant.replace("_", " ")}
      </span>
    </div>
  );
}
