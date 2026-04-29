export const TRIP_SECTIONS = [
  { key: "itinerary", label: "Itinerary" },
  { key: "map",       label: "Trip Map" },
  { key: "flights",   label: "Flights" },
  { key: "expenses",  label: "Budget & Expenses" },
  { key: "journal",   label: "Journal & Photos" },
] as const;

export type SectionKey = (typeof TRIP_SECTIONS)[number]["key"];

const STORAGE_KEY = "trip_sections_visible";

export function getSectionVisibility(): Record<SectionKey, boolean> {
  if (typeof window === "undefined") return defaultVisibility();
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return { ...defaultVisibility(), ...JSON.parse(raw) };
  } catch {}
  return defaultVisibility();
}

export function setSectionVisibility(prefs: Record<SectionKey, boolean>) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
}

function defaultVisibility(): Record<SectionKey, boolean> {
  return { itinerary: true, map: true, flights: true, expenses: true, journal: true };
}
