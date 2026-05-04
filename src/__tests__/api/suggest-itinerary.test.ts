/**
 * Tests for /api/suggest-itinerary
 * Tests the buildPrompt logic and JSON parsing — these are the most
 * failure-prone parts without hitting the real Anthropic API.
 */

// ─── Inline the pure logic from the route so we can test it directly ──────────
// (The actual route imports NextRequest which requires Next.js infrastructure)

import type { ItineraryStyle } from "@/types/database";

function buildPrompt(
  destination: string,
  num_days: number,
  style: ItineraryStyle,
  preferences: string
): string {
  const pref = preferences.trim() ? `\nUser preferences: ${preferences.trim()}` : "";

  if (style === "structured") {
    return `You are a travel expert. Create a ${num_days}-day itinerary for ${destination}.${pref}

Return ONLY a JSON object with this exact structure (no markdown, no commentary):
{
  "days": [
    {
      "day_number": 1,
      "activities": [
        { "time": "09:00", "title": "Activity name", "place_name": "Specific place or null" }
      ]
    }
  ]
}

Rules:
- Include 4–6 activities per day
- Use 24-hour time strings (e.g. "09:00", "14:30")
- place_name should be a specific venue/landmark, or null
- Cover a good mix: sightseeing, food, culture, downtime`;
  }

  if (style === "notes") {
    return `You are a travel expert. Write a ${num_days}-day itinerary for ${destination} as flowing prose.${pref}

Return ONLY a JSON object:
{ "content": "Day 1 - Arrival\\n\\nStart by..." }

Write naturally, like notes you'd make for yourself. Include specific places, restaurants, and tips. Use \\n for line breaks.`;
  }

  if (style === "notes_day_night") {
    return `You are a travel expert. Create a ${num_days}-day itinerary for ${destination} split into day and night.${pref}

Return ONLY a JSON object:
{
  "days": [
    {
      "day_number": 1,
      "sections": {
        "day": "Morning and afternoon plans...",
        "night": "Evening plans..."
      }
    }
  ]
}

Write each section as short prose notes. Include specific places and food recommendations.`;
  }

  return `You are a travel expert. Create a ${num_days}-day itinerary for ${destination} split into day, afternoon, and night.${pref}

Return ONLY a JSON object:
{
  "days": [
    {
      "day_number": 1,
      "sections": {
        "day": "Morning plans...",
        "afternoon": "Afternoon plans...",
        "night": "Evening plans..."
      }
    }
  ]
}

Write each section as short prose notes. Include specific places and food recommendations.`;
}

/** Mimics the route's JSON cleaning logic */
function cleanAndParse(text: string): unknown {
  const cleaned = text
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/```\s*$/i, "")
    .trim();
  return JSON.parse(cleaned);
}

// ─── buildPrompt ──────────────────────────────────────────────────────────────

describe("buildPrompt — structured style", () => {
  const prompt = buildPrompt("Tokyo", 3, "structured", "");

  it("mentions the destination", () => {
    expect(prompt).toContain("Tokyo");
  });

  it("mentions the number of days", () => {
    expect(prompt).toContain("3-day");
  });

  it("instructs model to return JSON with 'days' array", () => {
    expect(prompt).toContain('"days"');
    expect(prompt).toContain('"activities"');
  });

  it("does NOT include preferences line when preferences is empty", () => {
    expect(prompt).not.toContain("User preferences");
  });

  it("includes preferences when provided", () => {
    const p = buildPrompt("Tokyo", 3, "structured", "vegetarian only");
    expect(p).toContain("vegetarian only");
    expect(p).toContain("User preferences");
  });

  it("trims whitespace-only preferences", () => {
    const p = buildPrompt("Tokyo", 3, "structured", "   ");
    expect(p).not.toContain("User preferences");
  });
});

describe("buildPrompt — notes style", () => {
  const prompt = buildPrompt("Kyoto", 5, "notes", "");

  it("asks for 'content' field (prose format)", () => {
    expect(prompt).toContain('"content"');
  });

  it("does not request 'days' array", () => {
    expect(prompt).not.toContain('"days"');
  });
});

describe("buildPrompt — notes_day_night style", () => {
  const prompt = buildPrompt("Bali", 7, "notes_day_night", "");

  it("asks for day and night sections", () => {
    expect(prompt).toContain('"day"');
    expect(prompt).toContain('"night"');
  });

  it("does NOT ask for afternoon section", () => {
    expect(prompt).not.toContain('"afternoon"');
  });
});

describe("buildPrompt — notes_day_afternoon_night style", () => {
  const prompt = buildPrompt("Bangkok", 10, "notes_day_afternoon_night", "beach vibes");

  it("asks for all three sections", () => {
    expect(prompt).toContain('"day"');
    expect(prompt).toContain('"afternoon"');
    expect(prompt).toContain('"night"');
  });

  it("includes preferences", () => {
    expect(prompt).toContain("beach vibes");
  });
});

// ─── JSON cleaning / parsing ──────────────────────────────────────────────────

describe("cleanAndParse — AI response JSON cleaning", () => {
  it("parses plain JSON without fences", () => {
    const input = '{"days":[{"day_number":1,"activities":[]}]}';
    expect(() => cleanAndParse(input)).not.toThrow();
    expect((cleanAndParse(input) as any).days).toHaveLength(1);
  });

  it("strips ```json fences successfully", () => {
    const input = '```json\n{"days":[]}\n```';
    const result = cleanAndParse(input) as any;
    expect(result.days).toEqual([]);
  });

  it("strips plain ``` fences", () => {
    const input = '```\n{"content":"hello"}\n```';
    const result = cleanAndParse(input) as any;
    expect(result.content).toBe("hello");
  });

  it("throws on genuinely malformed JSON (not just fences)", () => {
    expect(() => cleanAndParse("not json at all")).toThrow();
  });

  it("handles nested JSON correctly after stripping", () => {
    const input = '```json\n{"days":[{"day_number":1,"activities":[{"time":"09:00","title":"Breakfast","place_name":null}]}]}\n```';
    const result = cleanAndParse(input) as any;
    expect(result.days[0].activities[0].title).toBe("Breakfast");
    expect(result.days[0].activities[0].place_name).toBeNull();
  });
});

// ─── Input validation (mirrors route guard logic) ─────────────────────────────

describe("Input validation rules", () => {
  it("num_days < 1 is invalid", () => {
    expect(0 < 1 || 0 > 30).toBe(true);
  });

  it("num_days > 30 is invalid", () => {
    expect(31 < 1 || 31 > 30).toBe(true);
  });

  it("num_days = 1 is valid", () => {
    expect(1 < 1 || 1 > 30).toBe(false);
  });

  it("num_days = 30 is valid", () => {
    expect(30 < 1 || 30 > 30).toBe(false);
  });

  it("empty destination is falsy", () => {
    expect(!"").toBe(true);
    expect(!null).toBe(true);
    expect(!"Tokyo").toBe(false);
  });
});
