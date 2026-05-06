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
  distanceMiles: number | null;
  /** True when only partial data was found (airline only — no route info) */
  partial?: boolean;
  /** Source of the data — live APIs vs AI estimate */
  source?: "live" | "ai";
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const flightNumber = searchParams.get("flight")?.toUpperCase().replace(/\s+/g, "");
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
        cache: "no-store",
      });

      const rawText = await res.text();

      // Only fall through silently on auth/subscription errors — surface everything else
      if (res.status === 403 || res.status === 401) {
        throw new Error(`AeroDataBox auth error ${res.status}`);
      }
      if (!res.ok) {
        return NextResponse.json(
          { error: `AeroDataBox error ${res.status}: ${rawText.slice(0, 300)}` },
          { status: 502 }
        );
      }

      const json = JSON.parse(rawText);
      const flights = Array.isArray(json) ? json : json.items ?? [];

      if (flights.length === 0) {
        return NextResponse.json(
          { error: `AeroDataBox returned no flights for ${flightNumber} on ${date}. The schedule may not be available that far in advance.` },
          { status: 404 }
        );
      }

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
        distanceMiles: f.greatCircleDistance?.mile ? Math.round(f.greatCircleDistance.mile) : null,
        source: "live",
      };
      return NextResponse.json(result);
    } catch (err) {
      console.error("[AeroDataBox] error, falling through:", err);
      // Fall through to next source
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
          departureCity: (f.departure?.timezone ?? "").split("/")[1]?.replace("_", " ") ?? null,
          departureIata: f.departure?.iata ?? null,
          departureTime: f.departure?.scheduled ?? null,
          arrivalAirport: f.arrival?.airport ?? null,
          arrivalCity: (f.arrival?.timezone ?? "").split("/")[1]?.replace("_", " ") ?? null,
          arrivalIata: f.arrival?.iata ?? null,
          arrivalTime: f.arrival?.scheduled ?? null,
          status: f.flight_status ?? null,
          distanceMiles: null,
          source: "live",
        };
        return NextResponse.json(result);
      }
    } catch {
      // Fall through to Claude
    }
  }

  // ── Claude fallback (airline + best-guess route) ─────────────
  if (anthropicKey) {
    try {
      const prompt = `You are a flight data assistant with knowledge of airline routes. Look up flight ${flightNumber}.

The first 2 letters are the airline IATA code (UA = United Airlines, AA = American Airlines, DL = Delta, BA = British Airways, LH = Lufthansa, SQ = Singapore Airlines, CX = Cathay Pacific, JL = Japan Airlines, NH = ANA, QF = Qantas, EK = Emirates, etc.).

Many flight numbers are operated on fixed routes. Use your training knowledge to identify the most likely route for this flight number. Major international and domestic routes are often consistent for years.

Return ONLY a valid JSON object — no markdown, no commentary, no extra text:
{
  "flightNumber": "${flightNumber}",
  "airline": "Full airline name derived from the 2-letter prefix",
  "departureAirport": "Full airport name, or null only if truly unknown",
  "departureCity": "City name, or null only if truly unknown",
  "departureIata": "3-letter IATA code, or null only if truly unknown",
  "arrivalAirport": "Full airport name, or null only if truly unknown",
  "arrivalCity": "City name, or null only if truly unknown",
  "arrivalIata": "3-letter IATA code, or null only if truly unknown"
}

Rules:
- Always provide the airline name — derive it from the 2-letter prefix
- Provide your best guess for the route based on training data — most major flight numbers have well-known consistent routes
- Only use null for airport fields if you genuinely have no information about this route
- Do not return departure and arrival times (you don't have real-time data)`;

      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "x-api-key": anthropicKey,
          "anthropic-version": "2023-06-01",
          "content-type": "application/json",
        },
        body: JSON.stringify({
          model: "claude-sonnet-4-5",
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

      const hasRouteInfo = !!(parsed.departureIata || parsed.arrivalIata);
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
        distanceMiles: null,
        partial: !hasRouteInfo,
        source: "ai",
      };
      return NextResponse.json(result);
    } catch {
      return NextResponse.json({ error: "Flight not found" }, { status: 404 });
    }
  }

  return NextResponse.json({ error: "Flight lookup not configured" }, { status: 503 });
}
