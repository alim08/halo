export type CardLayoutType = "classic" | "quote" | "lifestyle" | "compatibility" | "bento";

export interface CardTemplateConfig {
  type: CardLayoutType;
  priority: number;
  weight: number;
}

const CARD_TEMPLATES: Record<CardLayoutType, CardTemplateConfig> = {
  classic: { type: "classic", priority: 2, weight: 1.0 },
  quote: { type: "quote", priority: 1.8, weight: 0.9 },
  lifestyle: { type: "lifestyle", priority: 1.6, weight: 0.9 },
  compatibility: { type: "compatibility", priority: 1.7, weight: 0.9 },
  bento: { type: "bento", priority: 1.9, weight: 0.95 },
};

export class CardTemplateSelector {
  private lastTemplate: CardLayoutType | null = null;

  selectTemplate(): CardLayoutType {
    const templates = Object.values(CARD_TEMPLATES)
      .map((cfg) => cfg.type)
      .filter((type) => type !== this.lastTemplate);

    const selected =
      templates[Math.floor(Math.random() * templates.length)] ?? "classic";

    this.lastTemplate = selected;
    return selected;
  }

  resetHistory(): void {
    this.lastTemplate = null;
  }
}

export type LifestyleBadge = {
  category: string;
  value: string;
  emoji?: string;
};

const LIFESTYLE_EMOJIS: Record<string, string> = {
  "Non-drinker": "🚫",
  Socially: "🍷",
  Regularly: "🍹",
  Often: "🍻",
  "Non-smoker": "✨",
  "Early bird": "🌅",
  "Night owl": "🌙",
  Flexible: "🎯",
  Daily: "💪",
  "1-2x/week": "🏃",
  "3-4x/week": "🔥",
  Never: "😴",
  Yes: "👶",
  No: "🗺️",
  Maybe: "🤔",
  "Already have kids": "👨‍👩‍👧‍👦",
  Vegetarian: "🥗",
  Vegan: "🌱",
  Pescatarian: "🐟",
  Omnivore: "🍖",
  "Have dog": "🐕",
  "Have cat": "🐈",
};

function cleanValue(value: unknown): string | null {
  if (!value) return null;

  const cleaned = String(value).trim();

  if (cleaned.length < 3) return null;
  if (["n/a", "none", "null", "undefined", "test"].includes(cleaned.toLowerCase())) {
    return null;
  }

  return cleaned;
}

export function getLifestyleBadges(profileData: Record<string, any>): LifestyleBadge[] {
  const lifestyle = profileData.lifestyle || {};

  const mappings: Array<[string, string]> = [
    ["drinking", "Drinking"],
    ["smoking", "Smoking"],
    ["fitness", "Fitness"],
    ["sleep_schedule", "Sleep"],
    ["diet", "Diet"],
    ["wants_kids", "Kids"],
    ["pets", "Pets"],
  ];

  const badges: LifestyleBadge[] = [];

  for (const [key, label] of mappings) {
    const value = cleanValue(lifestyle[key]);

    if (value) {
      badges.push({
        category: label,
        value,
        emoji: LIFESTYLE_EMOJIS[value] || "✨",
      });
    }
  }

  return badges;
}
