import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const from = searchParams.get("from")?.toUpperCase();
  const to   = searchParams.get("to")?.toUpperCase();

  if (!from || !to) {
    return NextResponse.json({ error: "Missing from/to" }, { status: 400 });
  }

  if (from === to) {
    return NextResponse.json({ rate: 1, from, to, approximate: false });
  }

  // ── Try Frankfurter (real-time, free, no key) ──────────────────────────────
  try {
    const res = await fetch(
      `https://api.frankfurter.app/latest?from=${from}&to=${to}`,
      { signal: AbortSignal.timeout(4000) }
    );
    if (res.ok) {
      const data = await res.json();
      const rate: number = data.rates?.[to];
      if (rate) {
        return NextResponse.json({ rate, from, to, approximate: false });
      }
    }
  } catch {
    // Fall through to AI fallback
  }

  // ── Fallback: ask Claude for an approximate rate ───────────────────────────
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (apiKey) {
    try {
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": apiKey,
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify({
          model: "claude-haiku-4-5-20251001",
          max_tokens: 64,
          messages: [{
            role: "user",
            content: `What is the approximate exchange rate from ${from} to ${to}? Reply with ONLY a single decimal number (e.g. 32.5). No text, no units.`,
          }],
        }),
      });
      if (res.ok) {
        const data = await res.json();
        const rate = parseFloat(data.content?.[0]?.text?.trim());
        if (!isNaN(rate) && rate > 0) {
          return NextResponse.json({ rate, from, to, approximate: true });
        }
      }
    } catch {
      // Both sources failed
    }
  }

  return NextResponse.json({ error: "Rate unavailable" }, { status: 503 });
}
