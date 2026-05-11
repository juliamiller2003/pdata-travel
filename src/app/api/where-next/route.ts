import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const { currentLocation, destination, preferences, user_style, user_pace, trip_countries, trip_start_date } = await req.json();

  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({ error: "AI not configured" }, { status: 500 });
  }

  const prefsLine = preferences?.trim()
    ? `\nTraveler preferences: ${preferences.trim()}`
    : "";

  // Budget context
  const budgetMode =
    user_style === "budget" ? "budget"
    : user_style === "mid"  ? "mid-range"
    : user_style === "comfort" ? "comfort"
    : null;

  const budgetRule =
    user_style === "budget"
      ? `BUDGET TRAVELER: Only suggest destinations where you can survive on under $30/day. Hostels must be available. Prioritise places with cheap street food scenes, free or near-free sights, and cheap public transport links. Skip any destination that is inherently expensive (island resorts, ski towns, places with no hostel infrastructure).`
    : user_style === "mid"
      ? `MID-RANGE TRAVELER: Suggest places with a good range of guesthouses and local restaurants in the $30–80/day range. No luxury resorts or budget-hostile destinations.`
    : user_style === "comfort"
      ? `COMFORT TRAVELER: Suggest quality destinations — boutique hotels, good food scenes, private transfers available. Skip backpacker ghetto towns.`
    : "";

  // Route context for multi-country trips
  const countries = (trip_countries ?? []).filter(Boolean);
  const routeLine = countries.length > 1
    ? `\nFull trip route: ${countries.join(" → ")}. The traveler is at ${currentLocation} and moving onward — suggest destinations that fit logically into this overland journey, not detours that require major backtracking.`
    : "";

  // Season hint
  let seasonLine = "";
  if (trip_start_date) {
    try {
      const d = new Date(trip_start_date + "T00:00:00");
      const month = d.toLocaleString("en-US", { month: "long" });
      seasonLine = `\nTravel month: ${month} — factor in seasonal weather and road/ferry conditions.`;
    } catch {}
  }

  const prompt = `You are a travel expert specialising in overland travel and independent backpacker routes.

The traveler is currently in ${currentLocation} (part of a trip to ${destination}).${routeLine}${seasonLine}${prefsLine}
${budgetRule ? `\n${budgetRule}` : ""}

Suggest exactly 3 places they could move on to next. Requirements:
- Prioritise overland connections (train, bus, shared minivan, ferry) over flying — include realistic fares and timetables
- Favour destinations that appear on established backpacker circuits and have strong independent traveler infrastructure
- Include at least one lesser-known or off-the-beaten-path option — not the first result on a Google search
- Consider land border crossings where relevant and practical
- Vary the suggestions: one nearby easy option, one slightly further or more adventurous option, one that might surprise them${budgetMode ? `\n- Match suggestions to ${budgetMode} travel — every suggestion must be realistic for that budget level` : ""}
- If there are land borders between ${currentLocation} and the suggested place, briefly mention if crossing is straightforward or requires planning

Respond with ONLY valid JSON — no markdown, no explanation:
{
  "suggestions": [
    {
      "destination": "City or place name",
      "tagline": "One punchy sentence selling the destination",
      "distance": "Approximate distance and direction, e.g. 90km north",
      "why": "2 sentences on what makes it worth visiting from here — be specific, not generic",
      "transport": "Primary transport mode(s), e.g. Overnight train, Shared minivan, Ferry",
      "fare": "Realistic fare range with local currency if known, e.g. $3–8 USD / 100–250 THB",
      "schedule": "Departure frequency or specific times, e.g. Buses every 30 min from 06:00–20:00",
      "duration": "Journey time, e.g. 2–3 hours",
      "border_note": "Brief note on any land border crossing required, or null if none"
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
      max_tokens: 1500,
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
