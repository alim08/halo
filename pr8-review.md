# PR review — original findings & current status

Validation: `go test ./...`, `go vet ./...`, `go build ./...`, and `tsc --noEmit` all pass.

## PR overview

Adds race/ethnicity self-identification + matching preferences and an age-range preference to onboarding. Introduces:

- New auth'd endpoint `GET /v1/profile/options` so the frontend gets allowed values from a single source.
- New profile-data validation: race/ethnicity arrays (with exclusive "Prefer not to say" / "Open to all"), age preferences (18–99, min ≤ max), coarse location length cap.
- New onboarding step (`AgeRacePreferenceStep`) inserted at step 4; total steps 8 → 9.
- Restore failure now surfaces a retry UI instead of silently failing.
- Centralizes `API_BASE` (used by `ws.ts` too); refactors duplicated age math into `ageInYears`.
- Backend tests for handler + validation; no frontend tests.

Plus: **location normalization** — typed input no longer leaks raw ZIPs into `coarse_location`; only suggestion-derived "City, State" values get persisted, with a backend backstop.

---

## ✅ Fixed in this session

### 🔴 → ✅ Resume logic skipped the new step 4

**Original problem:** `useOnboarding.ts` defaulted `age_pref_min`/`max` to 18/99 and `race_ethnicity_preferences` to `["Open to all"]` even when the server hadn't persisted them. `computeResumeStep` saw those defaults as "completed" and jumped returning users from step 3 straight to step 5, never showing the new screen. Final submit would then fail validation server-side, trapping the user.

**Fix:** `frontend/src/components/onboarding/useOnboarding.ts`

```ts
// Sentinel 0 in INITIAL_STATE means "not yet persisted"; the AgeRace step
// seeds 18/99 locally when the user opens it.
age_pref_min: 0,
age_pref_max: 0,
race_ethnicity_preferences: [],
```

Restore no longer fills `race_ethnicity_preferences` from `defaultRaceEthnicityPreferences`. The `AgeRacePreferenceStep` component still seeds the UI with sensible defaults (`agePrefMin || 18`, `raceEthnicityPreferenceDefault` when empty), so the user sees "18–99" and "Open to all" pre-selected — they just have to confirm them instead of skipping the step entirely.

### 🟡 → ✅ Coarse location validated by bytes, not runes

**Original problem:** `len(coarseLocation) > 200` measures bytes. "São Paulo, Brazil" or "東京都" use multi-byte runes, so the effective limit dropped well below 200 user-visible characters.

**Fix:** `backend/internal/service/profile_validation.go`

```go
import "unicode/utf8"

if utf8.RuneCountInString(coarseLocation) > 200 { ... }
```

New tests: `200 multi-byte runes passes`, `201 multi-byte runes rejects`.

### 🟡 → ✅ Options fetch was gating the entire wizard

**Original problem:** `Promise.all([api.me.get(), api.me.getProfileOptions()])` made a transient 5xx on `/v1/profile/options` (static reference data) block onboarding behind the "Try again" screen, indistinguishable from a real auth failure.

**Fix:** `frontend/src/components/onboarding/useOnboarding.ts`

```ts
const mePromise = api.me.get();
const optionsPromise = api.me.getProfileOptions().catch((err: unknown) => {
  console.warn("[Onboarding] profile options fetch failed, using fallback:", err);
  return null;
});
const [me, options] = await Promise.all([mePromise, optionsPromise]);
```

A new `FALLBACK_PROFILE_OPTIONS` constant mirrors the server's allowed values so the wizard stays usable. Backend remains the source of truth — it still validates on `PUT /v1/me/profile`.

### 🆕 Location normalization

**Problem:** typed input like `33004` could bypass the autocomplete dropdown and get persisted verbatim as a user's `coarse_location`.

**Frontend** (`OnboardingWizard.tsx`):

- Separated typed-input state (`locationSearch`) from the persisted value (`loc`). Typing only mutates `locationSearch`; `loc` is set **only** by `selectLocation()` or `useCurrentLocation()`.
- Editing after selecting clears `loc`, forcing re-confirmation.
- On **Continue**: if `loc` is empty but `locationSuggestions` has results, auto-pick the top (so `33004` → `Dania Beach, FL`). If suggestions are still loading, ask the user to wait. If no suggestions exist, block.

**Backend** (`profile_validation.go`):

- Defense-in-depth: reject bare ZIPs (`^\d{5}(-\d{4})?$`) so a client bypassing the UI can't store unnormalized input. `"Dania Beach, FL 33004"` still passes (anchored regex).
- 4 new test cases covering bare ZIP, ZIP+4, whitespace-padded ZIP, and a city display containing a ZIP-like substring.

| Input the user types | What gets saved |
|---|---|
| `33004` + clicks "Dania Beach, FL" | `Dania Beach, FL` |
| `33004` + Continue without clicking | `Dania Beach, FL` (auto-picked) |
| `33004` + Continue while loading | blocked, "give it a moment" |
| Free text with no matches | blocked, "pick a city from the suggestions" |
| Direct API call with `"33004"` | server returns 400 |

---

## Still solid (no change needed)

- **Backend validation rigor** — exclusive options correctly reject mixing, 20-item array cap, age pairs validated together.
- **Test coverage** for the validation surface: leap-year edge, exclusive-option conflicts, missing-pair age prefs, onboarding-complete gating. Extended with rune-count and ZIP cases.
- **`GET /v1/profile/options`** — single source of truth for allowed values; eliminates Go/TS string drift.
- **`API_BASE` consolidation** in `api.ts` and `ws.ts`; production-empty-string + `window.location.origin` fallback works behind a same-origin proxy.
- **`mergeJSON`** now logs parse failures via `slog.Warn` instead of swallowing them silently.

---

## 🟢 Still open — lower priority

### 1. Package-level mutable `now` in tests

`profile_validation.go:39` — `var now = time.Now` is reassigned by `TestValidateBirthdate` with `defer` rather than `t.Cleanup`. Tests in this file can never `t.Parallel()`; a panic mid-table leaves `now` corrupted for sibling tests. Cleaner path: pass the clock as an argument.

### 2. Verbose `console.log` in production paths

`useOnboarding.ts:208, 222, 228, 239` — `[Onboarding] Sending profile update`, `[Onboarding] ✅ Complete!`, etc. fire on every save. Either gate on `NODE_ENV !== "production"` or remove.

### 3. `getAge` returning `-1` for invalid date

`OnboardingWizard.tsx:1646-1660` — good defensive change, but worth confirming no caller does sign-sensitive math.

### 4. Whitespace-only diff noise

`router.go:42` (rate-limiter comment alignment) and `chat_service.go:140-145` (gofmt re-align of `MatchSummary`). Harmless, just noise in the diff.

---

## Recommendation

The blocking issues from the original review are all resolved. Clean merge against `main` (no conflicts). Ready to merge once the 🟢 follow-ups are triaged.
