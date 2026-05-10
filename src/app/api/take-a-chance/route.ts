import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const { location, distance, duration, travelDate, budget, requests, vibes } = await req.json();

  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({ error: "AI not configured" }, { status: 500 });
  }

  const requestsText = requests?.trim() ? `\n- Specific requests: ${requests.trim()}` : "";
  const budgetText = budget ? `\n- Total budget (flights + accommodation): $${budget} USD` : "";
  const dateText = travelDate
    ? `\n- Travel month: ${new Date(travelDate + "-01").toLocaleString("en-US", { month: "long", year: "numeric" })}`
    : "";

  const vibeText = vibes?.length > 0 ? `\n- Vibe: ${vibes.join(", ")}` : "";

  const budgetGuidance = budget
    ? `IMPORTANT: The user's total budget is $${budget} USD. Only suggest destinations where flights + accommodation for ${duration} days fit within this budget.`
    : "";

  const prompt = `You are a travel expert. Suggest exactly 3 trip destinations based on these constraints:
- Starting from: ${location}
- Willing to travel: ${distance}
- Trip length: ${duration} days${vibeText}${dateText}${budgetText}${requestsText}

${budgetGuidance}

Respond with ONLY valid JSON — no markdown, no code blocks, no explanation. Use this exact structure:
{"trips":[{"title":"Short trip name","destination":"City, Country","country_code":"XX","tagline":"One punchy sentence that sells the trip","why":"2-3 sentences explaining why this destination matches the constraints","highlights":["specific highlight 1","specific highlight 2","specific highlight 3"],"best_time":"Month–Month"}]}

country_code must be a valid ISO 3166-1 alpha-2 code.${travelDate ? ` Prioritize destinations with good weather, low crowds, or notable events during the specified travel month.` : ""}`;

  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": process.env.ANTHROPIC_API_KEY,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-6",
      max_tokens: 2048,
      messages: [{ role: "user", content: prompt }],
    }),
  });

  if (!response.ok) {
    return NextResponse.json({ error: "Failed to reach AI" }, { status: 500 });
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
