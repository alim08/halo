"use client";

import { useState, useEffect } from "react";
import type { PhotoVariant } from "@/lib/api";

type SecureImageProps = {
  photo: PhotoVariant | null;
  alt: string;
  className?: string;
  fallbackInitial?: string;
};

export function SecureImage({
  photo,
  alt,
  className = "",
  fallbackInitial,
}: SecureImageProps) {
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState(false);

  useEffect(() => {
    setLoaded(false);
    setError(false);
  }, [photo?.url]);

  if (!photo || !photo.url || error) {
    return (
      <div
        className={`flex items-center justify-center bg-gradient-to-br from-halo-primary/20 to-halo-primary-container/30 ${className}`}
        role="img"
        aria-label={alt}
      >
        {fallbackInitial ? (
          <span className="font-serif text-2xl font-bold text-halo-primary/60">
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
      {!loaded && (
        <div className="absolute inset-0 animate-pulse bg-halo-surface-container" />
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
      <span className="absolute bottom-1 right-1 rounded-full bg-halo-inverse-surface/50 px-2 py-0.5 text-[10px] text-halo-inverse-on-surface">
        {photo.variant.replace("_", " ")}
      </span>
    </div>
  );
}
