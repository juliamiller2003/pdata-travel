import { NextRequest, NextResponse } from "next/server";
import { OUTLET_LOOKUP, CURRENCY_CODES } from "@/lib/countryData";

export async function POST(req: NextRequest) {
  const { countryName, month, homeCountryName } = await req.json();

  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({ error: "AI not configured" }, { status: 500 });
  }

  const monthLine   = month           ? `The traveler is visiting in ${month}.`              : "";
  const passportLine = homeCountryName ? `The traveler holds a ${homeCountryName} passport.` : "";

  const visaField = homeCountryName
    ? `"visa": "visa requirement for a ${homeCountryName} passport holder, e.g. Visa-free (90 days) or Visa on arrival ($30, 30 days) or Visa required — apply in advance"`
    : `"visa": null`;

  // Outlet is handled client-side from static data — omit from AI prompt entirely
  const prompt = `You are a concise travel reference. For the country "${countryName}", provide practical traveler information.
${monthLine}
${passportLine}

Respond with ONLY valid JSON — no markdown, no explanation:
{
  "currency": "currency name, code, and symbol, e.g. New Taiwan Dollar (TWD · NT$)",
  "weather": "one short sentence about typical weather${month ? ` in ${month}` : ""} including temperature range in both °C and °F",
  "sim": "one short sentence on getting a local SIM: where to buy, typical cost for a data plan, and whether eSIM is widely supported",
  ${visaField}
}`;

  const aiRes = await fetch("https://api.anthropic.com/v1/messages", {
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

  if (!aiRes.ok) {
    return NextResponse.json({ error: "Failed to reach AI" }, { status: 500 });
  }

  const aiData = await aiRes.json();
  const text: string = aiData.content?.[0]?.text ?? "";
  const cleaned = text.replace(/^```(?:json)?\n?/m, "").replace(/\n?```$/m, "").trim();

  let parsed: Record<string, unknown>;
  try {
    parsed = JSON.parse(cleaned);
  } catch {
    return NextResponse.json({ error: "Unexpected AI response" }, { status: 500 });
  }

  // Always inject outlet from static data — never trust the AI for this
  parsed.outlet = OUTLET_LOOKUP[countryName] ?? null;

  // ── Real-time exchange rate ────────────────────────────────────────────────
  const destCode = CURRENCY_CODES[countryName];
  const homeCode = homeCountryName ? CURRENCY_CODES[homeCountryName] : null;

  if (destCode && homeCode && destCode !== homeCode) {
    try {
      // Frankfurter: free, no API key, returns how much 1 unit of homeCode buys in destCode
      const fxRes = await fetch(
        `https://api.frankfurter.app/latest?from=${homeCode}&to=${destCode}`,
        { next: { revalidate: 3600 } }
      );
      if (fxRes.ok) {
        const fxData = await fxRes.json();
        const rate: number = fxData.rates?.[destCode];
        if (rate) {
          // Format: "1 USD = 32.5 TWD"
          const formatted = rate >= 100
            ? Math.round(rate).toLocaleString()
            : rate >= 10
              ? rate.toFixed(1)
              : rate.toFixed(2);
          parsed.exchangeRate = `1 ${homeCode} = ${formatted} ${destCode}`;
        }
      }
    } catch {
      // Exchange rate is non-critical — silently skip on failure
    }
  }

  return NextResponse.json(parsed);
}
