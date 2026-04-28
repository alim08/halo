"use client";

import { useState, useEffect } from "react";
import { useOnboarding } from "./useOnboarding";

// -- Color tokens --
const C = {
  primary: "#9500cb",
  primaryContainer: "#b914f9",
  surface: "#fff7fb",
  onSurface: "#211824",
  outlineVariant: "#d4c0d7",
  surfaceContainer: "#f9e9fa",
  onSurfaceVariant: "#504254",
  surfaceContainerLowest: "#ffffff",
} as const;

// -- Step definitions --

const PERSONALITY_VIBE_OPTIONS = [
  { key: "energy_level", label: "Energy Level", options: ["Chill", "Moderate", "High Energy"] },
  { key: "life_pace", label: "Life Pace", options: ["Slow & Steady", "Balanced", "Fast-Paced"] },
  { key: "social_style", label: "Social Style", options: ["Homebody", "Ambivert", "Social Butterfly"] },
  { key: "dating_energy", label: "Dating Energy", options: ["Casual & exploring", "Looking actively", "Very intentional"] },
];

const RELATIONSHIP_INTENTIONS_OPTIONS = [
  "Long-term partner",
  "Casual dating",
  "Short-term connection",
  "Open to exploring",
  "Marriage-minded",
  "Still figuring it out",
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
    category: "Fitness Habits",
    key: "fitness",
    options: ["Never", "1-2x/week", "3-4x/week", "Daily"],
  },
  {
    category: "Pets",
    key: "pets",
    options: ["Don't have", "Have dog", "Have cat", "Have other", "Want pets"],
  },
  {
    category: "Sleep Schedule",
    key: "sleep_schedule",
    options: ["Early bird", "Night owl", "Flexible"],
  },
  {
    category: "Diet",
    key: "diet",
    options: ["Omnivore", "Vegetarian", "Vegan", "Pescatarian"],
  },
  {
    category: "Wants Kids",
    key: "wants_kids",
    options: ["Yes", "No", "Maybe", "Already have kids", "Prefer not to say"],
  },
];

const CONNECTION_STYLE_OPTIONS = [
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
    id: "affection_level",
    label: "Affection Level",
    options: ["Reserved", "Moderate", "Very Affectionate"],
  },
  {
    id: "conflict_style",
    label: "Conflict Style",
    options: ["Address it directly", "Need time to think", "Talk it out calmly", "Avoid conflict"],
  },
  {
    id: "emotional_openness",
    label: "Emotional Openness",
    options: ["Very open", "Moderately open", "Reserved", "Prefer to process alone"],
  },
  {
    id: "relationship_pace",
    label: "Relationship Pace",
    options: ["Take it slow", "Go with the flow", "Move quickly"],
  },
];

const INTERESTS_OPTIONS = [
  {
    category: "Fitness",
    interests: ["Gym", "Yoga", "Running", "Team Sports", "Hiking", "Swimming", "Cycling", "Pilates"],
  },
  {
    category: "Food",
    interests: ["Cooking", "Foodie", "Wine", "Coffee", "Baking", "Vegan/Vegetarian", "Farmer's Markets"],
  },
  {
    category: "Entertainment",
    interests: ["Movies", "Gaming", "Books", "Podcasts", "TV Shows", "Comedy", "Live Music", "Theater"],
  },
  {
    category: "Learning",
    interests: ["Museums", "History", "Languages", "Philosophy", "Science", "Tech", "Podcasts", "Documentaries"],
  },
  {
    category: "Travel",
    interests: ["Travel", "Camping", "Beach", "Mountains", "Road trips", "International travel", "Backpacking"],
  },
  {
    category: "Creative",
    interests: ["Painting", "Music", "Photography", "Writing", "Dancing", "Art", "Design", "Crafts"],
  },
];

const PROMPT_QUESTIONS = [
  { id: "p1", question: "Dating me is like…" },
  { id: "p2", question: "A green flag I look for is…" },
  { id: "p3", question: "Sunday mornings are for…" },
  { id: "p4", question: "Teach me something about…" },
];

// -- Nav Header --

function NavHeader({
  step,
  totalSteps,
  saving,
  onSaveExit,
}: {
  step: number;
  totalSteps: number;
  saving: boolean;
  onSaveExit: () => void;
}) {
  const progress = ((step + 1) / totalSteps) * 100;

  return (
    <header
      className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-6 py-3 border-b"
      style={{
        backgroundColor: "rgba(255, 255, 255, 0.9)",
        backdropFilter: "blur(12px)",
        WebkitBackdropFilter: "blur(12px)",
        borderColor: C.outlineVariant,
      }}
    >
      {/* Left: Logo */}
      <span className="text-2xl font-black" style={{ color: "#7c3aed" }}>
        Halo
      </span>

      {/* Center: Step indicator + progress bar */}
      <div className="flex flex-col items-center gap-1">
        <span className="text-xs font-medium" style={{ color: C.onSurfaceVariant }}>
          Step {step + 1} of {totalSteps}
        </span>
        <div className="w-32 h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: C.outlineVariant }}>
          <div
            className="h-full rounded-full transition-all duration-300"
            style={{
              width: `${progress}%`,
              background: `linear-gradient(to right, ${C.primary}, ${C.primaryContainer})`,
            }}
          />
        </div>
      </div>

      {/* Right: Save & Exit */}
      <button
        onClick={onSaveExit}
        disabled={saving}
        className="px-4 py-2 text-sm font-semibold text-white rounded-xl transition-opacity hover:opacity-90 disabled:opacity-50"
        style={{ backgroundColor: C.primary }}
      >
        {saving ? "Saving..." : "Save & Exit"}
      </button>
    </header>
  );
}

// -- Main component --

export function OnboardingWizard() {
  const {
    state,
    step,
    loading,
    saving,
    error,
    nextStep,
    prevStep,
    saveProgress,
    totalSteps,
  } = useOnboarding();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div
          className="h-10 w-10 animate-spin rounded-full border-4 border-t-transparent"
          style={{ borderColor: `${C.primary} transparent ${C.primary} ${C.primary}` }}
        />
      </div>
    );
  }

  return (
    <>
      <NavHeader
        step={step}
        totalSteps={totalSteps}
        saving={saving}
        onSaveExit={() => saveProgress({})}
      />

      {/* Main content area below fixed nav */}
      <div className="pt-20 min-h-screen">
        {error && (
          <div className="mx-auto max-w-3xl px-6 pt-4">
            <div className="rounded-2xl bg-red-50 border border-red-200 p-4 text-sm text-red-700">
              {error}
            </div>
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
          <BasicsProfileStep
            gender={state.gender}
            sexual_profile={state.sexual_profile}
            interested_in={state.interested_in}
            onNext={(gender, sexual_profile, interested_in) =>
              nextStep({ gender, sexual_profile, interested_in })
            }
            onBack={prevStep}
            saving={saving}
          />
        )}

        {step === 2 && (
          <PersonalityVibeStep
            vibe={state.vibe}
            onNext={(vibe) => nextStep({ vibe })}
            onBack={prevStep}
            saving={saving}
          />
        )}

        {step === 3 && (
          <RelationshipIntentionsStep
            intentions={state.relationship_intentions}
            onNext={(relationship_intentions) =>
              nextStep({ relationship_intentions })
            }
            onBack={prevStep}
            saving={saving}
          />
        )}

        {step === 4 && (
          <LifestyleStep
            lifestyle={state.lifestyle_habits}
            onNext={(lifestyle_habits) =>
              nextStep({ lifestyle_habits })
            }
            onBack={prevStep}
            saving={saving}
          />
        )}

        {step === 5 && (
          <ConnectionStyleStep
            connectionStyle={state.connection_style}
            onNext={(connection_style) =>
              nextStep({ connection_style })
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
            bio={state.bio}
            prompts={state.prompts}
            onNext={(bio, prompts) => nextStep({ bio, prompts })}
            onBack={prevStep}
            saving={saving}
          />
        )}
      </div>
    </>
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
  const [initialYear, initialMonth, initialDay] = birthdate
    ? (() => {
        const parts = birthdate.split("-");
        if (parts.length !== 3) return [0, 0, 0];

        const [yearPart, monthPart, dayPart] = parts.map(Number);
        if (
          !Number.isInteger(yearPart) ||
          !Number.isInteger(monthPart) ||
          !Number.isInteger(dayPart)
        ) {
          return [0, 0, 0];
        }

        return [yearPart, monthPart, dayPart];
      })()
    : [0, 0, 0];

  const [month, setMonth] = useState(initialMonth);
  const [day, setDay] = useState(initialDay);
  const [year, setYear] = useState(initialYear);
  
  const [loc, setLoc] = useState(location);
  const [locationSearch, setLocationSearch] = useState(location);
  const [locationSuggestions, setLocationSuggestions] = useState<LocationSuggestion[]>([]);
  const [showLocationDropdown, setShowLocationDropdown] = useState(false);
  const [locationLoading, setLocationLoading] = useState(false);
  const [locationError, setLocationError] = useState("");
  const [geolocationLoading, setGeolocationLoading] = useState(false);
  
  const [localError, setLocalError] = useState("");

  useEffect(() => {
    if (!showLocationDropdown) return;

    const trimmed = locationSearch.trim();

    if (trimmed.length < 2) {
      setLocationSuggestions([]);
      setLocationLoading(false);
      return;
    }

    const timeout = setTimeout(() => {
      searchLocations(trimmed);
    }, 300);

    return () => clearTimeout(timeout);
  }, [locationSearch, showLocationDropdown]);

  // Debounced location search
  const searchLocations = async (query: string) => {
    if (query.length < 2) {
      setLocationSuggestions([]);
      return;
    }

    setLocationLoading(true);
    setLocationError("");
    try {
      const apiBase = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080";
      const response = await fetch(`${apiBase}/v1/locations/search?q=${encodeURIComponent(query)}`);

      if (!response.ok) {
        const text = await response.text();
        throw new Error(`Failed to fetch locations: ${response.status} ${text}`);
    }
      
      const data = (await response.json()) as LocationSuggestion[] | null;
      setLocationSuggestions(data || []);
    } catch (err) {
      setLocationError("Unable to search locations. Please try again.");
      console.error(err);
    } finally {
      setLocationLoading(false);
    }
  };

  const handleLocationInputChange = (value: string) => {
    setLoc(value);
    setLocationSearch(value);
    setLocationError("");
    setShowLocationDropdown(true);
  };

  const selectLocation = (suggestion: LocationSuggestion) => {
    setLoc(suggestion.display);
    setLocationSearch(suggestion.display);
    setLocationSuggestions([]);
    setShowLocationDropdown(false);
  };

  const useCurrentLocation = async () => {
    setGeolocationLoading(true);
    setLocationError("");
    
    if (!navigator.geolocation) {
      setLocationError("Geolocation is not supported by your browser");
      setGeolocationLoading(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          const { latitude, longitude } = position.coords;
          const apiBase = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080";
          const response = await fetch(`${apiBase}/v1/locations/reverse-geocode?lat=${latitude}&lon=${longitude}`);

          if (!response.ok) {
            const text = await response.text();
            throw new Error(`Failed to fetch location name: ${response.status} ${text}`);
          }
          
          const data = (await response.json()) as ReverseGeocodeResult;
          
          setLoc(data.display);
          setLocationSearch(data.display);
          setLocationSuggestions([]);
          setShowLocationDropdown(false);
        } catch (err) {
          setLocationError("Could not determine your location. Please try manually entering it.");
          console.error(err);
        } finally {
          setGeolocationLoading(false);
        }
      },
      (error) => {
        if (error.code === error.PERMISSION_DENIED) {
          setLocationError("Location permission denied. Please enter your location manually.");
        } else {
          setLocationError("Could not access your location. Please enter it manually.");
        }
        setGeolocationLoading(false);
      }
    );
  };

  const getBirthdateString = (): string => {
    if (!month || !day || !year) return "";
    return `${String(year).padStart(4, "0")}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
  };

  const getDaysInMonth = (m: number, y: number): number => {
    return new Date(y, m, 0).getDate();
  };

  const isValidDate = (m: number, d: number, y: number): boolean => {
    if (!m || !d || !y) return false;
    if (d > getDaysInMonth(m, y)) return false;
    if (m < 1 || m > 12) return false;
    return true;
  };

  function handleNext() {
    const bdStr = getBirthdateString();
    
    if (!month || !day || !year) {
      setLocalError("Please enter your complete birthdate");
      return;
    }

    if (!isValidDate(month, day, year)) {
      setLocalError("Please enter a valid date");
      return;
    }

    if (!loc.trim()) {
      setLocalError("Location is required");
      return;
    }

    const age = getAge(bdStr);
    if (age < 18) {
      setLocalError("You must be at least 18 years old");
      return;
    }
    setLocalError("");
    onNext(bdStr, loc.trim());
  }

  const currentYear = new Date().getFullYear();
  const minYear = currentYear - 100;
  const maxYear = currentYear - 18;

  return (
    <div className="grid grid-cols-12 gap-8 max-w-6xl mx-auto px-6 py-10">
      {/* Left content */}
      <div className="col-span-12 lg:col-span-8 space-y-8">
        <div>
          <h2 className="text-3xl font-bold" style={{ color: C.onSurface }}>
            Let&apos;s get the basics
          </h2>
          <p className="mt-2 text-base" style={{ color: C.onSurfaceVariant }}>
            We need a few things to get started.
          </p>
        </div>

        {localError && (
          <div className="rounded-2xl bg-red-50 border border-red-200 p-4 text-sm text-red-700">
            {localError}
          </div>
        )}

        <div className="max-w-md space-y-6">
          {/* Birthdate Selector */}
          <div>
            <label className="mb-1.5 block text-sm font-medium" style={{ color: C.onSurfaceVariant }}>
              When were you born?
            </label>
            <div className="flex gap-2">
              <select
                value={month}
                onChange={(e) => setMonth(Number(e.target.value))}
                className="flex-1 rounded-xl px-3 py-3 text-sm outline-none transition-all focus:ring-2 appearance-none cursor-pointer"
                style={{ backgroundColor: C.surfaceContainer, color: C.onSurface }}
              >
                <option value={0}>Month</option>
                {Array.from({ length: 12 }).map((_, i) => (
                  <option key={i + 1} value={i + 1}>
                    {new Date(2000, i).toLocaleDateString("en-US", { month: "short" })}
                  </option>
                ))}
              </select>
              <select
                value={day}
                onChange={(e) => setDay(Number(e.target.value))}
                className="flex-1 rounded-xl px-3 py-3 text-sm outline-none transition-all focus:ring-2 appearance-none cursor-pointer"
                style={{ backgroundColor: C.surfaceContainer, color: C.onSurface }}
              >
                <option value={0}>Day</option>
                {Array.from({ length: 31 }).map((_, i) => (
                  <option key={i + 1} value={i + 1}>
                    {String(i + 1).padStart(2, "0")}
                  </option>
                ))}
              </select>
              <select
                value={year}
                onChange={(e) => setYear(Number(e.target.value))}
                className="flex-1 rounded-xl px-3 py-3 text-sm outline-none transition-all focus:ring-2 appearance-none cursor-pointer"
                style={{ backgroundColor: C.surfaceContainer, color: C.onSurface }}
              >
                <option value={0}>Year</option>
                {Array.from({ length: maxYear - minYear + 1 }).map((_, i) => {
                  const y = maxYear - i;
                  return <option key={y} value={y}>{y}</option>;
                })}
              </select>
            </div>
            <p className="mt-1 text-xs" style={{ color: C.onSurfaceVariant }}>
              {month && day && year && isValidDate(month, day, year)
                ? `Age: ${getAge(getBirthdateString())}`
                : "Must be 18+"}
            </p>
          </div>

          {/* Location Autocomplete */}
          <div className="relative z-10">
            <label className="mb-1.5 block text-sm font-medium" style={{ color: C.onSurfaceVariant }}>
              Where are you located?
            </label>
            <div className="relative">
              <input
                type="text"
                value={locationSearch}
                onChange={(e) => handleLocationInputChange(e.target.value)}
                onFocus={() => setShowLocationDropdown(true)}
                onKeyDown={(e) => { if (e.key === "Escape") setShowLocationDropdown(false); }}
                placeholder="Search city, state, or ZIP code"
                className="block w-full rounded-xl px-4 py-3 text-base outline-none transition-all focus:ring-2"
                style={{ backgroundColor: C.surfaceContainer, color: C.onSurface }}
              />
              {showLocationDropdown && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-white border rounded-xl shadow-lg max-h-64 overflow-y-auto z-50" style={{ borderColor: C.outlineVariant }}>
                  {locationLoading ? (
                    <div className="px-4 py-3 text-center text-sm" style={{ color: C.onSurfaceVariant }}>
                      <span className="inline-block animate-spin">⟳</span> Searching...
                    </div>
                  ) : locationError ? (
                    <div className="px-4 py-3 text-sm text-red-600">{locationError}</div>
                  ) : locationSuggestions.length > 0 ? (
                    locationSuggestions.map((suggestion) => (
                      <button
                        key={`${suggestion.lat}-${suggestion.lon}-${suggestion.display}`}
                        onClick={() => selectLocation(suggestion)}
                        className="w-full px-4 py-2.5 text-left text-sm border-b last:border-0 transition-colors hover:opacity-80"
                        style={{ borderColor: C.outlineVariant, color: C.onSurface }}
                      >
                        {suggestion.display}
                      </button>
                    ))
                  ) : locationSearch.length > 1 ? (
                    <div className="px-4 py-3 text-sm text-center" style={{ color: C.onSurfaceVariant }}>No locations found</div>
                  ) : (
                    <div className="px-4 py-3 text-sm text-center" style={{ color: C.onSurfaceVariant }}>Start typing to search</div>
                  )}
                  <div className="border-t p-2" style={{ borderColor: C.outlineVariant }}>
                    <button
                      onClick={useCurrentLocation}
                      disabled={geolocationLoading}
                      className="w-full px-3 py-2 text-sm font-medium rounded-lg transition-colors disabled:opacity-50 flex items-center justify-center gap-2 hover:opacity-80"
                      style={{ color: C.primary }}
                    >
                      {geolocationLoading ? <><span className="inline-block animate-spin">⟳</span> Detecting...</> : <>📍 Use my current location</>}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          <button
            onClick={handleNext}
            disabled={saving}
            className="w-full rounded-xl px-6 py-3.5 text-base font-semibold text-white transition-all hover:opacity-90 active:scale-[0.99] disabled:opacity-50"
            style={{ background: `linear-gradient(to right, ${C.primary}, ${C.primaryContainer})` }}
          >
            {saving ? "Saving..." : "Continue"}
          </button>
        </div>
      </div>

      {/* Right sidebar */}
      <div className="hidden lg:flex col-span-4 flex-col gap-6">
        <div className="rounded-3xl border p-6" style={{ backgroundColor: C.surfaceContainer, borderColor: C.outlineVariant }}>
          <div className="flex items-center gap-2 mb-3">
            <span className="material-symbols-outlined text-xl" style={{ color: C.primary }}>info</span>
            <span className="font-semibold text-sm" style={{ color: C.onSurface }}>Why this matters</span>
          </div>
          <p className="text-sm leading-relaxed" style={{ color: C.onSurfaceVariant }}>
            Your birthdate helps us ensure a safe community for adults. Your location helps us find people near you.
          </p>
        </div>
        <div className="rounded-3xl p-6" style={{ backgroundColor: C.onSurface }}>
          <h3 className="text-sm font-semibold text-white/60 mb-3">Your Profile</h3>
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-lg text-white/40">cake</span>
              <span className="text-sm text-white/80">{getBirthdateString() || "Not set"}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-lg text-white/40">location_on</span>
              <span className="text-sm text-white/80">{loc || "Not set"}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Location Autocomplete Types ──

interface LocationSuggestion {
  id: string;
  display: string;
  lat: string;
  lon: string;
}

interface ReverseGeocodeResult {
  display: string;
}

// ── Step 1: Basics Profile (Gender, Sexual orientation, Who interested in) ──

function BasicsProfileStep({
  gender,
  sexual_profile,
  interested_in,
  onNext,
  onBack,
  saving,
}: {
  gender: string;
  sexual_profile: string;
  interested_in: string[];
  onNext: (gender: string, sexual_profile: string, interested_in: string[]) => void;
  onBack: () => void;
  saving: boolean;
}) {
  const [genderValue, setGenderValue] = useState(gender);
  const [sexualProfileValue, setSexualProfileValue] = useState(sexual_profile);
  const [selectedInterests, setSelectedInterests] = useState<string[]>(interested_in);

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
  const interestedInOptions = ["Man", "Woman", "Non-binary"];

  function toggleInterestedIn(option: string) {
    setSelectedInterests((prev) => {
      if (prev.includes(option)) {
        return prev.filter((o) => o !== option);
      }
      return [...prev, option];
    });
  }

  function handleNext() {
    onNext(genderValue, sexualProfileValue, selectedInterests);
  }

  const allSelected = genderValue && sexualProfileValue && selectedInterests.length > 0;

  return (
    <div className="grid grid-cols-12 gap-8 max-w-6xl mx-auto px-6 py-10">
      <div className="col-span-12 lg:col-span-8 space-y-8">
        <div>
          <h2 className="text-3xl font-bold" style={{ color: C.onSurface }}>Let&apos;s get to know you</h2>
          <p className="mt-2 text-base" style={{ color: C.onSurfaceVariant }}>This helps us make better matches for you.</p>
        </div>

        <div className="space-y-6">
          <div>
            <p className="text-sm font-semibold mb-3" style={{ color: C.onSurface }}>What&apos;s your gender?</p>
            <div className="flex flex-wrap gap-3">
              {genderOptions.map((opt) => {
                const isActive = genderValue === opt;
                return (
                  <button key={opt} onClick={() => setGenderValue(opt)}
                    className="rounded-2xl px-5 py-3 text-sm font-medium border-2 transition-all"
                    style={{ borderColor: isActive ? C.primary : C.outlineVariant, backgroundColor: isActive ? C.primary : C.surfaceContainerLowest, color: isActive ? "#fff" : C.onSurfaceVariant }}>
                    {isActive && <span className="material-symbols-outlined text-sm mr-1 align-middle">check_circle</span>}
                    {opt}
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <p className="text-sm font-semibold mb-3" style={{ color: C.onSurface }}>Sexual orientation</p>
            <div className="flex flex-wrap gap-3">
              {sexualProfileOptions.map((opt) => {
                const isActive = sexualProfileValue === opt;
                return (
                  <button key={opt} onClick={() => setSexualProfileValue(opt)}
                    className="rounded-2xl px-5 py-3 text-sm font-medium border-2 transition-all"
                    style={{ borderColor: isActive ? C.primary : C.outlineVariant, backgroundColor: isActive ? C.primary : C.surfaceContainerLowest, color: isActive ? "#fff" : C.onSurfaceVariant }}>
                    {isActive && <span className="material-symbols-outlined text-sm mr-1 align-middle">check_circle</span>}
                    {opt}
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <p className="text-sm font-semibold mb-1" style={{ color: C.onSurface }}>Who are you interested in?</p>
            <p className="text-xs mb-3" style={{ color: C.onSurfaceVariant }}>Select all that apply</p>
            <div className="flex flex-wrap gap-3">
              {interestedInOptions.map((option) => {
                const isActive = selectedInterests.includes(option);
                return (
                  <button key={option} onClick={() => toggleInterestedIn(option)}
                    className="rounded-2xl px-5 py-3 text-sm font-medium border-2 transition-all"
                    style={{ borderColor: isActive ? C.primary : C.outlineVariant, backgroundColor: isActive ? C.primary : C.surfaceContainerLowest, color: isActive ? "#fff" : C.onSurfaceVariant }}>
                    {isActive && <span className="material-symbols-outlined text-sm mr-1 align-middle">check_circle</span>}
                    {option}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        <div className="flex gap-3 max-w-md">
          <button onClick={onBack} className="flex-1 rounded-xl px-6 py-3.5 font-semibold border-2 transition-all hover:opacity-80" style={{ borderColor: C.outlineVariant, color: C.onSurface, backgroundColor: C.surfaceContainerLowest }}>Back</button>
          <button onClick={handleNext} disabled={!allSelected || saving} className="flex-1 rounded-xl px-6 py-3.5 font-semibold text-white transition-all hover:opacity-90 active:scale-[0.99] disabled:opacity-50" style={{ background: `linear-gradient(to right, ${C.primary}, ${C.primaryContainer})` }}>
            {saving ? "Saving..." : "Continue"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Step 2: Personality & Vibe ──────────────────────────

function PersonalityVibeStep({
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
  const allSelected = PERSONALITY_VIBE_OPTIONS.every((v) => selected[v.key]);

  const vibeIcons: Record<string, string> = {
    energy_level: "bolt",
    life_pace: "speed",
    social_style: "groups",
    dating_energy: "favorite",
  };

  return (
    <div className="grid grid-cols-12 gap-8 max-w-6xl mx-auto px-6 py-10">
      <div className="col-span-12 lg:col-span-8 space-y-8">
        <div>
          <h2 className="text-3xl font-bold" style={{ color: C.onSurface }}>What&apos;s your vibe?</h2>
          <p className="mt-2 text-base" style={{ color: C.onSurfaceVariant }}>Pick what best describes you in each category.</p>
        </div>

        <div className="space-y-6">
          {PERSONALITY_VIBE_OPTIONS.map((group) => (
            <div key={group.key}>
              <div className="flex items-center gap-2 mb-3">
                <span className="material-symbols-outlined text-xl" style={{ color: C.primary }}>{vibeIcons[group.key] ?? "circle"}</span>
                <p className="text-sm font-semibold" style={{ color: C.onSurface }}>{group.label}</p>
              </div>
              <div className="flex flex-wrap gap-3">
                {group.options.map((opt) => {
                  const isActive = selected[group.key] === opt;
                  return (
                    <button
                      key={opt}
                      onClick={() => setSelected((s) => ({ ...s, [group.key]: opt }))}
                      className="rounded-2xl px-5 py-3 text-sm font-medium border-2 transition-all"
                      style={{
                        borderColor: isActive ? C.primary : C.outlineVariant,
                        backgroundColor: isActive ? `${C.primaryContainer}10` : C.surfaceContainerLowest,
                        color: isActive ? C.primary : C.onSurfaceVariant,
                      }}
                    >
                      {isActive && <span className="material-symbols-outlined text-sm mr-1 align-middle" style={{ color: C.primary }}>check_circle</span>}
                      {opt}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        <div className="flex gap-3 pt-4 max-w-md">
          <button onClick={onBack} className="flex-1 rounded-xl px-6 py-3.5 font-semibold border-2 transition-all hover:opacity-80" style={{ borderColor: C.outlineVariant, color: C.onSurface, backgroundColor: C.surfaceContainerLowest }}>Back</button>
          <button onClick={() => onNext(selected)} disabled={!allSelected || saving} className="flex-1 rounded-xl px-6 py-3.5 font-semibold text-white transition-all hover:opacity-90 active:scale-[0.99] disabled:opacity-50" style={{ background: `linear-gradient(to right, ${C.primary}, ${C.primaryContainer})` }}>
            {saving ? "Saving..." : "Continue"}
          </button>
        </div>
      </div>

      <div className="hidden lg:flex col-span-4 flex-col gap-6">
        <div className="rounded-3xl border p-6" style={{ backgroundColor: C.surfaceContainer, borderColor: C.outlineVariant }}>
          <div className="flex items-center gap-2 mb-3">
            <span className="material-symbols-outlined text-xl" style={{ color: C.primary }}>info</span>
            <span className="font-semibold text-sm" style={{ color: C.onSurface }}>Why this matters</span>
          </div>
          <p className="text-sm leading-relaxed" style={{ color: C.onSurfaceVariant }}>Your vibe helps us match you with people who share your energy and lifestyle. Compatible vibes lead to stronger connections.</p>
        </div>
        <div className="rounded-3xl p-6" style={{ backgroundColor: C.onSurface }}>
          <h3 className="text-sm font-semibold text-white/60 mb-3">Your Profile</h3>
          <div className="space-y-2">
            {PERSONALITY_VIBE_OPTIONS.map((group) => (
              <div key={group.key} className="flex items-center gap-2">
                <span className="material-symbols-outlined text-lg text-white/40">{vibeIcons[group.key] ?? "circle"}</span>
                <span className="text-sm text-white/80">{selected[group.key] || "Not selected"}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Step 3: Relationship Intentions ───────────────────

function RelationshipIntentionsStep({
  intentions,
  onNext,
  onBack,
  saving,
}: {
  intentions: string[];
  onNext: (intentions: string[]) => void;
  onBack: () => void;
  saving: boolean;
}) {
  const [selected, setSelected] = useState<string[]>(intentions);

  function toggle(option: string) {
    setSelected((prev) =>
      prev.includes(option) ? prev.filter((o) => o !== option) : [...prev, option]
    );
  }

  return (
    <div className="grid grid-cols-12 gap-8 max-w-6xl mx-auto px-6 py-10">
      <div className="col-span-12 lg:col-span-8 space-y-6">
        <div>
          <h2 className="text-3xl font-bold" style={{ color: C.onSurface }}>What are you looking for?</h2>
          <p className="mt-2 text-base" style={{ color: C.onSurfaceVariant }}>Select all that apply. You can change this anytime.</p>
        </div>

        <div className="space-y-3">
          {RELATIONSHIP_INTENTIONS_OPTIONS.map((option) => {
            const isSelected = selected.includes(option);
            return (
              <button
                key={option}
                onClick={() => toggle(option)}
                className="w-full rounded-2xl px-5 py-4 text-left font-medium border-2 transition-all flex items-center gap-3"
                style={{
                  borderColor: isSelected ? C.primary : C.outlineVariant,
                  backgroundColor: isSelected ? `${C.primaryContainer}1a` : C.surfaceContainerLowest,
                  color: isSelected ? C.primary : C.onSurface,
                }}
              >
                <span
                  className="flex h-5 w-5 shrink-0 items-center justify-center rounded-md border-2 transition-all"
                  style={{
                    borderColor: isSelected ? C.primary : C.outlineVariant,
                    backgroundColor: isSelected ? C.primary : "transparent",
                  }}
                >
                  {isSelected && <span className="material-symbols-outlined text-sm text-white">check</span>}
                </span>
                {option}
              </button>
            );
          })}
        </div>

        <div className="flex gap-3 pt-2 max-w-md">
          <button onClick={onBack} className="flex-1 rounded-xl px-6 py-3.5 font-semibold border-2 transition-all hover:opacity-80" style={{ borderColor: C.outlineVariant, color: C.onSurface, backgroundColor: C.surfaceContainerLowest }}>Back</button>
          <button onClick={() => onNext(selected)} disabled={selected.length === 0 || saving} className="flex-1 rounded-xl px-6 py-3.5 font-semibold text-white transition-all hover:opacity-90 active:scale-[0.99] disabled:opacity-50" style={{ background: `linear-gradient(to right, ${C.primary}, ${C.primaryContainer})` }}>
            {saving ? "Saving..." : "Continue"}
          </button>
        </div>
      </div>

      <div className="hidden lg:flex col-span-4 flex-col gap-6">
        <div className="rounded-3xl border p-6" style={{ backgroundColor: C.surfaceContainer, borderColor: C.outlineVariant }}>
          <div className="flex items-center gap-2 mb-3">
            <span className="material-symbols-outlined text-xl" style={{ color: C.primary }}>info</span>
            <span className="font-semibold text-sm" style={{ color: C.onSurface }}>Why this matters</span>
          </div>
          <p className="text-sm leading-relaxed" style={{ color: C.onSurfaceVariant }}>Being clear about your intentions helps you connect with people who want the same things.</p>
        </div>
        <div className="rounded-3xl p-6" style={{ backgroundColor: C.onSurface }}>
          <h3 className="text-sm font-semibold text-white/60 mb-3">Your Profile</h3>
          {selected.length === 0 ? (
            <p className="text-sm text-white/40">Nothing selected yet</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {selected.map((s) => (
                <span key={s} className="inline-flex rounded-full px-3 py-1 text-xs font-medium" style={{ backgroundColor: `${C.primaryContainer}33`, color: "#e0b0ff" }}>{s}</span>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Step 4: Lifestyle ─────────────────────────────────────



function LifestyleStep({
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
    <div className="grid grid-cols-12 gap-8 max-w-6xl mx-auto px-6 py-10">
      <div className="col-span-12 lg:col-span-8 space-y-8">
        <div>
          <h2 className="text-3xl font-bold" style={{ color: C.onSurface }}>Your lifestyle</h2>
          <p className="mt-2 text-base" style={{ color: C.onSurfaceVariant }}>Help matches understand your habits and preferences.</p>
        </div>

        <div className="space-y-6">
          {LIFESTYLE_OPTIONS.map((group) => (
            <div key={group.key}>
              <p className="text-sm font-semibold mb-3" style={{ color: C.onSurface }}>{group.category}</p>
              <div className="flex flex-wrap gap-3">
                {group.options.map((opt) => {
                  const isActive = selected[group.key] === opt;
                  return (
                    <button key={opt} onClick={() => setSelected((s) => ({ ...s, [group.key]: opt }))}
                      className="rounded-2xl px-5 py-3 text-sm font-medium border-2 transition-all"
                      style={{ borderColor: isActive ? C.primary : C.outlineVariant, backgroundColor: isActive ? C.primary : C.surfaceContainerLowest, color: isActive ? "#fff" : C.onSurfaceVariant }}>
                      {isActive && <span className="material-symbols-outlined text-sm mr-1 align-middle">check_circle</span>}
                      {opt}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        <div className="flex gap-3 max-w-md">
          <button onClick={onBack} className="flex-1 rounded-xl px-6 py-3.5 font-semibold border-2 transition-all hover:opacity-80" style={{ borderColor: C.outlineVariant, color: C.onSurface, backgroundColor: C.surfaceContainerLowest }}>Back</button>
          <button onClick={handleNext} disabled={!allSelected || saving} className="flex-1 rounded-xl px-6 py-3.5 font-semibold text-white transition-all hover:opacity-90 active:scale-[0.99] disabled:opacity-50" style={{ background: `linear-gradient(to right, ${C.primary}, ${C.primaryContainer})` }}>
            {saving ? "Saving..." : "Continue"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Step 5: Connection Style ───────────────────────────

function ConnectionStyleStep({
  connectionStyle = {},
  onNext,
  onBack,
  saving,
}: {
  connectionStyle?: Record<string, string>;
  onNext: (connectionStyle: Record<string, string>) => void;
  onBack: () => void;
  saving: boolean;
}) {
  const [selected, setSelected] = useState<Record<string, string>>(connectionStyle ?? {});

  function handleNext() {
    onNext(selected);
  }

  const allSelected = CONNECTION_STYLE_OPTIONS.every((opt) => selected?.[opt.id]);

  return (
    <div className="grid grid-cols-12 gap-8 max-w-6xl mx-auto px-6 py-10">
      <div className="col-span-12 lg:col-span-8 space-y-8">
        <div>
          <h2 className="text-3xl font-bold" style={{ color: C.onSurface }}>How do you connect?</h2>
          <p className="mt-2 text-base" style={{ color: C.onSurfaceVariant }}>Help matches understand your communication and emotional style.</p>
        </div>

        <div className="space-y-6">
          {CONNECTION_STYLE_OPTIONS.map((group) => (
            <div key={group.id}>
              <p className="text-sm font-semibold mb-3" style={{ color: C.onSurface }}>{group.label}</p>
              <div className="flex flex-wrap gap-3">
                {group.options.map((opt) => {
                  const isActive = selected[group.id] === opt;
                  return (
                    <button key={opt} onClick={() => setSelected((s) => ({ ...s, [group.id]: opt }))}
                      className="rounded-2xl px-5 py-3 text-sm font-medium border-2 transition-all"
                      style={{ borderColor: isActive ? C.primary : C.outlineVariant, backgroundColor: isActive ? C.primary : C.surfaceContainerLowest, color: isActive ? "#fff" : C.onSurfaceVariant }}>
                      {isActive && <span className="material-symbols-outlined text-sm mr-1 align-middle">check_circle</span>}
                      {opt}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        <div className="flex gap-3 max-w-md">
          <button onClick={onBack} className="flex-1 rounded-xl px-6 py-3.5 font-semibold border-2 transition-all hover:opacity-80" style={{ borderColor: C.outlineVariant, color: C.onSurface, backgroundColor: C.surfaceContainerLowest }}>Back</button>
          <button onClick={handleNext} disabled={!allSelected || saving} className="flex-1 rounded-xl px-6 py-3.5 font-semibold text-white transition-all hover:opacity-90 active:scale-[0.99] disabled:opacity-50" style={{ background: `linear-gradient(to right, ${C.primary}, ${C.primaryContainer})` }}>
            {saving ? "Saving..." : "Continue"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Step 6: Interests ───────────────────────────────────

function InterestsStep({
  selected = [],
  onNext,
  onBack,
  saving,
}: {
  selected?: string[];
  onNext: (interests: string[]) => void;
  onBack: () => void;
  saving: boolean;
}) {
  const [interests, setInterests] = useState<string[]>(selected ?? []);
  const MAX_INTERESTS = 12;

  function toggle(interest: string) {
    setInterests((prev) => {
      const exists = prev.includes(interest);
      if (exists) return prev.filter((i) => i !== interest);
      if (prev.length >= MAX_INTERESTS) return prev; // max 12 interests
      return [...prev, interest];
    });
  }

  return (
    <div className="grid grid-cols-12 gap-8 max-w-6xl mx-auto px-6 py-10">
      <div className="col-span-12 lg:col-span-8 space-y-8">
        <div>
          <h2 className="text-3xl font-bold" style={{ color: C.onSurface }}>What are your interests?</h2>
          <p className="mt-2 text-base" style={{ color: C.onSurfaceVariant }}>Pick up to {MAX_INTERESTS} that describe you.</p>
        </div>

        <div className="space-y-6">
          {INTERESTS_OPTIONS.map((category) => (
            <div key={category.category}>
              <p className="text-sm font-semibold mb-3" style={{ color: C.onSurface }}>{category.category}</p>
              <div className="flex flex-wrap gap-3">
                {category.interests.map((interest) => {
                  const isSelected = interests.includes(interest);
                  const isDisabled = !isSelected && interests.length >= MAX_INTERESTS;
                  return (
                    <button key={interest} onClick={() => toggle(interest)} disabled={isDisabled}
                      className="rounded-2xl px-5 py-3 text-sm font-medium border-2 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                      style={{ borderColor: isSelected ? C.primary : C.outlineVariant, backgroundColor: isSelected ? C.primary : C.surfaceContainerLowest, color: isSelected ? "#fff" : C.onSurfaceVariant }}>
                      {isSelected && <span className="material-symbols-outlined text-sm mr-1 align-middle">check_circle</span>}
                      {interest}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        <div className="flex items-center gap-4 max-w-md">
          <p className="text-sm font-medium" style={{ color: C.onSurfaceVariant }}>{interests.length}/{MAX_INTERESTS} selected</p>
          <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: C.outlineVariant }}>
            <div className="h-full rounded-full transition-all" style={{ width: `${(interests.length / MAX_INTERESTS) * 100}%`, background: `linear-gradient(to right, ${C.primary}, ${C.primaryContainer})` }} />
          </div>
        </div>

        <div className="flex gap-3 max-w-md">
          <button onClick={onBack} className="flex-1 rounded-xl px-6 py-3.5 font-semibold border-2 transition-all hover:opacity-80" style={{ borderColor: C.outlineVariant, color: C.onSurface, backgroundColor: C.surfaceContainerLowest }}>Back</button>
          <button onClick={() => onNext(interests)} disabled={interests.length === 0 || saving} className="flex-1 rounded-xl px-6 py-3.5 font-semibold text-white transition-all hover:opacity-90 active:scale-[0.99] disabled:opacity-50" style={{ background: `linear-gradient(to right, ${C.primary}, ${C.primaryContainer})` }}>
            {saving ? "Saving..." : "Continue"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Step 7: Prompts ──────────────────────────────────────

function PromptsStep({
  bio,
  prompts,
  onNext,
  onBack,
  saving,
}: {
  bio: string;
  prompts: Array<{ prompt_id: string; question: string; answer: string }>;
  onNext: (
    bio: string,
    prompts: Array<{ prompt_id: string; question: string; answer: string }>
  ) => void;
  onBack: () => void;
  saving: boolean;
}) {
  const [bioText, setBioText] = useState(bio);
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
    onNext(bioText.trim(), result);
  }

  const filledCount = PROMPT_QUESTIONS.filter(
    (q) => answers[q.id]?.trim()
  ).length;
  const isBioValid = bioText.trim().length > 0;
  const canSubmit = isBioValid && filledCount > 0;

  return (
    <div className="grid grid-cols-12 gap-8 max-w-6xl mx-auto px-6 py-10">
      <div className="col-span-12 lg:col-span-8 space-y-6">
        <div>
          <h2 className="text-3xl font-bold" style={{ color: C.onSurface }}>Share a bit about yourself</h2>
          <p className="mt-2 text-base" style={{ color: C.onSurfaceVariant }}>Add a bio and answer at least one prompt. These show up on your discovery card.</p>
        </div>

        {/* Bio */}
        <div>
          <label htmlFor="bio" className="mb-1.5 flex items-center gap-2 text-base font-semibold" style={{ color: C.onSurface }}>
            <span className="material-symbols-outlined text-xl" style={{ color: C.primary }}>person</span>
            Your Bio <span style={{ color: "red" }}>*</span>
          </label>
          <textarea
            id="bio"
            rows={3}
            value={bioText}
            onChange={(e) => setBioText(e.target.value)}
            className="block w-full rounded-2xl px-4 py-3 text-base outline-none transition-all resize-none focus:ring-2"
            style={{ backgroundColor: C.surfaceContainer, color: C.onSurface }}
            maxLength={500}
            placeholder="Tell us who you are in a few sentences..."
          />
          <p className="mt-1 text-xs" style={{ color: C.onSurfaceVariant }}>{bioText.length}/500</p>
        </div>

        {/* Prompts */}
        <div className="space-y-6 max-w-lg">
          {PROMPT_QUESTIONS.map((q) => (
            <div key={q.id}>
              <label htmlFor={q.id} className="mb-2 flex items-center gap-2 text-base font-semibold" style={{ color: C.onSurface }}>
                <span className="material-symbols-outlined text-xl" style={{ color: C.primary }}>edit_note</span>
                {q.question}
              </label>
              <textarea
                id={q.id}
                rows={3}
                value={answers[q.id] || ""}
                onChange={(e) => setAnswers((a) => ({ ...a, [q.id]: e.target.value }))}
                className="block w-full rounded-2xl px-4 py-3 text-base outline-none transition-all resize-none focus:ring-2"
                style={{ backgroundColor: C.surfaceContainer, color: C.onSurface }}
                maxLength={300}
                placeholder="Type your answer here..."
              />
              <p className="mt-1 text-xs" style={{ color: C.onSurfaceVariant }}>{answers[q.id]?.length || 0}/300</p>
            </div>
          ))}
        </div>

        <div className="flex gap-3 pt-4 max-w-md">
          <button onClick={onBack} className="flex-1 rounded-xl px-6 py-3.5 font-semibold border-2 transition-all hover:opacity-80" style={{ borderColor: C.outlineVariant, color: C.onSurface, backgroundColor: C.surfaceContainerLowest }}>Back</button>
          <button onClick={handleNext} disabled={!canSubmit || saving} className="flex-1 rounded-xl px-6 py-3.5 font-semibold text-white transition-all hover:opacity-90 active:scale-[0.99] disabled:opacity-50" style={{ background: `linear-gradient(to right, ${C.primary}, ${C.primaryContainer})` }}>
            {saving ? "Completing..." : "Complete Profile"}
          </button>
        </div>
      </div>

      <div className="hidden lg:flex col-span-4 flex-col gap-6">
        <div className="rounded-3xl border p-6" style={{ backgroundColor: C.surfaceContainer, borderColor: C.outlineVariant }}>
          <div className="flex items-center gap-2 mb-3">
            <span className="material-symbols-outlined text-xl" style={{ color: C.primary }}>info</span>
            <span className="font-semibold text-sm" style={{ color: C.onSurface }}>Why this matters</span>
          </div>
          <p className="text-sm leading-relaxed" style={{ color: C.onSurfaceVariant }}>Your prompts give others a glimpse into who you really are. Authentic answers lead to more meaningful conversations.</p>
        </div>
        <div className="rounded-3xl p-6" style={{ backgroundColor: C.onSurface }}>
          <h3 className="text-sm font-semibold text-white/60 mb-3">Your Profile</h3>
          {filledCount === 0 ? (
            <p className="text-sm text-white/40">No prompts answered yet</p>
          ) : (
            <div className="space-y-3">
              {PROMPT_QUESTIONS.filter((q) => answers[q.id]?.trim()).map((q) => (
                <div key={q.id}>
                  <p className="text-xs text-white/40">{q.question}</p>
                  <p className="text-sm text-white/80 mt-0.5 line-clamp-2">{answers[q.id]}</p>
                </div>
              ))}
            </div>
          )}
        </div>
        <div className="rounded-3xl border p-6" style={{ backgroundColor: C.surfaceContainer, borderColor: C.outlineVariant }}>
          <div className="flex items-center gap-2 mb-2">
            <span className="material-symbols-outlined text-xl" style={{ color: C.primary }}>celebration</span>
            <span className="font-semibold text-sm" style={{ color: C.onSurface }}>Almost there!</span>
          </div>
          <p className="text-sm leading-relaxed" style={{ color: C.onSurfaceVariant }}>This is the final step. Once you complete your profile, you will start discovering people who share your values.</p>
        </div>
      </div>
    </div>
  );
}

// -- Helpers --

function getAge(dateStr: string): number {
  // Parse YYYY-MM-DD to avoid timezone-sensitive UTC parsing.
  // Construct date in local timezone using new Date(year, month-1, day).
  const [yearStr, monthStr, dayStr] = dateStr.split("-");
  const year = parseInt(yearStr, 10);
  const month = parseInt(monthStr, 10);
  const day = parseInt(dayStr, 10);

  const birth = new Date(year, month - 1, day);
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) {
    age--;
  }
  return age;
}
