export type ClockFormat = "12h" | "24h";
export const CLOCK_FORMAT_KEY = "pathway-clock-format";
export const DEFAULT_CLOCK_FORMAT: ClockFormat = "12h";

export function getClockFormat(): ClockFormat {
  if (typeof window === "undefined") return DEFAULT_CLOCK_FORMAT;
  return (localStorage.getItem(CLOCK_FORMAT_KEY) as ClockFormat) ?? DEFAULT_CLOCK_FORMAT;
}

export function setClockFormat(format: ClockFormat): void {
  localStorage.setItem(CLOCK_FORMAT_KEY, format);
}

export function formatActivityTime(time: string | null, format: ClockFormat): string {
  if (!time) return "—";
  const [h, m] = time.slice(0, 5).split(":").map(Number);
  if (format === "12h") {
    const ampm = h >= 12 ? "PM" : "AM";
    const hour = h % 12 || 12;
    return `${hour}:${String(m).padStart(2, "0")} ${ampm}`;
  }
  return time.slice(0, 5);
}
