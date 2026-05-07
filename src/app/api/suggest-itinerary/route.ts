import { NextRequest, NextResponse } from "next/server";
import type { ItineraryStyle } from "@/types/database";

interface SuggestRequest {
  destination: string;
  num_days: number;
  style: ItineraryStyle;
  preferences: string;
  existing_activities: string[];
}

function buildPrompt(destination: string, num_days: number, style: ItineraryStyle, preferences: string, existing_activities: string[]) {
  const pref = preferences.trim() ? `\nUser preferences: ${preferences.trim()}` : "";
  const existing = existing_activities.length > 0
    ? `\nAlready in the itinerary (do NOT repeat these or anything similar): ${existing_activities.join(", ")}`
    : "";

  if (style === "structured") {
    return `You are a travel expert. Create a ${num_days}-day itinerary for ${destination}.${pref}${existing}

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
- Every activity must be a specific named experience — a real place, dish, market, trail, viewpoint, temple, etc. No generic filler like "rest and reflection", "leisurely walk", or vague descriptions like "local dim sum spot"
- Meals: only include if it is a specific named restaurant, street food stall, or night market. Do not add generic "lunch" or "dinner". Be accurate — do not describe a famous chain as a "local" spot, and only suggest venues for meals they actually serve (e.g. do not schedule a dinner restaurant for breakfast)
- No duplicates: do not suggest any place or experience that is already in the itinerary, even under a different title. If Elephant Mountain is already listed, do not suggest it again in any form
- Geographic logic: group activities in the same day by area. If the day includes somewhere that is 45+ minutes from the city centre (e.g. Yangmingshan, Maokong, Jiufen, Yehliu), do not add other distant locations to the same day — allow travel time and keep the rest of the day nearby or at the destination
- Realistic hours: morning markets early, night markets 18:00+, sunrise spots before 07:00, tea houses afternoon/evening, bars and clubs 21:00+. Never schedule a night market or bar before 17:00
- Use 24-hour time strings (e.g. "09:00", "14:30")
- place_name must be the exact venue or landmark name, never null for sightseeing activities`;
  }

  if (style === "notes") {
    return `You are a travel planner writing quick personal notes for a trip to ${destination} (${num_days} days).${pref}${existing}

Return ONLY a JSON object:
{ "content": "Day 1\\n\\n9am - Arrive, check in at hotel. Head to X for lunch.\\n\\nAfternoon - ..." }

Style rules:
- Write like a friend's shorthand notes, not a travel magazine
- No adjectives like "vibrant", "bustling", "enchanting", "stunning", "picturesque", "delightful", or "charming"
- No filler phrases like "immerse yourself", "soak up the atmosphere", "don't miss", or "be sure to"
- Just facts: place names, rough times, what to do, what to eat, practical tips
- Specific named places only — no generic "local restaurant" or "nearby café"
- Realistic timing (night markets from 6pm+, sunrise spots before 7am)
- Use \\n for line breaks`;
  }

  if (style === "notes_day_night") {
    return `You are a travel planner writing quick personal notes for a trip to ${destination} (${num_days} days).${pref}${existing}

Return ONLY a JSON object:
{
  "days": [
    {
      "day_number": 1,
      "sections": {
        "day": "9am Chiang Kai-shek Memorial Hall. Grab lunch at Din Tai Fung (Xinyi). Afternoon: Songshan Cultural Park.",
        "night": "Shilin Night Market from 6pm. Try oyster vermicelli and stinky tofu."
      }
    }
  ]
}

Style rules:
- Short, direct notes — not prose, not a travel article
- No adjectives like "vibrant", "bustling", "enchanting", "stunning", or "charming"
- No filler phrases like "immerse yourself", "soak up", "don't miss"
- Specific named places only. Include rough times where useful.`;
  }

  // notes_day_afternoon_night
  return `You are a travel planner writing quick personal notes for a trip to ${destination} (${num_days} days).${pref}${existing}

Return ONLY a JSON object:
{
  "days": [
    {
      "day_number": 1,
      "sections": {
        "day": "9am Longshan Temple. Walk to Ximending after.",
        "afternoon": "Zhongshan District — check out the design shops on Chifeng St.",
        "night": "Raohe Street Night Market from 6pm."
      }
    }
  ]
}

Style rules:
- Short, direct notes — not prose, not a travel article
- No adjectives like "vibrant", "bustling", "enchanting", "stunning", or "charming"
- No filler phrases like "immerse yourself", "soak up", "don't miss"
- Specific named places only. Include rough times where useful.`;
}

export async function POST(req: NextRequest) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return NextResponse.json({ error: "Not configured" }, { status: 500 });

  const { destination, num_days, style, preferences, existing_activities = [] }: SuggestRequest = await req.json();

  const VALID_STYLES: ItineraryStyle[] = ["structured", "notes", "notes_day_night", "notes_day_afternoon_night"];

  if (!destination || !num_days || num_days < 1 || num_days > 30) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  if (!VALID_STYLES.includes(style)) {
    return NextResponse.json({ error: "Invalid itinerary style" }, { status: 400 });
  }

  const prompt = buildPrompt(destination, num_days, style, preferences ?? "", existing_activities);

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
        model: "claude-haiku-4-5",
        max_tokens: 8192,
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

  // Concatenate all text content blocks (Anthropic can split output across multiple blocks)
  const allText: string = (result.content ?? [])
    .filter((b: { type: string }) => b.type === "text")
    .map((b: { text: string }) => b.text)
    .join("");

  const stopReason: string = result.stop_reason ?? "unknown";

  let text = allText.trim()
    .replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/```\s*$/i, "").trim();

  if (!text) {
    return NextResponse.json({ error: `Empty response from AI (stop_reason: ${stopReason})` }, { status: 500 });
  }

  try {
    return NextResponse.json(JSON.parse(text));
  } catch {
    return NextResponse.json(
      { error: `Truncated response (stop_reason: ${stopReason}): ${text.slice(0, 200)}` },
      { status: 500 }
    );
  }
}
