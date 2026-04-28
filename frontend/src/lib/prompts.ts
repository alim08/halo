/**
 * Prompt database organized by category
 * Each profile will randomly select 2-4 prompts from these categories
 */

export type PromptCategory = "fun" | "lifestyle" | "dating" | "values" | "humor" | "deep";

export type Prompt = {
  id: string;
  category: PromptCategory;
  question: string;
};

export const PROMPT_DATABASE: Prompt[] = [
  // ── FUN / PERSONALITY ──────────────────────────────────
  {
    id: "fun_1",
    category: "fun",
    question: "A random skill I have is…",
  },
  {
    id: "fun_2",
    category: "fun",
    question: "Obsessed with…",
  },
  {
    id: "fun_3",
    category: "fun",
    question: "If I could only eat one thing for a week…",
  },
  {
    id: "fun_4",
    category: "fun",
    question: "My hidden talent is…",
  },
  {
    id: "fun_5",
    category: "fun",
    question: "The most spontaneous thing I've done is…",
  },
  {
    id: "fun_6",
    category: "fun",
    question: "I'm embarrassingly good at…",
  },
  {
    id: "fun_7",
    category: "fun",
    question: "Something I'm weirdly passionate about…",
  },
  {
    id: "fun_8",
    category: "fun",
    question: "My playlist says a lot about me because…",
  },

  // ── LIFESTYLE ──────────────────────────────────────────
  {
    id: "lifestyle_1",
    category: "lifestyle",
    question: "Sunday mornings usually look like…",
  },
  {
    id: "lifestyle_2",
    category: "lifestyle",
    question: "My ideal weekend is…",
  },
  {
    id: "lifestyle_3",
    category: "lifestyle",
    question: "I'm usually the person who…",
  },
  {
    id: "lifestyle_4",
    category: "lifestyle",
    question: "My favorite way to unwind is…",
  },
  {
    id: "lifestyle_5",
    category: "lifestyle",
    question: "On a typical Tuesday evening, you'll find me…",
  },
  {
    id: "lifestyle_6",
    category: "lifestyle",
    question: "My go-to coffee order says…",
  },
  {
    id: "lifestyle_7",
    category: "lifestyle",
    question: "I'm a morning person / night owl because…",
  },

  // ── DATING INTENTIONS ──────────────────────────────────
  {
    id: "dating_1",
    category: "dating",
    question: "We'll get along if…",
  },
  {
    id: "dating_2",
    category: "dating",
    question: "My ideal first date is…",
  },
  {
    id: "dating_3",
    category: "dating",
    question: "A green flag I notice immediately is…",
  },
  {
    id: "dating_4",
    category: "dating",
    question: "I know there's potential when…",
  },
  {
    id: "dating_5",
    category: "dating",
    question: "Dating me is like…",
  },
  {
    id: "dating_6",
    category: "dating",
    question: "I'm looking for someone who…",
  },
  {
    id: "dating_7",
    category: "dating",
    question: "The way to my heart is…",
  },

  // ── VALUES ─────────────────────────────────────────────
  {
    id: "values_1",
    category: "values",
    question: "The value I care about most is…",
  },
  {
    id: "values_2",
    category: "values",
    question: "My biggest relationship lesson is…",
  },
  {
    id: "values_3",
    category: "values",
    question: "Something I'm deeply passionate about…",
  },
  {
    id: "values_4",
    category: "values",
    question: "I believe love should…",
  },
  {
    id: "values_5",
    category: "values",
    question: "If I could change one thing about the world…",
  },
  {
    id: "values_6",
    category: "values",
    question: "My non-negotiable in a partner is…",
  },
  {
    id: "values_7",
    category: "values",
    question: "Something I stand up for is…",
  },

  // ── HUMOR ──────────────────────────────────────────────
  {
    id: "humor_1",
    category: "humor",
    question: "My toxic trait is…",
  },
  {
    id: "humor_2",
    category: "humor",
    question: "Something that always makes me smile is…",
  },
  {
    id: "humor_3",
    category: "humor",
    question: "I'm overly competitive about…",
  },
  {
    id: "humor_4",
    category: "humor",
    question: "My most controversial take is…",
  },
  {
    id: "humor_5",
    category: "humor",
    question: "Something I'm irrationally afraid of…",
  },
  {
    id: "humor_6",
    category: "humor",
    question: "My biggest pet peeve is…",
  },
  {
    id: "humor_7",
    category: "humor",
    question: "I lose focus when…",
  },

  // ── DEEP QUESTIONS ─────────────────────────────────────
  {
    id: "deep_1",
    category: "deep",
    question: "Ask me about the time I…",
  },
  {
    id: "deep_2",
    category: "deep",
    question: "Something people often get wrong about me is…",
  },
  {
    id: "deep_3",
    category: "deep",
    question: "I'm still learning to…",
  },
  {
    id: "deep_4",
    category: "deep",
    question: "What I'm looking for this year is…",
  },
  {
    id: "deep_5",
    category: "deep",
    question: "The person I'm becoming is someone who…",
  },
  {
    id: "deep_6",
    category: "deep",
    question: "A moment that changed me was…",
  },
  {
    id: "deep_7",
    category: "deep",
    question: "I want to be known for…",
  },
];

/**
 * Shuffle array using Fisher-Yates algorithm
 */
function shuffleArray<T>(arr: T[]): T[] {
  const result = [...arr];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

/**
 * Select 2-4 random prompts from the database, with balanced category distribution
 */
export function selectRandomPrompts(
  count: number = 3,
  excludeIds: string[] = []
): Prompt[] {
  const available = PROMPT_DATABASE.filter((p) => !excludeIds.includes(p.id));

  if (available.length === 0) {
    return [];
  }

  // Aim for at least one from each category if possible
  const categories: PromptCategory[] = ["fun", "lifestyle", "dating", "values", "humor", "deep"];
  const selectedByCategory = new Map<PromptCategory, Prompt[]>();

  // Initialize map
  categories.forEach((cat) => {
    selectedByCategory.set(
      cat,
      available.filter((p) => p.category === cat)
    );
  });

  const selected: Prompt[] = [];
  const usedIds = new Set(excludeIds);

  // First, try to get one from different categories
  for (const category of shuffleArray(categories)) {
    if (selected.length >= count) break;

    const candidatesByCategory = selectedByCategory
      .get(category)!
      .filter((p) => !usedIds.has(p.id));

    if (candidatesByCategory.length > 0) {
      const chosen = candidatesByCategory[Math.floor(Math.random() * candidatesByCategory.length)];
      selected.push(chosen);
      usedIds.add(chosen.id);
    }
  }

  // If we need more, fill from all available
  while (selected.length < count) {
    const remaining = available.filter((p) => !usedIds.has(p.id));
    if (remaining.length === 0) break;

    const chosen = remaining[Math.floor(Math.random() * remaining.length)];
    selected.push(chosen);
    usedIds.add(chosen.id);
  }

  return selected;
}

/**
 * Get prompts from profile_data answers
 */
export function extractPromptsFromAnswers(answers: Record<string, string>): { question: string; answer: string }[] {
  return Object.entries(answers)
    .map(([key, answer]) => {
      const prompt = PROMPT_DATABASE.find((p) => p.id === key);
      return {
        question: prompt?.question || key,
        answer: String(answer),
      };
    })
    .filter((item) => item.answer && item.answer.trim());
}
