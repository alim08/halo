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

const LIFESTYLE_OPTIONS = [
  {
    category: "Drinking",
    key: "drinking",
    options: ["Non-drinker", "Socially", "Regularly", "Often"],
  },
  {
    category: "Smoking",
    key: "smoking",
    options: ["Non-smoker", "Socially", "Regularly"],
  },
  {
    category: "Working Out",
    key: "working_out",
    options: ["Never", "1-2x/week", "3-4x/week", "Daily"],
  },
  {
    category: "Pets",
    key: "pets",
    options: ["Don't have", "Have dog", "Have cat", "Have other", "Want pets"],
  },
];

const INTIMACY_OPTIONS = [
  {
    id: "communication_style",
    label: "Communication Style",
    options: ["Direct", "Thoughtful", "Spontaneous", "Balanced"],
  },
  {
    id: "love_language",
    label: "Love Language",
    options: ["Words of Affirmation", "Acts of Service", "Quality Time", "Physical Touch", "Gifts"],
  },
  {
    id: "affection_style",
    label: "Affection Style",
    options: ["Reserved", "Moderate", "Very Affectionate"],
  },
  {
    id: "relationship_pace",
    label: "Relationship Pace",
    options: ["Take it slow", "Go with the flow", "Move quickly"],
  },
];

const INTERESTS_OPTIONS = [
  {
    category: "Sports & Fitness",
    interests: ["Gym", "Yoga", "Running", "Team Sports", "Hiking", "Swimming"],
  },
  {
    category: "Creative & Arts",
    interests: ["Painting", "Music", "Photography", "Writing", "Dancing", "Theater"],
  },
  {
    category: "Culture & Learning",
    interests: ["Museums", "History", "Languages", "Philosophy", "Science", "Tech"],
  },
  {
    category: "Food & Drink",
    interests: ["Cooking", "Foodie", "Wine", "Coffee", "Baking", "Vegan/Vegetarian"],
  },
  {
    category: "Entertainment",
    interests: ["Movies", "Gaming", "Books", "Podcasts", "TV Shows", "Comedy"],
  },
  {
    category: "Travel & Adventure",
    interests: ["Travel", "Camping", "Beach", "Mountains", "Road trips", "Budget travel"],
  },
  {
    category: "Community",
    interests: ["Volunteering", "Activism", "Community Events", "Networking", "Mentoring"],
  },
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
        <GenderStep
          gender={state.gender}
          sexual_profile={state.sexual_profile}
          onNext={(gender, sexual_profile) =>
            nextStep({ gender, sexual_profile })
          }
          onBack={prevStep}
          saving={saving}
        />
      )}

      {step === 2 && (
        <InterestedInStep
          interested_in={state.interested_in}
          onNext={(interested_in) =>
            nextStep({ interested_in })
          }
          onBack={prevStep}
          saving={saving}
        />
      )}

      {step === 3 && (
        <VibeStep
          vibe={state.vibe}
          onNext={(vibe) => nextStep({ vibe })}
          onBack={prevStep}
          saving={saving}
        />
      )}

      {step === 4 && (
        <LifestyleHabitsStep
          lifestyle={state.lifestyle_habits}
          onNext={(lifestyle_habits) =>
            nextStep({ lifestyle_habits })
          }
          onBack={prevStep}
          saving={saving}
        />
      )}

      {step === 5 && (
        <IntimacyQuestionsStep
          intimacy={state.intimacy_questions}
          onNext={(intimacy_questions) =>
            nextStep({ intimacy_questions })
          }
          onBack={prevStep}
          saving={saving}
        />
      )}

      {step === 6 && (
        <InterestsStep
          selected={state.interests}
          onNext={(interests) => nextStep({ interests })}
          onBack={prevStep}
          saving={saving}
        />
      )}

      {step === 7 && (
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

// ── Step 1: Gender & Sexual Profile ──────────────────

function GenderStep({
  gender,
  sexual_profile,
  onNext,
  onBack,
  saving,
}: {
  gender: string;
  sexual_profile: string;
  onNext: (gender: string, sexual_profile: string) => void;
  onBack: () => void;
  saving: boolean;
}) {
  const [genderValue, setGenderValue] = useState(gender);
  const [sexualProfileValue, setSexualProfileValue] = useState(sexual_profile);

  const genderOptions = ["Man", "Woman", "Non-binary", "Prefer not to say"];
  const sexualProfileOptions = [
    "Straight",
    "Gay",
    "Lesbian",
    "Bisexual",
    "Asexual",
    "Demisexual",
    "Prefer not to say",
  ];

  function handleNext() {
    onNext(genderValue, sexualProfileValue);
  }

  const allSelected = genderValue && sexualProfileValue;

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold">Tell us about yourself</h2>
      <p className="text-sm text-gray-500">
        This helps us make better matches.
      </p>

      <div>
        <p className="mb-2 text-sm font-medium">Gender</p>
        <div className="flex flex-wrap gap-2">
          {genderOptions.map((opt) => (
            <button
              key={opt}
              onClick={() => setGenderValue(opt)}
              className={`rounded-full px-4 py-2 min-h-touch text-sm border transition-colors ${
                genderValue === opt
                  ? "border-halo-primary bg-halo-primary text-white"
                  : "border-gray-300 hover:border-halo-primary"
              }`}
            >
              {opt}
            </button>
          ))}
        </div>
      </div>

      <div>
        <p className="mb-2 text-sm font-medium">Sexual Profile</p>
        <div className="flex flex-wrap gap-2">
          {sexualProfileOptions.map((opt) => (
            <button
              key={opt}
              onClick={() => setSexualProfileValue(opt)}
              className={`rounded-full px-4 py-2 min-h-touch text-sm border transition-colors ${
                sexualProfileValue === opt
                  ? "border-halo-primary bg-halo-primary text-white"
                  : "border-gray-300 hover:border-halo-primary"
              }`}
            >
              {opt}
            </button>
          ))}
        </div>
      </div>

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

// ── Step 2: Who are you interested in? ──────────────────

function InterestedInStep({
  interested_in,
  onNext,
  onBack,
  saving,
}: {
  interested_in: string[];
  onNext: (interested_in: string[]) => void;
  onBack: () => void;
  saving: boolean;
}) {
  const [selected, setSelected] = useState<string[]>(interested_in);

  const options = ["Man", "Woman", "Non-binary"];

  function toggle(option: string) {
    setSelected((prev) => {
      if (prev.includes(option)) {
        return prev.filter((o) => o !== option);
      }
      return [...prev, option];
    });
  }

  function handleNext() {
    onNext(selected);
  }

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold">Who are you interested in seeing?</h2>
      <p className="text-sm text-gray-500">
        Select all that apply. You can change this later.
      </p>

      <div className="flex flex-wrap gap-2">
        {options.map((option) => (
          <button
            key={option}
            onClick={() => toggle(option)}
            className={`rounded-full px-4 py-2 min-h-touch text-sm border transition-colors ${
              selected.includes(option)
                ? "border-halo-primary bg-halo-primary text-white"
                : "border-gray-300 hover:border-halo-primary"
            }`}
          >
            {option}
          </button>
        ))}
      </div>

      <div className="flex gap-3">
        <button
          onClick={onBack}
          className="flex-1 rounded-md border border-gray-300 px-4 py-3 min-h-touch font-medium hover:bg-gray-50"
        >
          Back
        </button>
        <button
          onClick={handleNext}
          disabled={selected.length === 0 || saving}
          className="flex-1 rounded-md bg-halo-primary px-4 py-3 min-h-touch text-white font-medium hover:bg-opacity-90 disabled:opacity-50"
        >
          {saving ? "Saving…" : "Continue"}
        </button>
      </div>
    </div>
  );
}

// ── Step 3: Vibe ─────────────────────────────────────────

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

// ── Step 4: Tags ─────────────────────────────────────────

// ── Step 4: Lifestyle Habits ────────────────────────────

function LifestyleHabitsStep({
  lifestyle = {},
  onNext,
  onBack,
  saving,
}: {
  lifestyle?: Record<string, string>;
  onNext: (lifestyle: Record<string, string>) => void;
  onBack: () => void;
  saving: boolean;
}) {
  const [selected, setSelected] = useState<Record<string, string>>(lifestyle);

  function handleNext() {
    onNext(selected);
  }

  const allSelected = LIFESTYLE_OPTIONS.every((opt) => selected[opt.key]);

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold">Your lifestyle</h2>
      <p className="text-sm text-gray-500">
        Help us understand your habits and preferences.
      </p>

      {LIFESTYLE_OPTIONS.map((group) => (
        <div key={group.key} className="space-y-2">
          <p className="text-sm font-medium text-gray-700">{group.category}</p>
          <div className="flex flex-wrap gap-2">
            {group.options.map((opt) => (
              <button
                key={opt}
                onClick={() =>
                  setSelected((s) => ({ ...s, [group.key]: opt }))
                }
                className={`rounded-full px-3 py-1.5 text-xs border transition-colors ${
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

// ── Step 5: Intimacy Questions ──────────────────────────

function IntimacyQuestionsStep({
  intimacy,
  onNext,
  onBack,
  saving,
}: {
  intimacy: Record<string, string>;
  onNext: (intimacy: Record<string, string>) => void;
  onBack: () => void;
  saving: boolean;
}) {
  const [selected, setSelected] = useState<Record<string, string>>(intimacy);

  function handleNext() {
    onNext(selected);
  }

  const allSelected = INTIMACY_OPTIONS.every((opt) => selected[opt.id]);

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold">Intimacy & connection</h2>
      <p className="text-sm text-gray-500">
        Choose what resonates with you most.
      </p>

      {INTIMACY_OPTIONS.map((group) => (
        <div key={group.id} className="space-y-2">
          <p className="text-sm font-medium text-gray-700">{group.label}</p>
          <div className="flex flex-wrap gap-2">
            {group.options.map((opt) => (
              <button
                key={opt}
                onClick={() =>
                  setSelected((s) => ({ ...s, [group.id]: opt }))
                }
                className={`rounded-full px-3 py-1.5 text-xs border transition-colors ${
                  selected[group.id] === opt
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

// ── Step 6: Interests ───────────────────────────────────

function InterestsStep({
  selected,
  onNext,
  onBack,
  saving,
}: {
  selected: string[];
  onNext: (interests: string[]) => void;
  onBack: () => void;
  saving: boolean;
}) {
  const [interests, setInterests] = useState(selected);

  function toggle(interest: string) {
    setInterests((prev) => {
      const exists = prev.includes(interest);
      if (exists) return prev.filter((i) => i !== interest);
      if (prev.length >= 12) return prev; // max 12 interests
      return [...prev, interest];
    });
  }

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold">Your interests</h2>
      <p className="text-sm text-gray-500">
        Pick up to 12 that describe you. Choose from categories below.
      </p>

      {INTERESTS_OPTIONS.map((category) => (
        <div key={category.category} className="space-y-2">
          <p className="text-sm font-medium text-gray-700">{category.category}</p>
          <div className="flex flex-wrap gap-2">
            {category.interests.map((interest) => {
              const isSelected = interests.includes(interest);
              return (
                <button
                  key={interest}
                  onClick={() => toggle(interest)}
                  className={`rounded-full px-3 py-1.5 text-xs border transition-colors ${
                    isSelected
                      ? "border-halo-primary bg-halo-primary text-white"
                      : "border-gray-300 hover:border-halo-primary"
                  }`}
                >
                  {interest}
                </button>
              );
            })}
          </div>
        </div>
      ))}

      <p className="text-xs text-gray-400">{interests.length}/12 selected</p>

      <div className="flex gap-3">
        <button
          onClick={onBack}
          className="flex-1 rounded-md border border-gray-300 px-4 py-3 min-h-touch font-medium hover:bg-gray-50"
        >
          Back
        </button>
        <button
          onClick={() => onNext(interests)}
          disabled={interests.length === 0 || saving}
          className="flex-1 rounded-md bg-halo-primary px-4 py-3 min-h-touch text-white font-medium hover:bg-opacity-90 disabled:opacity-50"
        >
          {saving ? "Saving…" : "Continue"}
        </button>
      </div>
    </div>
  );
}

// ── Step 7: Prompts ──────────────────────────────────────

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
