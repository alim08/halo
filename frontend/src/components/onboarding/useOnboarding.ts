"use client";

import { useState, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import { api, type MeResponse } from "@/lib/api";

type OnboardingState = {
  birthdate: string;
  coarse_location: string;
  gender: string;
  sexual_profile: string;
  interested_in: string[];
  vibe: Record<string, string>;
  lifestyle_habits: Record<string, string>;
  intimacy_questions: Record<string, string>;
  interests: string[];
  prompts: Array<{ prompt_id: string; question: string; answer: string }>;
};

const INITIAL_STATE: OnboardingState = {
  birthdate: "",
  coarse_location: "",
  gender: "",
  sexual_profile: "",
  interested_in: [],
  vibe: {},
  lifestyle_habits: {},
  intimacy_questions: {},
  interests: [],
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
          gender: (pd.gender as string) || "",
          sexual_profile: (pd.sexual_profile as string) || "",
          interested_in: (pd.interested_in as string[]) || [],
          vibe: (pd.vibe as Record<string, string>) || {},
          lifestyle_habits: (pd.lifestyle_habits as Record<string, string>) || {},
          intimacy_questions: (pd.intimacy_questions as Record<string, string>) || {},
          interests: (pd.interests as string[]) || [],
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

        // Package gender/sexual_profile/interested_in/vibe/lifestyle_habits/intimacy_questions/interests/prompts into profile_data.
        const profileData: Record<string, unknown> = {};
        if (merged.gender) profileData.gender = merged.gender;
        if (merged.sexual_profile) profileData.sexual_profile = merged.sexual_profile;
        if (merged.interested_in.length > 0) profileData.interested_in = merged.interested_in;
        if (Object.keys(merged.vibe).length > 0) profileData.vibe = merged.vibe;
        if (Object.keys(merged.lifestyle_habits).length > 0) profileData.lifestyle_habits = merged.lifestyle_habits;
        if (Object.keys(merged.intimacy_questions).length > 0) profileData.intimacy_questions = merged.intimacy_questions;
        if (merged.interests.length > 0) profileData.interests = merged.interests;
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
    totalSteps: 8,
  };
}

/** Determine the first incomplete onboarding step. */
function computeResumeStep(s: OnboardingState): number {
  if (!s.birthdate || !s.coarse_location) return 0;
  if (!s.gender || !s.sexual_profile) return 1;
  if (s.interested_in.length === 0) return 2;
  if (Object.keys(s.vibe).length === 0) return 3;
  if (Object.keys(s.lifestyle_habits).length === 0) return 4;
  if (Object.keys(s.intimacy_questions).length === 0) return 5;
  if (s.interests.length === 0) return 6;
  if (s.prompts.length === 0) return 7;
  return 7; // all filled — show last step for final submit
}
