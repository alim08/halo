"use client";

import { useState, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import { api, type MeResponse } from "@/lib/api";

type OnboardingState = {
  birthdate: string;
  coarse_location: string;
  race_ethnicity: string[];
  gender: string;
  sexual_profile: string;
  interested_in: string[];
  vibe: Record<string, string>;
  relationship_intentions: string[];
  age_pref_min: number;
  age_pref_max: number;
  race_ethnicity_preferences: string[];
  lifestyle_habits: Record<string, string>;
  connection_style: Record<string, string>;
  interests: string[];
  bio: string;
  prompts: Array<{ prompt_id: string; question: string; answer: string }>;
};

type ProfileOptions = {
  raceEthnicity: string[];
  raceEthnicityExclusive: string;
  raceEthnicityPreferences: string[];
  raceEthnicityPreferenceExclusive: string;
  defaultRaceEthnicityPreferences: string[];
};

// 0 is a sentinel for "not yet persisted"; the AgeRace step seeds 18/99 locally
// when the user opens it, but the resume logic needs to distinguish "saved" from "default".
const INITIAL_STATE: OnboardingState = {
  birthdate: "",
  coarse_location: "",
  race_ethnicity: [],
  gender: "",
  sexual_profile: "",
  interested_in: [],
  vibe: {},
  relationship_intentions: [],
  age_pref_min: 0,
  age_pref_max: 0,
  race_ethnicity_preferences: [],
  lifestyle_habits: {},
  connection_style: {},
  interests: [],
  bio: "",
  prompts: [],
};

const EMPTY_PROFILE_OPTIONS: ProfileOptions = {
  raceEthnicity: [],
  raceEthnicityExclusive: "",
  raceEthnicityPreferences: [],
  raceEthnicityPreferenceExclusive: "",
  defaultRaceEthnicityPreferences: [],
};

// Used when /v1/profile/options is unreachable; keeps the wizard usable.
// Backend remains the source of truth — these are validated server-side on submit.
const FALLBACK_PROFILE_OPTIONS: ProfileOptions = {
  raceEthnicity: [
    "Asian",
    "Black/African",
    "Hispanic/Latino",
    "Middle Eastern/North African",
    "Pacific Islander",
    "White",
    "Other",
    "Prefer not to say",
  ],
  raceEthnicityExclusive: "Prefer not to say",
  raceEthnicityPreferences: [
    "Open to all",
    "Asian",
    "Black/African",
    "Hispanic/Latino",
    "Middle Eastern/North African",
    "Pacific Islander",
    "White",
    "Other",
  ],
  raceEthnicityPreferenceExclusive: "Open to all",
  defaultRaceEthnicityPreferences: ["Open to all"],
};

const TOTAL_STEPS = 9;

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
  const [restoreError, setRestoreError] = useState("");
  const [restoreAttempt, setRestoreAttempt] = useState(0);
  const [profileOptions, setProfileOptions] = useState<ProfileOptions>(EMPTY_PROFILE_OPTIONS);

  // Resume: fetch current profile on mount.
  useEffect(() => {
    let cancelled = false;

    async function restore() {
      setLoading(true);
      setError("");
      setRestoreError("");

      try {
        // /v1/me is required to know whether to resume the wizard or redirect.
        // /v1/profile/options is static reference data — if it fails we fall back to
        // FALLBACK_PROFILE_OPTIONS so a transient outage doesn't block the user.
        const mePromise = api.me.get();
        const optionsPromise = api.me.getProfileOptions().catch((err: unknown) => {
          console.warn("[Onboarding] profile options fetch failed, using fallback:", err);
          return null;
        });
        const [me, options]: [
          MeResponse,
          Awaited<ReturnType<typeof api.me.getProfileOptions>> | null,
        ] = await Promise.all([mePromise, optionsPromise]);

        if (me.is_onboarded) {
          router.replace("/discovery");
          return;
        }

        // Restore partial progress from profile_data and top-level fields.
        const pd = me.profile_data || {};
        const restored: OnboardingState = {
          birthdate: me.birthdate || "",
          coarse_location: me.coarse_location || "",
          race_ethnicity: (pd.race_ethnicity as string[]) || [],
          gender: (pd.gender as string) || "",
          sexual_profile: (pd.sexual_profile as string) || "",
          interested_in: (pd.interested_in as string[]) || [],
          vibe: (pd.vibe as Record<string, string>) || {},
          relationship_intentions: (pd.relationship_intentions as string[]) || [],
          age_pref_min: readAgePreference(pd.age_pref_min, INITIAL_STATE.age_pref_min),
          age_pref_max: readAgePreference(pd.age_pref_max, INITIAL_STATE.age_pref_max),
          race_ethnicity_preferences:
            (pd.race_ethnicity_preferences as string[]) || [],
          lifestyle_habits: (pd.lifestyle_habits as Record<string, string>) || {},
          connection_style: (pd.connection_style as Record<string, string>) || {},
          interests: (pd.interests as string[]) || [],
          bio: (pd.bio as string) || "",
          prompts:
            (pd.prompts as Array<{
              prompt_id: string;
              question: string;
              answer: string;
            }>) || [],
        };

        if (!cancelled) {
          setProfileOptions(
            options
              ? {
                  raceEthnicity: options.race_ethnicity,
                  raceEthnicityExclusive: options.race_ethnicity_exclusive,
                  raceEthnicityPreferences: options.race_ethnicity_preferences,
                  raceEthnicityPreferenceExclusive: options.race_ethnicity_preference_exclusive,
                  defaultRaceEthnicityPreferences: options.default_race_ethnicity_preferences,
                }
              : FALLBACK_PROFILE_OPTIONS,
          );
          setState(restored);
          // Determine which step to resume at.
          setStep(computeResumeStep(restored));
        }
      } catch (err: unknown) {
        console.error("[Onboarding] restore failed:", err);
        if (!cancelled) {
          const message = restoreFailureMessage(err);
          setRestoreError(message);
          setError(message);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    restore();
    return () => {
      cancelled = true;
    };
  }, [router, restoreAttempt]);

  const retryRestore = useCallback(() => {
    setLoading(true);
    setError("");
    setRestoreError("");
    setRestoreAttempt((attempt) => attempt + 1);
  }, []);

  // Persist current step's data to the server.
  const saveProgress = useCallback(
    async (partial: Partial<OnboardingState>): Promise<boolean> => {
      setSaving(true);
      setError("");

      const merged = { ...state, ...partial };

      try {
        const payload: Record<string, unknown> = {};

        if (merged.birthdate) {
          payload.birthdate = merged.birthdate;
        }
        if (merged.coarse_location) {
          payload.coarse_location = merged.coarse_location;
        }

        // Package onboarding answers into profile_data.
        const profileData: Record<string, unknown> = {};
        if (partial.race_ethnicity !== undefined) {
          profileData.race_ethnicity = merged.race_ethnicity;
        }
        if (merged.gender) profileData.gender = merged.gender;
        if (merged.sexual_profile) profileData.sexual_profile = merged.sexual_profile;
        if (merged.interested_in.length > 0) profileData.interested_in = merged.interested_in;
        if (Object.keys(merged.vibe).length > 0) profileData.vibe = merged.vibe;
        if (merged.relationship_intentions.length > 0) profileData.relationship_intentions = merged.relationship_intentions;
        if (partial.age_pref_min !== undefined) {
          profileData.age_pref_min = merged.age_pref_min;
        }
        if (partial.age_pref_max !== undefined) {
          profileData.age_pref_max = merged.age_pref_max;
        }
        if (partial.race_ethnicity_preferences !== undefined) {
          profileData.race_ethnicity_preferences = merged.race_ethnicity_preferences;
        }
        if (Object.keys(merged.lifestyle_habits).length > 0) profileData.lifestyle_habits = merged.lifestyle_habits;
        if (Object.keys(merged.connection_style).length > 0) profileData.connection_style = merged.connection_style;
        if (merged.interests.length > 0) profileData.interests = merged.interests;
        if (merged.bio) profileData.bio = merged.bio;
        if (merged.prompts.length > 0) profileData.prompts = merged.prompts;
        if (Object.keys(profileData).length > 0) {
          payload.profile_data = profileData;
        }

        console.log("[Onboarding] Sending profile update:", {
          profileDataKeys: Object.keys(profileData),
        });

        const me = await api.me.updateProfile(
          payload as {
            birthdate?: string;
            coarse_location?: string;
            profile_data?: Record<string, unknown>;
          }
        );

        setState(merged);

        console.log("[Onboarding] Server response:", {
          is_onboarded: me.is_onboarded,
          has_profile_data: !!me.profile_data,
        });

        if (me.is_onboarded) {
          console.log("[Onboarding] ✅ Complete! Navigating to /discovery");
          router.push("/discovery");
          return true;
        } else {
          console.log("[Onboarding] ❌ Still not onboarded after save.");
        }

        return true;
      } catch (err: unknown) {
        const message =
          err instanceof Error ? err.message : "Failed to save progress";
        console.error("[Onboarding] ❌ Error saving progress:", message);
        setError(message);
        return false;
      } finally {
        setSaving(false);
      }
    },
    [state, router]
  );

  const nextStep = useCallback(
    async (partial: Partial<OnboardingState>) => {
      const saved = await saveProgress(partial);
      if (!saved) return;

      setStep((s) => Math.min(s + 1, TOTAL_STEPS - 1));
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
    restoreError,
    profileOptions,
    nextStep,
    prevStep,
    retryRestore,
    saveProgress,
    totalSteps: TOTAL_STEPS,
  };
}

/** Determine the first incomplete onboarding step. */
function computeResumeStep(s: OnboardingState): number {
  if (!s.birthdate || s.race_ethnicity.length === 0 || !s.coarse_location) return 0;
  if (!s.gender || !s.sexual_profile || s.interested_in.length === 0) return 1;
  if (Object.keys(s.vibe).length === 0) return 2;
  if (s.relationship_intentions.length === 0) return 3;
  if (!hasValidAgePreferences(s.age_pref_min, s.age_pref_max)) return 4;
  if (s.race_ethnicity_preferences.length === 0) return 4;
  if (Object.keys(s.lifestyle_habits).length === 0) return 5;
  if (Object.keys(s.connection_style).length === 0) return 6;
  if (s.interests.length === 0) return 7;
  if (s.prompts.length === 0) return 8;
  return 8; // all filled, show last step for final submit
}

function readAgePreference(value: unknown, fallback: number): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function hasValidAgePreferences(min: number, max: number): boolean {
  return Number.isFinite(min) && Number.isFinite(max) && min >= 18 && max <= 99 && min <= max;
}

function restoreFailureMessage(err: unknown): string {
  if (err instanceof TypeError || (err instanceof Error && err.message.includes("fetch"))) {
    return "We couldn't restore your progress. Check your connection and try again.";
  }

  return "We couldn't restore your progress. Try again.";
}
