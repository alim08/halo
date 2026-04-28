/**
 * Card Type: Bento Card
 * Highly visual grid-style profile card with interests, lifestyle, vibe, and connection traits.
 * 2-column layout with icon + label tiles (4-6 max).
 * Premium dating app feel with modern clean spacing.
 */

import { Heart, X } from "lucide-react";

type PromptAnswer = {
  question: string;
  answer: string;
};

type BentoTile = {
  icon: string;
  label: string;
  subtext?: string;
};

export type BentoCardData = {
  card_id: string;
  age: number;
  location: string;
  interests?: string[];
  lifestyle_habits?: Record<string, unknown>;
  vibe?: Record<string, unknown>;
  connection_style?: Record<string, unknown>;
  profile_data?: Record<string, unknown>;
};

type BentoCardProps = {
  data: BentoCardData;
  onPass: () => void;
  onConnect: () => void;
};

// Icon mapping for common attributes
const ICON_MAP: Record<string, Record<string, string>> = {
  sleep_schedule: {
    "early bird": "🌅",
    "night owl": "🌙",
    flexible: "⏰",
  },
  fitness: {
    never: "😌",
    "1-2x/week": "🏃",
    "3-4x/week": "🏋",
    daily: "💪",
  },
  drinking: {
    "non-drinker": "🚫",
    socially: "🍷",
    regularly: "🍹",
    often: "🍻",
  },
  pets: {
    "have dog": "🐶",
    "have cat": "🐱",
    "have other": "🐾",
    "want pets": "🐾",
    "don't have": "✨",
    "no pets": "✨",
  },
  diet: {
    omnivore: "🍜",
    vegetarian: "🥗",
    vegan: "🌱",
    pescatarian: "🐟",
  },
  smoking: {
    "non-smoker": "✨",
    socially: "💨",
    regularly: "🚬",
  },
  wants_kids: {
    yes: "👶",
    no: "✈️",
    maybe: "🤔",
    "already have kids": "👨‍👩‍👧",
  },
  energy_level: {
    chill: "😌",
    moderate: "⚖️",
    "high energy": "⚡",
  },
  life_pace: {
    "slow & steady": "🌿",
    balanced: "⚖️",
    "fast-paced": "⚡",
  },
  social_style: {
    homebody: "🏡",
    ambivert: "🌗",
    "social butterfly": "🎉",
  },
  communication_style: {
    direct: "🎯",
    thoughtful: "💭",
    spontaneous: "⚡",
    balanced: "⚖️",
  },
  love_language: {
    "words of affirmation": "💬",
    "acts of service": "🤝",
    "quality time": "🕰",
    "physical touch": "🤗",
    gifts: "🎁",
  },
  affection_level: {
    reserved: "🧊",
    moderate: "🤍",
    "very affectionate": "💕",
  },
  conflict_style: {
    "address it directly": "🎯",
    "need time to think": "⏳",
    "talk it out calmly": "💬",
    "avoid conflict": "☮️",
  },
  relationship_pace: {
    "take it slow": "🌱",
    "go with the flow": "🌊",
    "move quickly": "⚡",
  },
};

// Label mapping for cleaner display
const LABEL_MAP: Record<string, Record<string, string>> = {
  sleep_schedule: {
    "early bird": "Early bird",
    "night owl": "Night owl",
    flexible: "Flexible",
  },
  fitness: {
    never: "Low-key",
    "1-2x/week": "Active",
    "3-4x/week": "Active",
    daily: "Fitness focused",
  },
  drinking: {
    "non-drinker": "Doesn't drink",
    socially: "Social drinker",
    regularly: "Enjoys going out",
    often: "Party vibe",
  },
  pets: {
    "have dog": "Dog person",
    "have cat": "Cat person",
    "have other": "Pet person",
    "want pets": "Wants pets",
    "don't have": "Pet-free",
    "no pets": "Pet-free",
  },
  diet: {
    omnivore: "Foodie",
    vegetarian: "Vegetarian",
    vegan: "Vegan",
    pescatarian: "Seafood lover",
  },
  smoking: {
    "non-smoker": "Non-smoker",
    socially: "Social smoker",
    regularly: "Smokes",
  },
  wants_kids: {
    yes: "Wants kids",
    no: "Child-free",
    maybe: "Open-minded",
    "already have kids": "Parent",
  },
  energy_level: {
    chill: "Chill",
    moderate: "Balanced",
    "high energy": "High energy",
  },
  life_pace: {
    "slow & steady": "Slow & steady",
    balanced: "Balanced",
    "fast-paced": "Fast-paced",
  },
  social_style: {
    homebody: "Homebody",
    ambivert: "Ambivert",
    "social butterfly": "Social butterfly",
  },
  communication_style: {
    direct: "Direct",
    thoughtful: "Thoughtful",
    spontaneous: "Spontaneous",
    balanced: "Balanced",
  },
  love_language: {
    "words of affirmation": "Words",
    "acts of service": "Acts of service",
    "quality time": "Quality time",
    "physical touch": "Physical touch",
    gifts: "Gift giver",
  },
  affection_level: {
    reserved: "Reserved",
    moderate: "Moderate",
    "very affectionate": "Affectionate",
  },
  conflict_style: {
    "address it directly": "Direct",
    "need time to think": "Thoughtful",
    "talk it out calmly": "Calm",
    "avoid conflict": "Avoidant",
  },
  relationship_pace: {
    "take it slow": "Take it slow",
    "go with the flow": "Go with flow",
    "move quickly": "Move fast",
  },
};

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
  "prefer not to say",
]);

function cleanText(value: unknown, minLength = 2): string | null {
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

function getProfileRecord(data: BentoCardData, key: string): Record<string, unknown> {
  const source = data.profile_data?.[key] ?? data[key as keyof BentoCardData];
  return source && typeof source === "object" && !Array.isArray(source) ? (source as Record<string, unknown>) : {};
}

function getProfileArray(data: BentoCardData, key: string): string[] {
  const source = data.profile_data?.[key] ?? data[key as keyof BentoCardData];
  return Array.isArray(source) ? source.filter((item): item is string => typeof item === "string") : [];
}

function getTile(
  fieldName: string,
  value: unknown,
  iconMap: Record<string, Record<string, string>>,
  labelMap: Record<string, Record<string, string>>
): BentoTile | null {
  const normalized = normalizeValue(value);
  if (!normalized) return null;

  const icon = iconMap[fieldName]?.[normalized];
  const label = labelMap[fieldName]?.[normalized];

  if (!icon || !label) return null;

  return { icon, label };
}

function extractTiles(data: BentoCardData): BentoTile[] {
  const tiles: BentoTile[] = [];

  // Priority order for attributes to maximize visual interest
  const lifestyle = getProfileRecord(data, "lifestyle_habits");
  const vibe = getProfileRecord(data, "vibe");
  const connection = getProfileRecord(data, "connection_style");

  // High-priority lifestyle attributes
  const priorityLifestyle = ["sleep_schedule", "fitness", "pets", "diet"];
  for (const key of priorityLifestyle) {
    if (tiles.length >= 6) break;
    const tile = getTile(key, lifestyle[key], ICON_MAP, LABEL_MAP);
    if (tile) tiles.push(tile);
  }

  // Vibe attributes
  const vibeKeys = ["energy_level", "life_pace", "social_style"];
  for (const key of vibeKeys) {
    if (tiles.length >= 6) break;
    const tile = getTile(key, vibe[key], ICON_MAP, LABEL_MAP);
    if (tile) tiles.push(tile);
  }

  // Connection style attributes
  const connectionKeys = ["love_language", "affection_level"];
  for (const key of connectionKeys) {
    if (tiles.length >= 6) break;
    const tile = getTile(key, connection[key], ICON_MAP, LABEL_MAP);
    if (tile) tiles.push(tile);
  }

  // Interests as special tiles
  const interests = data.interests ?? getProfileArray(data, "interests");
  const interestTiles = interests
    .slice(0, 2)
    .map((interest) => {
      const cleaned = cleanText(interest);
      if (!cleaned) return null;

      // Map interests to icons
      const interestLower = cleaned.toLowerCase();
      let icon = "✨";

      if (interestLower.includes("music") || interestLower.includes("guitar")) icon = "🎵";
      else if (interestLower.includes("travel") || interestLower.includes("hiking")) icon = "✈️";
      else if (interestLower.includes("cook") || interestLower.includes("food")) icon = "👨‍🍳";
      else if (interestLower.includes("art") || interestLower.includes("photo")) icon = "🎨";
      else if (interestLower.includes("read") || interestLower.includes("book")) icon = "📚";
      else if (interestLower.includes("sport") || interestLower.includes("game")) icon = "⚽";
      else if (interestLower.includes("dog") || interestLower.includes("cat")) icon = "🐾";
      else if (interestLower.includes("outdoor") || interestLower.includes("nature")) icon = "🏞️";

      return { icon, label: cleaned };
    })
    .filter((t): t is BentoTile => t !== null);

  tiles.push(...interestTiles);

  // Ensure we have 4-6 tiles
  return tiles.slice(0, 6);
}

function formatLocation(location: string): string {
  return cleanText(location) ?? "Nearby";
}

function hasEnoughData(data: BentoCardData): boolean {
  const lifestyle = getProfileRecord(data, "lifestyle_habits");
  const vibe = getProfileRecord(data, "vibe");
  const interests = data.interests ?? getProfileArray(data, "interests");

  const lifestyleCount = Object.keys(lifestyle).length;
  const vibeCount = Object.keys(vibe).length;
  const interestCount = interests.length;

  // Need at least 4 data points across all categories
  return lifestyleCount + vibeCount + interestCount >= 4;
}

export function BentoCard({ data, onPass, onConnect }: BentoCardProps) {
  const tiles = extractTiles(data);
  const hasData = hasEnoughData(data);

  // Return null for fallback if not enough data
  if (!hasData || tiles.length < 4) {
    return null;
  }

  return (
    <div className="flex w-full max-w-sm flex-col overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-lg">
      {/* Header: age & location */}
      <div className="bg-gradient-to-r from-halo-primary to-halo-secondary px-5 py-4">
        <p className="text-lg text-white">
          <span className="font-bold">{data.age}</span>
          <span className="font-medium"> · {formatLocation(data.location)}</span>
        </p>
      </div>

      {/* Bento Grid */}
      <div className="flex-1 p-4">
        <div className="grid grid-cols-2 gap-3">
          {tiles.map((tile, idx) => (
            <div
              key={`${tile.label}-${idx}`}
              className="flex flex-col items-center justify-center rounded-xl bg-gradient-to-br from-halo-primary/5 to-halo-secondary/5 border border-halo-primary/10 px-4 py-5 transition-all hover:border-halo-primary/20 hover:shadow-sm"
            >
              <span className="text-3xl mb-2 leading-none">{tile.icon}</span>
              <span className="text-sm font-semibold text-gray-800 text-center line-clamp-2">
                {tile.label}
              </span>
              {tile.subtext && (
                <span className="text-xs text-gray-500 mt-1 text-center">{tile.subtext}</span>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Action buttons */}
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
          className="flex h-14 w-14 items-center justify-center rounded-full border-2 border-halo-primary text-halo-primary transition-all hover:bg-halo-primary hover:text-white active:bg-halo-primary/90"
        >
          <Heart className="h-7 w-7" />
        </button>
      </div>
    </div>
  );
}
