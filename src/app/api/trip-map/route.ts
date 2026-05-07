import { NextRequest, NextResponse } from "next/server";

interface FlightInput {
  id: string;
  flight_number: string;
  departure_iata: string | null;
  arrival_iata: string | null;
}

interface ActivityInput {
  id: string;
  title: string;
  place_name: string | null;
  lat: number | null;
  lng: number | null;
}

export interface MapMarker {
  id: string;
  type: "airport" | "activity";
  lat: number;
  lng: number;
  label: string;
  sublabel?: string;
}

export interface MapRoute {
  id: string;
  from: [number, number];
  to: [number, number];
  label: string;
}

export interface TripMapData {
  markers: MapMarker[];
  routes: MapRoute[];
}

interface GeocodeResult {
  type: "airport" | "place";
  iata?: string;
  id?: string;
  lat: number;
  lng: number;
  name?: string;
}

export async function POST(req: NextRequest) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return NextResponse.json({ markers: [], routes: [] });

  const { flights, activities }: { flights: FlightInput[]; activities: ActivityInput[] } = await req.json();

  // Collect unique IATAs from flights
  const iatas = new Set<string>();
  for (const f of flights) {
    if (f.departure_iata) iatas.add(f.departure_iata);
    if (f.arrival_iata) iatas.add(f.arrival_iata);
  }

  // Activities needing geocoding (have place_name or title, but no coordinates)
  const toGeocode = activities.filter((a) => (a.place_name || a.title) && (a.lat == null || a.lng == null));
  const preGeocoded = activities.filter((a) => (a.place_name || a.title) && a.lat != null && a.lng != null);

  // Skip API call if nothing to geocode
  if (iatas.size === 0 && toGeocode.length === 0) {
    const markers: MapMarker[] = preGeocoded.map((a) => ({
      id: a.id,
      type: "activity",
      lat: a.lat!,
      lng: a.lng!,
      label: a.title,
      sublabel: a.place_name ?? undefined,
    }));
    return NextResponse.json({ markers, routes: [] });
  }

  const airportLines = [...iatas].map((iata) => `- ${iata}`).join("\n");
  const placeLines = toGeocode.map((a) => `- id:"${a.id}" name:"${a.place_name ?? a.title}"`).join("\n");

  const prompt = `Return precise latitude/longitude coordinates for these locations. Return ONLY a JSON array, no commentary.

${iatas.size > 0 ? `Airports:\n${airportLines}` : ""}
${toGeocode.length > 0 ? `Places:\n${placeLines}` : ""}

Format each entry as one of:
{ "type": "airport", "iata": "JFK", "lat": 40.6413, "lng": -73.7781, "name": "John F. Kennedy International Airport" }
{ "type": "place", "id": "abc123", "lat": 48.8584, "lng": 2.2945 }

Only include entries you are confident about (within ~1km accuracy). Omit entries you are unsure of.`;

  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5",
        max_tokens: 2048,
        messages: [{ role: "user", content: prompt }],
      }),
    });

    if (!res.ok) {
      const errText = await res.text().catch(() => "");
      console.error(`trip-map geocode failed (${res.status}):`, errText.slice(0, 200));
      return NextResponse.json({ markers: [], routes: [], error: `Geocode failed: ${res.status}` }, { status: 502 });
    }

    const result = await res.json();
    let text: string = (result.content ?? []).filter((b: { type: string }) => b.type === "text").map((b: { text: string }) => b.text).join("").trim();
    text = text.replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/```\s*$/i, "").trim();

    if (!text) return NextResponse.json({ markers: [], routes: [] });
    const geocoded: GeocodeResult[] = JSON.parse(text);

    // Build lookup maps
    const airportCoords = new Map<string, GeocodeResult>();
    const placeCoords = new Map<string, GeocodeResult>();
    for (const g of geocoded) {
      if (g.type === "airport" && g.iata) airportCoords.set(g.iata, g);
      if (g.type === "place" && g.id) placeCoords.set(g.id, g);
    }

    // Build markers
    const markers: MapMarker[] = [];
    const seenAirports = new Set<string>();

    for (const f of flights) {
      if (f.departure_iata && airportCoords.has(f.departure_iata) && !seenAirports.has(f.departure_iata)) {
        const g = airportCoords.get(f.departure_iata)!;
        markers.push({ id: `airport-${f.departure_iata}`, type: "airport", lat: g.lat, lng: g.lng, label: f.departure_iata, sublabel: g.name });
        seenAirports.add(f.departure_iata);
      }
      if (f.arrival_iata && airportCoords.has(f.arrival_iata) && !seenAirports.has(f.arrival_iata)) {
        const g = airportCoords.get(f.arrival_iata)!;
        markers.push({ id: `airport-${f.arrival_iata}`, type: "airport", lat: g.lat, lng: g.lng, label: f.arrival_iata, sublabel: g.name });
        seenAirports.add(f.arrival_iata);
      }
    }

    for (const a of preGeocoded) {
      markers.push({ id: a.id, type: "activity", lat: a.lat!, lng: a.lng!, label: a.title, sublabel: a.place_name ?? undefined });
    }
    for (const a of toGeocode) {
      const g = placeCoords.get(a.id);
      if (g) markers.push({ id: a.id, type: "activity", lat: g.lat, lng: g.lng, label: a.title, sublabel: a.place_name ?? a.title });
    }

    // Build routes
    const routes: MapRoute[] = [];
    for (const f of flights) {
      if (!f.departure_iata || !f.arrival_iata) continue;
      const dep = airportCoords.get(f.departure_iata);
      const arr = airportCoords.get(f.arrival_iata);
      if (dep && arr) {
        routes.push({
          id: f.id,
          from: [dep.lat, dep.lng],
          to: [arr.lat, arr.lng],
          label: f.flight_number,
        });
      }
    }

    return NextResponse.json({ markers, routes } satisfies TripMapData);
  } catch {
    return NextResponse.json({ markers: [], routes: [] });
  }
}
