/**
 * Card Type C: Lifestyle card
 * Premium profile summary with lifestyle facts, interests, and one prompt.
 */

import { Heart, X } from "lucide-react";

type PromptAnswer = {
  question: string;
  answer: string;
};

type LifestyleFact = {
  emoji: string;
  text: string;
};

type LifestyleHabits = Record<string, unknown>;

export type LifestyleCardData = {
  card_id: string;
  age: number;
  location: string;
  lifestyle_habits?: LifestyleHabits;
  interests?: string[];
  profile_data?: Record<string, unknown>;
  prompt_answers?: PromptAnswer[];
  bio_prompt?: PromptAnswer;
};

type LifestyleCardProps = {
  data: LifestyleCardData;
  onPass: () => void;
  onConnect: () => void;
};

const LIFESTYLE_ORDER = [
  "drinking",
  "fitness",
  "sleep_schedule",
  "pets",
  "diet",
  "wants_kids",
  "smoking",
] as const;

const LIFESTYLE_MAP: Record<string, Record<string, LifestyleFact>> = {
  drinking: {
    "non-drinker": { emoji: "🚫", text: "Doesn’t drink" },
    socially: { emoji: "🍷", text: "Drinks socially" },
    regularly: { emoji: "🍹", text: "Enjoys going out" },
    often: { emoji: "🍻", text: "Social energy" },
  },
  fitness: {
    never: { emoji: "😌", text: "Low-key lifestyle" },
    "1-2x/week": { emoji: "🏃", text: "Stays active" },
    "3-4x/week": { emoji: "🔥", text: "Active" },
    daily: { emoji: "💪", text: "Fitness focused" },
  },
  sleep_schedule: {
    "early bird": { emoji: "🌅", text: "Early bird" },
    "night owl": { emoji: "🌙", text: "Night owl" },
    flexible: { emoji: "⏰", text: "Flexible schedule" },
  },
  pets: {
    "have dog": { emoji: "🐶", text: "Dog person" },
    "have cat": { emoji: "🐱", text: "Cat person" },
    "have other": { emoji: "🐾", text: "Pet person" },
    "want pets": { emoji: "🐾", text: "Wants pets" },
    "no pets": { emoji: "✨", text: "Pet-free" },
    "don't have": { emoji: "✨", text: "Pet-free" },
  },
  diet: {
    omnivore: { emoji: "🍽", text: "Food lover" },
    vegetarian: { emoji: "🥗", text: "Vegetarian" },
    vegan: { emoji: "🌱", text: "Vegan" },
    pescatarian: { emoji: "🐟", text: "Seafood lover" },
  },
  wants_kids: {
    yes: { emoji: "👶", text: "Wants kids" },
    no: { emoji: "✈️", text: "Child-free lifestyle" },
    maybe: { emoji: "🤔", text: "Open-minded" },
    "already have kids": { emoji: "👨‍👩‍👧", text: "Family oriented" },
  },
  smoking: {
    "non-smoker": { emoji: "✨", text: "Non-smoker" },
    socially: { emoji: "💨", text: "Occasionally social" },
    regularly: { emoji: "🚬", text: "Smokes" },
  },
};

const FALLBACK_LIFESTYLE_FACTS: LifestyleFact[] = [
  { emoji: "✨", text: "Easygoing" },
  { emoji: "🎯", text: "Open to new experiences" },
  { emoji: "💬", text: "Here for real connection" },
];

const JUNK_VALUES = new Set([
  "12",
  "n/a",
  "na",
  "none",
  "null",
  "test",
  "undefined",
  "yes1",
  "yuh",
]);

function cleanText(value: unknown, minLength = 3): string | null {
  if (typeof value !== "string") return null;

  const cleaned = value.trim().replace(/\s+/g, " ");
  if (cleaned.length < minLength) return null;
  if (JUNK_VALUES.has(cleaned.toLowerCase())) return null;

  return cleaned;
}

function normalizeValue(value: unknown): string | null {
  const cleaned = cleanText(value);
  return cleaned ? cleaned.toLowerCase() : null;
}

function getProfileArray(data: LifestyleCardData, key: string): string[] {
  const value = data.profile_data?.[key];
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}

function getLifestyleHabits(data: LifestyleCardData): LifestyleHabits {
  const profileLifestyle =
    data.profile_data?.lifestyle_habits ?? data.profile_data?.lifestyle;

  if (data.lifestyle_habits) return data.lifestyle_habits;
  if (profileLifestyle && typeof profileLifestyle === "object" && !Array.isArray(profileLifestyle)) {
    return profileLifestyle as LifestyleHabits;
  }

  return {};
}

function getLifestyleFacts(data: LifestyleCardData): LifestyleFact[] {
  const lifestyle = getLifestyleHabits(data);
  const facts = LIFESTYLE_ORDER.flatMap((key) => {
    const normalized = normalizeValue(lifestyle[key]);
    const fact = normalized ? LIFESTYLE_MAP[key]?.[normalized] : undefined;
    return fact ? [fact] : [];
  });

  return facts.length > 0 ? facts.slice(0, 3) : FALLBACK_LIFESTYLE_FACTS;
}

function titleCase(value: string): string {
  return value
    .split(" ")
    .map((word) => {
      if (word.length <= 2 && word === word.toUpperCase()) return word;
      return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
    })
    .join(" ");
}

function getInterests(data: LifestyleCardData): string[] {
  const source = data.interests?.length ? data.interests : getProfileArray(data, "interests");
  const seen = new Set<string>();
  const interests: string[] = [];

  for (const item of source) {
    const cleaned = cleanText(item);
    if (!cleaned) continue;

    const key = cleaned.toLowerCase();
    if (seen.has(key)) continue;

    seen.add(key);
    interests.push(titleCase(cleaned));
    if (interests.length === 3) break;
  }

  return interests;
}

function isValidPrompt(prompt: PromptAnswer): boolean {
  const answer = cleanText(prompt.answer, 4);
  if (!answer) return false;

  return /[a-z]/i.test(answer);
}

function promptScore(prompt: PromptAnswer): number {
  const answer = prompt.answer.trim();
  const wordCount = answer.match(/[a-z]+/gi)?.length ?? 0;
  const lengthScore = Math.min(answer.length, 140);

  return wordCount * 10 + lengthScore;
}

function getBestPrompt(data: LifestyleCardData): PromptAnswer | null {
  const prompts = [...(data.prompt_answers ?? [])];
  if (data.bio_prompt) prompts.push(data.bio_prompt);

  return (
    prompts
      .filter(isValidPrompt)
      .sort((a, b) => promptScore(b) - promptScore(a))[0] ?? null
  );
}

function formatLocation(location: string): string {
  return cleanText(location) ?? "Nearby";
}

export function LifestyleCard({ data, onPass, onConnect }: LifestyleCardProps) {
  const lifestyleFacts = getLifestyleFacts(data);
  const interests = getInterests(data);
  const bestPrompt = getBestPrompt(data);

  return (
    <div className="flex w-full max-w-sm flex-col overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-lg">
      <div className="bg-gradient-to-r from-primary to-primary-container px-5 py-4">
        <p className="text-lg text-white">
          <span className="font-bold">{data.age}</span>
          <span className="font-medium"> · {formatLocation(data.location)}</span>
        </p>
      </div>

      <div className="flex-1 px-5 py-4">
        <section>
          <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-gray-400">
            Lifestyle
          </p>
          <div className="space-y-2">
            {lifestyleFacts.map((fact) => (
              <p
                key={`${fact.emoji}-${fact.text}`}
                className="flex items-center gap-2 text-base font-medium text-gray-800"
              >
                <span className="text-lg leading-none">{fact.emoji}</span>
                <span>{fact.text}</span>
              </p>
            ))}
          </div>
        </section>

        {interests.length > 0 && (
          <section className="mt-4 border-t border-gray-100 pt-4">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-400">
              Also into
            </p>
            <p className="text-sm font-medium leading-relaxed text-gray-800">
              {interests.join(" · ")}
            </p>
          </section>
        )}

        {bestPrompt && (
          <section className="mt-4 border-t border-gray-100 pt-4">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-400">
              Prompt
            </p>
            {cleanText(bestPrompt.question) && (
              <p className="text-sm font-semibold text-gray-900">
                {bestPrompt.question.trim()}
              </p>
            )}
            <p className="mt-1 text-sm leading-relaxed text-gray-700">
              {bestPrompt.answer.trim()}
            </p>
          </section>
        )}
      </div>

      <div className="flex items-center justify-center gap-6 border-t bg-gray-50/30 px-5 py-4">
        <button
          onClick={onPass}
          aria-label="Pass"
          className="flex h-14 w-14 items-center justify-center rounded-full border-2 border-gray-300 text-gray-400 transition-all hover:border-red-400 hover:text-red-400 active:bg-red-50"
        >
          <X className="h-7 w-7" />
        </button>

        <button
          onClick={onConnect}
          aria-label="Connect"
          className="flex h-14 w-14 items-center justify-center rounded-full border-2 border-primary text-primary transition-all hover:bg-primary hover:text-white active:bg-primary/90"
        >
          <Heart className="h-7 w-7" />
        </button>
      </div>
    </div>
  );
}
