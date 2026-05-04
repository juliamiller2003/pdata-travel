import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const { currentLocation, destination, preferences } = await req.json();

  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({ error: "AI not configured" }, { status: 500 });
  }

  const prefsLine = preferences?.trim()
    ? `\nTraveler preferences: ${preferences.trim()}`
    : "";

  const prompt = `You are a travel expert specialising in ground-level transport for independent travelers and backpackers.

The traveler is currently in ${currentLocation} (part of a trip to ${destination}).${prefsLine}

Suggest exactly 3 nearby places they could visit next — a mix of day trips and short multi-day options. Prioritise destinations reachable by public transport (train, bus, ferry, tuk-tuk). Include realistic fares and schedules.

Respond with ONLY valid JSON — no markdown, no explanation:
{
  "suggestions": [
    {
      "destination": "City or place name",
      "tagline": "One punchy sentence selling the destination",
      "distance": "Approximate distance and direction, e.g. 90km north",
      "why": "2 sentences on what makes it worth visiting from here",
      "transport": "Primary transport mode(s), e.g. Train, Bus, Ferry",
      "fare": "Realistic fare range with currency, e.g. $3–8 USD / 100–250 THB",
      "schedule": "Departure frequency or specific times, e.g. Buses every 30 min from 06:00–20:00",
      "duration": "Journey time, e.g. 2–3 hours"
    }
  ]
}`;

  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": process.env.ANTHROPIC_API_KEY,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 1024,
      messages: [{ role: "user", content: prompt }],
    }),
  });

  if (!response.ok) {
    return NextResponse.json({ error: "Failed to reach AI" }, { status: 500 });
  }

  const data = await response.json();
  const text: string = data.content?.[0]?.text ?? "";
  const cleaned = text.replace(/^```(?:json)?\n?/m, "").replace(/\n?```$/m, "").trim();

  try {
    const parsed = JSON.parse(cleaned);
    return NextResponse.json(parsed);
  } catch {
    return NextResponse.json({ error: "Unexpected AI response" }, { status: 500 });
  }
}
