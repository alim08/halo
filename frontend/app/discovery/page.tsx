"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { isAuthenticated, api, MeResponse, type ComparisonProfile } from "@/lib/api";
import { DiscoveryStack } from "@/components/discovery/DiscoveryStack";

export default function DiscoveryPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentUserProfile, setCurrentUserProfile] = useState<ComparisonProfile | null>(null);

  useEffect(() => {
    if (!isAuthenticated()) {
      router.replace("/login");
      return;
    }

    // Verify user is onboarded and fetch profile once.
    api.me
      .get()
      .then((me: MeResponse) => {
        if (!me.is_onboarded) {
          router.replace("/onboarding");
          return;
        }
        setCurrentUserProfile(me.profile_data as ComparisonProfile);
        setLoading(false);
      })
      .catch((err: Error) => {
        console.error("[Discovery] ❌ Error checking profile:", err.message);
        setError("Failed to load your profile.");
        setLoading(false);
      });
  }, [router]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="mx-auto h-8 w-8 animate-spin rounded-full border-4 border-halo-primary border-t-transparent" />
          <p className="mt-4 text-sm text-gray-500">Loading discovery…</p>
        </div>
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
    <main className="flex min-h-screen flex-col bg-gray-50">
      <header className="sticky top-0 z-10 border-b bg-white px-4 py-3">
        <h1 className="text-center text-lg font-semibold text-halo-primary">
          Discover
        </h1>
      </header>

      <div className="flex flex-1 items-center justify-center p-4 pb-20">
        <DiscoveryStack currentUserProfile={currentUserProfile} />
      </div>

      {/* Bottom nav */}
      <nav className="fixed bottom-0 left-0 right-0 flex justify-around border-t bg-white py-2">
        <button className="min-h-touch px-4 py-2 text-xs font-semibold text-halo-primary">
          Discover
        </button>
        <button
          onClick={() => router.push("/matches")}
          className="min-h-touch px-4 py-2 text-xs text-gray-500"
        >
          Matches
        </button>
        <button
          onClick={() => router.push("/me")}
          className="min-h-touch px-4 py-2 text-xs text-gray-500"
        >
          Profile
        </button>
      </nav>
    </main>
  );
}
