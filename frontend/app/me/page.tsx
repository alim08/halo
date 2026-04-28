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
      <main className="flex min-h-screen items-center justify-center bg-halo-surface">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-halo-primary border-t-transparent" />
      </main>
    );
  }

  if (error || !me) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-halo-surface p-6">
        <div className="text-center">
          <p className="text-halo-error">{error || "Profile not found."}</p>
          <button
            onClick={() => router.push("/discovery")}
            className="mt-4 rounded-full bg-halo-surface-container-high px-6 py-2.5 text-sm font-semibold text-halo-on-surface transition-colors hover:bg-halo-surface-container-highest"
          >
            Back to Discovery
          </button>
        </div>
      </main>
    );
  }

  const pd = me.profile_data || {};
  const tags = (pd.tags as Array<{ type: string; label: string }>) || [];
  const prompts =
    (pd.prompts as Array<{ prompt_id: string; question: string; answer: string }>) || [];
  const vibe = (pd.vibe as Record<string, string>) || {};

  return (
    <main className="min-h-screen bg-halo-surface">
      {/* Header */}
      <header className="glass sticky top-0 z-10 px-6 py-4 lg:px-10">
        <div className="mx-auto flex max-w-6xl items-center justify-between">
          <span className="font-serif text-xl font-bold text-halo-primary">Halo</span>
          <h1 className="font-serif text-lg font-semibold text-halo-on-surface">
            My Profile
          </h1>
          <div className="w-10" />
        </div>
      </header>

      <div className="mx-auto max-w-2xl px-6 pb-24 pt-8">
        {/* Profile hero */}
        <div className="rounded-4xl bg-halo-surface-container-low p-8 shadow-ambient">
          <div className="flex items-center gap-5">
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-halo-primary to-halo-primary-container">
              <span className="font-serif text-3xl font-bold text-halo-on-primary">
                {(me.profile_data as Record<string, unknown>)?.display_name
                  ? String((me.profile_data as Record<string, unknown>).display_name).charAt(0).toUpperCase()
                  : me.id.charAt(0).toUpperCase()}
              </span>
            </div>
            <div>
              <h2 className="font-serif text-2xl font-bold text-halo-on-surface">
                {(me.profile_data as Record<string, unknown>)?.display_name
                  ? String((me.profile_data as Record<string, unknown>).display_name)
                  : "Your Profile"}
              </h2>
              <p className="text-halo-on-surface-variant">
                {me.coarse_location || "Location not set"}
              </p>
              <span className="mt-1 inline-block rounded-full bg-halo-secondary-container px-3 py-0.5 text-xs font-semibold text-halo-on-secondary-container">
                {me.is_onboarded ? "Onboarded" : "Setup incomplete"}
              </span>
            </div>
          </div>
        </div>

        {/* Values & Interests */}
        {tags.length > 0 && (
          <section className="mt-8">
            <h3 className="mb-4 font-serif text-lg font-semibold text-halo-on-surface">
              Values &amp; Interests
            </h3>
            <div className="flex flex-wrap gap-2">
              {tags.map((tag) => (
                <span
                  key={tag.label}
                  className="rounded-full bg-halo-secondary-container px-4 py-2 text-sm font-medium text-halo-on-secondary-container"
                >
                  {tag.label}
                </span>
              ))}
            </div>
          </section>
        )}

        {/* Vibe */}
        {Object.keys(vibe).length > 0 && (
          <section className="mt-8">
            <h3 className="mb-4 font-serif text-lg font-semibold text-halo-on-surface">
              Your Vibe
            </h3>
            <div className="grid gap-3 sm:grid-cols-3">
              {Object.entries(vibe).map(([key, val]) => (
                <div
                  key={key}
                  className="rounded-2xl bg-halo-surface-container-low p-4 shadow-sm"
                >
                  <p className="text-xs font-semibold uppercase tracking-wider text-halo-on-surface-variant">
                    {key.replace(/_/g, " ")}
                  </p>
                  <p className="mt-1 font-serif text-base font-semibold text-halo-on-surface">
                    {val}
                  </p>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Prompts */}
        {prompts.length > 0 && (
          <section className="mt-8">
            <h3 className="mb-4 font-serif text-lg font-semibold text-halo-on-surface">
              About You
            </h3>
            <div className="space-y-4">
              {prompts.map((p) => (
                <div
                  key={p.prompt_id}
                  className="rounded-2xl bg-halo-surface-container-low p-5 shadow-sm"
                >
                  <p className="font-serif text-sm font-semibold italic text-halo-on-surface-variant">
                    {p.question}
                  </p>
                  <p className="mt-2 leading-relaxed text-halo-on-surface">
                    {p.answer}
                  </p>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Action */}
        <div className="mt-10">
          <button
            onClick={() => router.push("/discovery")}
            className="rounded-full bg-gradient-to-r from-halo-primary to-halo-primary-container px-8 py-3 text-sm font-semibold text-halo-on-primary shadow-ambient transition-transform hover:scale-[1.02] active:scale-[0.98]"
          >
            Back to Discovery
          </button>
        </div>
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
          <button
            onClick={() => router.push("/matches")}
            className="min-h-touch rounded-full px-5 py-2 text-sm text-halo-on-surface-variant hover:text-halo-on-surface transition-colors"
          >
            Matches
          </button>
          <button className="min-h-touch rounded-full px-5 py-2 text-sm font-semibold text-halo-primary">
            Profile
          </button>
        </div>
      </nav>
    </main>
  );
}
