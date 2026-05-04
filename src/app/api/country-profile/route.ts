import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const { countryName, month, homeCountryName } = await req.json();

  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({ error: "AI not configured" }, { status: 500 });
  }

  const monthLine = month ? `The traveler is visiting in ${month}.` : "";
  const passportLine = homeCountryName
    ? `The traveler holds a ${homeCountryName} passport.`
    : "";

  const visaField = homeCountryName
    ? `"visa": "visa requirement for a ${homeCountryName} passport holder, e.g. Visa-free (90 days) or Visa on arrival ($30, 30 days) or Visa required — apply in advance"`
    : `"visa": null`;

  const prompt = `You are a concise travel reference. For the country "${countryName}", provide practical traveler information.
${monthLine}
${passportLine}

Respond with ONLY valid JSON — no markdown, no explanation:
{
  "outlet": "US, EU, or Other compatibility label, then plug type(s) and voltage, e.g. EU (Type C/F · 230V · 50Hz) or US (Type A/B · 120V · 60Hz) or Other (Type G · 230V · 50Hz)",
  "currency": "currency name, code, and symbol, e.g. Euro (EUR · €)",
  "weather": "one short sentence about typical weather${month ? ` in ${month}` : ""} including temperature range in both °C and °F",
  "sim": "one short sentence on getting a local SIM: where to buy, typical cost for a data plan, and whether eSIM is widely supported",
  ${visaField}
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
