import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const { query } = await req.json();

  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({ error: "AI not configured" }, { status: 500 });
  }

  if (!query?.trim()) {
    return NextResponse.json({ error: "No query provided" }, { status: 400 });
  }

  const prompt = `You are a travel expert. A user asked: "${query.trim()}"

Respond with ONLY valid JSON — no markdown, no code blocks, no explanation. Use this exact structure:
{
  "destination": "City or Country name",
  "overview": "2-3 engaging sentences about the destination and why it's worth visiting",
  "duration": "Recommended trip length, e.g. 10-14 days",
  "bestTime": "Best months to visit, e.g. November to April",
  "estimatedBudget": "Daily budget range, e.g. $60-120/day",
  "highlights": ["top highlight 1", "top highlight 2", "top highlight 3", "top highlight 4"],
  "tips": ["practical tip 1", "practical tip 2", "practical tip 3"]
}

Keep highlights and tips concise (under 12 words each). If the query is not travel-related, set destination to null and all other fields to null.`;

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
        model: "claude-haiku-4-5",
        max_tokens: 1024,
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
  const cleaned = text.replace(/^```(?:json)?\n?/m, "").replace(/\n?```$/m, "").trim();

  try {
    const parsed = JSON.parse(cleaned);
    return NextResponse.json(parsed);
  } catch {
    return NextResponse.json({ error: "Unexpected AI response" }, { status: 500 });
  }
}
