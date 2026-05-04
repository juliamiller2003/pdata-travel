import {
  effectiveStatus,
  formatDate,
  formatDayDate,
  computeDuration,
  stripMarkdownFences,
} from "@/lib/tripUtils";

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Returns a date string offset from today by `days` (negative = past). */
function dateOffset(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

const TODAY = dateOffset(0);
const YESTERDAY = dateOffset(-1);
const TOMORROW = dateOffset(1);
const PAST = "2020-01-01";
const FUTURE = "2099-12-31";

// ─── effectiveStatus ──────────────────────────────────────────────────────────

describe("effectiveStatus", () => {
  it("always returns 'cancelled' regardless of dates", () => {
    expect(
      effectiveStatus({ status: "cancelled", start_date: FUTURE, end_date: FUTURE })
    ).toBe("cancelled");
  });

  it("returns 'completed' when trip end date is in the past and status is planning", () => {
    expect(
      effectiveStatus({ status: "planning", start_date: PAST, end_date: YESTERDAY })
    ).toBe("completed");
  });

  it("does NOT auto-complete when status is already 'completed'", () => {
    expect(
      effectiveStatus({ status: "completed", start_date: PAST, end_date: YESTERDAY })
    ).toBe("completed");
  });

  it("returns 'ongoing' when today is between start and end and status is planning", () => {
    expect(
      effectiveStatus({ status: "planning", start_date: YESTERDAY, end_date: TOMORROW })
    ).toBe("ongoing");
  });

  it("returns 'ongoing' when trip starts today (first day counts)", () => {
    expect(
      effectiveStatus({ status: "planning", start_date: TODAY, end_date: TOMORROW })
    ).toBe("ongoing");
  });

  it("does NOT mark as ongoing if status is already 'ongoing'", () => {
    // ongoing stays ongoing — no double-transition
    expect(
      effectiveStatus({ status: "ongoing", start_date: YESTERDAY, end_date: TOMORROW })
    ).toBe("ongoing");
  });

  it("resets 'completed' to 'planning' when end date is moved to the future", () => {
    expect(
      effectiveStatus({ status: "completed", start_date: TOMORROW, end_date: FUTURE })
    ).toBe("planning");
  });

  it("resets 'completed' to 'ongoing' when dates now straddle today", () => {
    expect(
      effectiveStatus({ status: "completed", start_date: YESTERDAY, end_date: TOMORROW })
    ).toBe("ongoing");
  });

  it("keeps 'completed' when end date is still in the past (no change needed)", () => {
    expect(
      effectiveStatus({ status: "completed", start_date: PAST, end_date: YESTERDAY })
    ).toBe("completed");
  });

  it("keeps 'completed' with no dates (manually set, can't evaluate)", () => {
    expect(
      effectiveStatus({ status: "completed", start_date: null, end_date: null })
    ).toBe("completed");
  });

  it("returns 'planning' when trip is in the future", () => {
    expect(
      effectiveStatus({ status: "planning", start_date: TOMORROW, end_date: FUTURE })
    ).toBe("planning");
  });

  it("handles null dates — returns stored status unchanged", () => {
    expect(
      effectiveStatus({ status: "planning", start_date: null, end_date: null })
    ).toBe("planning");
  });

  it("returns 'completed' with null start but past end", () => {
    expect(
      effectiveStatus({ status: "planning", start_date: null, end_date: YESTERDAY })
    ).toBe("completed");
  });

  it("does not return 'ongoing' on the day AFTER the end date", () => {
    expect(
      effectiveStatus({ status: "planning", start_date: PAST, end_date: YESTERDAY })
    ).toBe("completed"); // past end → completed, not ongoing
  });
});

// ─── formatDate ───────────────────────────────────────────────────────────────

describe("formatDate", () => {
  it("returns em-dash for null", () => {
    expect(formatDate(null)).toBe("—");
  });

  it("formats a known date correctly (locale en-US)", () => {
    expect(formatDate("2025-03-14")).toBe("March 14, 2025");
  });

  it("formats first-of-month correctly", () => {
    expect(formatDate("2025-01-01")).toBe("January 1, 2025");
  });

  it("does not produce wrong day due to UTC midnight parsing", () => {
    // This was a bug: new Date("2025-01-01") parses as UTC midnight
    // which in negative-offset timezones (e.g. UTC-5) becomes Dec 31.
    // The fix: parse with T00:00:00 to force local time.
    const result = formatDate("2025-01-01");
    expect(result).toContain("2025");
    expect(result).toContain("January");
    expect(result).toContain("1");
  });
});

// ─── formatDayDate ────────────────────────────────────────────────────────────

describe("formatDayDate", () => {
  it("returns null for null input", () => {
    expect(formatDayDate(null)).toBeNull();
  });

  it("formats as 'Mon DD' (short month, no year)", () => {
    const result = formatDayDate("2025-07-04");
    expect(result).toContain("Jul");
    expect(result).toContain("4");
    expect(result).not.toContain("2025");
  });

  it("does not produce wrong day due to UTC parsing", () => {
    const result = formatDayDate("2025-01-01");
    expect(result).toContain("Jan");
  });
});

// ─── computeDuration ─────────────────────────────────────────────────────────

describe("computeDuration", () => {
  it("returns null when start is null", () => {
    expect(computeDuration(null, "2025-03-14")).toBeNull();
  });

  it("returns null when end is null", () => {
    expect(computeDuration("2025-03-01", null)).toBeNull();
  });

  it("returns null when both are null", () => {
    expect(computeDuration(null, null)).toBeNull();
  });

  it("returns 1 for a same-day trip", () => {
    expect(computeDuration("2025-03-14", "2025-03-14")).toBe(1);
  });

  it("returns 2 for a one-night trip", () => {
    expect(computeDuration("2025-03-14", "2025-03-15")).toBe(2);
  });

  it("returns 14 for a two-week trip", () => {
    expect(computeDuration("2025-03-01", "2025-03-14")).toBe(14);
  });

  it("clamps to minimum of 1 even if end is before start (defensive)", () => {
    // End before start is a user error, but we should not return 0 or negative
    expect(computeDuration("2025-03-14", "2025-03-01")).toBeGreaterThanOrEqual(1);
  });

  it("handles month boundaries correctly", () => {
    expect(computeDuration("2025-01-30", "2025-02-02")).toBe(4);
  });

  it("handles year boundaries correctly", () => {
    expect(computeDuration("2024-12-28", "2025-01-04")).toBe(8);
  });
});

// ─── stripMarkdownFences ──────────────────────────────────────────────────────

describe("stripMarkdownFences", () => {
  it("strips ```json fences", () => {
    const input = "```json\n{\"key\": \"value\"}\n```";
    expect(stripMarkdownFences(input)).toBe('{"key": "value"}');
  });

  it("strips plain ``` fences", () => {
    const input = "```\n{\"key\": \"value\"}\n```";
    expect(stripMarkdownFences(input)).toBe('{"key": "value"}');
  });

  it("leaves plain JSON untouched", () => {
    const input = '{"key": "value"}';
    expect(stripMarkdownFences(input)).toBe('{"key": "value"}');
  });

  it("handles extra whitespace/newlines around JSON", () => {
    const input = "  \n{\"key\": \"value\"}\n  ";
    expect(stripMarkdownFences(input)).toBe('{"key": "value"}');
  });

  it("result can be parsed by JSON.parse after stripping", () => {
    const cases = [
      "```json\n{\"a\":1}\n```",
      "```\n[1,2,3]\n```",
      '{"a":1}',
    ];
    for (const c of cases) {
      expect(() => JSON.parse(stripMarkdownFences(c))).not.toThrow();
    }
  });
});
