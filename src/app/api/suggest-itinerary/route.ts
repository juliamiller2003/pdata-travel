import { NextRequest, NextResponse } from "next/server";
import type { ItineraryStyle } from "@/types/database";

interface SuggestRequest {
  destination: string;
  num_days: number;
  style: ItineraryStyle;
  preferences: string;
}

function buildPrompt(destination: string, num_days: number, style: ItineraryStyle, preferences: string) {
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

  // notes_day_afternoon_night
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

export async function POST(req: NextRequest) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return NextResponse.json({ error: "Not configured" }, { status: 500 });

  const { destination, num_days, style, preferences }: SuggestRequest = await req.json();

  const VALID_STYLES: ItineraryStyle[] = ["structured", "notes", "notes_day_night", "notes_day_afternoon_night"];

  if (!destination || !num_days || num_days < 1 || num_days > 30) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  if (!VALID_STYLES.includes(style)) {
    return NextResponse.json({ error: "Invalid itinerary style" }, { status: 400 });
  }

  const prompt = buildPrompt(destination, num_days, style, preferences ?? "");

  let anthropicRes: Response;
  try {
    anthropicRes = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 4096,
        messages: [{ role: "user", content: prompt }],
      }),
    });
  } catch (err) {
    return NextResponse.json({ error: `Network error reaching AI: ${String(err)}` }, { status: 502 });
  }

  if (!anthropicRes.ok) {
    const errText = await anthropicRes.text().catch(() => "");
    return NextResponse.json(
      { error: `AI request failed (${anthropicRes.status}): ${errText.slice(0, 200)}` },
      { status: 500 }
    );
  }

  const result = await anthropicRes.json();
  let text: string = result.content?.[0]?.text?.trim() ?? "";
  text = text.replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/```\s*$/i, "").trim();

  if (!text) return NextResponse.json({ error: "Empty response from AI" }, { status: 500 });

  try {
    return NextResponse.json(JSON.parse(text));
  } catch {
    return NextResponse.json({ error: `Failed to parse AI response: ${text.slice(0, 200)}` }, { status: 500 });
  }
}
