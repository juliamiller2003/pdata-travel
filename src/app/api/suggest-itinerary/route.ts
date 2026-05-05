import { NextRequest } from "next/server";
import type { ItineraryStyle } from "@/types/database";

interface SuggestRequest {
  destination: string;
  num_days: number;
  style: ItineraryStyle;
  preferences: string;
}

function buildPrompt(destination: string, num_days: number, style: ItineraryStyle, preferences: string) {
  const pref = preferences.trim() ? `\nUser preferences: ${preferences.trim()}` : "";

  if (style === "structured") {
    return `You are a travel expert. Create a ${num_days}-day itinerary for ${destination}.${pref}

Return ONLY a JSON object with this exact structure (no markdown, no commentary):
{
  "days": [
    {
      "day_number": 1,
      "activities": [
        { "time": "09:00", "title": "Activity name", "place_name": "Specific place or null" }
      ]
    }
  ]
}

Rules:
- Include 4–6 activities per day
- Use 24-hour time strings (e.g. "09:00", "14:30")
- place_name should be a specific venue/landmark, or null
- Cover a good mix: sightseeing, food, culture, downtime`;
  }

  if (style === "notes") {
    return `You are a travel expert. Write a ${num_days}-day itinerary for ${destination} as flowing prose.${pref}

Return ONLY a JSON object:
{ "content": "Day 1 - Arrival\\n\\nStart by..." }

Write naturally, like notes you'd make for yourself. Include specific places, restaurants, and tips. Use \\n for line breaks.`;
  }

  if (style === "notes_day_night") {
    return `You are a travel expert. Create a ${num_days}-day itinerary for ${destination} split into day and night.${pref}

Return ONLY a JSON object:
{
  "days": [
    {
      "day_number": 1,
      "sections": {
        "day": "Morning and afternoon plans...",
        "night": "Evening plans..."
      }
    }
  ]
}

Write each section as short prose notes. Include specific places and food recommendations.`;
  }

  // notes_day_afternoon_night
  return `You are a travel expert. Create a ${num_days}-day itinerary for ${destination} split into day, afternoon, and night.${pref}

Return ONLY a JSON object:
{
  "days": [
    {
      "day_number": 1,
      "sections": {
        "day": "Morning plans...",
        "afternoon": "Afternoon plans...",
        "night": "Evening plans..."
      }
    }
  ]
}

Write each section as short prose notes. Include specific places and food recommendations.`;
}

export async function POST(req: NextRequest) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return new Response(JSON.stringify({ error: "Not configured" }), { status: 500 });

  const { destination, num_days, style, preferences }: SuggestRequest = await req.json();

  const VALID_STYLES: ItineraryStyle[] = ["structured", "notes", "notes_day_night", "notes_day_afternoon_night"];

  if (!destination || !num_days || num_days < 1 || num_days > 30) {
    return new Response(JSON.stringify({ error: "Invalid request" }), { status: 400 });
  }

  if (!VALID_STYLES.includes(style)) {
    return new Response(JSON.stringify({ error: "Invalid itinerary style" }), { status: 400 });
  }

  const prompt = buildPrompt(destination, num_days, style, preferences);

  const anthropicRes = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model: "claude-haiku-4-5",
      max_tokens: 2048,
      stream: true,
      messages: [{ role: "user", content: prompt }],
    }),
  });

  if (!anthropicRes.ok || !anthropicRes.body) {
    return new Response(JSON.stringify({ error: "AI request failed" }), { status: 500 });
  }

  // Stream text deltas straight to the client as plain text.
  // The component accumulates the chunks and parses JSON when the stream closes.
  const decoder = new TextDecoder();
  const encoder = new TextEncoder();
  let sseBuffer = "";

  const stream = new ReadableStream({
    async start(controller) {
      const reader = anthropicRes.body!.getReader();

      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          sseBuffer += decoder.decode(value, { stream: true });
          const lines = sseBuffer.split("\n");
          sseBuffer = lines.pop() ?? "";

          for (const line of lines) {
            if (!line.startsWith("data: ")) continue;
            const payload = line.slice(6).trim();
            if (!payload || payload === "[DONE]") continue;
            try {
              const event = JSON.parse(payload);
              if (
                event.type === "content_block_delta" &&
                event.delta?.type === "text_delta" &&
                event.delta.text
              ) {
                controller.enqueue(encoder.encode(event.delta.text));
              }
            } catch {
              // skip malformed SSE lines
            }
          }
        }
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}
