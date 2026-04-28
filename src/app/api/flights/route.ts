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

  const apiKey = process.env.AVIATIONSTACK_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "Flight lookup not configured" }, { status: 503 });
  }

  const url = `http://api.aviationstack.com/v1/flights?access_key=${apiKey}&flight_iata=${flightNumber}&flight_date=${date}`;

  try {
    const res = await fetch(url, { next: { revalidate: 3600 } });
    const json = await res.json();

    if (!json.data || json.data.length === 0) {
      return NextResponse.json({ error: "Flight not found" }, { status: 404 });
    }

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
  } catch {
    return NextResponse.json({ error: "Failed to fetch flight data" }, { status: 500 });
  }
}
