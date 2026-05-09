"use client";

import { useState, useEffect } from "react";
import { useOnboarding } from "./useOnboarding";
import { API_BASE } from "@/lib/api";

// ── Step definitions ─────────────────────────────────────

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

const AGE_PRESET_OPTIONS = [
  { label: "18-25", min: 18, max: 25 },
  { label: "25-35", min: 25, max: 35 },
  { label: "35-50", min: 35, max: 50 },
  { label: "50+", min: 50, max: 99 },
  { label: "Open", min: 18, max: 99 },
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

// ── Main component ───────────────────────────────────────

export function OnboardingWizard() {
  const {
    state,
    step,
    loading,
    saving,
    error,
    restoreError,
    profileOptions,
    nextStep,
    prevStep,
    retryRestore,
    totalSteps,
  } = useOnboarding();

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-gray-400">Loading your progress…</div>
      </div>
    );
  }

  if (restoreError) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-full max-w-sm space-y-4 text-center">
          <div className="rounded-lg border border-red-100 bg-red-50 p-4 text-sm text-red-700">
            {restoreError}
          </div>
          <button
            type="button"
            onClick={retryRestore}
            className="w-full rounded-lg bg-halo-primary px-4 py-3 min-h-touch text-white font-medium hover:bg-opacity-90 transition-opacity"
          >
            Try again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Progress bar */}
      <div className="flex gap-1">
        {Array.from({ length: totalSteps }).map((_, i) => (
          <div
            key={i}
            className={`h-1.5 flex-1 rounded-full transition-colors ${
              i <= step ? "bg-halo-primary" : "bg-gray-200"
            }`}
          />
        ))}
      </div>

      {error && (
        <div className="rounded-md bg-red-50 p-3 text-sm text-red-600">
          {error}
        </div>
      )}

      {step === 0 && (
        <BasicsStep
          birthdate={state.birthdate}
          raceEthnicity={state.race_ethnicity}
          raceEthnicityOptions={profileOptions.raceEthnicity}
          raceEthnicityExclusive={profileOptions.raceEthnicityExclusive}
          location={state.coarse_location}
          onNext={(birthdate, race_ethnicity, location) =>
            nextStep({ birthdate, race_ethnicity, coarse_location: location })
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
        <AgeRacePreferenceStep
          agePrefMin={state.age_pref_min}
          agePrefMax={state.age_pref_max}
          raceEthnicityPreferences={state.race_ethnicity_preferences}
          raceEthnicityPreferenceOptions={profileOptions.raceEthnicityPreferences}
          raceEthnicityPreferenceExclusive={profileOptions.raceEthnicityPreferenceExclusive}
          raceEthnicityPreferenceDefault={profileOptions.defaultRaceEthnicityPreferences}
          onNext={(age_pref_min, age_pref_max, race_ethnicity_preferences) =>
            nextStep({
              age_pref_min,
              age_pref_max,
              race_ethnicity_preferences,
            })
          }
          onBack={prevStep}
          saving={saving}
        />
      )}

      {step === 5 && (
        <LifestyleStep
          lifestyle={state.lifestyle_habits}
          onNext={(lifestyle_habits) =>
            nextStep({ lifestyle_habits })
          }
          onBack={prevStep}
          saving={saving}
        />
      )}

      {step === 6 && (
        <ConnectionStyleStep
          connectionStyle={state.connection_style}
          onNext={(connection_style) =>
            nextStep({ connection_style })
          }
          onBack={prevStep}
          saving={saving}
        />
      )}

      {step === 7 && (
        <InterestsStep
          selected={state.interests}
          onNext={(interests) => nextStep({ interests })}
          onBack={prevStep}
          saving={saving}
        />
      )}

      {step === 8 && (
        <PromptsStep
          bio={state.bio}
          prompts={state.prompts}
          onNext={(bio, prompts) => nextStep({ bio, prompts })}
          onBack={prevStep}
          saving={saving}
        />
      )}
    </div>
  );
}

// ── Step 0: Basics (birthdate + location) ────────────────
function BasicsStep({
  birthdate,
  raceEthnicity,
  raceEthnicityOptions,
  raceEthnicityExclusive,
  location,
  onNext,
  saving,
}: {
  birthdate: string;
  raceEthnicity: string[];
  raceEthnicityOptions: string[];
  raceEthnicityExclusive: string;
  location: string;
  onNext: (birthdate: string, raceEthnicity: string[], location: string) => void;
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
  const [selectedRaceEthnicity, setSelectedRaceEthnicity] = useState<string[]>(raceEthnicity);
  
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
      const response = await fetch(`${API_BASE}/v1/locations/search?q=${encodeURIComponent(query)}`);

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

  const toggleRaceEthnicity = (option: string) => {
    setSelectedRaceEthnicity((prev) => {
      if (option === raceEthnicityExclusive) {
        return prev.includes(option) ? [] : [option];
      }

      const withoutPreferNot = prev.filter((item) => item !== raceEthnicityExclusive);
      if (withoutPreferNot.includes(option)) {
        return withoutPreferNot.filter((item) => item !== option);
      }
      return [...withoutPreferNot, option];
    });
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
          const response = await fetch(`${API_BASE}/v1/locations/reverse-geocode?lat=${latitude}&lon=${longitude}`);

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

    if (selectedRaceEthnicity.length === 0) {
      setLocalError(`Please select your race/ethnicity or choose ${raceEthnicityExclusive}`);
      return;
    }

    setLocalError("");
    onNext(bdStr, selectedRaceEthnicity, loc.trim());
  }

  const currentYear = new Date().getFullYear();
  const minYear = currentYear - 100;
  const maxYear = currentYear - 18;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold">Let&apos;s get the basics</h2>
        <p className="mt-1 text-sm text-gray-600">
          We need these to get started and ensure you&apos;re 18+.
        </p>
      </div>

      {localError && (
        <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700 border border-red-100">
          {localError}
        </div>
      )}

      {/* Birthdate Selector */}
      <div className="space-y-3">
        <label className="block text-sm font-semibold text-gray-900">
          When were you born?
        </label>
        <div className="flex gap-2">
          {/* Month */}
          <div className="flex-1">
            <select
              value={month}
              onChange={(e) => setMonth(Number(e.target.value))}
              className="w-full rounded-lg border border-gray-300 px-3 py-3 min-h-touch text-sm font-medium bg-white focus:border-halo-primary focus:outline-none focus:ring-2 focus:ring-halo-primary/20 appearance-none cursor-pointer"
              style={{
                backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%23666' d='M6 9L1 4h10z'/%3E%3C/svg%3E")`,
                backgroundRepeat: "no-repeat",
                backgroundPosition: "right 8px center",
                paddingRight: "28px",
              }}
            >
              <option value={0}>Month</option>
              {Array.from({ length: 12 }).map((_, i) => (
                <option key={i + 1} value={i + 1}>
                  {new Date(2000, i).toLocaleDateString("en-US", { month: "short" })}
                </option>
              ))}
            </select>
          </div>

          {/* Day */}
          <div className="flex-1">
            <select
              value={day}
              onChange={(e) => setDay(Number(e.target.value))}
              className="w-full rounded-lg border border-gray-300 px-3 py-3 min-h-touch text-sm font-medium bg-white focus:border-halo-primary focus:outline-none focus:ring-2 focus:ring-halo-primary/20 appearance-none cursor-pointer"
              style={{
                backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%23666' d='M6 9L1 4h10z'/%3E%3C/svg%3E")`,
                backgroundRepeat: "no-repeat",
                backgroundPosition: "right 8px center",
                paddingRight: "28px",
              }}
            >
              <option value={0}>Day</option>
              {Array.from({ length: 31 }).map((_, i) => (
                <option key={i + 1} value={i + 1}>
                  {String(i + 1).padStart(2, "0")}
                </option>
              ))}
            </select>
          </div>

          {/* Year */}
          <div className="flex-1">
            <select
              value={year}
              onChange={(e) => setYear(Number(e.target.value))}
              className="w-full rounded-lg border border-gray-300 px-3 py-3 min-h-touch text-sm font-medium bg-white focus:border-halo-primary focus:outline-none focus:ring-2 focus:ring-halo-primary/20 appearance-none cursor-pointer"
              style={{
                backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%23666' d='M6 9L1 4h10z'/%3E%3C/svg%3E")`,
                backgroundRepeat: "no-repeat",
                backgroundPosition: "right 8px center",
                paddingRight: "28px",
              }}
            >
              <option value={0}>Year</option>
              {Array.from({ length: maxYear - minYear + 1 }).map((_, i) => {
                const y = maxYear - i;
                return (
                  <option key={y} value={y}>
                    {y}
                  </option>
                );
              })}
            </select>
          </div>
        </div>
        <p className="text-xs text-gray-500">
          {month && day && year && isValidDate(month, day, year)
            ? `Age: ${getAge(getBirthdateString())}`
            : "Must be 18+"}
        </p>
      </div>

      {/* Race/Ethnicity Selector */}
      <div className="space-y-3">
        <div>
          <label className="block text-sm font-semibold text-gray-900">
            Race/ethnicity
          </label>
          <p className="mt-1 text-xs text-gray-500">
            Select all that apply.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {raceEthnicityOptions.map((option) => {
            const isSelected = selectedRaceEthnicity.includes(option);
            return (
              <button
                key={option}
                type="button"
                onClick={() => toggleRaceEthnicity(option)}
                className={`rounded-full px-3.5 py-2 text-sm font-medium border-2 transition-all ${
                  isSelected
                    ? "border-halo-primary bg-halo-primary text-white shadow-sm"
                    : "border-gray-200 text-gray-700 hover:border-halo-primary hover:bg-halo-primary/5"
                }`}
              >
                {option}
              </button>
            );
          })}
        </div>
      </div>

      {/* Location Autocomplete */}
      <div className="space-y-3 relative z-10">
        <label className="block text-sm font-semibold text-gray-900">
          Where are you located?
        </label>
        <div className="relative">
          <input
            type="text"
            value={locationSearch}
            onChange={(e) => handleLocationInputChange(e.target.value)}
            onFocus={() => setShowLocationDropdown(true)}
            onKeyDown={(e) => {
              if (e.key === "Escape") setShowLocationDropdown(false);
            }}
            placeholder="Search city, state, or ZIP code"
            className="w-full rounded-lg border border-gray-300 px-4 py-3 min-h-touch text-sm focus:border-halo-primary focus:outline-none focus:ring-2 focus:ring-halo-primary/20"
          />

          {/* Dropdown */}
          {showLocationDropdown && (
            <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-64 overflow-y-auto z-50">
              {locationLoading ? (
                <div className="px-4 py-3 text-center text-sm text-gray-500">
                  <div className="inline-block animate-spin">⟳</div> Searching...
                </div>
              ) : locationError ? (
                <div className="px-4 py-3 text-sm text-red-600 bg-red-50">
                  {locationError}
                </div>
              ) : locationSuggestions.length > 0 ? (
                locationSuggestions.map((suggestion) => (
                  <button
                    key={`${suggestion.lat}-${suggestion.lon}-${suggestion.display}`}
                    onClick={() => selectLocation(suggestion)}
                    className="w-full px-4 py-2.5 text-left text-sm hover:bg-gray-50 border-b border-gray-100 last:border-0 transition-colors"
                  >
                    <div className="font-medium text-gray-900">{suggestion.display}</div>
                  </button>
                ))
              ) : locationSearch.length > 1 ? (
                <div className="px-4 py-3 text-sm text-gray-500 text-center">
                  No locations found
                </div>
              ) : (
                <div className="px-4 py-3 text-sm text-gray-500 text-center">
                  Start typing to search
                </div>
              )}

              {/* Use Current Location Button */}
              <div className="border-t border-gray-200 p-2">
                <button
                  onClick={useCurrentLocation}
                  disabled={geolocationLoading}
                  className="w-full px-3 py-2 text-sm font-medium text-halo-primary hover:bg-blue-50 rounded-md transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {geolocationLoading ? (
                    <>
                      <span className="inline-block animate-spin">⟳</span> Detecting...
                    </>
                  ) : (
                    <>
                      📍 Use my current location
                    </>
                  )}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      <button
        onClick={handleNext}
        disabled={saving}
        className="w-full rounded-lg bg-halo-primary px-4 py-3 min-h-touch text-white font-medium hover:bg-opacity-90 disabled:opacity-50 transition-opacity"
      >
        {saving ? "Saving…" : "Continue"}
      </button>
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
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold">Let's get to know you</h2>
        <p className="mt-1 text-sm text-gray-600">
          This helps us make better matches for you.
        </p>
      </div>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-semibold text-gray-900 mb-3">
            What's your gender?
          </label>
          <div className="flex flex-wrap gap-2">
            {genderOptions.map((opt) => (
              <button
                key={opt}
                onClick={() => setGenderValue(opt)}
                className={`rounded-full px-4 py-2.5 min-h-touch text-sm font-medium border-2 transition-all ${
                  genderValue === opt
                    ? "border-halo-primary bg-halo-primary text-white shadow-sm"
                    : "border-gray-200 text-gray-700 hover:border-halo-primary hover:bg-halo-primary/5"
                }`}
              >
                {opt}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-sm font-semibold text-gray-900 mb-3">
            Sexual orientation
          </label>
          <div className="flex flex-wrap gap-2">
            {sexualProfileOptions.map((opt) => (
              <button
                key={opt}
                onClick={() => setSexualProfileValue(opt)}
                className={`rounded-full px-4 py-2.5 min-h-touch text-sm font-medium border-2 transition-all ${
                  sexualProfileValue === opt
                    ? "border-halo-primary bg-halo-primary text-white shadow-sm"
                    : "border-gray-200 text-gray-700 hover:border-halo-primary hover:bg-halo-primary/5"
                }`}
              >
                {opt}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-sm font-semibold text-gray-900 mb-3">
            Who are you interested in?
          </label>
          <p className="text-xs text-gray-500 mb-2">Select all that apply</p>
          <div className="flex flex-wrap gap-2">
            {interestedInOptions.map((option) => (
              <button
                key={option}
                onClick={() => toggleInterestedIn(option)}
                className={`rounded-full px-4 py-2.5 min-h-touch text-sm font-medium border-2 transition-all ${
                  selectedInterests.includes(option)
                    ? "border-halo-primary bg-halo-primary text-white shadow-sm"
                    : "border-gray-200 text-gray-700 hover:border-halo-primary hover:bg-halo-primary/5"
                }`}
              >
                {option}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="flex gap-3 pt-4">
        <button
          onClick={onBack}
          className="flex-1 rounded-lg border border-gray-300 px-4 py-3 min-h-touch font-medium text-gray-700 hover:bg-gray-50 transition-colors"
        >
          Back
        </button>
        <button
          onClick={handleNext}
          disabled={!allSelected || saving}
          className="flex-1 rounded-lg bg-halo-primary px-4 py-3 min-h-touch text-white font-medium hover:bg-opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
        >
          {saving ? "Saving…" : "Continue"}
        </button>
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

  function handleNext() {
    onNext(selected);
  }

  const allSelected = PERSONALITY_VIBE_OPTIONS.every((v) => selected[v.key]);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold">What's your vibe?</h2>
        <p className="mt-1 text-sm text-gray-600">
          Help others understand your personality and lifestyle.
        </p>
      </div>

      <div className="space-y-5">
        {PERSONALITY_VIBE_OPTIONS.map((group) => (
          <div key={group.key}>
            <label className="block text-sm font-semibold text-gray-900 mb-3">
              {group.label}
            </label>
            <div className="flex flex-wrap gap-2">
              {group.options.map((opt) => (
                <button
                  key={opt}
                  onClick={() =>
                    setSelected((s) => ({ ...s, [group.key]: opt }))
                  }
                  className={`rounded-full px-4 py-2.5 min-h-touch text-sm font-medium border-2 transition-all ${
                    selected[group.key] === opt
                      ? "border-halo-primary bg-halo-primary text-white shadow-sm"
                      : "border-gray-200 text-gray-700 hover:border-halo-primary hover:bg-halo-primary/5"
                  }`}
                >
                  {opt}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="flex gap-3 pt-4">
        <button
          onClick={onBack}
          className="flex-1 rounded-lg border border-gray-300 px-4 py-3 min-h-touch font-medium text-gray-700 hover:bg-gray-50 transition-colors"
        >
          Back
        </button>
        <button
          onClick={handleNext}
          disabled={!allSelected || saving}
          className="flex-1 rounded-lg bg-halo-primary px-4 py-3 min-h-touch text-white font-medium hover:bg-opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
        >
          {saving ? "Saving…" : "Continue"}
        </button>
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
    setSelected((prev) => {
      if (prev.includes(option)) {
        return prev.filter((o) => o !== option);
      }
      return [...prev, option];
    });
  }

  function handleNext() {
    onNext(selected);
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold">What are you looking for?</h2>
        <p className="mt-1 text-sm text-gray-600">
          Select all that apply. You can change this anytime.
        </p>
      </div>

      <div className="space-y-2.5">
        {RELATIONSHIP_INTENTIONS_OPTIONS.map((option) => (
          <button
            key={option}
            onClick={() => toggle(option)}
            className={`w-full rounded-lg px-4 py-3.5 text-left font-medium border-2 transition-all flex items-center ${
              selected.includes(option)
                ? "border-halo-primary bg-halo-primary/10 text-halo-primary"
                : "border-gray-200 text-gray-700 hover:border-halo-primary hover:bg-gray-50"
            }`}
          >
            <div
              className={`w-5 h-5 rounded border-2 mr-3 flex items-center justify-center ${
                selected.includes(option)
                  ? "border-halo-primary bg-halo-primary"
                  : "border-gray-300"
              }`}
            >
              {selected.includes(option) && (
                <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                </svg>
              )}
            </div>
            {option}
          </button>
        ))}
      </div>

      <div className="flex gap-3 pt-4">
        <button
          onClick={onBack}
          className="flex-1 rounded-lg border border-gray-300 px-4 py-3 min-h-touch font-medium text-gray-700 hover:bg-gray-50 transition-colors"
        >
          Back
        </button>
        <button
          onClick={handleNext}
          disabled={selected.length === 0 || saving}
          className="flex-1 rounded-lg bg-halo-primary px-4 py-3 min-h-touch text-white font-medium hover:bg-opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
        >
          {saving ? "Saving…" : "Continue"}
        </button>
      </div>
    </div>
  );
}

// ── Step 4: Preferences ──────────────────────────────────

function AgeRacePreferenceStep({
  agePrefMin,
  agePrefMax,
  raceEthnicityPreferences,
  raceEthnicityPreferenceOptions,
  raceEthnicityPreferenceExclusive,
  raceEthnicityPreferenceDefault,
  onNext,
  onBack,
  saving,
}: {
  agePrefMin: number;
  agePrefMax: number;
  raceEthnicityPreferences: string[];
  raceEthnicityPreferenceOptions: string[];
  raceEthnicityPreferenceExclusive: string;
  raceEthnicityPreferenceDefault: string[];
  onNext: (agePrefMin: number, agePrefMax: number, raceEthnicityPreferences: string[]) => void;
  onBack: () => void;
  saving: boolean;
}) {
  const [minAge, setMinAge] = useState(clampAge(agePrefMin || 18));
  const [maxAge, setMaxAge] = useState(clampAge(agePrefMax || 99));
  const [selectedPreferences, setSelectedPreferences] = useState<string[]>(
    raceEthnicityPreferences.length > 0 ? raceEthnicityPreferences : raceEthnicityPreferenceDefault
  );

  function applyPreset(min: number, max: number) {
    setMinAge(min);
    setMaxAge(max);
  }

  function toggleRacePreference(option: string) {
    setSelectedPreferences((prev) => {
      if (option === raceEthnicityPreferenceExclusive) {
        return [raceEthnicityPreferenceExclusive];
      }

      const withoutOpen = prev.filter((item) => item !== raceEthnicityPreferenceExclusive);
      if (withoutOpen.includes(option)) {
        const next = withoutOpen.filter((item) => item !== option);
        return next.length > 0 ? next : raceEthnicityPreferenceDefault;
      }
      return [...withoutOpen, option];
    });
  }

  function handleMinAgeChange(value: number) {
    setMinAge(Math.min(value, maxAge));
  }

  function handleMaxAgeChange(value: number) {
    setMaxAge(Math.max(value, minAge));
  }

  function handleNext() {
    onNext(minAge, maxAge, selectedPreferences);
  }

  const canSubmit = minAge >= 18 && maxAge <= 99 && minAge <= maxAge && selectedPreferences.length > 0;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold">Who would you like to meet?</h2>
        <p className="mt-1 text-sm text-gray-600">
          Set a comfortable age range and race/ethnicity preferences.
        </p>
      </div>

      <div className="space-y-4 rounded-lg border border-gray-200 bg-white p-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-semibold text-gray-900">Age preference</h3>
            <p className="mt-0.5 text-xs text-gray-500">Drag the range or pick a preset.</p>
          </div>
          <div className="rounded-full bg-halo-primary/10 px-3 py-1 text-sm font-semibold text-halo-primary">
            {minAge}-{maxAge === 99 ? "99+" : maxAge}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <label className="space-y-2 rounded-lg bg-gray-50 p-3">
            <span className="block text-xs font-semibold uppercase text-gray-500">Minimum</span>
            <input
              type="range"
              min={18}
              max={99}
              value={minAge}
              onChange={(e) => handleMinAgeChange(Number(e.target.value))}
              className="w-full accent-halo-primary"
            />
            <span className="block text-sm font-semibold text-gray-900">{minAge}</span>
          </label>
          <label className="space-y-2 rounded-lg bg-gray-50 p-3">
            <span className="block text-xs font-semibold uppercase text-gray-500">Maximum</span>
            <input
              type="range"
              min={18}
              max={99}
              value={maxAge}
              onChange={(e) => handleMaxAgeChange(Number(e.target.value))}
              className="w-full accent-halo-primary"
            />
            <span className="block text-sm font-semibold text-gray-900">
              {maxAge === 99 ? "99+" : maxAge}
            </span>
          </label>
        </div>

        <div className="flex flex-wrap gap-2">
          {AGE_PRESET_OPTIONS.map((preset) => {
            const isSelected = minAge === preset.min && maxAge === preset.max;
            return (
              <button
                key={preset.label}
                type="button"
                onClick={() => applyPreset(preset.min, preset.max)}
                className={`rounded-full px-3.5 py-2 text-sm font-medium border-2 transition-all ${
                  isSelected
                    ? "border-halo-primary bg-halo-primary text-white shadow-sm"
                    : "border-gray-200 text-gray-700 hover:border-halo-primary hover:bg-halo-primary/5"
                }`}
              >
                {preset.label}
              </button>
            );
          })}
        </div>
      </div>

      <div className="space-y-3">
        <div>
          <label className="block text-sm font-semibold text-gray-900">
            Race/ethnicity preference
          </label>
          <p className="mt-1 text-xs text-gray-500">
            Choose specific preferences or stay open to all.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {raceEthnicityPreferenceOptions.map((option) => {
            const isSelected = selectedPreferences.includes(option);
            return (
              <button
                key={option}
                type="button"
                onClick={() => toggleRacePreference(option)}
                className={`rounded-full px-3.5 py-2 text-sm font-medium border-2 transition-all ${
                  isSelected
                    ? "border-halo-primary bg-halo-primary text-white shadow-sm"
                    : "border-gray-200 text-gray-700 hover:border-halo-primary hover:bg-halo-primary/5"
                }`}
              >
                {option}
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex gap-3 pt-4">
        <button
          onClick={onBack}
          className="flex-1 rounded-lg border border-gray-300 px-4 py-3 min-h-touch font-medium text-gray-700 hover:bg-gray-50 transition-colors"
        >
          Back
        </button>
        <button
          onClick={handleNext}
          disabled={!canSubmit || saving}
          className="flex-1 rounded-lg bg-halo-primary px-4 py-3 min-h-touch text-white font-medium hover:bg-opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
        >
          {saving ? "Saving…" : "Continue"}
        </button>
      </div>
    </div>
  );
}

// ── Step 5: Tags ─────────────────────────────────────────



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
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold">Your lifestyle</h2>
        <p className="mt-1 text-sm text-gray-600">
          Help matches understand your habits and preferences.
        </p>
      </div>

      <div className="space-y-6">
        {LIFESTYLE_OPTIONS.map((group) => (
          <div key={group.key}>
            <label className="block text-sm font-semibold text-gray-900 mb-3">
              {group.category}
            </label>
            <div className="flex flex-wrap gap-2">
              {group.options.map((opt) => (
                <button
                  key={opt}
                  onClick={() =>
                    setSelected((s) => ({ ...s, [group.key]: opt }))
                  }
                  className={`rounded-full px-3.5 py-2 text-sm font-medium border-2 transition-all ${
                    selected[group.key] === opt
                      ? "border-halo-primary bg-halo-primary text-white shadow-sm"
                      : "border-gray-200 text-gray-700 hover:border-halo-primary hover:bg-halo-primary/5"
                  }`}
                >
                  {opt}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="flex gap-3 pt-4">
        <button
          onClick={onBack}
          className="flex-1 rounded-lg border border-gray-300 px-4 py-3 min-h-touch font-medium text-gray-700 hover:bg-gray-50 transition-colors"
        >
          Back
        </button>
        <button
          onClick={handleNext}
          disabled={!allSelected || saving}
          className="flex-1 rounded-lg bg-halo-primary px-4 py-3 min-h-touch text-white font-medium hover:bg-opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
        >
          {saving ? "Saving…" : "Continue"}
        </button>
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
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold">How do you connect?</h2>
        <p className="mt-1 text-sm text-gray-600">
          Help matches understand your communication and emotional style.
        </p>
      </div>

      <div className="space-y-5">
        {CONNECTION_STYLE_OPTIONS.map((group) => (
          <div key={group.id}>
            <label className="block text-sm font-semibold text-gray-900 mb-3">
              {group.label}
            </label>
            <div className="flex flex-wrap gap-2">
              {group.options.map((opt) => (
                <button
                  key={opt}
                  onClick={() =>
                    setSelected((s) => ({ ...s, [group.id]: opt }))
                  }
                  className={`rounded-full px-4 py-2.5 min-h-touch text-sm font-medium border-2 transition-all ${
                    selected[group.id] === opt
                      ? "border-halo-primary bg-halo-primary text-white shadow-sm"
                      : "border-gray-200 text-gray-700 hover:border-halo-primary hover:bg-halo-primary/5"
                  }`}
                >
                  {opt}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="flex gap-3 pt-4">
        <button
          onClick={onBack}
          className="flex-1 rounded-lg border border-gray-300 px-4 py-3 min-h-touch font-medium text-gray-700 hover:bg-gray-50 transition-colors"
        >
          Back
        </button>
        <button
          onClick={handleNext}
          disabled={!allSelected || saving}
          className="flex-1 rounded-lg bg-halo-primary px-4 py-3 min-h-touch text-white font-medium hover:bg-opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
        >
          {saving ? "Saving…" : "Continue"}
        </button>
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
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold">What are your interests?</h2>
        <p className="mt-1 text-sm text-gray-600">
          Pick up to {MAX_INTERESTS} that describe you.
        </p>
      </div>

      <div className="space-y-5">
        {INTERESTS_OPTIONS.map((category) => (
          <div key={category.category}>
            <label className="block text-sm font-semibold text-gray-900 mb-3">
              {category.category}
            </label>
            <div className="flex flex-wrap gap-2">
              {category.interests.map((interest) => {
                const isSelected = interests.includes(interest);
                const isDisabled = !isSelected && interests.length >= MAX_INTERESTS;
                return (
                  <button
                    key={interest}
                    onClick={() => toggle(interest)}
                    disabled={isDisabled}
                    className={`rounded-full px-4 py-2 text-sm font-medium border-2 transition-all min-h-touch ${
                      isSelected
                        ? "border-halo-primary bg-halo-primary text-white shadow-sm"
                        : isDisabled
                        ? "border-gray-200 text-gray-400 cursor-not-allowed"
                        : "border-gray-200 text-gray-700 hover:border-halo-primary hover:bg-halo-primary/5"
                    }`}
                  >
                    {interest}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      <div className="flex items-center justify-between pt-2 px-1">
        <p className="text-sm font-medium text-gray-600">
          {interests.length}/{MAX_INTERESTS} selected
        </p>
        <div className="w-16 h-1 bg-gray-200 rounded-full overflow-hidden">
          <div
            className="h-full bg-halo-primary transition-all"
            style={{ width: `${(interests.length / MAX_INTERESTS) * 100}%` }}
          />
        </div>
      </div>

      <div className="flex gap-3 pt-4">
        <button
          onClick={onBack}
          className="flex-1 rounded-lg border border-gray-300 px-4 py-3 min-h-touch font-medium text-gray-700 hover:bg-gray-50 transition-colors"
        >
          Back
        </button>
        <button
          onClick={() => onNext(interests)}
          disabled={interests.length === 0 || saving}
          className="flex-1 rounded-lg bg-halo-primary px-4 py-3 min-h-touch text-white font-medium hover:bg-opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
        >
          {saving ? "Saving…" : "Continue"}
        </button>
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
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold">Share a bit about yourself</h2>
        <p className="mt-1 text-sm text-gray-600">
          Answer at least 1 prompt and tell us a bit about yourself.
        </p>
      </div>

      {/* Bio Section - Required */}
      <div className="space-y-3">
        <label htmlFor="bio" className="block text-sm font-semibold text-gray-900">
          Your Bio <span className="text-red-500">*</span>
        </label>
        <textarea
          id="bio"
          rows={3}
          placeholder="Tell us who you are in a few sentences. What makes you interesting? What should people know about you?"
          value={bioText}
          onChange={(e) => setBioText(e.target.value)}
          maxLength={500}
          className="w-full rounded-lg border border-gray-200 px-4 py-3 text-sm focus:border-halo-primary focus:outline-none focus:ring-2 focus:ring-halo-primary/20 resize-none"
        />
        <p className="text-xs text-gray-400">
          {bioText.length}/500 characters
        </p>
        {!isBioValid && bioText.length === 0 && (
          <p className="text-xs text-red-600">Bio is required</p>
        )}
      </div>

      {/* Prompts Section */}
      <div className="space-y-4">
        <label className="block text-sm font-semibold text-gray-900">
          Icebreaker Prompts <span className="text-red-500">*</span>
        </label>
        {PROMPT_QUESTIONS.map((q) => (
          <div key={q.id} className="space-y-2">
            <label htmlFor={q.id} className="block text-sm font-medium text-gray-700">
              {q.question}
            </label>
            <textarea
              id={q.id}
              rows={3}
              placeholder="Be creative and genuine. This helps people get to know you."
              value={answers[q.id] || ""}
              onChange={(e) =>
                setAnswers((a) => ({ ...a, [q.id]: e.target.value }))
              }
              maxLength={300}
              className="w-full rounded-lg border border-gray-200 px-4 py-3 text-sm focus:border-halo-primary focus:outline-none focus:ring-2 focus:ring-halo-primary/20 resize-none"
            />
            <p className="text-xs text-gray-400">
              {answers[q.id]?.length || 0}/300 characters
            </p>
          </div>
        ))}
      </div>

      <div className="flex items-center justify-between py-3 px-3 bg-blue-50 rounded-lg">
        <p className="text-sm font-medium text-gray-700">
          {filledCount} of {PROMPT_QUESTIONS.length} prompts answered
        </p>
        <div className="flex gap-1">
          {PROMPT_QUESTIONS.map((q) => (
            <div
              key={q.id}
              className={`h-2 w-2 rounded-full transition-colors ${
                answers[q.id]?.trim()
                  ? "bg-halo-primary"
                  : "bg-gray-300"
              }`}
            />
          ))}
        </div>
      </div>

      <div className="flex gap-3 pt-2">
        <button
          onClick={onBack}
          className="flex-1 rounded-lg border border-gray-300 px-4 py-3 min-h-touch font-medium text-gray-700 hover:bg-gray-50 transition-colors"
        >
          Back
        </button>
        <button
          onClick={handleNext}
          disabled={!canSubmit || saving}
          className="flex-1 rounded-lg bg-halo-primary px-4 py-3 min-h-touch text-white font-medium hover:bg-opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
        >
          {saving ? "Completing…" : "Complete Profile"}
        </button>
      </div>
    </div>
  );
}

// ── Helpers ──────────────────────────────────────────────

function clampAge(value: number): number {
  if (!Number.isFinite(value)) return 18;
  return Math.min(99, Math.max(18, Math.round(value)));
}

function getAge(dateStr: string): number {
  // Parse YYYY-MM-DD to avoid timezone-sensitive UTC parsing.
  // Construct date in local timezone using new Date(year, month-1, day).
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateStr);
  if (!match) return -1;

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);

  const birth = new Date(year, month - 1, day);
  if (
    birth.getFullYear() !== year ||
    birth.getMonth() !== month - 1 ||
    birth.getDate() !== day
  ) {
    return -1;
  }

  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) {
    age--;
  }
  return age;
}
