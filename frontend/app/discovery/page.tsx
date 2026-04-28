"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { isAuthenticated, api, MeResponse } from "@/lib/api";
import { DiscoveryStack } from "@/components/discovery/DiscoveryStack";

export default function DiscoveryPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isAuthenticated()) {
      router.replace("/login");
      return;
    }

    api.me
      .get()
      .then((me: MeResponse) => {
        if (!me.is_onboarded) {
          router.replace("/onboarding");
          return;
        }
        setLoading(false);
      })
      .catch(() => {
        setError("Failed to load your profile.");
        setLoading(false);
      });
  }, [router]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-surface">
        <div className="text-center">
          <div className="mx-auto h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          <p className="mt-4 text-sm text-on-surface/60">Loading discovery...</p>
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
      {/* ── Top Nav ── */}
      <header className="fixed inset-x-0 top-0 z-30 border-b border-outline-variant bg-white/90 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
          {/* Logo */}
          <span className="text-2xl font-extrabold tracking-tight text-primary">
            Halo
          </span>

          {/* Nav links */}
          <nav className="hidden items-center gap-8 md:flex">
            <button className="border-b-2 border-primary pb-0.5 text-sm font-semibold text-primary">
              Discover
            </button>
            <button
              onClick={() => router.push("/matches")}
              className="text-sm font-medium text-on-surface/50 transition-colors hover:text-on-surface"
            >
              Matches
            </button>
            <button
              onClick={() => router.push("/me")}
              className="text-sm font-medium text-on-surface/50 transition-colors hover:text-on-surface"
            >
              Profile
            </button>
          </nav>

          {/* Right actions */}
          <div className="flex items-center gap-4">
            <button
              aria-label="Notifications"
              className="relative flex h-10 w-10 items-center justify-center rounded-full text-on-surface/60 transition-colors hover:bg-surface-container hover:text-on-surface"
            >
              <span className="material-symbols-outlined text-[22px]">notifications</span>
            </button>
            <button className="hidden rounded-full bg-primary px-5 py-2 text-sm font-semibold text-on-primary shadow-sm transition-shadow hover:shadow-md md:block">
              Get Started
            </button>
          </div>
        </div>
      </header>

      {/* ── Main Grid ── */}
      <main className="mx-auto grid max-w-7xl grid-cols-1 gap-6 px-6 pt-[calc(4rem+1.5rem)] lg:grid-cols-12 lg:h-[calc(100vh-140px)]">
        {/* ── Left Sidebar ── */}
        <aside className="hidden space-y-5 overflow-y-auto py-2 lg:col-span-3 lg:block">
          {/* Values Filter */}
          <div className="rounded-2xl border border-outline-variant bg-white p-5">
            <h2 className="mb-4 text-xs font-bold uppercase tracking-wider text-on-surface/50">
              Values Filter
            </h2>
            <ul className="space-y-3">
              {[
                { label: "Emotional Intelligence", checked: true },
                { label: "Growth Mindset", checked: true },
                { label: "Authenticity", checked: false },
                { label: "Vulnerability", checked: true },
                { label: "Compassion", checked: false },
              ].map((item) => (
                <li key={item.label} className="flex items-center gap-3">
                  <span
                    className={`flex h-5 w-5 items-center justify-center rounded-md border text-xs ${
                      item.checked
                        ? "border-primary bg-primary text-white"
                        : "border-outline-variant bg-white text-transparent"
                    }`}
                  >
                    <span className="material-symbols-outlined text-[16px]">check</span>
                  </span>
                  <span className="text-sm text-on-surface/80">{item.label}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Discovery Mode */}
          <div className="rounded-2xl border border-outline-variant bg-white p-5">
            <h2 className="mb-2 text-xs font-bold uppercase tracking-wider text-on-surface/50">
              Discovery Mode
            </h2>
            <p className="mb-3 text-sm text-on-surface/70">Values-First</p>
            <div className="h-2 w-full overflow-hidden rounded-full bg-surface-container">
              <div
                className="h-full rounded-full bg-gradient-to-r from-primary to-secondary"
                style={{ width: "68%" }}
              />
            </div>
            <p className="mt-2 text-xs text-on-surface/50">68% compatibility threshold</p>
          </div>
        </aside>

        {/* ── Center Card ── */}
        <section className="flex items-start justify-center py-2 lg:col-span-6 lg:items-center">
          <DiscoveryStack />
        </section>

        {/* ── Right Sidebar ── */}
        <aside className="hidden space-y-5 overflow-y-auto py-2 lg:col-span-3 lg:block">
          {/* Mutual Context */}
          <div className="rounded-2xl border border-outline-variant bg-white p-5">
            <h2 className="mb-3 text-xs font-bold uppercase tracking-wider text-on-surface/50">
              Mutual Context
            </h2>
            <ul className="space-y-2 text-sm text-on-surface/70">
              <li className="flex items-center gap-2">
                <span className="material-symbols-outlined text-primary text-[18px]">group</span>
                3 shared values
              </li>
              <li className="flex items-center gap-2">
                <span className="material-symbols-outlined text-primary text-[18px]">favorite</span>
                Similar attachment style
              </li>
              <li className="flex items-center gap-2">
                <span className="material-symbols-outlined text-primary text-[18px]">psychology</span>
                Communication match
              </li>
            </ul>
          </div>

          {/* Deep Insights */}
          <div className="rounded-2xl border border-outline-variant bg-white p-5">
            <h2 className="mb-3 text-xs font-bold uppercase tracking-wider text-on-surface/50">
              Deep Insights
            </h2>
            <ol className="relative border-l-2 border-outline-variant pl-5">
              {[
                { time: "Values aligned", desc: "Core beliefs match" },
                { time: "Lifestyle fit", desc: "Growth-oriented" },
                { time: "Emotional depth", desc: "Reflective thinker" },
              ].map((item, i) => (
                <li key={i} className="relative mb-4 last:mb-0">
                  <span className="absolute -left-[1.6rem] top-1 h-3 w-3 rounded-full border-2 border-primary bg-white" />
                  <p className="text-xs font-semibold text-on-surface/80">{item.time}</p>
                  <p className="text-xs text-on-surface/50">{item.desc}</p>
                </li>
              ))}
            </ol>
          </div>

          {/* Mini map placeholder */}
          <div className="flex h-36 items-center justify-center rounded-2xl border border-outline-variant bg-surface-container">
            <span className="material-symbols-outlined text-on-surface/30 text-[36px]">map</span>
          </div>
        </aside>
      </main>

      {/* ── Mobile Bottom Nav ── */}
      <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-outline-variant bg-white/90 backdrop-blur-md lg:hidden">
        <div className="mx-auto flex max-w-md justify-around py-2">
          <button className="flex min-h-[44px] flex-col items-center justify-center px-4 text-primary">
            <span className="material-symbols-outlined text-[22px]">explore</span>
            <span className="text-[10px] font-semibold">Discover</span>
          </button>
          <button
            onClick={() => router.push("/matches")}
            className="flex min-h-[44px] flex-col items-center justify-center px-4 text-on-surface/50 transition-colors hover:text-on-surface"
          >
            <span className="material-symbols-outlined text-[22px]">chat_bubble</span>
            <span className="text-[10px] font-medium">Matches</span>
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
