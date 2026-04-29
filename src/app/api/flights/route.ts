import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export interface FlightResult {
  flightNumber: string;
  airline: string | null;
  departureAirport: string | null;
  departureCity: string | null;
  departureIata: string | null;
  departureTime: string | null;
  arrivalAirport: string | null;
  arrivalCity: string | null;
  arrivalIata: string | null;
  arrivalTime: string | null;
  status: string | null;
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const flightNumber = searchParams.get("flight")?.toUpperCase();
  const date = searchParams.get("date");

  if (!flightNumber || !date) {
    return NextResponse.json({ error: "Missing flight or date" }, { status: 400 });
  }

  const aviationKey = process.env.AVIATIONSTACK_API_KEY;
  const anthropicKey = process.env.ANTHROPIC_API_KEY;

  // ── AviationStack (real-time) ────────────────────────────────
  if (aviationKey) {
    try {
      const url = `http://api.aviationstack.com/v1/flights?access_key=${aviationKey}&flight_iata=${flightNumber}&flight_date=${date}`;
      const res = await fetch(url, { next: { revalidate: 3600 } });
      const json = await res.json();

      if (!json.data || json.data.length === 0) {
        // Fall through to Claude — free AviationStack plan doesn't support
        // future dates or date filtering, so no results doesn't mean invalid flight
      } else {

      const f = json.data[0];
      const result: FlightResult = {
        flightNumber: f.flight?.iata ?? flightNumber,
        airline: f.airline?.name ?? null,
        departureAirport: f.departure?.airport ?? null,
        departureCity: f.departure?.timezone?.split("/")[1]?.replace("_", " ") ?? null,
        departureIata: f.departure?.iata ?? null,
        departureTime: f.departure?.scheduled ?? null,
        arrivalAirport: f.arrival?.airport ?? null,
        arrivalCity: f.arrival?.timezone?.split("/")[1]?.replace("_", " ") ?? null,
        arrivalIata: f.arrival?.iata ?? null,
        arrivalTime: f.arrival?.scheduled ?? null,
        status: f.flight_status ?? null,
      };
      return NextResponse.json(result);
      }
    } catch {
      // Fall through to Claude on network/parse errors
    }
  }

  // ── Claude fallback (static info, no real-time times) ────────
  if (anthropicKey) {
    try {
      const prompt = `You are a flight data assistant. Return information for flight ${flightNumber}.

The first 2 letters of a flight number are the airline's IATA code (e.g. AA = American Airlines, UA = United Airlines, BA = British Airways, SL = Thai Lion Air).

Return ONLY a JSON object — no markdown, no commentary:
{
  "flightNumber": "${flightNumber}",
  "airline": "Full airline name (derive from the 2-letter prefix — always provide this if you can identify the airline)",
  "departureAirport": "Full airport name or null if you don't know this specific route",
  "departureCity": "City name or null",
  "departureIata": "3-letter IATA code or null",
  "arrivalAirport": "Full airport name or null if you don't know this specific route",
  "arrivalCity": "City name or null",
  "arrivalIata": "3-letter IATA code or null"
}

Always try to identify the airline from the 2-letter prefix. Only return null for airport fields if you are not confident of the specific route.`;

      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "x-api-key": anthropicKey,
          "anthropic-version": "2023-06-01",
          "content-type": "application/json",
        },
        body: JSON.stringify({
          model: "claude-haiku-4-5-20251001",
          max_tokens: 512,
          messages: [{ role: "user", content: prompt }],
        }),
      });

      if (!res.ok) return NextResponse.json({ error: "Flight not found" }, { status: 404 });

      const aiResult = await res.json();
      let text: string = aiResult.content[0].text.trim();
      text = text.replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/```\s*$/i, "").trim();

      const parsed = JSON.parse(text);

      // If Claude couldn't identify anything useful, fall through to manual save
      if (!parsed.airline && !parsed.departureIata && !parsed.arrivalIata) {
        return NextResponse.json({ error: "Flight not found. Try saving manually." }, { status: 404 });
      }

      const result: FlightResult = {
        flightNumber: parsed.flightNumber ?? flightNumber,
        airline: parsed.airline ?? null,
        departureAirport: parsed.departureAirport ?? null,
        departureCity: parsed.departureCity ?? null,
        departureIata: parsed.departureIata ?? null,
        departureTime: null,
        arrivalAirport: parsed.arrivalAirport ?? null,
        arrivalCity: parsed.arrivalCity ?? null,
        arrivalIata: parsed.arrivalIata ?? null,
        arrivalTime: null,
        status: null,
      };
      return NextResponse.json(result);
    } catch {
      return NextResponse.json({ error: "Flight not found" }, { status: 404 });
    }
  }

  return NextResponse.json({ error: "Flight lookup not configured" }, { status: 503 });
}
