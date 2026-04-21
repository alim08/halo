"use client";

import { useState } from "react";
import { useOnboarding } from "./useOnboarding";

// ── Step definitions ─────────────────────────────────────

const VIBE_OPTIONS = [
  { key: "energy_level", label: "Energy Level", options: ["Chill", "Moderate", "High Energy"] },
  { key: "life_pace", label: "Life Pace", options: ["Slow & Steady", "Balanced", "Fast-Paced"] },
  { key: "social_style", label: "Social Style", options: ["Homebody", "Ambivert", "Social Butterfly"] },
  { key: "commitment_style", label: "Commitment Style", options: ["Casual", "Serious", "Flexible"] },
];

const TAG_OPTIONS = [
  { type: "value", label: "Honesty" },
  { type: "value", label: "Loyalty" },
  { type: "value", label: "Kindness" },
  { type: "value", label: "Ambition" },
  { type: "value", label: "Humor" },
  { type: "value", label: "Creativity" },
  { type: "interest", label: "Travel" },
  { type: "interest", label: "Cooking" },
  { type: "interest", label: "Fitness" },
  { type: "interest", label: "Music" },
  { type: "interest", label: "Reading" },
  { type: "interest", label: "Gaming" },
];

const PROMPT_QUESTIONS = [
  { id: "p1", question: "My idea of a perfect weekend is…" },
  { id: "p2", question: "The value I care about most in a partner is…" },
  { id: "p3", question: "Something that always makes me smile is…" },
];

// ── Main component ───────────────────────────────────────

export function OnboardingWizard() {
  const {
    state,
    step,
    loading,
    saving,
    error,
    nextStep,
    prevStep,
    totalSteps,
  } = useOnboarding();

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-gray-400">Loading your progress…</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Progress bar */}
      <div className="flex gap-1">
        {Array.from({ length: totalSteps }).map((_, i) => (
          <div
            key={i}
            className={`h-1.5 flex-1 rounded-full transition-colors ${
              i <= step ? "bg-halo-primary" : "bg-gray-200"
            }`}
          />
        ))}
      </div>

      {error && (
        <div className="rounded-md bg-red-50 p-3 text-sm text-red-600">
          {error}
        </div>
      )}

      {step === 0 && (
        <BasicsStep
          birthdate={state.birthdate}
          location={state.coarse_location}
          onNext={(birthdate, location) =>
            nextStep({ birthdate, coarse_location: location })
          }
          saving={saving}
        />
      )}

      {step === 1 && (
        <VibeStep
          vibe={state.vibe}
          onNext={(vibe) => nextStep({ vibe })}
          onBack={prevStep}
          saving={saving}
        />
      )}

      {step === 2 && (
        <TagsStep
          selected={state.tags}
          onNext={(tags) => nextStep({ tags })}
          onBack={prevStep}
          saving={saving}
        />
      )}

      {step === 3 && (
        <PromptsStep
          prompts={state.prompts}
          onNext={(prompts) => nextStep({ prompts })}
          onBack={prevStep}
          saving={saving}
        />
      )}
    </div>
  );
}

// ── Step 0: Basics (birthdate + location) ────────────────

function BasicsStep({
  birthdate,
  location,
  onNext,
  saving,
}: {
  birthdate: string;
  location: string;
  onNext: (birthdate: string, location: string) => void;
  saving: boolean;
}) {
  const [bd, setBd] = useState(birthdate);
  const [loc, setLoc] = useState(location);
  const [localError, setLocalError] = useState("");

  function handleNext() {
    if (!bd) {
      setLocalError("Birthdate is required");
      return;
    }
    if (!loc.trim()) {
      setLocalError("Location is required");
      return;
    }

    // Quick 18+ check on client side.
    const age = getAge(bd);
    if (age < 18) {
      setLocalError("You must be at least 18 years old");
      return;
    }

    setLocalError("");
    onNext(bd, loc.trim());
  }

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold">Let&apos;s get the basics</h2>
      <p className="text-sm text-gray-500">
        We need a few things to get started.
      </p>

      {localError && (
        <div className="rounded-md bg-red-50 p-3 text-sm text-red-600">
          {localError}
        </div>
      )}

      <div>
        <label htmlFor="birthdate" className="block text-sm font-medium">
          Birthdate
        </label>
        <input
          id="birthdate"
          type="date"
          value={bd}
          onChange={(e) => setBd(e.target.value)}
          className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 min-h-touch focus:border-halo-primary focus:outline-none focus:ring-1 focus:ring-halo-primary"
        />
      </div>

      <div>
        <label htmlFor="location" className="block text-sm font-medium">
          Location
        </label>
        <input
          id="location"
          type="text"
          placeholder="e.g. Austin, TX"
          value={loc}
          onChange={(e) => setLoc(e.target.value)}
          className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 min-h-touch focus:border-halo-primary focus:outline-none focus:ring-1 focus:ring-halo-primary"
        />
      </div>

      <button
        onClick={handleNext}
        disabled={saving}
        className="w-full rounded-md bg-halo-primary px-4 py-3 min-h-touch text-white font-medium hover:bg-opacity-90 disabled:opacity-50"
      >
        {saving ? "Saving…" : "Continue"}
      </button>
    </div>
  );
}

// ── Step 1: Vibe ─────────────────────────────────────────

function VibeStep({
  vibe,
  onNext,
  onBack,
  saving,
}: {
  vibe: Record<string, string>;
  onNext: (vibe: Record<string, string>) => void;
  onBack: () => void;
  saving: boolean;
}) {
  const [selected, setSelected] = useState<Record<string, string>>(vibe);

  function handleNext() {
    onNext(selected);
  }

  const allSelected = VIBE_OPTIONS.every((v) => selected[v.key]);

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold">What&apos;s your vibe?</h2>
      <p className="text-sm text-gray-500">Pick what best describes you.</p>

      {VIBE_OPTIONS.map((group) => (
        <div key={group.key}>
          <p className="mb-2 text-sm font-medium">{group.label}</p>
          <div className="flex flex-wrap gap-2">
            {group.options.map((opt) => (
              <button
                key={opt}
                onClick={() =>
                  setSelected((s) => ({ ...s, [group.key]: opt }))
                }
                className={`rounded-full px-4 py-2 min-h-touch text-sm border transition-colors ${
                  selected[group.key] === opt
                    ? "border-halo-primary bg-halo-primary text-white"
                    : "border-gray-300 hover:border-halo-primary"
                }`}
              >
                {opt}
              </button>
            ))}
          </div>
        </div>
      ))}

      <div className="flex gap-3">
        <button
          onClick={onBack}
          className="flex-1 rounded-md border border-gray-300 px-4 py-3 min-h-touch font-medium hover:bg-gray-50"
        >
          Back
        </button>
        <button
          onClick={handleNext}
          disabled={!allSelected || saving}
          className="flex-1 rounded-md bg-halo-primary px-4 py-3 min-h-touch text-white font-medium hover:bg-opacity-90 disabled:opacity-50"
        >
          {saving ? "Saving…" : "Continue"}
        </button>
      </div>
    </div>
  );
}

// ── Step 2: Tags ─────────────────────────────────────────

function TagsStep({
  selected,
  onNext,
  onBack,
  saving,
}: {
  selected: Array<{ type: string; label: string }>;
  onNext: (tags: Array<{ type: string; label: string }>) => void;
  onBack: () => void;
  saving: boolean;
}) {
  const [tags, setTags] = useState(selected);

  function toggle(tag: { type: string; label: string }) {
    setTags((prev) => {
      const exists = prev.some((t) => t.label === tag.label);
      if (exists) return prev.filter((t) => t.label !== tag.label);
      if (prev.length >= 6) return prev; // max 6 tags
      return [...prev, tag];
    });
  }

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold">Your values & interests</h2>
      <p className="text-sm text-gray-500">
        Pick up to 6 that matter most to you.
      </p>

      <div className="flex flex-wrap gap-2">
        {TAG_OPTIONS.map((tag) => {
          const isSelected = tags.some((t) => t.label === tag.label);
          return (
            <button
              key={tag.label}
              onClick={() => toggle(tag)}
              className={`rounded-full px-4 py-2 min-h-touch text-sm border transition-colors ${
                isSelected
                  ? "border-halo-primary bg-halo-primary text-white"
                  : "border-gray-300 hover:border-halo-primary"
              }`}
            >
              {tag.label}
            </button>
          );
        })}
      </div>

      <p className="text-xs text-gray-400">{tags.length}/6 selected</p>

      <div className="flex gap-3">
        <button
          onClick={onBack}
          className="flex-1 rounded-md border border-gray-300 px-4 py-3 min-h-touch font-medium hover:bg-gray-50"
        >
          Back
        </button>
        <button
          onClick={() => onNext(tags)}
          disabled={tags.length === 0 || saving}
          className="flex-1 rounded-md bg-halo-primary px-4 py-3 min-h-touch text-white font-medium hover:bg-opacity-90 disabled:opacity-50"
        >
          {saving ? "Saving…" : "Continue"}
        </button>
      </div>
    </div>
  );
}

// ── Step 3: Prompts ──────────────────────────────────────

function PromptsStep({
  prompts,
  onNext,
  onBack,
  saving,
}: {
  prompts: Array<{ prompt_id: string; question: string; answer: string }>;
  onNext: (
    prompts: Array<{ prompt_id: string; question: string; answer: string }>
  ) => void;
  onBack: () => void;
  saving: boolean;
}) {
  const [answers, setAnswers] = useState<Record<string, string>>(() => {
    const map: Record<string, string> = {};
    prompts.forEach((p) => {
      map[p.prompt_id] = p.answer;
    });
    return map;
  });

  function handleNext() {
    const result = PROMPT_QUESTIONS.filter((q) => answers[q.id]?.trim()).map(
      (q) => ({
        prompt_id: q.id,
        question: q.question,
        answer: answers[q.id].trim(),
      })
    );
    onNext(result);
  }

  const filledCount = PROMPT_QUESTIONS.filter(
    (q) => answers[q.id]?.trim()
  ).length;

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold">Share a bit about yourself</h2>
      <p className="text-sm text-gray-500">
        Answer at least one prompt. These will show up on your discovery card.
      </p>

      {PROMPT_QUESTIONS.map((q) => (
        <div key={q.id}>
          <label htmlFor={q.id} className="block text-sm font-medium">
            {q.question}
          </label>
          <textarea
            id={q.id}
            rows={2}
            value={answers[q.id] || ""}
            onChange={(e) =>
              setAnswers((a) => ({ ...a, [q.id]: e.target.value }))
            }
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 focus:border-halo-primary focus:outline-none focus:ring-1 focus:ring-halo-primary resize-none"
            maxLength={300}
          />
        </div>
      ))}

      <div className="flex gap-3">
        <button
          onClick={onBack}
          className="flex-1 rounded-md border border-gray-300 px-4 py-3 min-h-touch font-medium hover:bg-gray-50"
        >
          Back
        </button>
        <button
          onClick={handleNext}
          disabled={filledCount === 0 || saving}
          className="flex-1 rounded-md bg-halo-primary px-4 py-3 min-h-touch text-white font-medium hover:bg-opacity-90 disabled:opacity-50"
        >
          {saving ? "Completing…" : "Complete Profile"}
        </button>
      </div>
    </div>
  );
}

// ── Helpers ──────────────────────────────────────────────

function getAge(dateStr: string): number {
  const birth = new Date(dateStr);
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) {
    age--;
  }
  return age;
}
