import { NextRequest, NextResponse } from "next/server";
import { OUTLET_LOOKUP, CURRENCY_CODES } from "@/lib/countryData";

export async function POST(req: NextRequest) {
  const { countryName, month, homeCountryName } = await req.json();

  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({ error: "AI not configured" }, { status: 500 });
  }

  const destCode = CURRENCY_CODES[countryName] ?? null;
  // Default to USD if the user hasn't set a home country, so the rate always shows
  const homeCode = (homeCountryName ? CURRENCY_CODES[homeCountryName] : null) ?? "USD";
  const showRate = destCode && destCode !== homeCode;

  const monthLine    = month           ? `The traveler is visiting in ${month}.`              : "";
  const passportLine = homeCountryName ? `The traveler holds a ${homeCountryName} passport.` : "";

  const visaField = homeCountryName
    ? `"visa": "visa requirement for a ${homeCountryName} passport holder, e.g. Visa-free (90 days) or Visa on arrival ($30, 30 days) or Visa required — apply in advance"`
    : `"visa": null`;

  const exchangeRateField = showRate
    ? `"exchangeRate": "approximate exchange rate as a short string, e.g. \\"1 ${homeCode} ≈ 32 ${destCode}\\" — use a round number, no cents"`
    : null;

  // Outlet is resolved client-side from static data — excluded from AI prompt entirely
  const prompt = `You are a concise travel reference. For the country "${countryName}", provide practical traveler information.
${monthLine}
${passportLine}

Respond with ONLY valid JSON — no markdown, no explanation:
{
  "currency": "currency name, code, and symbol, e.g. New Taiwan Dollar (TWD · NT$)",
  ${exchangeRateField ? exchangeRateField + "," : ""}
  "weather": "one short sentence about typical weather${month ? ` in ${month}` : ""} including temperature range in both °C and °F",
  "sim": "one short sentence on getting a local SIM: where to buy, typical cost for a data plan, and whether eSIM is widely supported",
  ${visaField}
}`;

  let aiRes: Response;
  try {
    aiRes = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": process.env.ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5",
        max_tokens: 1024,
        messages: [{ role: "user", content: prompt }],
      }),
    });
  } catch (err) {
    return NextResponse.json({ error: `Network error: ${String(err)}` }, { status: 502 });
  }

  if (!aiRes.ok) {
    const errText = await aiRes.text().catch(() => "");
    return NextResponse.json({ error: `AI error (${aiRes.status}): ${errText.slice(0, 200)}` }, { status: 500 });
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

  // Try Frankfurter for a real-time rate; AI value is the fallback if it fails
  if (showRate) {
    try {
      const fxRes = await fetch(
        `https://api.frankfurter.app/latest?from=${homeCode}&to=${destCode}`,
        { signal: AbortSignal.timeout(3000) }
      );
      if (fxRes.ok) {
        const fxData = await fxRes.json();
        const rate: number = fxData.rates?.[destCode];
        if (rate) {
          const formatted = rate >= 100
            ? Math.round(rate).toLocaleString()
            : rate >= 10
              ? rate.toFixed(1)
              : rate.toFixed(2);
          // Override AI value with real-time rate
          parsed.exchangeRate = `1 ${homeCode} = ${formatted} ${destCode}`;
        }
      }
    } catch {
      // Frankfurter unavailable — keep the AI's approximate rate
    }
  }

  return NextResponse.json(parsed);
}
