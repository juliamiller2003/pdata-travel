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

/** Extract the first JSON array from a string, even if wrapped in prose or code fences */
function extractJsonArray(text: string): string {
  // Strip code fences
  text = text.replace(/^```json\s*/im, "").replace(/^```\s*/im, "").replace(/```\s*$/im, "").trim();
  // Find the outermost [ ... ]
  const start = text.indexOf("[");
  const end = text.lastIndexOf("]");
  if (start === -1 || end === -1 || end < start) return "[]";
  return text.slice(start, end + 1);
}

export async function POST(req: NextRequest) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return NextResponse.json({ markers: [], routes: [] });

  const { flights, activities }: { flights: FlightInput[]; activities: ActivityInput[] } = await req.json();

  // Collect unique IATAs from flights
  const iatas = [...new Set<string>(
    flights.flatMap((f) => [f.departure_iata, f.arrival_iata].filter(Boolean) as string[])
  )];

  // Activities needing geocoding (no coordinates stored)
  const toGeocode = activities.filter((a) => (a.place_name || a.title) && (a.lat == null || a.lng == null));
  const preGeocoded = activities.filter((a) => (a.place_name || a.title) && a.lat != null && a.lng != null);

  // If nothing to geocode, return pre-geocoded markers only
  if (iatas.length === 0 && toGeocode.length === 0) {
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

  // Build prompt using indices (not UUIDs) for reliable matching
  const airportSection = iatas.length > 0
    ? `Airports (return type "airport", use the iata field as given):\n${iatas.map((c) => `  ${c}`).join("\n")}`
    : "";

  const placeSection = toGeocode.length > 0
    ? `Places (return type "place", use the exact index 0…${toGeocode.length - 1}):\n${
        toGeocode.map((a, i) => `  ${i}: "${a.place_name ?? a.title}"`).join("\n")
      }`
    : "";

  const prompt = `Return precise latitude/longitude coordinates for these locations.
Return ONLY a valid JSON array with no extra text or markdown.

${airportSection}
${placeSection}

For airports use this shape:
{ "type": "airport", "iata": "TPE", "lat": 25.0777, "lng": 121.2322, "name": "Taiwan Taoyuan International Airport" }

For places use this shape (index must be the integer from the list above):
{ "type": "place", "index": 0, "lat": 25.0369, "lng": 121.4996 }

Only include entries you are confident about. Omit any you are unsure of.`;

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
      console.error(`trip-map geocode failed (${res.status}):`, errText.slice(0, 300));
      return NextResponse.json({ markers: [], routes: [], error: `Geocode API error: ${res.status}` }, { status: 502 });
    }

    const result = await res.json();
    const rawText: string = (result.content ?? [])
      .filter((b: { type: string }) => b.type === "text")
      .map((b: { text: string }) => b.text)
      .join("")
      .trim();

    const jsonText = extractJsonArray(rawText);
    type GeoEntry =
      | { type: "airport"; iata: string; lat: number; lng: number; name?: string }
      | { type: "place"; index: number; lat: number; lng: number };

    const geocoded: GeoEntry[] = JSON.parse(jsonText);

    // Build lookup maps
    const airportCoords = new Map<string, { lat: number; lng: number; name?: string }>();
    const placeCoords = new Map<number, { lat: number; lng: number }>();

    for (const g of geocoded) {
      if (g.type === "airport" && g.iata) {
        airportCoords.set(g.iata, { lat: g.lat, lng: g.lng, name: (g as { type: "airport"; iata: string; lat: number; lng: number; name?: string }).name });
      }
      if (g.type === "place" && typeof g.index === "number") {
        placeCoords.set(g.index, { lat: g.lat, lng: g.lng });
      }
    }

    // Build markers
    const markers: MapMarker[] = [];
    const seenAirports = new Set<string>();

    for (const f of flights) {
      for (const iata of [f.departure_iata, f.arrival_iata]) {
        if (iata && airportCoords.has(iata) && !seenAirports.has(iata)) {
          const c = airportCoords.get(iata)!;
          markers.push({ id: `airport-${iata}`, type: "airport", lat: c.lat, lng: c.lng, label: iata, sublabel: c.name });
          seenAirports.add(iata);
        }
      }
    }

    for (const a of preGeocoded) {
      markers.push({ id: a.id, type: "activity", lat: a.lat!, lng: a.lng!, label: a.title, sublabel: a.place_name ?? undefined });
    }

    for (let i = 0; i < toGeocode.length; i++) {
      const coords = placeCoords.get(i);
      if (coords) {
        const a = toGeocode[i];
        markers.push({ id: a.id, type: "activity", lat: coords.lat, lng: coords.lng, label: a.title, sublabel: a.place_name ?? undefined });
      }
    }

    // Build routes
    const routes: MapRoute[] = [];
    for (const f of flights) {
      if (!f.departure_iata || !f.arrival_iata) continue;
      const dep = airportCoords.get(f.departure_iata);
      const arr = airportCoords.get(f.arrival_iata);
      if (dep && arr) {
        routes.push({ id: f.id, from: [dep.lat, dep.lng], to: [arr.lat, arr.lng], label: f.flight_number });
      }
    }

    return NextResponse.json({ markers, routes } satisfies TripMapData);
  } catch (err) {
    console.error("trip-map error:", err);
    return NextResponse.json({ markers: [], routes: [] });
  }
}
