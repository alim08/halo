"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api, isAuthenticated, MeResponse } from "@/lib/api";

export default function MePage() {
  const router = useRouter();
  const [me, setMe] = useState<MeResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isAuthenticated()) {
      router.replace("/login");
      return;
    }

    api.me
      .get()
      .then((resp) => {
        setMe(resp);
        setLoading(false);
      })
      .catch((err: unknown) => {
        const message = err instanceof Error ? err.message : "Failed to load profile.";
        setError(message);
        setLoading(false);
      });
  }, [router]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-surface">
        <div className="text-center">
          <div className="mx-auto h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          <p className="mt-4 text-sm text-on-surface/60">Loading profile...</p>
        </div>
      </div>
    );
  }

  if (error || !me) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-surface p-6">
        <div className="text-center">
          <p className="text-error">{error || "Profile not found."}</p>
          <button
            onClick={() => router.push("/discovery")}
            className="mt-4 rounded-full bg-surface-container px-6 py-2.5 text-sm font-semibold text-on-surface transition-colors hover:bg-surface-container-high"
          >
            Back to Discovery
          </button>
        </div>
      </div>
    );
  }

  const pd = me.profile_data || {};
  const tags = (pd.tags as Array<{ type: string; label: string }>) || [];
  const prompts =
    (pd.prompts as Array<{ prompt_id: string; question: string; answer: string }>) || [];
  const vibe = (pd.vibe as Record<string, string>) || {};
  const displayName = (me.profile_data as Record<string, unknown>)?.display_name
    ? String((me.profile_data as Record<string, unknown>).display_name)
    : "Your Profile";

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
            <button
              onClick={() => router.push("/matches")}
              className="text-sm font-medium text-white/70 transition-colors hover:text-white"
            >
              Matches
            </button>
            <button className="border-b-2 border-white pb-0.5 text-sm font-semibold text-white">
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
        {/* Profile hero */}
        <div className="mt-4 rounded-2xl border border-outline-variant bg-white p-8 shadow-sm">
          <div className="flex items-center gap-5">
            <div className="flex h-20 w-20 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-primary to-primary-container">
              <span className="text-3xl font-bold text-on-primary">
                {displayName.charAt(0).toUpperCase()}
              </span>
            </div>
            <div>
              <h2 className="text-2xl font-bold text-on-surface">{displayName}</h2>
              <p className="text-sm text-on-surface/60">{me.coarse_location || "Location not set"}</p>
              <span className="mt-1 inline-block rounded-full bg-surface-container px-3 py-0.5 text-xs font-semibold text-on-surface/70">
                {me.is_onboarded ? "Onboarded" : "Setup incomplete"}
              </span>
            </div>
          </div>
        </div>

        {/* Values & Interests */}
        {tags.length > 0 && (
          <section className="mt-6">
            <h3 className="mb-4 text-lg font-semibold text-on-surface">Values &amp; Interests</h3>
            <div className="flex flex-wrap gap-2">
              {tags.map((tag) => (
                <span
                  key={tag.label}
                  className="rounded-full bg-surface-container px-4 py-2 text-sm font-medium text-on-surface"
                >
                  {tag.label}
                </span>
              ))}
            </div>
          </section>
        )}

        {/* Vibe */}
        {Object.keys(vibe).length > 0 && (
          <section className="mt-6">
            <h3 className="mb-4 text-lg font-semibold text-on-surface">Your Vibe</h3>
            <div className="grid gap-3 sm:grid-cols-3">
              {Object.entries(vibe).map(([key, val]) => (
                <div
                  key={key}
                  className="rounded-2xl border border-outline-variant bg-white p-4 shadow-sm"
                >
                  <p className="text-xs font-semibold uppercase tracking-wider text-on-surface/50">
                    {key.replace(/_/g, " ")}
                  </p>
                  <p className="mt-1 text-base font-semibold text-on-surface">{val}</p>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Prompts */}
        {prompts.length > 0 && (
          <section className="mt-6">
            <h3 className="mb-4 text-lg font-semibold text-on-surface">About You</h3>
            <div className="space-y-4">
              {prompts.map((p) => (
                <div
                  key={p.prompt_id}
                  className="rounded-2xl border border-outline-variant bg-white p-5 shadow-sm"
                >
                  <p className="text-sm font-semibold italic text-on-surface/60">{p.question}</p>
                  <p className="mt-2 leading-relaxed text-on-surface">{p.answer}</p>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Action */}
        <div className="mt-8">
          <button
            onClick={() => router.push("/discovery")}
            className="rounded-full bg-gradient-to-r from-primary to-primary-container px-8 py-3 text-sm font-semibold text-on-primary shadow-sm transition-transform hover:scale-[1.02] active:scale-[0.98]"
          >
            Back to Discovery
          </button>
        </div>
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
          <button
            onClick={() => router.push("/matches")}
            className="flex min-h-[44px] flex-col items-center justify-center px-4 text-on-surface/50 transition-colors hover:text-on-surface"
          >
            <span className="material-symbols-outlined text-[22px]">chat_bubble</span>
            <span className="text-[10px] font-medium">Matches</span>
          </button>
          <button className="flex min-h-[44px] flex-col items-center justify-center px-4 text-primary">
            <span className="material-symbols-outlined text-[22px]">person</span>
            <span className="text-[10px] font-semibold">Profile</span>
          </button>
        </div>
      </nav>
    </div>
  );
}
