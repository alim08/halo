"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { isAuthenticated, api, MatchSummary } from "@/lib/api";

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
      <div className="flex min-h-screen items-center justify-center bg-surface">
        <div className="text-center">
          <div className="mx-auto h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          <p className="mt-4 text-sm text-on-surface/60">Loading matches...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-surface">
        <p className="text-error">{error}</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-surface">
      {/* Top Nav */}
      <header className="fixed inset-x-0 top-0 z-30 bg-gradient-to-r from-primary to-primary-container shadow-md">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
          <span className="text-2xl font-extrabold tracking-tight text-white">Halo</span>

          <nav className="hidden items-center gap-8 md:flex">
            <button
              onClick={() => router.push("/discovery")}
              className="text-sm font-medium text-white/70 transition-colors hover:text-white"
            >
              Discover
            </button>
            <button className="border-b-2 border-white pb-0.5 text-sm font-semibold text-white">
              Matches
            </button>
            <button
              onClick={() => router.push("/me")}
              className="text-sm font-medium text-white/70 transition-colors hover:text-white"
            >
              Profile
            </button>
          </nav>

          <div className="flex items-center gap-4">
            <button
              aria-label="Notifications"
              className="relative flex h-10 w-10 items-center justify-center rounded-full text-white/80 transition-colors hover:bg-white/10 hover:text-white"
            >
              <span className="material-symbols-outlined text-[22px]">notifications</span>
            </button>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="mx-auto max-w-2xl px-6 pt-[calc(4rem+1.5rem)] pb-20">
        {matches.length === 0 ? (
          <div className="mt-4 flex flex-col items-center justify-center rounded-2xl border border-outline-variant bg-white p-10 text-center shadow-sm">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-surface-container">
              <span className="material-symbols-outlined text-[32px] text-primary">chat_bubble</span>
            </div>
            <p className="mt-6 text-xl font-semibold text-on-surface">No matches yet</p>
            <p className="mt-2 text-sm text-on-surface/60">
              Keep discovering to find your people.
            </p>
            <button
              onClick={() => router.push("/discovery")}
              className="mt-6 rounded-full bg-gradient-to-r from-primary to-primary-container px-8 py-3 text-sm font-semibold text-on-primary shadow-sm transition-transform hover:scale-[1.02] active:scale-[0.98]"
            >
              Go to Discovery
            </button>
          </div>
        ) : (
          <div className="mt-4 space-y-3">
            {matches.map((match) => (
              <button
                key={match.match_id}
                onClick={() => router.push(`/matches/${match.match_id}`)}
                className="flex w-full items-center gap-4 rounded-2xl border border-outline-variant bg-white p-4 text-left shadow-sm transition-all hover:shadow-md active:scale-[0.99]"
              >
                <div className="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-primary to-primary-container">
                  <span className="text-lg font-bold text-on-primary">
                    {match.partner.display_name.charAt(0).toUpperCase()}
                  </span>
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-base font-semibold text-on-surface">
                    {match.partner.display_name}
                  </p>
                  <p className="text-sm text-on-surface/60">
                    {match.partner.location} · Level {match.current_connection_level}
                  </p>
                </div>
                {match.last_message_at && (
                  <span className="flex-shrink-0 text-xs text-on-surface/40">
                    {formatRelativeTime(match.last_message_at)}
                  </span>
                )}
              </button>
            ))}
          </div>
        )}
      </main>

      {/* Mobile Bottom Nav */}
      <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-outline-variant bg-white/90 backdrop-blur-md lg:hidden">
        <div className="mx-auto flex max-w-md justify-around py-2">
          <button
            onClick={() => router.push("/discovery")}
            className="flex min-h-[44px] flex-col items-center justify-center px-4 text-on-surface/50 transition-colors hover:text-on-surface"
          >
            <span className="material-symbols-outlined text-[22px]">explore</span>
            <span className="text-[10px] font-medium">Discover</span>
          </button>
          <button className="flex min-h-[44px] flex-col items-center justify-center px-4 text-primary">
            <span className="material-symbols-outlined text-[22px]">chat_bubble</span>
            <span className="text-[10px] font-semibold">Matches</span>
          </button>
          <button
            onClick={() => router.push("/me")}
            className="flex min-h-[44px] flex-col items-center justify-center px-4 text-on-surface/50 transition-colors hover:text-on-surface"
          >
            <span className="material-symbols-outlined text-[22px]">person</span>
            <span className="text-[10px] font-medium">Profile</span>
          </button>
        </div>
      </nav>
    </div>
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
