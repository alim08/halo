# Dynamic Discovery Card System

Premium, engaging discovery experience with rotating prompts and diverse card layouts.

## System Overview

The discovery card system has been refactored to deliver a playful, high-personality experience inspired by Hinge, Tinder, and Gen Z design principles.

### Key Features

✨ **Dynamic Prompt Rotation**
- 40+ contextually-relevant prompts across 6 categories
- Prompts selected randomly per card (no repetition)
- Categories: Fun/Personality, Lifestyle, Dating Intentions, Values, Humor, Deep Questions

🎨 **6 Card Layout Types**
- **Classic**: Multi-prompt traditional layout (Type A)
- **Quote**: Single standout quote prominent (Type B)
- **Lifestyle**: Visual lifestyle badges + bio (Type C)
- **This or That**: Rapid-fire personality choices (Type D)
- **Story**: "Ask me about..." intriguing prompt (Type F)
- **Quick**: 3-line personality snapshot (Bonus)

🔄 **Smart Template Variety**
- Avoids showing same layout twice in a row
- Weighted random selection favors engaging templates
- Tracks last 5 templates shown

🎯 **Graceful Fallbacks**
- Empty prompts get fun default text
- Incomplete profiles display available data
- No broken states

## Architecture

```
discovery/
├── DiscoveryCard.tsx          ← Main orchestrator (routes to templates)
├── DiscoveryStack.tsx         ← Manages card stack & template selection
├── useDiscovery.ts            ← API integration & state
├── cardTypes/
│   ├── ClassicCard.tsx        ← Type A layout
│   ├── QuoteCard.tsx          ← Type B layout
│   ├── LifestyleCard.tsx      ← Type C layout
│   ├── ThisOrThatCard.tsx     ← Type D layout
│   ├── StoryCard.tsx          ← Type F layout
│   └── QuickCard.tsx          ← Bonus layout

lib/
├── prompts.ts                 ← Prompt database & rotation logic
└── cardTemplates.ts           ← Template system & lifestyle badges
```

## Usage

### Basic Implementation

The discovery page automatically uses the new system:

```tsx
import { DiscoveryStack } from "@/components/discovery/DiscoveryStack";

export default function DiscoveryPage() {
  return (
    <main>
      <DiscoveryStack />
    </main>
  );
}
```

### Card Data Flow

1. API returns `DiscoveryCardData` (standard format from backend)
2. `DiscoveryStack` selects template type for current card
3. `DiscoveryCard` transforms data into template-specific format
4. Template component renders optimized layout

### Adding New Prompts

Edit [lib/prompts.ts](../lib/prompts.ts):

```typescript
export const PROMPT_DATABASE: Prompt[] = [
  {
    id: "fun_9",
    category: "fun",
    question: "My hidden passion is…",
  },
  // Add more...
];
```

### Adding New Card Layouts

1. Create new component in `cardTypes/NewCard.tsx`
2. Export type `NewCardData` and component
3. Add type to `CardLayoutType` in [lib/cardTemplates.ts](../lib/cardTemplates.ts)
4. Add case to `renderCard()` in [DiscoveryCard.tsx](./DiscoveryCard.tsx)

## Card Layout Details

### Classic Card (Type A)
- 2-4 prompt-answer pairs
- Vibe tags row
- Age/location header with gradient
- Best for: Well-answered profiles

### Quote Card (Type B)
- Prominent single quote (20-150 chars ideal)
- Supporting prompt below
- Minimal design, high impact
- Best for: Witty, insightful answers

### Lifestyle Card (Type C)
- Grid of lifestyle badges with emojis
- Categories: Drinking, Smoking, Fitness, Sleep, Diet, Kids, Pets
- One bio prompt at bottom
- Best for: Visual personality types

### This or That Card (Type D)
- 3 rapid-fire choice pairs
- Purple/pink color scheme
- Gauges personality preferences
- Best for: Playful, quick profiles

### Story Card (Type F)
- "Ask me about..." setup
- Message icon, intriguing setup
- Supporting prompt below
- Best for: Mystery, conversation starters

### Quick Card (Bonus)
- 3-line personality snapshot
- Bullet points, teal color scheme
- Fast, punchy, no fluff
- Best for: Quick scanning

## Prompt Categories

### 🎉 Fun / Personality (8 prompts)
- A random skill I have is…
- My hidden talent is…
- Something I'm weirdly passionate about…

### 🏠 Lifestyle (7 prompts)
- Sunday mornings usually look like…
- My favorite way to unwind is…
- On a typical Tuesday evening, you'll find me…

### 💕 Dating Intentions (7 prompts)
- We'll get along if…
- My ideal first date is…
- A green flag I notice immediately is…

### ✨ Values (7 prompts)
- The value I care about most is…
- My biggest relationship lesson is…
- My non-negotiable in a partner is…

### 😆 Humor (7 prompts)
- My toxic trait is…
- Something that always makes me smile is…
- I'm overly competitive about…

### 🌙 Deep Questions (7 prompts)
- Ask me about the time I…
- Something people often get wrong about me is…
- What I'm looking for this year is…

## Template Selection Algorithm

`CardTemplateSelector` uses weighted random selection:

1. Each template has a priority score (base score)
2. Recently used templates are penalized
3. Less-used templates get higher scores
4. Last 5 templates tracked to prevent immediate repetition

Weights (0.7-1.0):
- Classic: 1.0 (always popular)
- Quote: 0.8 (high impact, use moderately)
- Lifestyle: 0.9 (visual interest)
- This or That: 0.7 (niche appeal)
- Story: 0.85 (conversation starter)
- Quick: 0.9 (fast scanning)

## Lifestyle Badges

Mapped from onboarding profile data:

```typescript
lifestyle: {
  drinking: "Socially" → 🍷,
  smoking: "Non-smoker" → ✨,
  fitness: "3-4x/week" → 🔥,
  sleep_schedule: "Night owl" → 🌙,
  diet: "Vegan" → 🌱,
  wants_kids: "Maybe" → 🤔,
  pets: "Have dog" → 🐕,
}
```

Emoji lookup in [cardTemplates.ts](../lib/cardTemplates.ts).

## Styling

### Design System
- Primary accent: `halo-primary`, `halo-secondary` (gradients)
- Card container: White, rounded-2xl, shadow-lg
- Buttons: 44px touch targets (mobile friendly)
- Responsive: max-w-sm (504px) on desktop, full on mobile

### Color Palette by Template
- **Classic**: Halo primary/secondary gradient
- **Quote**: Soft primary/secondary wash
- **Lifestyle**: Blue theme
- **This or That**: Purple/pink
- **Story**: Amber/orange
- **Quick**: Teal/green

## Performance Considerations

- Templates use `useMemo` to prevent unnecessary re-renders
- Prompt selection is deterministic within a session
- Template selector persists across card swipes
- Graceful fallbacks prevent layout shifts

## Future Enhancements

- [ ] Custom This or That questions from profile interests
- [ ] Photo/media preview card type (currently text-only per constitution)
- [ ] Voice note placeholder card
- [ ] Swipe gesture animations
- [ ] A/B testing framework for template effectiveness
- [ ] Analytics on template engagement rates
- [ ] User preference learning (prefer shorter prompts, etc.)

## Testing

### Manual Testing Checklist
- [ ] 6 different card types render without errors
- [ ] Same template doesn't appear twice in a row
- [ ] Empty profiles show graceful fallbacks
- [ ] All action buttons (Pass/Connect) work
- [ ] Match celebration overlay appears on connection
- [ ] Card counter accurate
- [ ] Touch targets 44px minimum

### Prompts to Test With
```typescript
// Test card with minimal data
{
  card_id: "test-1",
  age: 28,
  location: "San Francisco",
  vibe_tags: [],
  prompt_answers: []
}

// Test card with rich data
{
  card_id: "test-2",
  age: 26,
  location: "NYC",
  vibe_tags: ["adventurous", "creative"],
  prompt_answers: [
    { question: "My ideal first date is…", answer: "Coffee at a cozy spot where we can actually talk without shouting." },
    { question: "Something that always makes me smile is…", answer: "Dogs being confused by reflections" },
    { question: "My toxic trait is…", answer: "I reorganize other people's cabinets" }
  ]
}
```

## Integrating with Backend

The backend discovery API should return:

```json
{
  "cards": [
    {
      "card_id": "user-123",
      "age": 28,
      "location": "San Francisco",
      "vibe_tags": ["adventurous", "creative"],
      "prompt_answers": [
        {
          "question": "My ideal first date is…",
          "answer": "Coffee at a cozy spot where we can actually talk"
        }
      ],
      "profile_data": {
        "lifestyle": {
          "drinking": "Socially",
          "fitness": "3-4x/week",
          "pets": "Have dog"
        }
      }
    }
  ]
}
```

Backend should already provide this structure; the frontend consumes it transparently.

## Known Limitations

- Text-only design (no photos per constitution)
- Lifestyle badges require onboarding data to be populated
- This or That choices are randomized (not profile-specific yet)
- Template selector resets on page reload

## Questions?

Refer to individual component files for implementation details. Each card type is self-contained and documents its data structure.
