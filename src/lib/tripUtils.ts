import type { TripStatus } from "@/types/database";

// ─── Trip status ───────────────────────────────────────────────────────────────

/**
 * Derives the display status of a trip from its dates without touching the DB.
 * Used in TripCard, trip detail page, and any place that needs effective status.
 */
export function effectiveStatus(trip: {
  status: string;
  start_date: string | null;
  end_date: string | null;
}): TripStatus {
  const stored = trip.status as TripStatus;
  if (stored === "cancelled") return "cancelled";

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Parse dates as local midnight (T00:00:00) to avoid UTC offset shifting the day
  const end   = trip.end_date   ? new Date(trip.end_date   + "T00:00:00") : null;
  const start = trip.start_date ? new Date(trip.start_date + "T00:00:00") : null;
  if (end)   end.setHours(0, 0, 0, 0);
  if (start) start.setHours(0, 0, 0, 0);

  // End date is in the past → always completed, regardless of stored status
  if (end && today > end) return "completed";

  // Today is within the trip window → ongoing
  if (start && today >= start && (!end || today <= end)) return "ongoing";

  // Dates are in the future: a stored "completed" or "ongoing" is now stale — reset to planning
  if (end && today <= end && (stored === "completed" || stored === "ongoing")) return "planning";

  return stored;
}

// ─── Date formatting ───────────────────────────────────────────────────────────

/** Formats a YYYY-MM-DD date string as "January 1, 2025". Returns "—" for null. */
export function formatDate(d: string | null): string {
  if (!d) return "—";
  return new Date(d + "T00:00:00").toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

/** Formats a YYYY-MM-DD date string as "Jan 1". Returns null for null input. */
export function formatDayDate(date: string | null): string | null {
  if (!date) return null;
  return new Date(date + "T00:00:00").toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

// ─── Duration ─────────────────────────────────────────────────────────────────

/**
 * Computes the number of days between two YYYY-MM-DD strings (inclusive).
 * Returns null if either date is missing. Minimum return value is 1.
 */
export function computeDuration(
  start: string | null,
  end: string | null
): number | null {
  if (!start || !end) return null;
  const diff = Math.round(
    (new Date(end + "T00:00:00").getTime() -
      new Date(start + "T00:00:00").getTime()) /
      (1000 * 60 * 60 * 24)
  ) + 1;
  return Math.max(1, diff);
}

// ─── JSON cleaning ─────────────────────────────────────────────────────────────

/**
 * Strips markdown code fences from AI responses before JSON.parse.
 * Handles ```json ... ``` and ``` ... ``` wrapping.
 */
export function stripMarkdownFences(text: string): string {
  return text
    .replace(/^```(?:json)?\s*/im, "")
    .replace(/\s*```\s*$/im, "")
    .trim();
}
