import { NextRequest, NextResponse } from "next/server";
import type { ItineraryStyle } from "@/types/database";

interface SuggestRequest {
  destination: string;
  num_days: number;
  style: ItineraryStyle;
  preferences: string;
  existing_activities: string[];
  existing_day_count: number;
  existing_notes?: string;
  travel_events?: string;
}

function buildPrompt(destination: string, num_days: number, style: ItineraryStyle, preferences: string, existing_activities: string[], existing_day_count: number, existing_notes?: string, travel_events?: string) {
  const pref = preferences.trim() ? `\nUser preferences: ${preferences.trim()}` : "";
  const existing = existing_activities.length > 0
    ? `\nBanned — do NOT suggest any of these or anything at the same venue, even under a different name or framing: ${existing_activities.join(", ")}`
    : "";
  const existingNotesContext = existing_notes?.trim()
    ? `\nAlready planned (do NOT repeat any place, venue, market, restaurant, or activity already mentioned here):\n${existing_notes.trim()}`
    : "";
  const travelEventsContext = travel_events?.trim()
    ? `\nFixed travel schedule (flights and transport already booked — schedule activities around these):\n${travel_events.trim()}`
    : "";
  const startDay = existing_day_count + 1;
  const tripContext = existing_day_count > 0
    ? `This trip already has ${existing_day_count} day${existing_day_count === 1 ? "" : "s"} planned. Generate ${num_days} additional day${num_days === 1 ? "" : "s"} starting from Day ${startDay}.`
    : `Generate a ${num_days}-day itinerary.`;

  if (style === "structured") {
    return `You are a travel expert planning a trip to ${destination}. ${tripContext}${pref}${existing}${existingNotesContext}${travelEventsContext}

Return ONLY a JSON object with this exact structure (no markdown, no commentary):
{
  "days": [
    {
      "day_number": ${startDay},
      "activities": [
        { "time": "09:00", "title": "Activity name", "place_name": "Specific place or null" }
      ]
    }
  ]
}

Rules:
- Include 4–6 activities per day
- SPECIFICITY IS MANDATORY: Every single activity must be a real, named place or experience that exists. Use the actual name — not a category or description of it. Bad examples that will be rejected: "Taipei culture and food workshop", "local cooking class", "beverage tasting", "learn traditional cuisine", "local market visit", "temple tour", "scenic viewpoint". Good examples: "Longshan Temple", "Addiction Aquatic Development seafood market", "Raw restaurant", "Beitou Hot Spring Museum", "Wistaria Tea House", "Raohe Street Night Market"
- If you suggest a cooking class, name the specific school or operator (e.g. "Taipei Homecooking"). If you suggest a food experience, name the exact dish and stall or restaurant
- Meals: only include if it is a specific named restaurant or stall. No generic "lunch", "dinner", "food tour", or "tasting". Only suggest a venue for a meal they actually serve
- No duplicates: do not suggest any place or experience already in the itinerary, even under a different title
- Vary restaurants and food stops every time — do not default to famous tourist staples. If Din Tai Fung, Shilin Night Market, or any chain has already been suggested, pick something genuinely different. Favour neighbourhood spots and less-covered options
- GEOGRAPHIC COHERENCE IS MANDATORY: Before assigning activities to days, mentally map ${destination} and divide it into distinct zones or neighbourhoods. Assign each day one primary zone — every activity that day must be within easy reach of that zone (walkable, or a single short transit/taxi ride). Never mix activities from opposite ends of a city or region in the same day. A day's activities should read as a logical route, not a scatter across a map. If the destination is a large area (island, coastal strip, multiple districts), dedicate each day to one geographic section and move systematically — never bounce back to an area already covered
- TRAVEL EVENTS: If a day has a flight or transport in the fixed schedule above, only suggest activities that fit around it. Arrival day: start activities from the arrival time, choosing things close to the arrival airport or city centre. Departure day: only suggest activities before the departure time, allowing at least 2 hours to reach the airport or station. Transit day (departs and arrives): plan only at the destination after arrival. Do not suggest any activity that overlaps with or immediately precedes a departure
- Realistic hours: morning markets early, night markets 18:00+, sunrise spots before 07:00, tea houses afternoon/evening, bars and clubs 21:00+. Never schedule a night market or bar before 17:00
- Use 24-hour time strings (e.g. "09:00", "14:30")
- place_name must be the exact venue or landmark name, never null for sightseeing activities`;
  }

  if (style === "notes") {
    return `You are a travel planner writing quick personal notes for a trip to ${destination}. ${tripContext}${pref}${existing}${existingNotesContext}${travelEventsContext}

Return ONLY a JSON object:
{ "content": "Day ${startDay}\\n\\n9am - ...\\n\\nAfternoon - ..." }

Style rules:
- Write like a friend's shorthand notes, not a travel magazine
- No adjectives like "vibrant", "bustling", "enchanting", "stunning", "picturesque", "delightful", or "charming"
- No filler phrases like "immerse yourself", "soak up the atmosphere", "don't miss", or "be sure to"
- Just facts: place names, rough times, what to do, what to eat, practical tips
- SPECIFICITY IS MANDATORY: every place must be a real named venue — no "local cooking class", "beverage tasting", "food workshop", "temple tour", or any other category label. Use the actual name of the place
- GEOGRAPHIC COHERENCE: each day must be anchored to one zone or neighbourhood of ${destination}. All places that day must be reachable from each other without major backtracking. If the destination covers a large area, move through it systematically — one section per day, never bouncing between distant areas
- TRAVEL EVENTS: if a day has a flight or transport in the fixed schedule above, mention it in the notes and only suggest activities that fit around it. Arrival day: activities from arrival time onward. Departure day: activities only before departure, with time to reach the airport/station
- Realistic timing (night markets from 6pm+, sunrise spots before 7am)
- Use \\n for line breaks`;
  }

  if (style === "notes_day_night") {
    return `You are a travel planner writing quick personal notes for a trip to ${destination}. ${tripContext}${pref}${existing}${existingNotesContext}${travelEventsContext}

Return ONLY a JSON object:
{
  "days": [
    {
      "day_number": ${startDay},
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
- SPECIFICITY IS MANDATORY: every place must be a real named venue — not "cooking class", "beverage tasting", "food workshop", or any category label. Use the actual name
- GEOGRAPHIC COHERENCE: each day must be anchored to one zone or neighbourhood of ${destination}. All places that day must be reachable from each other without major backtracking. If the destination covers a large area, move through it systematically — one section per day, never bouncing between distant areas
- TRAVEL EVENTS: if a day has a flight or transport in the fixed schedule above, note it and only fill sections with activities that fit around it. Arrival day: day/night activities from arrival time onward. Departure day: day activities only before departure
- Include rough times where useful`;
  }

  // notes_day_afternoon_night
  return `You are a travel planner writing quick personal notes for a trip to ${destination}. ${tripContext}${pref}${existing}${existingNotesContext}${travelEventsContext}

Return ONLY a JSON object:
{
  "days": [
    {
      "day_number": ${startDay},
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
- SPECIFICITY IS MANDATORY: every place must be a real named venue — not "cooking class", "beverage tasting", "food workshop", or any category label. Use the actual name
- GEOGRAPHIC COHERENCE: each day must be anchored to one zone or neighbourhood of ${destination}. All places that day must be reachable from each other without major backtracking. If the destination covers a large area, move through it systematically — one section per day, never bouncing between distant areas
- TRAVEL EVENTS: if a day has a flight or transport in the fixed schedule above, note it and only fill sections with activities that fit around it. Arrival day: populate only afternoon/night (or whichever sections fall after arrival). Departure day: populate only day/morning sections before departure
- Include rough times where useful`;
}

export async function POST(req: NextRequest) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return NextResponse.json({ error: "Not configured" }, { status: 500 });

  const { destination, num_days, style, preferences, existing_activities = [], existing_day_count = 0, existing_notes = "", travel_events = "" }: SuggestRequest = await req.json();

  const VALID_STYLES: ItineraryStyle[] = ["structured", "notes", "notes_day_night", "notes_day_afternoon_night"];

  if (!destination || !num_days || num_days < 1 || num_days > 30) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  if (!VALID_STYLES.includes(style)) {
    return NextResponse.json({ error: "Invalid itinerary style" }, { status: 400 });
  }

  const prompt = buildPrompt(destination, num_days, style, preferences ?? "", existing_activities, existing_day_count, existing_notes, travel_events);

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
