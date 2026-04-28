"use client";

import { useState } from "react";
import { useOnboarding } from "./useOnboarding";

// -- Color tokens --
const C = {
  primary: "#9500cb",
  primaryContainer: "#b914f9",
  surface: "#fff7fb",
  onSurface: "#211824",
  outlineVariant: "#d4c0d7",
  surfaceContainer: "#f9e9fa",
  onSurfaceVariant: "#504254",
  surfaceContainerLowest: "#ffffff",
} as const;

// -- Step definitions --

const VIBE_OPTIONS = [
  { key: "energy_level", label: "Energy Level", options: ["Chill", "Moderate", "High Energy"] },
  { key: "life_pace", label: "Life Pace", options: ["Slow & Steady", "Balanced", "Fast-Paced"] },
  { key: "social_style", label: "Social Style", options: ["Homebody", "Ambivert", "Social Butterfly"] },
];

const TAG_OPTIONS = [
  { type: "value", label: "Honesty", icon: "verified", description: "Truthful and transparent in all interactions" },
  { type: "value", label: "Loyalty", icon: "handshake", description: "Committed and dependable through thick and thin" },
  { type: "value", label: "Kindness", icon: "favorite", description: "Compassionate and caring toward others" },
  { type: "value", label: "Ambition", icon: "rocket_launch", description: "Driven to grow and achieve meaningful goals" },
  { type: "value", label: "Humor", icon: "sentiment_very_satisfied", description: "Finds joy and laughter in everyday moments" },
  { type: "value", label: "Creativity", icon: "palette", description: "Imaginative and open to new possibilities" },
  { type: "interest", label: "Travel", icon: "flight_takeoff", description: "Exploring new places and cultures" },
  { type: "interest", label: "Cooking", icon: "restaurant", description: "Crafting delicious meals and sharing food" },
  { type: "interest", label: "Fitness", icon: "fitness_center", description: "Staying active and pushing physical limits" },
  { type: "interest", label: "Music", icon: "music_note", description: "Listening, playing, or creating music" },
  { type: "interest", label: "Reading", icon: "menu_book", description: "Diving into books and expanding horizons" },
  { type: "interest", label: "Gaming", icon: "sports_esports", description: "Playing and connecting through games" },
];

const PROMPT_QUESTIONS = [
  { id: "p1", question: "My idea of a perfect weekend is..." },
  { id: "p2", question: "The value I care about most in a partner is..." },
  { id: "p3", question: "Something that always makes me smile is..." },
];

// -- Nav Header --

function NavHeader({
  step,
  totalSteps,
  saving,
  onSaveExit,
}: {
  step: number;
  totalSteps: number;
  saving: boolean;
  onSaveExit: () => void;
}) {
  const progress = ((step + 1) / totalSteps) * 100;

  return (
    <header
      className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-6 py-3 border-b"
      style={{
        backgroundColor: "rgba(255, 255, 255, 0.9)",
        backdropFilter: "blur(12px)",
        WebkitBackdropFilter: "blur(12px)",
        borderColor: C.outlineVariant,
      }}
    >
      {/* Left: Logo */}
      <span className="text-2xl font-black" style={{ color: "#7c3aed" }}>
        Halo
      </span>

      {/* Center: Step indicator + progress bar */}
      <div className="flex flex-col items-center gap-1">
        <span className="text-xs font-medium" style={{ color: C.onSurfaceVariant }}>
          Step {step + 1} of {totalSteps}
        </span>
        <div className="w-32 h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: C.outlineVariant }}>
          <div
            className="h-full rounded-full transition-all duration-300"
            style={{
              width: `${progress}%`,
              background: `linear-gradient(to right, ${C.primary}, ${C.primaryContainer})`,
            }}
          />
        </div>
      </div>

      {/* Right: Save & Exit */}
      <button
        onClick={onSaveExit}
        disabled={saving}
        className="px-4 py-2 text-sm font-semibold text-white rounded-xl transition-opacity hover:opacity-90 disabled:opacity-50"
        style={{ backgroundColor: C.primary }}
      >
        {saving ? "Saving..." : "Save & Exit"}
      </button>
    </header>
  );
}

// -- Main component --

export function OnboardingWizard() {
  const {
    state,
    step,
    loading,
    saving,
    error,
    nextStep,
    prevStep,
    saveProgress,
    totalSteps,
  } = useOnboarding();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div
          className="h-10 w-10 animate-spin rounded-full border-4 border-t-transparent"
          style={{ borderColor: `${C.primary} transparent ${C.primary} ${C.primary}` }}
        />
      </div>
    );
  }

  return (
    <>
      <NavHeader
        step={step}
        totalSteps={totalSteps}
        saving={saving}
        onSaveExit={() => saveProgress({})}
      />

      {/* Main content area below fixed nav */}
      <div className="pt-20 min-h-screen">
        {error && (
          <div className="mx-auto max-w-3xl px-6 pt-4">
            <div className="rounded-2xl bg-red-50 border border-red-200 p-4 text-sm text-red-700">
              {error}
            </div>
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
    </>
  );
}

// -- Step 0: Basics --

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
    const age = getAge(bd);
    if (age < 18) {
      setLocalError("You must be at least 18 years old");
      return;
    }
    setLocalError("");
    onNext(bd, loc.trim());
  }

  return (
    <div className="grid grid-cols-12 gap-8 max-w-6xl mx-auto px-6 py-10">
      {/* Left content */}
      <div className="col-span-12 lg:col-span-8 space-y-8">
        <div>
          <h2 className="text-3xl font-bold" style={{ color: C.onSurface }}>
            Let&apos;s get the basics
          </h2>
          <p className="mt-2 text-base" style={{ color: C.onSurfaceVariant }}>
            We need a few things to get started.
          </p>
        </div>

        {localError && (
          <div className="rounded-2xl bg-red-50 border border-red-200 p-4 text-sm text-red-700">
            {localError}
          </div>
        )}

        <div className="max-w-md space-y-6">
          <div>
            <label
              htmlFor="birthdate"
              className="mb-1.5 block text-sm font-medium"
              style={{ color: C.onSurfaceVariant }}
            >
              Birthdate
            </label>
            <input
              id="birthdate"
              type="date"
              value={bd}
              onChange={(e) => setBd(e.target.value)}
              className="block w-full rounded-xl px-4 py-3 text-base outline-none transition-all focus:ring-2"
              style={{
                backgroundColor: C.surfaceContainer,
                color: C.onSurface,
              }}
            />
          </div>

          <div>
            <label
              htmlFor="location"
              className="mb-1.5 block text-sm font-medium"
              style={{ color: C.onSurfaceVariant }}
            >
              Location
            </label>
            <input
              id="location"
              type="text"
              placeholder="e.g. Austin, TX"
              value={loc}
              onChange={(e) => setLoc(e.target.value)}
              className="block w-full rounded-xl px-4 py-3 text-base outline-none transition-all focus:ring-2"
              style={{
                backgroundColor: C.surfaceContainer,
                color: C.onSurface,
              }}
            />
          </div>

          <button
            onClick={handleNext}
            disabled={saving}
            className="w-full rounded-xl px-6 py-3.5 text-base font-semibold text-white transition-all hover:opacity-90 active:scale-[0.99] disabled:opacity-50"
            style={{
              background: `linear-gradient(to right, ${C.primary}, ${C.primaryContainer})`,
            }}
          >
            {saving ? "Saving..." : "Continue"}
          </button>
        </div>
      </div>

      {/* Right sidebar */}
      <div className="hidden lg:flex col-span-4 flex-col gap-6">
        <div
          className="rounded-3xl border p-6"
          style={{ backgroundColor: C.surfaceContainer, borderColor: C.outlineVariant }}
        >
          <div className="flex items-center gap-2 mb-3">
            <span className="material-symbols-outlined text-xl" style={{ color: C.primary }}>
              info
            </span>
            <span className="font-semibold text-sm" style={{ color: C.onSurface }}>
              Why this matters
            </span>
          </div>
          <p className="text-sm leading-relaxed" style={{ color: C.onSurfaceVariant }}>
            Your birthdate helps us ensure a safe community for adults. Your location helps us find people near you.
          </p>
        </div>

        <div className="rounded-3xl p-6" style={{ backgroundColor: C.onSurface }}>
          <h3 className="text-sm font-semibold text-white/60 mb-3">Your Profile</h3>
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-lg text-white/40">cake</span>
              <span className="text-sm text-white/80">{bd || "Not set"}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-lg text-white/40">location_on</span>
              <span className="text-sm text-white/80">{loc || "Not set"}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// -- Step 1: Vibe --

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
  const allSelected = VIBE_OPTIONS.every((v) => selected[v.key]);

  const vibeIcons: Record<string, string> = {
    energy_level: "bolt",
    life_pace: "speed",
    social_style: "groups",
  };

  return (
    <div className="grid grid-cols-12 gap-8 max-w-6xl mx-auto px-6 py-10">
      {/* Left content */}
      <div className="col-span-12 lg:col-span-8 space-y-8">
        <div>
          <h2 className="text-3xl font-bold" style={{ color: C.onSurface }}>
            What&apos;s your vibe?
          </h2>
          <p className="mt-2 text-base" style={{ color: C.onSurfaceVariant }}>
            Pick what best describes you in each category.
          </p>
        </div>

        <div className="space-y-6">
          {VIBE_OPTIONS.map((group) => (
            <div key={group.key}>
              <div className="flex items-center gap-2 mb-3">
                <span className="material-symbols-outlined text-xl" style={{ color: C.primary }}>
                  {vibeIcons[group.key]}
                </span>
                <p className="text-sm font-semibold" style={{ color: C.onSurface }}>
                  {group.label}
                </p>
              </div>
              <div className="flex flex-wrap gap-3">
                {group.options.map((opt) => {
                  const isActive = selected[group.key] === opt;
                  return (
                    <button
                      key={opt}
                      onClick={() =>
                        setSelected((s) => ({ ...s, [group.key]: opt }))
                      }
                      className="rounded-2xl px-5 py-3 text-sm font-medium border-2 transition-all"
                      style={{
                        borderColor: isActive ? C.primary : C.outlineVariant,
                        backgroundColor: isActive ? `${C.primaryContainer}10` : C.surfaceContainerLowest,
                        color: isActive ? C.primary : C.onSurfaceVariant,
                      }}
                    >
                      {isActive && (
                        <span className="material-symbols-outlined text-sm mr-1 align-middle" style={{ color: C.primary }}>
                          check_circle
                        </span>
                      )}
                      {opt}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        {/* Navigation buttons */}
        <div className="flex gap-3 pt-4 max-w-md">
          <button
            onClick={onBack}
            className="flex-1 rounded-xl px-6 py-3.5 font-semibold border-2 transition-all hover:opacity-80"
            style={{
              borderColor: C.outlineVariant,
              color: C.onSurface,
              backgroundColor: C.surfaceContainerLowest,
            }}
          >
            Back
          </button>
          <button
            onClick={() => onNext(selected)}
            disabled={!allSelected || saving}
            className="flex-1 rounded-xl px-6 py-3.5 font-semibold text-white transition-all hover:opacity-90 active:scale-[0.99] disabled:opacity-50"
            style={{
              background: `linear-gradient(to right, ${C.primary}, ${C.primaryContainer})`,
            }}
          >
            {saving ? "Saving..." : "Continue"}
          </button>
        </div>
      </div>

      {/* Right sidebar */}
      <div className="hidden lg:flex col-span-4 flex-col gap-6">
        <div
          className="rounded-3xl border p-6"
          style={{ backgroundColor: C.surfaceContainer, borderColor: C.outlineVariant }}
        >
          <div className="flex items-center gap-2 mb-3">
            <span className="material-symbols-outlined text-xl" style={{ color: C.primary }}>
              info
            </span>
            <span className="font-semibold text-sm" style={{ color: C.onSurface }}>
              Why this matters
            </span>
          </div>
          <p className="text-sm leading-relaxed" style={{ color: C.onSurfaceVariant }}>
            Your vibe helps us match you with people who share your energy and lifestyle. Compatible vibes lead to stronger connections.
          </p>
        </div>

        <div className="rounded-3xl p-6" style={{ backgroundColor: C.onSurface }}>
          <h3 className="text-sm font-semibold text-white/60 mb-3">Your Profile</h3>
          <div className="space-y-2">
            {VIBE_OPTIONS.map((group) => (
              <div key={group.key} className="flex items-center gap-2">
                <span className="material-symbols-outlined text-lg text-white/40">
                  {vibeIcons[group.key]}
                </span>
                <span className="text-sm text-white/80">
                  {selected[group.key] || "Not selected"}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// -- Step 2: Tags (Values & Interests) -- card grid style per reference --

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
      if (prev.length >= 6) return prev;
      return [...prev, tag];
    });
  }

  return (
    <div className="grid grid-cols-12 gap-8 max-w-6xl mx-auto px-6 py-10">
      {/* Left content: card grid */}
      <div className="col-span-12 lg:col-span-8 space-y-6">
        <div>
          <h2 className="text-3xl font-bold" style={{ color: C.onSurface }}>
            Select your values &amp; interests
          </h2>
          <p className="mt-2 text-base" style={{ color: C.onSurfaceVariant }}>
            Pick at least 3 that guide your life (up to 6).
          </p>
          <p className="mt-1 text-sm">
            <span className="font-semibold" style={{ color: C.primary }}>{tags.length}</span>
            <span style={{ color: C.onSurfaceVariant }}>/6 selected</span>
          </p>
        </div>

        {/* Card grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {TAG_OPTIONS.map((tag) => {
            const isSelected = tags.some((t) => t.label === tag.label);
            return (
              <button
                key={tag.label}
                onClick={() => toggle({ type: tag.type, label: tag.label })}
                className="relative p-6 rounded-2xl border-2 text-left transition-all group"
                style={{
                  borderColor: isSelected ? C.primary : C.outlineVariant,
                  backgroundColor: isSelected ? `${C.primaryContainer}1a` : C.surfaceContainerLowest,
                }}
                onMouseEnter={(e) => {
                  if (!isSelected) {
                    (e.currentTarget as HTMLButtonElement).style.borderColor = C.primary;
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isSelected) {
                    (e.currentTarget as HTMLButtonElement).style.borderColor = C.outlineVariant;
                  }
                }}
              >
                {/* Check icon for selected state */}
                {isSelected && (
                  <span
                    className="material-symbols-outlined absolute top-3 right-3 text-xl"
                    style={{ color: C.primary }}
                  >
                    check_circle
                  </span>
                )}

                {/* Icon */}
                <span
                  className="material-symbols-outlined text-3xl mb-3 block"
                  style={{ color: isSelected ? C.primary : C.onSurfaceVariant }}
                >
                  {tag.icon}
                </span>

                {/* Title */}
                <span
                  className="font-bold text-lg block"
                  style={{ color: C.onSurface }}
                >
                  {tag.label}
                </span>

                {/* Description */}
                <span
                  className="text-sm mt-1 block leading-relaxed"
                  style={{ color: C.onSurfaceVariant }}
                >
                  {tag.description}
                </span>
              </button>
            );
          })}
        </div>

        {/* Navigation buttons */}
        <div className="flex gap-3 pt-4 max-w-md">
          <button
            onClick={onBack}
            className="flex-1 rounded-xl px-6 py-3.5 font-semibold border-2 transition-all hover:opacity-80"
            style={{
              borderColor: C.outlineVariant,
              color: C.onSurface,
              backgroundColor: C.surfaceContainerLowest,
            }}
          >
            Back
          </button>
          <button
            onClick={() => onNext(tags)}
            disabled={tags.length === 0 || saving}
            className="flex-1 rounded-xl px-6 py-3.5 font-semibold text-white transition-all hover:opacity-90 active:scale-[0.99] disabled:opacity-50"
            style={{
              background: `linear-gradient(to right, ${C.primary}, ${C.primaryContainer})`,
            }}
          >
            {saving ? "Saving..." : "Continue"}
          </button>
        </div>
      </div>

      {/* Right sidebar */}
      <div className="hidden lg:flex col-span-4 flex-col gap-6">
        <div
          className="rounded-3xl border p-6"
          style={{ backgroundColor: C.surfaceContainer, borderColor: C.outlineVariant }}
        >
          <div className="flex items-center gap-2 mb-3">
            <span className="material-symbols-outlined text-xl" style={{ color: C.primary }}>
              info
            </span>
            <span className="font-semibold text-sm" style={{ color: C.onSurface }}>
              Why this matters
            </span>
          </div>
          <p className="text-sm leading-relaxed" style={{ color: C.onSurfaceVariant }}>
            Your values and interests are the foundation of meaningful connections. We use these to find people who share what matters most to you.
          </p>
        </div>

        <div className="rounded-3xl p-6" style={{ backgroundColor: C.onSurface }}>
          <h3 className="text-sm font-semibold text-white/60 mb-3">Your Profile</h3>
          {tags.length === 0 ? (
            <p className="text-sm text-white/40">No values selected yet</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {tags.map((t) => (
                <span
                  key={t.label}
                  className="inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-medium"
                  style={{ backgroundColor: `${C.primaryContainer}33`, color: "#e0b0ff" }}
                >
                  {t.label}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Continue button in sidebar */}
        <button
          onClick={() => onNext(tags)}
          disabled={tags.length === 0 || saving}
          className="w-full rounded-xl px-6 py-3.5 font-semibold text-white transition-all hover:opacity-90 active:scale-[0.99] disabled:opacity-50"
          style={{
            background: `linear-gradient(to right, ${C.primary}, ${C.primaryContainer})`,
          }}
        >
          {saving ? "Saving..." : "Continue"}
        </button>

        {/* Testimonial */}
        <div
          className="rounded-3xl border p-6"
          style={{ backgroundColor: C.surfaceContainer, borderColor: C.outlineVariant }}
        >
          <blockquote className="text-sm italic leading-relaxed" style={{ color: C.onSurfaceVariant }}>
            &ldquo;Finding people with the same integrity changed how I use social apps.&rdquo;
          </blockquote>
          <p className="mt-3 text-xs font-semibold" style={{ color: C.onSurface }}>
            -- Sarah M.
          </p>
        </div>
      </div>
    </div>
  );
}

// -- Step 3: Prompts --

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
    <div className="grid grid-cols-12 gap-8 max-w-6xl mx-auto px-6 py-10">
      {/* Left content */}
      <div className="col-span-12 lg:col-span-8 space-y-6">
        <div>
          <h2 className="text-3xl font-bold" style={{ color: C.onSurface }}>
            Share a bit about yourself
          </h2>
          <p className="mt-2 text-base" style={{ color: C.onSurfaceVariant }}>
            Answer at least one prompt. These show up on your discovery card.
          </p>
          <p className="mt-1 text-sm">
            <span className="font-semibold" style={{ color: C.primary }}>{filledCount}</span>
            <span style={{ color: C.onSurfaceVariant }}>/{PROMPT_QUESTIONS.length} answered</span>
          </p>
        </div>

        <div className="space-y-6 max-w-lg">
          {PROMPT_QUESTIONS.map((q) => (
            <div key={q.id}>
              <label
                htmlFor={q.id}
                className="mb-2 flex items-center gap-2 text-base font-semibold"
                style={{ color: C.onSurface }}
              >
                <span className="material-symbols-outlined text-xl" style={{ color: C.primary }}>
                  edit_note
                </span>
                {q.question}
              </label>
              <textarea
                id={q.id}
                rows={3}
                value={answers[q.id] || ""}
                onChange={(e) =>
                  setAnswers((a) => ({ ...a, [q.id]: e.target.value }))
                }
                className="block w-full rounded-2xl px-4 py-3 text-base outline-none transition-all resize-none focus:ring-2"
                style={{
                  backgroundColor: C.surfaceContainer,
                  color: C.onSurface,
                }}
                maxLength={300}
                placeholder="Type your answer here..."
              />
            </div>
          ))}
        </div>

        {/* Navigation buttons */}
        <div className="flex gap-3 pt-4 max-w-md">
          <button
            onClick={onBack}
            className="flex-1 rounded-xl px-6 py-3.5 font-semibold border-2 transition-all hover:opacity-80"
            style={{
              borderColor: C.outlineVariant,
              color: C.onSurface,
              backgroundColor: C.surfaceContainerLowest,
            }}
          >
            Back
          </button>
          <button
            onClick={handleNext}
            disabled={filledCount === 0 || saving}
            className="flex-1 rounded-xl px-6 py-3.5 font-semibold text-white transition-all hover:opacity-90 active:scale-[0.99] disabled:opacity-50"
            style={{
              background: `linear-gradient(to right, ${C.primary}, ${C.primaryContainer})`,
            }}
          >
            {saving ? "Completing..." : "Complete Profile"}
          </button>
        </div>
      </div>

      {/* Right sidebar */}
      <div className="hidden lg:flex col-span-4 flex-col gap-6">
        <div
          className="rounded-3xl border p-6"
          style={{ backgroundColor: C.surfaceContainer, borderColor: C.outlineVariant }}
        >
          <div className="flex items-center gap-2 mb-3">
            <span className="material-symbols-outlined text-xl" style={{ color: C.primary }}>
              info
            </span>
            <span className="font-semibold text-sm" style={{ color: C.onSurface }}>
              Why this matters
            </span>
          </div>
          <p className="text-sm leading-relaxed" style={{ color: C.onSurfaceVariant }}>
            Your prompts give others a glimpse into who you really are. Authentic answers lead to more meaningful conversations.
          </p>
        </div>

        <div className="rounded-3xl p-6" style={{ backgroundColor: C.onSurface }}>
          <h3 className="text-sm font-semibold text-white/60 mb-3">Your Profile</h3>
          {filledCount === 0 ? (
            <p className="text-sm text-white/40">No prompts answered yet</p>
          ) : (
            <div className="space-y-3">
              {PROMPT_QUESTIONS.filter((q) => answers[q.id]?.trim()).map((q) => (
                <div key={q.id}>
                  <p className="text-xs text-white/40">{q.question}</p>
                  <p className="text-sm text-white/80 mt-0.5 line-clamp-2">{answers[q.id]}</p>
                </div>
              ))}
            </div>
          )}
        </div>

        <div
          className="rounded-3xl border p-6"
          style={{ backgroundColor: C.surfaceContainer, borderColor: C.outlineVariant }}
        >
          <div className="flex items-center gap-2 mb-2">
            <span className="material-symbols-outlined text-xl" style={{ color: C.primary }}>
              celebration
            </span>
            <span className="font-semibold text-sm" style={{ color: C.onSurface }}>
              Almost there!
            </span>
          </div>
          <p className="text-sm leading-relaxed" style={{ color: C.onSurfaceVariant }}>
            This is the final step. Once you complete your profile, you will start discovering people who share your values.
          </p>
        </div>
      </div>
    </div>
  );
}

// -- Helpers --

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
