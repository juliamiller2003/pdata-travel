export type TravelPace = "slow" | "moderate" | "fast";
export type TravelStyle = "budget" | "mid" | "comfort";

export interface TravelPrefs {
  pace: TravelPace | "";
  style: TravelStyle | "";
  interests: string[];
  dietary: string[];
  dietaryOther?: string;              // Free-text when "Other" is selected
  daily_budget?: number | null;
  currency?: string;                  // e.g. "USD", "THB"
  fitness?: string;                   // e.g. "happy to hike 20km", "prefer light days"
  avoid?: string;                     // e.g. "crowded tourist spots, early mornings"
}

const KEY = "pathway-travel-prefs";

export const PACE_OPTIONS: { value: TravelPace | ""; label: string; desc: string }[] = [
  { value: "",         label: "Any",      desc: "No preference"              },
  { value: "slow",     label: "Slow",     desc: "1–2 things per day, relax"  },
  { value: "moderate", label: "Moderate", desc: "Balanced mix"               },
  { value: "fast",     label: "Fast",     desc: "Packed days, see everything" },
];

export const STYLE_OPTIONS: { value: TravelStyle | ""; label: string; desc: string }[] = [
  { value: "",        label: "Any",       desc: "No preference"                       },
  { value: "budget",  label: "Budget",    desc: "Hostels, street food, free sights"   },
  { value: "mid",     label: "Mid-range", desc: "Guesthouses, local restaurants"      },
  { value: "comfort", label: "Comfort",   desc: "Private rooms, sit-down dining"      },
];

export const INTERESTS = [
  "Food & Drink",
  "Culture & History",
  "Nature & Outdoors",
  "Adventure & Sports",
  "Nightlife",
  "Shopping",
  "Art & Museums",
  "Beaches",
  "Architecture",
];

export const DIETARY_OPTIONS = [
  "Vegetarian",
  "Vegan",
  "Halal",
  "Kosher",
  "Gluten-free",
  "Nut-free",
  "Dairy-free",
  "No pork",
  "No seafood",
  "Other",
];

export function getTravelPrefs(): TravelPrefs {
  try {
    const stored = localStorage.getItem(KEY);
    if (stored) return JSON.parse(stored) as TravelPrefs;
  } catch {}
  return { pace: "", style: "", interests: [], dietary: [] };
}

export function setTravelPrefs(prefs: TravelPrefs): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(prefs));
  } catch {}
}

export function formatTravelPrefsForPrompt(prefs: TravelPrefs): string {
  const parts: string[] = [];
  if (prefs.pace === "slow")     parts.push("Slow travel pace — max 2 activities per day, leave time to wander and rest");
  if (prefs.pace === "moderate") parts.push("Moderate pace — balanced days, not rushed");
  if (prefs.pace === "fast")     parts.push("Fast pace — pack as much in as possible, busy full days");
  if (prefs.style === "budget")  parts.push("Budget travel — prioritise free sights, street food, local spots over tourist restaurants");
  if (prefs.style === "mid")     parts.push("Mid-range travel — mix of local and comfortable options");
  if (prefs.style === "comfort") parts.push("Comfort travel — prefer sit-down restaurants, private experiences");
  if (prefs.interests.length > 0) parts.push(`Interests: ${prefs.interests.join(", ")}`);
  if (prefs.dietary.length > 0) {
    const dietaryList = prefs.dietary.map((d) =>
      d === "Other" && prefs.dietaryOther?.trim() ? prefs.dietaryOther.trim() : d
    );
    parts.push(`Dietary needs: ${dietaryList.join(", ")} — suggest restaurants and food that cater to this`);
  }
  if (prefs.daily_budget)         parts.push(`Daily budget: ${prefs.daily_budget} ${prefs.currency || "USD"} per day (all-in)`);
  if (prefs.fitness?.trim())      parts.push(`Physical fitness/mobility: ${prefs.fitness.trim()}`);
  if (prefs.avoid?.trim())        parts.push(`Things to avoid: ${prefs.avoid.trim()}`);
  return parts.join(". ");
}
