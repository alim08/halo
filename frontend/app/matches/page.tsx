"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { isAuthenticated, api, MatchSummary } from "@/lib/api";
import { MessageCircle } from "lucide-react";

export default function MatchesPage() {
  const router = useRouter();
  const [matches, setMatches] = useState<MatchSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isAuthenticated()) {
      router.replace("/login");
      return;
    }

    api.matches
      .list()
      .then((resp) => {
        setMatches(resp.matches);
        setLoading(false);
      })
      .catch(() => {
        setError("Failed to load matches.");
        setLoading(false);
      });
  }, [router]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-halo-surface">
        <div className="mx-auto h-8 w-8 animate-spin rounded-full border-4 border-halo-primary border-t-transparent" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-halo-surface">
        <p className="text-halo-error">{error}</p>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-halo-surface">
      {/* Header */}
      <header className="glass sticky top-0 z-10 px-6 py-4 lg:px-10">
        <div className="mx-auto flex max-w-6xl items-center justify-between">
          <span className="font-serif text-xl font-bold text-halo-primary">Halo</span>
          <h1 className="font-serif text-lg font-semibold text-halo-on-surface">
            Matches
          </h1>
          <div className="w-10" />
        </div>
      </header>

      <div className="mx-auto max-w-2xl px-6 pb-24 pt-6">
        {matches.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-4xl bg-halo-surface-container-low px-8 py-16 text-center shadow-ambient">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-halo-secondary-container">
              <MessageCircle className="h-8 w-8 text-halo-on-secondary-container" />
            </div>
            <p className="mt-6 font-serif text-xl font-semibold text-halo-on-surface">
              No matches yet
            </p>
            <p className="mt-2 text-halo-on-surface-variant">
              Keep discovering to find your people.
            </p>
            <button
              onClick={() => router.push("/discovery")}
              className="mt-6 rounded-full bg-gradient-to-r from-halo-primary to-halo-primary-container px-8 py-3 min-h-touch text-sm font-semibold text-halo-on-primary shadow-ambient transition-transform hover:scale-[1.02] active:scale-[0.98]"
            >
              Go to Discovery
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {matches.map((match) => (
              <button
                key={match.match_id}
                onClick={() => router.push(`/matches/${match.match_id}`)}
                className="flex w-full items-center gap-4 rounded-2xl bg-halo-surface-container-low p-4 text-left shadow-sm transition-all hover:bg-white hover:shadow-ambient active:scale-[0.99]"
              >
                {/* Avatar */}
                <div className="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-full bg-halo-secondary-container">
                  <span className="font-serif text-lg font-bold text-halo-on-secondary-container">
                    {match.partner.display_name.charAt(0).toUpperCase()}
                  </span>
                </div>

                <div className="min-w-0 flex-1">
                  <p className="font-serif text-base font-semibold text-halo-on-surface">
                    {match.partner.display_name}
                  </p>
                  <p className="text-sm text-halo-on-surface-variant">
                    {match.partner.location} · Level{" "}
                    {match.current_connection_level}
                  </p>
                </div>

                {match.last_message_at && (
                  <span className="flex-shrink-0 text-xs text-halo-outline">
                    {formatRelativeTime(match.last_message_at)}
                  </span>
                )}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Bottom nav */}
      <nav className="glass fixed bottom-0 left-0 right-0 z-10">
        <div className="mx-auto flex max-w-md justify-around py-2">
          <button
            onClick={() => router.push("/discovery")}
            className="min-h-touch rounded-full px-5 py-2 text-sm text-halo-on-surface-variant hover:text-halo-on-surface transition-colors"
          >
            Discover
          </button>
          <button className="min-h-touch rounded-full px-5 py-2 text-sm font-semibold text-halo-primary">
            Matches
          </button>
          <button
            onClick={() => router.push("/me")}
            className="min-h-touch rounded-full px-5 py-2 text-sm text-halo-on-surface-variant hover:text-halo-on-surface transition-colors"
          >
            Profile
          </button>
        </div>
      </nav>
    </main>
  );
}

function formatRelativeTime(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);

  if (diffMins < 1) return "now";
  if (diffMins < 60) return `${diffMins}m`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h`;
  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays}d`;
}
