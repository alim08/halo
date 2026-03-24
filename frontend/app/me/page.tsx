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
      <main className="flex min-h-screen items-center justify-center bg-gray-50 p-4">
        <p className="text-sm text-gray-500">Loading profile...</p>
      </main>
    );
  }

  if (error || !me) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-gray-50 p-4">
        <div className="text-center">
          <p className="text-red-600">{error || "Profile not found."}</p>
          <button
            onClick={() => router.push("/discovery")}
            className="mt-3 rounded-md border border-gray-300 px-4 py-2 text-sm"
          >
            Back to Discovery
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gray-50 p-4">
      <div className="mx-auto w-full max-w-2xl rounded-xl border bg-white p-4 shadow-sm">
        <h1 className="text-xl font-semibold text-halo-primary">My Profile</h1>

        <div className="mt-4 grid gap-2 text-sm">
          <div>
            <span className="font-medium">User ID: </span>
            <span className="break-all text-gray-700">{me.id}</span>
          </div>
          <div>
            <span className="font-medium">Onboarded: </span>
            <span className="text-gray-700">{me.is_onboarded ? "Yes" : "No"}</span>
          </div>
          <div>
            <span className="font-medium">Location: </span>
            <span className="text-gray-700">{me.coarse_location || "Not set"}</span>
          </div>
        </div>

        <h2 className="mt-6 text-sm font-semibold text-gray-700">profile_data</h2>
        <pre className="mt-2 overflow-x-auto rounded-md bg-gray-50 p-3 text-xs text-gray-800">
{JSON.stringify(me.profile_data, null, 2)}
        </pre>

        <div className="mt-4">
          <button
            onClick={() => router.push("/discovery")}
            className="rounded-md bg-halo-primary px-4 py-2 text-sm font-medium text-white"
          >
            Back to Discovery
          </button>
        </div>
      </div>
    </main>
  );
}
