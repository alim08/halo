"use client";

import { useState, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import { api, type MeResponse } from "@/lib/api";

type OnboardingState = {
  birthdate: string;
  coarse_location: string;
  vibe: Record<string, string>;
  tags: Array<{ type: string; label: string }>;
  prompts: Array<{ prompt_id: string; question: string; answer: string }>;
};

const INITIAL_STATE: OnboardingState = {
  birthdate: "",
  coarse_location: "",
  vibe: {},
  tags: [],
  prompts: [],
};

/**
 * Hook that manages onboarding state, persistence, and resumability.
 * On mount it fetches GET /v1/me to restore any partial progress.
 * Each step calls PUT /v1/me/profile to persist incrementally.
 */
export function useOnboarding() {
  const router = useRouter();
  const [state, setState] = useState<OnboardingState>(INITIAL_STATE);
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  // Resume: fetch current profile on mount.
  useEffect(() => {
    let cancelled = false;

    async function restore() {
      try {
        const me: MeResponse = await api.me.get();

        if (me.is_onboarded) {
          router.replace("/discovery");
          return;
        }

        // Restore partial progress from profile_data.
        const pd = me.profile_data || {};
        const restored: OnboardingState = {
          birthdate: (pd.birthdate as string) || "",
          coarse_location: me.coarse_location || "",
          vibe: (pd.vibe as Record<string, string>) || {},
          tags:
            (pd.tags as Array<{ type: string; label: string }>) || [],
          prompts:
            (pd.prompts as Array<{
              prompt_id: string;
              question: string;
              answer: string;
            }>) || [],
        };

        if (!cancelled) {
          setState(restored);
          // Determine which step to resume at.
          setStep(computeResumeStep(restored));
        }
      } catch {
        // If fetch fails (e.g. expired token), let the page-level guard redirect.
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    restore();
    return () => {
      cancelled = true;
    };
  }, [router]);

  // Persist current step's data to the server.
  const saveProgress = useCallback(
    async (partial: Partial<OnboardingState>) => {
      setSaving(true);
      setError("");

      const merged = { ...state, ...partial };
      setState(merged);

      try {
        const payload: Record<string, unknown> = {};

        if (merged.birthdate) {
          payload.birthdate = merged.birthdate;
        }
        if (merged.coarse_location) {
          payload.coarse_location = merged.coarse_location;
        }

        // Package vibe/tags/prompts into profile_data.
        const profileData: Record<string, unknown> = {};
        if (Object.keys(merged.vibe).length > 0) profileData.vibe = merged.vibe;
        if (merged.tags.length > 0) profileData.tags = merged.tags;
        if (merged.prompts.length > 0) profileData.prompts = merged.prompts;
        if (Object.keys(profileData).length > 0) {
          payload.profile_data = profileData;
        }

        const me = await api.me.updateProfile(
          payload as {
            birthdate?: string;
            coarse_location?: string;
            profile_data?: Record<string, unknown>;
          }
        );

        if (me.is_onboarded) {
          router.push("/discovery");
          return;
        }
      } catch (err: unknown) {
        const message =
          err instanceof Error ? err.message : "Failed to save progress";
        setError(message);
      } finally {
        setSaving(false);
      }
    },
    [state, router]
  );

  const nextStep = useCallback(
    (partial: Partial<OnboardingState>) => {
      saveProgress(partial);
      setStep((s) => s + 1);
    },
    [saveProgress]
  );

  const prevStep = useCallback(() => {
    setStep((s) => Math.max(0, s - 1));
  }, []);

  return {
    state,
    step,
    loading,
    saving,
    error,
    nextStep,
    prevStep,
    saveProgress,
    totalSteps: 4,
  };
}

/** Determine the first incomplete onboarding step. */
function computeResumeStep(s: OnboardingState): number {
  if (!s.birthdate || !s.coarse_location) return 0;
  if (Object.keys(s.vibe).length === 0) return 1;
  if (s.tags.length === 0) return 2;
  if (s.prompts.length === 0) return 3;
  return 3; // all filled — show last step for final submit
}
