# Feature Specification: Halo Core Experience (MVP)

**Feature Branch**: `001-halo-functional-spec`  
**Created**: 2026-02-09  
**Status**: Draft  
**Input**: User description: "Halo is a dating app that prioritizes emotional connection: Values onboarding, Blind discovery feed (no photos), Contextual messaging (Sparks), and a gamified Secure Reveal (photos clarify as conversation deepens)."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Complete Values Onboarding Wizard (Priority: P1)

As a new user, I want to define my core identity (values, interests, vibe) so I attract compatible matches.

**Why this priority**: Without onboarding, Halo can’t deliver values-first matching or the blind discovery experience.

**Independent Test**: Create a new account, complete the wizard end-to-end, and confirm the user is eligible to see the discovery feed.

**Acceptance Scenarios**:

1. **Given** a new user who has not completed onboarding, **When** they open Halo, **Then** they are guided into the onboarding wizard and cannot access discovery until required steps are complete.
2. **Given** a user is partway through the wizard, **When** they close and reopen the app, **Then** they can resume from where they left off without losing completed answers.
3. **Given** a user enters invalid or incomplete information (e.g., underage age), **When** they attempt to proceed, **Then** they receive a clear validation message and cannot continue until corrected.

---

### User Story 2 - Browse Blind Discovery Feed (Priority: P1)

As a user, I want to swipe on profiles based on personality, avoiding bias from physical appearance.

**Why this priority**: The blind feed is the core differentiator—values-first selection and reduced appearance bias.

**Independent Test**: With onboarding completed, open discovery and verify a vertical card stack with Pass/Connect actions where cards show no photos.

**Acceptance Scenarios**:

1. **Given** a user opens discovery, **When** a profile card is shown, **Then** it contains only text-based content (typography, vibe tags, and prompt answers) and contains no photos.
2. **Given** a user taps Pass, **When** they confirm the action (if confirmation is used), **Then** the current card is dismissed and the next card appears.
3. **Given** a user taps Connect on another profile, **When** the action completes, **Then** the system records the intent and updates the UI to show the next card.

---

### User Story 3 - Start Meaningful Chats with Sparks (Priority: P1)

As a user, I want help starting meaningful conversations without saying “hey.”

**Why this priority**: Conversations are the mechanism that drives connection and the Secure Reveal reward loop.

**Independent Test**: Create a mutual connection (match), open the chat, see Spark suggestions, and send a message.

**Acceptance Scenarios**:

1. **Given** two users have a match, **When** either user opens the conversation, **Then** they can send and receive messages.
2. **Given** a conversation is open, **When** Spark suggestions are displayed, **Then** they are relevant to the partner’s tags/prompts (e.g., tag “Jazz” leads to a Jazz-related question).
3. **Given** a user sends a message, **When** they tap send, **Then** the message appears immediately in the conversation and later updates to reflect final delivery state.

---

### User Story 4 - Progress Secure Reveal via Connection Level (Priority: P2)

As I chat, I want to see my partner’s photo slowly clarify to build a sense of reward and intimacy.

**Why this priority**: Secure Reveal reinforces the behavior Halo is optimizing for (meaningful, reciprocal conversation).

**Independent Test**: In a match conversation, exchange messages back and forth until the system updates the connection level and clarifies the photo.

**Acceptance Scenarios**:

1. **Given** a new match conversation, **When** the conversation is first opened, **Then** any photo shown is in a heavily blurred state (Connection Level 1).
2. **Given** both users exchange messages reciprocally, **When** message thresholds are reached, **Then** the connection level increases automatically and the photo becomes progressively clearer.
3. **Given** messages are one-sided (only one user is sending), **When** thresholds would otherwise be reached, **Then** the connection level does not advance until reciprocity requirements are met.

---

### User Story 5 - Protect Privacy and Secret Sauce (Priority: P3)

As a user, I want to trust that my private data and photos are protected, and that Halo’s matching is fair without exposing sensitive internals.

**Why this priority**: Trust is essential in dating; privacy leaks and easy scraping destroy the product.

**Independent Test**: Verify that discovery does not expose PII, and that users cannot access clear photos before the required connection level.

**Acceptance Scenarios**:

1. **Given** a user views discovery cards, **When** a card is rendered, **Then** it contains no direct contact info, no exact location, and no private photos.
2. **Given** a user attempts to access a clearer photo state without reaching the required connection level, **When** they attempt access, **Then** the system denies access and only permits the variant allowed at their current level.
3. **Given** a user receives a discovery feed result, **When** the result is inspected, **Then** it does not expose the matching score or scoring rules—only the ordered results.

### Edge Cases

- User skips or partially completes onboarding: the system blocks discovery until required steps are complete.
- User has no eligible discovery candidates: discovery shows an empty-state with a clear next action (e.g., expand preferences later).
- User has missing optional profile data: Spark suggestions still appear, using available tags/prompts.
- Conversation message counts include deleted/edited messages: message counting rules must be consistent and documented.
- Users are temporarily offline: outgoing messages appear immediately but reconcile later; failures are clearly surfaced.
- Connection Level thresholds are met while one user is inactive: level does not advance without reciprocity.

## Requirements *(mandatory)*

**Constitution Compliance (mandatory)**: Requirements MUST comply with `.specify/memory/constitution.md`, especially:
- client-agnostic behavior (the product works consistently across current web app and future native apps),
- matching algorithm isolation (clients receive results, not scoring logic or raw scores),
- zero-trust media (users only gain access to clearer photo variants when permitted),
- data minimization and no PII exposure in discovery contexts,
- chat UX expectations (messages feel real-time and reconcile reliably).

### Functional Requirements

#### Values Onboarding (Wizard)

- **FR-001**: The system MUST provide a multi-step onboarding wizard that collects, at minimum: Basics (Age, Location), Vibe (Energy Level, Life Pace), Core Identity (Hobbies, Values), and Open-Ended Prompts.
- **FR-002**: The wizard MUST use a card-based UI with visual selectors (avoid long dropdown-style forms for primary selections).
- **FR-003**: The system MUST validate onboarding inputs and prevent continuation when required fields are missing or invalid.
- **FR-004**: The system MUST enforce an age minimum of 18 years old.
- **FR-005**: The system MUST allow users to save progress and resume onboarding.
- **FR-006**: The system MUST prevent users from accessing the discovery feed until required onboarding steps are complete.

#### Blind Discovery Feed

- **FR-010**: The system MUST provide a discovery feed with a vertical card stack interaction.
- **FR-011**: Each discovery card MUST display only text-first profile content: typography, “Vibe” tags, and answers to prompts.
- **FR-012**: Discovery cards MUST NOT display photos (neither clear nor blurred) anywhere on the card.
- **FR-013**: The system MUST provide two primary actions on discovery cards: Pass and Connect.
- **FR-014**: The system MUST compute compatibility/ranking server-side and MUST return results without exposing raw scores or scoring logic to clients.
- **FR-015**: When a user selects Connect, the system MUST record that intent. When two users have mutual Connect intent, the system MUST create a match and enable messaging.

#### Contextual Messaging (“Sparks”)

- **FR-020**: Matched users MUST be able to exchange messages in a 1:1 conversation.
- **FR-021**: The system MUST provide Spark suggestions (conversation starter buttons) derived from the partner’s profile tags and prompt answers.
- **FR-022**: The system MUST present multiple Spark options (at least 3) and SHOULD refresh or vary suggestions over time to avoid repetition.
- **FR-023**: Selecting a Spark MUST create a ready-to-send starter message (either sent immediately or placed into the composer for review).
- **FR-024**: When a user sends a chat message, the UI MUST show the message immediately and later reconcile it to an acknowledged “final” state (e.g., confirmed ID, timestamp, and delivery outcome).

#### Gamified “Secure Reveal”

- **FR-030**: Each match MUST have a Connection Level from 1 to 5.
- **FR-031**: Connection Level 1 MUST present the partner photo in a heavily blurred state; Connection Level 5 MUST present it as clear.
- **FR-032**: Connection Level progression MUST be automatic and based on (a) exchanged message count and (b) reciprocal participation.
- **FR-033**: Default progression thresholds MUST be:

  | Level | Visual State (Example) | Total Exchanged Messages | Minimum Sent by Each User |
  |------:|-------------------------|--------------------------:|---------------------------:|
  | 2     | Strong blur (~14px)     | 10                        | 3                          |
  | 3     | Medium blur (~8px)      | 25                        | 8                          |
  | 4     | Light blur (~4px)       | 45                        | 15                         |
  | 5     | Clear                   | 70                        | 25                         |

- **FR-034**: The system MUST display the current Connection Level and progress toward the next level.
- **FR-035**: The system MUST enforce media access server-side so users cannot access clearer photo variants before their Connection Level allows it.

#### Privacy & Data Minimization

- **FR-040**: Discovery feed content MUST NOT include personally identifiable information or direct contact details (e.g., email, phone number, exact address, external handles).
- **FR-041**: Location shown in discovery MUST be coarse (e.g., city/region), not an exact location.
- **FR-042**: The system MUST limit discovery responses to only what is required to render the discovery card UI (text-first content only).

### Key Entities *(include if feature involves data)*

- **User**: A person using Halo; has account identity and settings.
- **Profile**: The user’s presented identity used for discovery and matching (selected vibe attributes, tags, and prompt answers).
- **Vibe Attribute**: A structured attribute describing energy level/life pace used for discovery display and matching.
- **Value/Interest Tag**: A structured tag representing hobbies and values; used for matching and Sparks.
- **Prompt**: An open-ended question offered to users during onboarding.
- **Prompt Answer**: A user’s answer to a Prompt; shown in discovery cards and can influence Sparks.
- **Discovery Card**: The text-first representation of a candidate profile shown in the feed.
- **Connection Intent**: A record of a user’s Connect action toward another profile.
- **Match**: A mutual connection that unlocks messaging.
- **Conversation**: The 1:1 messaging thread associated with a Match.
- **Message**: A unit of chat content with sender, time, and delivery state.
- **Spark Suggestion**: A generated conversation starter tied to a specific tag or prompt answer.
- **Connection Level State**: The current level and progress metadata for a Match.
- **Photo Variant**: A version of a user’s photo intended for a specific connection level (from blurred to clear).

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: At least 70% of new users who start onboarding complete it within the same day.
- **SC-002**: The median time to complete the Values Onboarding wizard is under 6 minutes.
- **SC-003**: At least 60% of matches send a first message within 10 minutes of matching.
- **SC-004**: At least 50% of conversations that start reach Connection Level 2 within 24 hours.
- **SC-005**: In usability testing, at least 85% of users correctly understand that discovery is “blind” (no photos) and can identify the Pass vs Connect actions without assistance.

## Assumptions

- Users must be 18+.
- “Location” is collected and displayed as a coarse area (city/region), not precise coordinates.
- Secure Reveal applies after a match (in a match context), not in the discovery feed.

## Out of Scope (for this specification)

- Payments/subscriptions, ads, and monetization.
- Advanced moderation workflows (reporting, appeals, safety center), beyond basic privacy constraints listed above.
- Group chats or non-1:1 messaging.
