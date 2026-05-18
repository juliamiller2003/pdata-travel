import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const { location, distance, duration, travelDate, budget, requests, vibes, user_style, user_pace } = await req.json();

  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({ error: "AI not configured" }, { status: 500 });
  }

  const requestsText = requests?.trim() ? `\n- Specific requests: ${requests.trim()}` : "";
  const budgetText = budget ? `\n- Total budget (flights + accommodation): $${budget} USD` : "";
  const dateText = travelDate
    ? `\n- Travel month: ${new Date(travelDate + "-01").toLocaleString("en-US", { month: "long", year: "numeric" })}`
    : "";
  const vibeText = vibes?.length > 0 ? `\n- Vibe: ${vibes.join(", ")}` : "";

  // Budget/style rules from travel prefs
  const budgetGuidanceFromPrefs =
    user_style === "budget"
      ? `BUDGET TRAVELER (from user settings): Bias strongly toward destinations with cheap hostel infrastructure, street food scenes, and backpacker communities. Avoid destinations that are inherently expensive (Maldives, Swiss Alps, Scandinavian cities unless specifically cheap areas). Every suggestion must be survivable on under $40/day excluding flights. Favour destinations on established overland routes with cheap public transport.`
    : user_style === "mid"
      ? `MID-RANGE TRAVELER (from user settings): Suggest destinations with a solid guesthouse/boutique hotel scene and good local restaurant options in the $50–100/day range. Mix of popular and lesser-known. Avoid budget-hostile luxury-only destinations.`
    : user_style === "comfort"
      ? `COMFORT TRAVELER (from user settings): Suggest quality destinations with good accommodation options, interesting food scenes, and private transport available. Skip backpacker ghetto towns. Quality over price.`
      : "";

  // Hard budget enforcement from the form's budget field
  const hardBudgetLine = budget
    ? `IMPORTANT: The user's total budget is $${budget} USD for ${duration} days including flights and accommodation. Only suggest destinations where this is realistic.`
    : "";

  // Pace modifier
  const paceNote =
    user_pace === "slow"
      ? `SLOW TRAVELER: Favour destinations with depth — places worth staying in for a while, with enough to explore without rushing. Skip stopover cities or places that are only good for a day.`
    : user_pace === "fast"
      ? `FAST TRAVELER: Destinations with a lot packed in — good for hitting highlights efficiently.`
      : "";

  const prompt = `You are a travel expert specialising in independent travel and backpacker destinations. Suggest exactly 3 trip destinations based on these constraints:
- Starting from: ${location}
- Willing to travel: ${distance}
- Trip length: ${duration} days${vibeText}${dateText}${budgetText}${requestsText}

${budgetGuidanceFromPrefs}
${hardBudgetLine}
${paceNote}

Additional rules:
- Include at least one destination that is NOT the obvious top Google result — somewhere on the backpacker radar but not yet overrun. Think: cities on popular overland routes that are often skipped, emerging destinations, or underrated alternatives to famous neighbours.
- For budget travelers, note whether hostels and backpacker infrastructure exist.
- Consider overland travel as a valid way to reach destinations — don't just optimise for flight routes.
- Factor in land border options where relevant.
- If vibes include "road less traveled", prioritise genuinely off-the-beaten-path options.${travelDate ? `\n- Prioritize destinations with good weather, low crowds, or notable events during the specified travel month.` : ""}

Respond with ONLY valid JSON — no markdown, no code blocks, no explanation. Use this exact structure:
{"trips":[{"title":"Short trip name","destination":"City, Country","country_code":"XX","tagline":"One punchy sentence that sells the trip","why":"2-3 sentences explaining why this destination matches the constraints — be specific about what makes it good for this type of traveler","highlights":["specific highlight 1","specific highlight 2","specific highlight 3"],"best_time":"Month–Month","backpacker_note":"One sentence on hostel availability, budget friendliness, or overland access — or null if not relevant"}]}

country_code must be a valid ISO 3166-1 alpha-2 code.`;

  let response: Response;
  try {
    response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": process.env.ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-5",
        max_tokens: 2048,
        messages: [{ role: "user", content: prompt }],
      }),
    });
  } catch (err) {
    return NextResponse.json({ error: `Network error: ${String(err)}` }, { status: 502 });
  }

  if (!response.ok) {
    const errText = await response.text().catch(() => "");
    return NextResponse.json({ error: `AI error (${response.status}): ${errText.slice(0, 200)}` }, { status: 500 });
  }

  const data = await response.json();
  const text: string = data.content?.[0]?.text ?? "";

  // Strip markdown fences if the model wraps the JSON anyway
  const cleaned = text.replace(/^```(?:json)?\n?/m, "").replace(/\n?```$/m, "").trim();

  try {
    const parsed = JSON.parse(cleaned);
    return NextResponse.json(parsed);
  } catch {
    console.error("Failed to parse AI response:", text);
    return NextResponse.json({ error: "Unexpected AI response format" }, { status: 500 });
  }
}
