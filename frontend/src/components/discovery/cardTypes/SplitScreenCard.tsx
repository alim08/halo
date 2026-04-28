/**
 * Compatibility card
 * Real side-by-side comparison between the viewer and discovery candidate.
 */

import { Heart, X } from "lucide-react";
import type { ComparisonProfile } from "@/lib/api";

export type SplitScreenRow = {
  category: string;
  me: string;
  you: string;
};

export type SplitScreenCardData = {
  card_id: string;
  age: number;
  location: string;
  currentUserProfile: ComparisonProfile;
  candidateProfile: ComparisonProfile;
};

type SplitScreenCardProps = {
  data: SplitScreenCardData;
  onPass: () => void;
  onConnect: () => void;
};

type ComparisonField = {
  category: string;
  group: "lifestyle" | "vibe" | "connection";
  key: string;
};

const COMPARISON_FIELDS: ComparisonField[] = [
  { category: "Sleep", group: "lifestyle", key: "sleep_schedule" },
  { category: "Fitness", group: "lifestyle", key: "fitness" },
  { category: "Drinking", group: "lifestyle", key: "drinking" },
  { category: "Pets", group: "lifestyle", key: "pets" },
  { category: "Diet", group: "lifestyle", key: "diet" },
  { category: "Life Pace", group: "vibe", key: "life_pace" },
  { category: "Social Style", group: "vibe", key: "social_style" },
  { category: "Energy", group: "vibe", key: "energy_level" },
  { category: "Communication", group: "connection", key: "communication_style" },
  { category: "Relationship Pace", group: "connection", key: "relationship_pace" },
  { category: "Love Language", group: "connection", key: "love_language" },
];

const VALUE_LABELS: Record<string, Record<string, string>> = {
  sleep_schedule: {
    "early bird": "🌅 Early bird",
    "night owl": "🌙 Night owl",
    flexible: "⏰ Flexible schedule",
  },
  fitness: {
    never: "😌 Low-key lifestyle",
    "1-2x/week": "🏃 Stays active",
    "3-4x/week": "🔥 Active",
    daily: "💪 Fitness focused",
  },
  drinking: {
    "non-drinker": "🚫 Doesn’t drink",
    socially: "🍷 Drinks socially",
    regularly: "🍹 Enjoys going out",
    often: "🍻 Social energy",
  },
  pets: {
    "don't have": "✨ Pet-free",
    "have dog": "🐶 Dog person",
    "have cat": "🐱 Cat person",
    "have other": "🐾 Pet person",
    "want pets": "🐾 Wants pets",
    "no pets": "✨ Pet-free",
  },
  diet: {
    omnivore: "🍽 Food lover",
    vegetarian: "🥗 Vegetarian",
    vegan: "🌱 Vegan",
    pescatarian: "🐟 Seafood lover",
  },
  life_pace: {
    "slow & steady": "🌿 Slow & steady",
    balanced: "⚖️ Balanced",
    "fast-paced": "⚡ Fast-paced",
  },
  social_style: {
    homebody: "🏡 Homebody",
    ambivert: "🌗 Ambivert",
    "social butterfly": "🎉 Social butterfly",
  },
  energy_level: {
    chill: "😌 Chill",
    moderate: "⚖️ Moderate",
    "high energy": "⚡ High energy",
  },
  communication_style: {
    direct: "🎯 Direct",
    thoughtful: "💭 Thoughtful",
    spontaneous: "⚡ Spontaneous",
    balanced: "⚖️ Balanced",
  },
  relationship_pace: {
    "take it slow": "🌱 Takes it slow",
    "go with the flow": "🌊 Goes with the flow",
    "move quickly": "⚡ Moves quickly",
  },
  love_language: {
    "words of affirmation": "💬 Words of affirmation",
    "acts of service": "🤝 Acts of service",
    "quality time": "🕰 Quality time",
    "physical touch": "🤗 Physical touch",
    gifts: "🎁 Gifts",
  },
};

const FIELD_FALLBACK_EMOJI: Record<string, string> = {
  sleep_schedule: "⏰",
  fitness: "🔥",
  drinking: "🍷",
  pets: "🐾",
  diet: "🍽",
  life_pace: "⚡",
  social_style: "✨",
  energy_level: "⚡",
  communication_style: "💬",
  relationship_pace: "🌊",
  love_language: "💛",
};

const JUNK_VALUES = new Set([
  "12",
  "n/a",
  "na",
  "none",
  "null",
  "prefer not to say",
  "test",
  "undefined",
  "yes1",
  "yuh",
]);

function cleanText(value: unknown): string | null {
  if (typeof value !== "string") return null;

  const cleaned = value.trim().replace(/\s+/g, " ");
  if (cleaned.length < 3) return null;
  if (JUNK_VALUES.has(cleaned.toLowerCase())) return null;

  return cleaned;
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

function getRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function getGroup(profile: ComparisonProfile, group: ComparisonField["group"]) {
  if (group === "lifestyle") {
    return getRecord(profile.lifestyle_habits ?? profile.lifestyle);
  }

  if (group === "connection") {
    return getRecord(profile.connection_style ?? profile.connection);
  }

  return getRecord(profile.vibe);
}

function formatValue(fieldKey: string, value: unknown): string | null {
  const cleaned = cleanText(value);
  if (!cleaned) return null;

  const normalized = cleaned.toLowerCase();
  return (
    VALUE_LABELS[fieldKey]?.[normalized] ??
    `${FIELD_FALLBACK_EMOJI[fieldKey] ?? "✨"} ${titleCase(cleaned)}`
  );
}

function getInterests(profile: ComparisonProfile): string[] {
  const interests = Array.isArray(profile.interests) ? profile.interests : [];
  const seen = new Set<string>();
  const cleaned: string[] = [];

  for (const item of interests) {
    const value = cleanText(item);
    if (!value) continue;

    const key = value.toLowerCase();
    if (seen.has(key)) continue;

    seen.add(key);
    cleaned.push(titleCase(value));
  }

  return cleaned;
}

function buildInterestRow(
  currentUserProfile: ComparisonProfile,
  candidateProfile: ComparisonProfile
): SplitScreenRow | null {
  const meInterests = getInterests(currentUserProfile);
  const youInterests = getInterests(candidateProfile);
  if (meInterests.length === 0 || youInterests.length === 0) return null;

  const meByKey = new Map(meInterests.map((interest) => [interest.toLowerCase(), interest]));
  const shared = youInterests.find((interest) => meByKey.has(interest.toLowerCase()));

  if (shared) {
    const label = `✨ ${shared}`;
    return { category: "Interests", me: label, you: label };
  }

  return {
    category: "Interests",
    me: `✨ ${meInterests[0]}`,
    you: `✨ ${youInterests[0]}`,
  };
}

export function buildSplitScreenRows(
  currentUserProfile: ComparisonProfile | null | undefined,
  candidateProfile: ComparisonProfile | null | undefined
): SplitScreenRow[] {
  if (!currentUserProfile || !candidateProfile) return [];

  const rows = COMPARISON_FIELDS.flatMap((field) => {
    const meValue = getGroup(currentUserProfile, field.group)[field.key];
    const youValue = getGroup(candidateProfile, field.group)[field.key];
    const me = formatValue(field.key, meValue);
    const you = formatValue(field.key, youValue);

    return me && you ? [{ category: field.category, me, you }] : [];
  });

  const interestRow = buildInterestRow(currentUserProfile, candidateProfile);
  if (interestRow) rows.push(interestRow);

  return rows.slice(0, 3);
}

function formatLocation(location: string): string {
  return cleanText(location) ?? "Nearby";
}

export function SplitScreenCard({ data, onPass, onConnect }: SplitScreenCardProps) {
  const rows = buildSplitScreenRows(data.currentUserProfile, data.candidateProfile);

  return (
    <div className="flex w-full max-w-sm flex-col overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-lg">
      <div className="bg-gradient-to-r from-primary to-primary-container px-5 py-4">
        <p className="text-lg text-white">
          <span className="font-bold">{data.age}</span>
          <span className="font-medium"> · {formatLocation(data.location)}</span>
        </p>
      </div>

      <div className="flex-1 px-5 py-4">
        <p className="mb-5 text-xs font-semibold uppercase tracking-wide text-gray-400">
          Compatibility Check
        </p>

        <div className="grid grid-cols-2 gap-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">
            Me
          </p>
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">
            You
          </p>

          {rows.map((row) => (
            <div key={row.category} className="contents">
              <div className="rounded-xl bg-gray-50 px-3 py-2.5">
                <p className="text-sm font-medium leading-snug text-gray-800">
                  {row.me}
                </p>
              </div>
              <div className="rounded-xl bg-primary/5 px-3 py-2.5">
                <p className="text-sm font-medium leading-snug text-gray-800">
                  {row.you}
                </p>
              </div>
            </div>
          ))}
        </div>

        <p className="mt-5 border-t border-gray-100 pt-4 text-sm font-medium text-gray-600">
          Different energies can be fun.
        </p>
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
