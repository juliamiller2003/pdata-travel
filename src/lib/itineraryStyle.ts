import type { ItineraryStyle } from "@/types/database";

export const ITINERARY_STYLE_KEY = "pathway-default-itinerary-style";
export const DEFAULT_ITINERARY_STYLE: ItineraryStyle = "structured";

export const ITINERARY_STYLE_OPTIONS: { value: ItineraryStyle; label: string; desc: string }[] = [
  { value: "structured",                label: "Structured",             desc: "Timed activities per day" },
  { value: "notes",                     label: "Free notes",             desc: "One open text area" },
  { value: "notes_day_night",           label: "Day & Night",            desc: "Notes split by day and night" },
  { value: "notes_day_afternoon_night", label: "Day, Afternoon & Night", desc: "Notes in three parts" },
];

export function getDefaultItineraryStyle(): ItineraryStyle {
  if (typeof window === "undefined") return DEFAULT_ITINERARY_STYLE;
  return (localStorage.getItem(ITINERARY_STYLE_KEY) as ItineraryStyle) ?? DEFAULT_ITINERARY_STYLE;
}

export function setDefaultItineraryStyle(style: ItineraryStyle): void {
  localStorage.setItem(ITINERARY_STYLE_KEY, style);
}
