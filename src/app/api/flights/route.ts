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

  const aeroKey = process.env.AERODATABOX_API_KEY;
  const aviationKey = process.env.AVIATIONSTACK_API_KEY;
  const anthropicKey = process.env.ANTHROPIC_API_KEY;

  // ── AeroDataBox (scheduled + live flights) ───────────────────
  if (aeroKey) {
    try {
      const url = `https://aerodatabox.p.rapidapi.com/flights/number/${encodeURIComponent(flightNumber)}/${date}`;
      const res = await fetch(url, {
        headers: {
          "X-RapidAPI-Key": aeroKey,
          "X-RapidAPI-Host": "aerodatabox.p.rapidapi.com",
        },
        next: { revalidate: 3600 },
      });

      const rawText = await res.text();
      console.log("[AeroDataBox] status:", res.status, "body:", rawText.slice(0, 500));

      if (res.ok) {
        const json = JSON.parse(rawText);
        const flights = Array.isArray(json) ? json : json.items ?? [];
        if (flights.length > 0) {
          const f = flights[0];
          const result: FlightResult = {
            flightNumber: f.number ?? flightNumber,
            airline: f.airline?.name ?? null,
            departureAirport: f.departure?.airport?.name ?? null,
            departureCity: f.departure?.airport?.municipalityName ?? null,
            departureIata: f.departure?.airport?.iata ?? null,
            departureTime: f.departure?.scheduledTime?.local ?? f.departure?.scheduledTime?.utc ?? null,
            arrivalAirport: f.arrival?.airport?.name ?? null,
            arrivalCity: f.arrival?.airport?.municipalityName ?? null,
            arrivalIata: f.arrival?.airport?.iata ?? null,
            arrivalTime: f.arrival?.scheduledTime?.local ?? f.arrival?.scheduledTime?.utc ?? null,
            status: f.status ?? null,
          };
          return NextResponse.json(result);
        }
      }
    } catch (e) {
      console.log("[AeroDataBox] error:", e);
    }
  }

  // ── AviationStack (real-time only, free plan = live flights) ─
  if (aviationKey) {
    try {
      const url = `http://api.aviationstack.com/v1/flights?access_key=${aviationKey}&flight_iata=${flightNumber}&flight_date=${date}`;
      const res = await fetch(url, { next: { revalidate: 3600 } });
      const json = await res.json();

      if (json.data && json.data.length > 0) {
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
      // Fall through to Claude
    }
  }

  // ── Claude fallback (airline name only) ──────────────────────
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
