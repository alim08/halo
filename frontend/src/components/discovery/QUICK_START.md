/**
 * QUICK START: Dynamic Discovery Card System
 * 
 * How the system works end-to-end:
 */

// ─────────────────────────────────────────────────────────────
// 1. API RETURNS DATA (from backend)
// ─────────────────────────────────────────────────────────────

const apiResponse = {
  cards: [
    {
      card_id: "user-alice-123",
      age: 26,
      location: "San Francisco, CA",
      vibe_tags: ["adventurous", "creative", "coffee lover"],
      prompt_answers: [
        {
          question: "My ideal first date is…",
          answer: "Exploring a neighborhood I've never been to and grabbing coffee at a cozy spot.",
        },
        {
          question: "Something that always makes me smile is…",
          answer: "My dog doing zoomies around the apartment",
        },
        {
          question: "My toxic trait is…",
          answer: "I reorganize other people's kitchen cabinets without asking 😅",
        },
      ],
      profile_data: {
        lifestyle: {
          drinking: "Socially",
          smoking: "Non-smoker",
          fitness: "3-4x/week",
          sleep_schedule: "Night owl",
          diet: "Omnivore",
          wants_kids: "Maybe",
          pets: "Have dog",
        },
      },
    },
  ],
};

// ─────────────────────────────────────────────────────────────
// 2. DISCOVERY STACK INITIALIZES
// ─────────────────────────────────────────────────────────────

// DiscoveryStack.tsx:
// - Creates CardTemplateSelector instance
// - Tracks which templates have been shown
// - Prevents same layout twice in a row

import { CardTemplateSelector } from "@/lib/cardTemplates";

const templateSelector = new CardTemplateSelector();
const currentTemplate = templateSelector.selectTemplate(); // "classic"

// Next card swipe:
const nextTemplate = templateSelector.selectTemplate(); // "quote" (not "classic")
// Then: "lifestyle", "thisorthat", "story", "quick", etc.

// ─────────────────────────────────────────────────────────────
// 3. DISCOVERY CARD RECEIVES DATA + TEMPLATE
// ─────────────────────────────────────────────────────────────

// DiscoveryCard.tsx orchestrates the transformation:
<DiscoveryCard
  card={apiResponse.cards[0]}
  templateType="quote"
  onPass={handlePass}
  onConnect={handleConnect}
/>

// ─────────────────────────────────────────────────────────────
// 4. ORCHESTRATOR SELECTS BEST DATA FOR TEMPLATE
// ─────────────────────────────────────────────────────────────

// Quote card needs ONE standout answer:
function selectStandoutPrompt(prompts) {
  // Picks answer between 20-150 chars (substantive but concise)
  return {
    question: "Something that always makes me smile is…",
    answer: "My dog doing zoomies around the apartment", // 46 chars - perfect!
  };
}

// Classic card uses ALL prompts:
const classicData = {
  card_id: "user-alice-123",
  age: 26,
  location: "San Francisco, CA",
  vibe_tags: ["adventurous", "creative", "coffee lover"],
  prompt_answers: [
    // all 3 prompts
  ],
};

// Lifestyle card extracts emoji badges:
import { getLifestyleBadges } from "@/lib/cardTemplates";

const badges = getLifestyleBadges(profile_data);
// Returns:
[
  { category: "Fitness", value: "3-4x/week", emoji: "🔥" },
  { category: "Sleep", value: "Night owl", emoji: "🌙" },
  { category: "Pets", value: "Have dog", emoji: "🐕" },
  // ... etc
];

// ─────────────────────────────────────────────────────────────
// 5. TEMPLATE COMPONENT RENDERS OPTIMIZED UI
// ─────────────────────────────────────────────────────────────

// QuoteCard.tsx receives transformed data:
export function QuoteCard({ data, onPass, onConnect }) {
  return (
    <div className="rounded-2xl bg-white shadow-lg">
      {/* Big, bold quote as main focus */}
      <div className="flex-1 flex flex-col justify-center px-5 py-8 bg-gradient-to-br from-halo-primary/5 to-halo-secondary/5">
        <p className="text-2xl font-semibold text-gray-900 italic">
          "{data.standout_prompt.answer}"
        </p>
      </div>
      {/* Action buttons */}
      {/* Pass & Connect buttons */}
    </div>
  );
}

// Meanwhile, another user gets a different template:

// ClassicCard.tsx - same user, but template="classic":
export function ClassicCard({ data, onPass, onConnect }) {
  return (
    <div className="rounded-2xl bg-white shadow-lg">
      {/* All prompts displayed */}
      <div className="space-y-4">
        {data.prompt_answers.map((pa) => (
          <div key={pa.question}>
            <p className="text-xs uppercase text-gray-400">{pa.question}</p>
            <p className="text-sm text-gray-700">{pa.answer}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// 6. PROMPT ROTATION - WHERE MAGIC HAPPENS
// ─────────────────────────────────────────────────────────────

// Prompts.ts - Database:
export const PROMPT_DATABASE = [
  // Fun/Personality
  { id: "fun_1", category: "fun", question: "A random skill I have is…" },
  { id: "fun_2", category: "fun", question: "Obsessed with…" },

  // Lifestyle
  { id: "lifestyle_1", category: "lifestyle", question: "Sunday mornings usually look like…" },

  // Dating Intentions
  { id: "dating_1", category: "dating", question: "My ideal first date is…" },

  // Values
  { id: "values_1", category: "values", question: "The value I care about most is…" },

  // Humor
  { id: "humor_1", category: "humor", question: "My toxic trait is…" },

  // Deep
  { id: "deep_1", category: "deep", question: "Ask me about the time I…" },
  // ... 40+ total
];

// When user fills out profile, they answer 2-4 random prompts:
const selectedPrompts = selectRandomPrompts(count = 3);
// [
//   { id: "fun_5", question: "My hidden talent is…" },
//   { id: "dating_2", question: "My ideal first date is…" },
//   { id: "humor_3", question: "I'm overly competitive about…" },
// ]

// EACH PROFILE is unique:
// - Different prompts selected per profile
// - Different answers per person
// - Different template when swiping

// ─────────────────────────────────────────────────────────────
// 7. USER SWIPES THROUGH DISCOVERY
// ─────────────────────────────────────────────────────────────

// Initial state:
// Card 1: Template="classic" → Prompts: [fun_5, dating_2, humor_3]
// Card 2: Template="quote" → Prompt: [lifestyle_4] (best answer highlighted)
// Card 3: Template="lifestyle" → Badges: [fitness, pets, sleep]
// Card 4: Template="thisorthat" → Choices: [coffee/tea, beach/mountains, etc]
// Card 5: Template="story" → Setup: "Ask me about..."
// Card 6: Template="quick" → Snapshot: ["Adventurous", "Night owl", "Dog parent"]

// When user "Pass" or "Connect", advance to next card
// Template selector prevents same layout twice in a row

// ─────────────────────────────────────────────────────────────
// BENEFITS
// ─────────────────────────────────────────────────────────────

/**
 * ✅ Premium Feel
 *    - No more "my ideal weekend is..." repeated across profiles
 *    - Each person feels unique and thoughtful
 *
 * ✅ Engagement
 *    - 6 different layouts prevent scrolling fatigue
 *    - Template variety maintains interest
 *    - Prompts across 6 categories feel comprehensive
 *
 * ✅ Personality
 *    - 40+ prompts vs 4 fixed ones = more authentic
 *    - Multiple categories (fun, values, humor, etc) = fuller picture
 *    - Different templates suit different personality types
 *
 * ✅ Technical
 *    - Graceful fallbacks for incomplete profiles
 *    - Uses existing onboarding data (lifestyle)
 *    - No new backend changes needed
 *    - Fully typed TypeScript
 *
 * ✅ Design
 *    - Each template has unique color scheme
 *    - Mobile-optimized (44px touch targets)
 *    - Responsive layout
 *    - Clear visual hierarchy
 */

// ─────────────────────────────────────────────────────────────
// EXTENDING THE SYSTEM
// ─────────────────────────────────────────────────────────────

// Add a new prompt:
export const PROMPT_DATABASE: Prompt[] = [
  // ... existing prompts
  {
    id: "values_8",
    category: "values",
    question: "In 5 years, I see myself…",
  },
];

// Add a new card template:
// 1. Create cardTypes/NewCard.tsx
export type NewCardData = {
  card_id: string;
  age: number;
  location: string;
  // ... your specific fields
};

// 2. Add type to CardLayoutType
export type CardLayoutType = "classic" | "quote" | "lifestyle" | "thisorthat" | "story" | "quick" | "new";

// 3. Update renderCard() in DiscoveryCard.tsx:
case "new":
  return (
    <NewCard
      data={{ /* transform data */ } as NewCardData}
      {...commonProps}
    />
  );

// ─────────────────────────────────────────────────────────────
// TESTING THE SYSTEM
// ─────────────────────────────────────────────────────────────

// Test with minimal data:
const minimalCard = {
  card_id: "test-1",
  age: 28,
  location: "NYC",
  vibe_tags: [],
  prompt_answers: [], // Empty - should show graceful fallbacks
  profile_data: {},
};

// Test with rich data:
const richCard = {
  card_id: "test-2",
  age: 26,
  location: "LA",
  vibe_tags: ["adventurous", "creative", "foodie"],
  prompt_answers: [
    {
      question: "My ideal first date is…",
      answer: "Coffee at a cozy spot where we can actually talk without shouting over music.",
    },
    {
      question: "Something that always makes me smile is…",
      answer: "My friend's cat judging us from the windowsill",
    },
    {
      question: "My toxic trait is…",
      answer: "I start too many projects and never finish them 😅",
    },
  ],
  profile_data: {
    lifestyle: {
      drinking: "Regularly",
      smoking: "Non-smoker",
      fitness: "3-4x/week",
      sleep_schedule: "Night owl",
      diet: "Pescatarian",
      wants_kids: "Yes",
      pets: "Have cat",
    },
  },
};

// Verify:
// - All 6 templates render without errors
// - Empty prompts show default text
// - Same template doesn't appear twice in a row
// - Lifestyle badges display correctly
// - Pass/Connect buttons work
// - Match alert shows on connection
