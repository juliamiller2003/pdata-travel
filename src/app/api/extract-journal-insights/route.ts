import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const { entries } = await req.json();

  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({ error: "Not configured" }, { status: 500 });
  }
  if (!entries || entries.length === 0) {
    return NextResponse.json({ profile: null });
  }

  const entriesText = entries
    .slice(0, 10) // limit to last 10 entries to stay within context
    .map((e: { content: string; day_number: number | null }, i: number) =>
      `Entry ${i + 1}${e.day_number ? ` (Day ${e.day_number})` : ""}:\n${e.content}`
    )
    .join("\n\n---\n\n");

  const prompt = `Based on these travel journal entries, extract a short traveler preference profile.

Identify:
- 3-5 specific things they clearly love about destinations (e.g. street food markets, temple architecture, local craft beer bars, early morning hikes)
- 2-3 things they consistently dislike or struggle with (e.g. crowded tourist sites, hot weather activities, expensive restaurants)
- Any patterns in their travel style (e.g. slow paced, food-focused, culturally curious, adventure-seeking)

Write it as 2-3 compact sentences a travel planner would use to personalise recommendations. Be specific — not "likes food" but "loves street food markets and hole-in-the-wall noodle spots; always seeks the local wet market".

Journal entries:
${entriesText}

Return ONLY the profile text, no JSON, no headings, no preamble.`;

  try {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": process.env.ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5",
        max_tokens: 300,
        messages: [{ role: "user", content: prompt }],
      }),
    });

    if (!response.ok) return NextResponse.json({ profile: null });

    const data = await response.json();
    const profile = data.content?.[0]?.text?.trim() ?? null;
    return NextResponse.json({ profile });
  } catch {
    return NextResponse.json({ profile: null });
  }
}
