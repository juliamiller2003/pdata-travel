import { NextRequest, NextResponse } from "next/server";
import { anthropicFetch } from "@/lib/anthropicFetch";
import type { ItineraryStyle } from "@/types/database";

export const maxDuration = 60;

const SYSTEM_PROMPT = `You are a seasoned backpacker and travel planner who has traveled solo through 50+ countries on a budget. You give recommendations the way a well-traveled friend would — specific, honest, and practical.

Your recommendations always:
- Prioritise authentic local experiences over tourist traps
- Suggest budget options first (hostels, street food, local transport)
- Include realistic time and cost estimates in local currency
- Flag common scams or mistakes first-time visitors make
- Recommend the best free or cheap activities alongside paid ones
- Suggest the best time of day to visit crowded spots

Avoid:
- Generic advice found on any travel blog
- Recommending anything primarily aimed at resort or luxury tourists
- Vague suggestions like "explore the old town" without specifics
- Over-scheduling — backpackers need flex time and spontaneity
- Parenthetical additions — never write "Place Name (description)" or add any (clarification) after a name or instruction. State things plainly without brackets.

Never suggest:
- Any restaurant or attraction that primarily caters to tourists (Hard Rock Cafe, rooftop bars in tourist districts, "international cuisine")
- Grab/Uber/taxi when public transit or a tuk-tuk exists
- Guided tours or "experiences" that require advance booking, unless there is genuinely no alternative or it is a true highlight
- Anything described as "luxury", "premium", or "five-star"
- Generic hotel-area restaurants

Always prefer:
- Street food stalls and local markets over sit-down restaurants
- Neighbourhoods where travellers and locals mix (not expat or tourist enclaves)
- Free or under-$5 activities where possible
- Public transit with the actual route (bus number, line name, fare)
- Spots with a social atmosphere where you might meet other travellers`;

interface SuggestRequest {
  destination: string;
  num_days: number;
  style: ItineraryStyle;
  preferences: string;
  existing_activities: string[];
  existing_day_count: number;
  existing_notes?: string;
  travel_events?: string;
  user_pace?: string;
  user_style?: string;
  trip_start_date?: string;
  trip_end_date?: string;
  trip_countries?: string[];
  daily_budget?: number | null;
  currency?: string;
  fitness?: string;
  avoid?: string;
  journal_profile?: string;
}

// ── Pace & style rules ────────────────────────────────────────────────────────

function paceRule(pace: string | undefined, format: "structured" | "notes"): string {
  if (format === "structured") {
    if (pace === "slow")     return "SLOW PACE — include exactly 2–3 activities per day. Gaps are intentional. Do not fill the day — leave room for wandering, sitting at a café, or spontaneous detours. Fewer, better things.";
    if (pace === "fast")     return "FAST PACE — include 6–7 activities per day. Pack the schedule tightly. The traveller wants to see as much as possible.";
    if (pace === "moderate") return "MODERATE PACE — include 4–5 activities per day. Balanced days with enough space to breathe.";
    return "Include 4–6 activities per day";
  } else {
    // notes formats
    if (pace === "slow")     return "SLOW PACE: keep each day to 2–3 things. Short notes, lots of breathing room.";
    if (pace === "fast")     return "FAST PACE: pack the day with 6–7 things. Tight schedule, no slack.";
    if (pace === "moderate") return "MODERATE PACE: 4–5 things per day.";
    return "Aim for 4–5 things per day";
  }
}

function styleRule(style: string | undefined): string {
  if (style === "budget") {
    return `BUDGET TRAVEL — apply these rules strictly:
  · Every activity must be free or have an entry fee under $5. If a paid sight is genuinely unmissable, note its cost — otherwise find the free version.
  · For food: name only street food stalls, hawker centres, wet markets, or tiny local spots. Never suggest a sit-down restaurant unless it is explicitly known as cheap and local (e.g. a $2 noodle stall). No cafés marketed to tourists, no brunch spots, no "renowned" restaurants.
  · Transport: always suggest the cheapest option — public bus, metro, shared songthaew, walking. Never suggest Grab/Uber/taxi when public transit exists.
  · Skip paid tours entirely. Self-guided is always preferred.`;
  }
  if (style === "mid") {
    return `MID-RANGE TRAVEL — apply these rules:
  · Mix of free sights and affordable local restaurants. No luxury experiences, no tourist-priced venues.
  · Food should be places locals actually eat — not tourist-strip restaurants. Keep dining choices under roughly $15/meal.
  · Taxis/ride-share are fine occasionally, but lean toward public transit.`;
  }
  if (style === "comfort") {
    return `COMFORT TRAVEL — apply these rules:
  · Private experiences, guided tours, and sit-down restaurants are all fine.
  · Still avoid generic tourist traps, overpriced hotel restaurants, and anything that exists purely for tourists. Quality over price.
  · Ride-share and taxis are expected.`;
  }
  return "";
}

// ── Destination context ───────────────────────────────────────────────────────

function buildDestinationContext(
  destination: string,
  num_days: number,
  existing_day_count: number,
  trip_start_date?: string,
  trip_countries?: string[]
): string {
  const totalDays = existing_day_count + num_days;

  // Travel month from start date
  let monthContext = "";
  if (trip_start_date) {
    try {
      const d = new Date(trip_start_date + "T00:00:00");
      const month = d.toLocaleString("en-US", { month: "long" });
      const year = d.getFullYear();
      monthContext = `Travel month: ${month} ${year} — account for seasonal weather, crowd levels, and local events. Avoid outdoor activities that are impractical this time of year; suggest weather-appropriate alternatives.`;
    } catch {}
  }

  // Route context for multi-country trips
  let routeContext = "";
  const countries = (trip_countries ?? []).filter(Boolean);
  if (countries.length > 1) {
    routeContext = `Route context: This ${totalDays}-day trip passes through multiple countries (${countries.join(" → ")}). The traveler is planning the ${destination} leg of a longer journey — suggest activities suited to someone passing through, not just a dedicated visitor. Favour experiences that are efficient and don't require backtracking. Skip anything that requires multi-day commitment unless the days available for this leg allow it.`;
  } else if (totalDays > 0) {
    routeContext = `Trip length: ${totalDays} day${totalDays === 1 ? "" : "s"} in ${destination}.`;
  }

  const lines = [routeContext, monthContext].filter(Boolean);
  return lines.length > 0 ? "\n" + lines.join("\n") : "";
}

function buildPrompt(
  destination: string,
  num_days: number,
  style: ItineraryStyle,
  preferences: string,
  existing_activities: string[],
  existing_day_count: number,
  existing_notes?: string,
  travel_events?: string,
  user_pace?: string,
  user_style?: string,
  trip_start_date?: string,
  trip_countries?: string[],
  daily_budget?: number | null,
  currency?: string,
  fitness?: string,
  avoid?: string,
  journal_profile?: string,
) {
  const destContext = buildDestinationContext(destination, num_days, existing_day_count, trip_start_date, trip_countries);
  const pref = preferences.trim() ? `\nUser preferences: ${preferences.trim()}` : "";
  const budgetLine = daily_budget
    ? `\nDaily budget: ${daily_budget} ${currency || "USD"} per day (all-in)`
    : "";
  const fitnessLine = fitness?.trim()
    ? `\nPhysical fitness/mobility: ${fitness.trim()}`
    : "";
  const avoidLine = avoid?.trim()
    ? `\nThings to avoid: ${avoid.trim()}`
    : "";
  const journalLine = journal_profile?.trim()
    ? `\nPersonalisation from past trips: ${journal_profile.trim()}`
    : "";
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

  const styleLine = styleRule(user_style);

  if (style === "structured") {
    const paceLine = paceRule(user_pace, "structured");
    return `You are a travel expert planning a trip to ${destination}. ${tripContext}${destContext}${pref}${budgetLine}${fitnessLine}${avoidLine}${journalLine}${existing}${existingNotesContext}${travelEventsContext}

Before generating the itinerary, write the traveler_note field first — briefly note what kind of traveler this destination suits and the biggest mistake first-timers make. This shapes the entire itinerary.

Return ONLY a JSON object with this exact structure (no markdown, no commentary):
{
  "traveler_note": "One sentence on what kind of traveler this destination suits and the single biggest mistake first-timers make here",
  "days": [
    {
      "day_number": ${startDay},
      "activities": [
        {
          "time": "09:00",
          "title": "Activity name",
          "place_name": "Specific venue or landmark name",
          "cost": "Free / 40 THB entry",
          "transport": "Route and stop names only: bus #8 from [named stop] to [named stop], 8 THB, 20 min. Walk 10 min south from [named landmark]. Never say 'ask the driver' or 'tell the conductor your stop' — name the exact stop.",
          "local_tip": "One thing only regulars know — best time, hidden entrance, secret order, etc.",
          "watch_out": "One specific scam, tourist trap, or common mistake — or null if none"
        }
      ]
    }
  ]
}

Rules:
- ${paceLine}${styleLine ? `\n- ${styleLine}` : ""}
- GEOGRAPHIC ACCURACY IS MANDATORY: Never describe a district, area, or landmark as being inside a different district or area. Districts, neighbourhoods, and streets are distinct — do not list them as sub-areas of each other. If you are not certain of the exact location of something, omit it rather than guess. Bad example: "Da'an district (Ximending and Xinyi streets)" — Ximending is in Wanhua District and Xinyi is a separate district; neither is in Da'an. The place_name and title must reflect where the activity actually is. Never invent street names, sub-areas, or parenthetical locations that are not part of the named place. This also applies at the day level: if you label a day by a district name, every activity in that day must genuinely be in that district. If activities span multiple districts, describe the day by its route or theme instead of assigning it to a single district that does not contain all the places.
- NEVER INVENT VENUES: Every restaurant, café, stall, bakery, or attraction you name must be a real, verifiable place that exists. Never fabricate a business name to satisfy a dietary restriction, fill a gap, or match a preference. If you cannot name a real venue that fits the constraints, suggest a market, hawker centre, or night market where the traveler can find suitable options themselves — do not invent a specific named business. Bad example: suggesting "Feliz Artisanal Bakery" in Palawan for tuna sandwiches when no such place exists. Invented venue names cause real harm — travelers go looking for places that do not exist.
- SPECIFICITY IS MANDATORY: Every single activity must be a real, named place or experience that exists. Use the actual name — not a category or description of it. Bad examples that will be rejected: "Taipei culture and food workshop", "local cooking class", "beverage tasting", "learn traditional cuisine", "local market visit", "temple tour", "scenic viewpoint". Good examples: "Longshan Temple", "Addiction Aquatic Development seafood market", "Raw restaurant", "Beitou Hot Spring Museum", "Wistaria Tea House", "Raohe Street Night Market"
- If you suggest a cooking class, name the specific school or operator (e.g. "Taipei Homecooking"). If you suggest a food experience, name the exact dish and stall or restaurant
- Meals: only include if it is a specific named restaurant or stall that you are confident exists. No generic "lunch", "dinner", "food tour", or "tasting". Only suggest a venue for a meal they actually serve. When dietary restrictions apply, prefer markets, hawker centres, and night markets where multiple options exist rather than a single restaurant that may not cater to the restriction
- No duplicates: do not suggest any place or experience already in the itinerary, even under a different title
- Vary restaurants and food stops every time — do not default to famous tourist staples. If Din Tai Fung, Shilin Night Market, or any chain has already been suggested, pick something genuinely different. Favour neighbourhood spots and less-covered options
- GEOGRAPHIC COHERENCE IS MANDATORY: Before assigning activities to days, mentally map ${destination} and divide it into distinct zones or neighbourhoods. Assign each day one primary zone — every activity that day must be within easy reach of that zone (walkable, or a single short transit/taxi ride). Never mix activities from opposite ends of a city or region in the same day. A day's activities should read as a logical route, not a scatter across a map. If the destination is a large area (island, coastal strip, multiple districts), dedicate each day to one geographic section and move systematically — never bounce back to an area already covered
- TRANSPORT DIRECTIONS: Never reference "your accommodation", "your hotel", "your hostel", or any lodging in transport descriptions — no accommodation data has been provided. Use only real, named reference points: a specific metro station, bus stop, major landmark, or street intersection. Bad: "15 min from your accommodation". Good: "MRT Longshan Temple Station Exit 1, 5 min walk"
- TRAVEL EVENTS: If a day has a flight or transport in the fixed schedule above, only suggest activities that fit around it. Arrival day: start activities from the arrival time, choosing things close to the arrival airport or city centre. Departure day: only suggest activities before the departure time, allowing at least 2 hours to reach the airport or station. Transit day (departs and arrives): plan only at the destination after arrival. Do not suggest any activity that overlaps with or immediately precedes a departure
- Realistic hours: morning markets early, night markets 18:00+, sunrise spots before 07:00, tea houses afternoon/evening, bars and clubs 21:00+. Never schedule a night market or bar before 17:00
- Use 24-hour time strings (e.g. "09:00", "14:30")
- place_name must be the exact venue or landmark name, never null for sightseeing activities
- NO PARENTHESES: never add (description), (clarification), (approximate), or any parenthetical text anywhere in the output. Write "Raohe Street Night Market" not "Raohe Street Night Market (one of Taipei's oldest)". Write "bus #8, 8 THB, 20 min" not "bus #8 (20 min, 8 THB)".`;
  }

  const paceLine = paceRule(user_pace, "notes");
  const styleFragment = styleLine ? `\n- ${styleLine}` : "";

  if (style === "notes") {
    return `You are a travel planner writing quick personal notes for a trip to ${destination}. ${tripContext}${destContext}${pref}${budgetLine}${fitnessLine}${avoidLine}${journalLine}${existing}${existingNotesContext}${travelEventsContext}

Return ONLY a JSON object:
{ "content": "Day ${startDay}\\n\\n9am - ...\\n\\nAfternoon - ..." }

Style rules:
- Write like a friend's shorthand notes, not a travel magazine
- No adjectives like "vibrant", "bustling", "enchanting", "stunning", "picturesque", "delightful", or "charming"
- No filler phrases like "immerse yourself", "soak up the atmosphere", "don't miss", or "be sure to"
- Just facts: place names, rough times, what to do, what to eat, practical tips
- ${paceLine}${styleFragment}
- SPECIFICITY IS MANDATORY: every place must be a real named venue — no "local cooking class", "beverage tasting", "food workshop", "temple tour", or any other category label. Use the actual name of the place
- NEVER INVENT VENUES: every restaurant, café, stall, or attraction you name must be a real, verifiable place. Never fabricate a business to satisfy dietary restrictions or fill a gap. If you cannot name a real venue that fits, suggest a market or hawker centre where options exist — do not invent a specific named business.
- GEOGRAPHIC ACCURACY IS MANDATORY: never describe a district or area as containing places that belong to a different district. Districts, neighbourhoods, and streets are distinct — do not conflate them or invent parenthetical sub-locations. If uncertain of the exact location of something, omit it rather than guess. If a day is labelled by a district, every place mentioned that day must actually be in that district.
- GEOGRAPHIC COHERENCE: each day must be anchored to one zone or neighbourhood of ${destination}. All places that day must be reachable from each other without major backtracking. If the destination covers a large area, move through it systematically — one section per day, never bouncing between distant areas
- TRAVEL EVENTS: if a day has a flight or transport in the fixed schedule above, mention it in the notes and only suggest activities that fit around it. Arrival day: activities from arrival time onward. Departure day: activities only before departure, with time to reach the airport/station
- Realistic timing (night markets from 6pm+, sunrise spots before 7am)
- Use \\n for line breaks
- NO PARENTHESES: never add (description) or (clarification) after any place name or instruction. Write place names and notes plainly without brackets.
`;
  }

  if (style === "notes_day_night") {
    return `You are a travel planner writing quick personal notes for a trip to ${destination}. ${tripContext}${destContext}${pref}${budgetLine}${fitnessLine}${avoidLine}${journalLine}${existing}${existingNotesContext}${travelEventsContext}

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
- ${paceLine}${styleFragment}
- SPECIFICITY IS MANDATORY: every place must be a real named venue — not "cooking class", "beverage tasting", "food workshop", or any category label. Use the actual name
- NEVER INVENT VENUES: every restaurant, café, stall, or attraction you name must be a real, verifiable place. Never fabricate a business to satisfy dietary restrictions or fill a gap. If you cannot name a real venue that fits, suggest a market or hawker centre where options exist — do not invent a specific named business.
- GEOGRAPHIC ACCURACY IS MANDATORY: never describe a district or area as containing places that belong to a different district. If a day is labelled by a district, every place mentioned must actually be in that district. If uncertain of a location, omit it rather than guess.
- GEOGRAPHIC COHERENCE: each day must be anchored to one zone or neighbourhood of ${destination}. All places that day must be reachable from each other without major backtracking. If the destination covers a large area, move through it systematically — one section per day, never bouncing between distant areas
- TRAVEL EVENTS: if a day has a flight or transport in the fixed schedule above, note it and only fill sections with activities that fit around it. Arrival day: day/night activities from arrival time onward. Departure day: day activities only before departure
- Include rough times where useful
- NO PARENTHESES: never add (description) or (clarification) after any place name or instruction. Write plainly without brackets.`;
  }

  // notes_day_afternoon_night
  return `You are a travel planner writing quick personal notes for a trip to ${destination}. ${tripContext}${destContext}${pref}${budgetLine}${fitnessLine}${avoidLine}${journalLine}${existing}${existingNotesContext}${travelEventsContext}

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
- ${paceLine}${styleFragment}
- SPECIFICITY IS MANDATORY: every place must be a real named venue — not "cooking class", "beverage tasting", "food workshop", or any category label. Use the actual name
- NEVER INVENT VENUES: every restaurant, café, stall, or attraction you name must be a real, verifiable place. Never fabricate a business to satisfy dietary restrictions or fill a gap. If you cannot name a real venue that fits, suggest a market or hawker centre where options exist — do not invent a specific named business.
- GEOGRAPHIC ACCURACY IS MANDATORY: never describe a district or area as containing places that belong to a different district. If a day is labelled by a district, every place mentioned must actually be in that district. If uncertain of a location, omit it rather than guess.
- GEOGRAPHIC COHERENCE: each day must be anchored to one zone or neighbourhood of ${destination}. All places that day must be reachable from each other without major backtracking. If the destination covers a large area, move through it systematically — one section per day, never bouncing between distant areas
- TRAVEL EVENTS: if a day has a flight or transport in the fixed schedule above, note it and only fill sections with activities that fit around it. Arrival day: populate only afternoon/night (or whichever sections fall after arrival). Departure day: populate only day/morning sections before departure
- Include rough times where useful
- NO PARENTHESES: never add (description) or (clarification) after any place name or instruction. Write plainly without brackets.
`;
}

export async function POST(req: NextRequest) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return NextResponse.json({ error: "Not configured" }, { status: 500 });

  const {
    destination,
    num_days,
    style,
    preferences,
    existing_activities = [],
    existing_day_count = 0,
    existing_notes = "",
    travel_events = "",
    user_pace = "",
    user_style = "",
    trip_start_date,
    trip_end_date: _trip_end_date,
    trip_countries,
    daily_budget,
    currency,
    fitness,
    avoid,
    journal_profile,
  }: SuggestRequest = await req.json();

  const VALID_STYLES: ItineraryStyle[] = ["structured", "notes", "notes_day_night", "notes_day_afternoon_night"];

  if (!destination || !num_days || num_days < 1 || num_days > 30) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  if (!VALID_STYLES.includes(style)) {
    return NextResponse.json({ error: "Invalid itinerary style" }, { status: 400 });
  }

  const prompt = buildPrompt(
    destination,
    num_days,
    style,
    preferences ?? "",
    existing_activities,
    existing_day_count,
    existing_notes,
    travel_events,
    user_pace,
    user_style,
    trip_start_date,
    trip_countries,
    daily_budget,
    currency,
    fitness,
    avoid,
    journal_profile,
  );

  let anthropicRes: Response;
  try {
    anthropicRes = await anthropicFetch(
      { model: "claude-haiku-4-5", max_tokens: 8192, system: SYSTEM_PROMPT, messages: [{ role: "user", content: prompt }] },
      apiKey,
    );
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
