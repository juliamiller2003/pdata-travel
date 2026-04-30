"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import type { TripMapData } from "@/app/api/trip-map/route";
import type { Flight } from "@/types/database";

const TripMapInner = dynamic(() => import("./TripMapInner"), {
  ssr: false,
  loading: () => (
    <div className="flex h-full items-center justify-center text-sm text-gray-400">
      Loading map…
    </div>
  ),
});

interface ActivityInput {
  id: string;
  title: string;
  place_name: string | null;
  lat: number | null;
  lng: number | null;
}

interface TripMapViewProps {
  flights: Flight[];
  activities: ActivityInput[];
}

export default function TripMapView({ flights, activities }: TripMapViewProps) {
  const [data, setData] = useState<TripMapData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const hasContent =
    flights.some((f) => f.departure_iata && f.arrival_iata) ||
    activities.some((a) => a.place_name || a.title);

  useEffect(() => {
    if (!hasContent) { setLoading(false); return; }

    fetch("/api/trip-map", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        flights: flights.map((f) => ({
          id: f.id,
          flight_number: f.flight_number,
          departure_iata: f.departure_iata,
          arrival_iata: f.arrival_iata,
        })),
        activities,
      }),
    })
      .then((r) => r.json())
      .then((d: TripMapData) => { setData(d); setLoading(false); })
      .catch(() => { setError(true); setLoading(false); });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!hasContent) return null;

  const isEmpty = data && data.markers.length === 0 && data.routes.length === 0;

  return (
    <section className="mb-8">
      <h2 className="mb-4 text-lg font-semibold text-gray-900">Trip Map</h2>
      <div className="overflow-hidden rounded-2xl border border-gray-100 shadow-sm" style={{ height: 380 }}>
        {loading && (
          <div className="flex h-full items-center justify-center gap-2 bg-gray-50 text-sm text-gray-400">
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-gray-300 border-t-sky-500" />
            Plotting your trip…
          </div>
        )}
        {error && (
          <div className="flex h-full items-center justify-center bg-gray-50 text-sm text-gray-400">
            Map unavailable
          </div>
        )}
        {isEmpty && (
          <div className="flex h-full items-center justify-center bg-gray-50 text-sm text-gray-400">
            No locations found
          </div>
        )}
        {data && !isEmpty && <TripMapInner data={data} />}
      </div>
      {data && (
        <p className="mt-1.5 text-xs text-gray-400">
          {data.markers.filter((m) => m.type === "airport").length > 0 && "✈ Airports  "}
          {data.markers.filter((m) => m.type === "activity").length > 0 && "● Activities"}
        </p>
      )}
    </section>
  );
}
