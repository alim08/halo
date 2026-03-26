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
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="mx-auto h-8 w-8 animate-spin rounded-full border-4 border-halo-primary border-t-transparent" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <p className="text-red-600">{error}</p>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-gray-50">
      <header className="sticky top-0 z-10 border-b bg-white px-4 py-3">
        <h1 className="text-center text-lg font-semibold text-halo-primary">
          Matches
        </h1>
      </header>

      {matches.length === 0 ? (
        <div className="flex flex-col items-center justify-center px-6 py-20">
          <MessageCircle className="h-12 w-12 text-gray-300" />
          <p className="mt-4 text-center text-gray-500">
            No matches yet. Keep discovering!
          </p>
          <button
            onClick={() => router.push("/discovery")}
            className="mt-4 min-h-touch rounded-full bg-halo-primary px-6 py-3 text-sm font-medium text-white"
          >
            Go to Discovery
          </button>
        </div>
      ) : (
        <ul className="divide-y">
          {matches.map((match) => (
            <li key={match.match_id}>
              <button
                onClick={() => router.push(`/matches/${match.match_id}`)}
                className="flex w-full items-center gap-4 px-4 py-3 text-left transition-colors hover:bg-gray-100 active:bg-gray-200"
              >
                {/* Avatar placeholder */}
                <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-halo-primary/10">
                  <span className="text-lg font-bold text-halo-primary">
                    {match.partner.display_name.charAt(0).toUpperCase()}
                  </span>
                </div>

                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium text-gray-900">
                    {match.partner.display_name}
                  </p>
                  <p className="text-xs text-gray-500">
                    {match.partner.location} · Level{" "}
                    {match.current_connection_level}
                  </p>
                </div>

                {match.last_message_at && (
                  <span className="flex-shrink-0 text-xs text-gray-400">
                    {formatRelativeTime(match.last_message_at)}
                  </span>
                )}
              </button>
            </li>
          ))}
        </ul>
      )}

      {/* Bottom nav */}
      <nav className="fixed bottom-0 left-0 right-0 flex justify-around border-t bg-white py-2">
        <button
          onClick={() => router.push("/discovery")}
          className="min-h-touch px-4 py-2 text-xs text-gray-500"
        >
          Discover
        </button>
        <button className="min-h-touch px-4 py-2 text-xs font-semibold text-halo-primary">
          Matches
        </button>
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
