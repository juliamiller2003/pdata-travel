"use client";

import { useEffect, useState, useMemo } from "react";
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
  day_number?: number;
}

interface DayInfo {
  day_number: number;
  date: string | null;
}

interface AccommodationInput {
  id: string;
  name: string;
  city: string | null;
  type: string | null;
}

interface TripMapViewProps {
  tripId: string;
  flights: Flight[];
  activities: ActivityInput[];
  days: DayInfo[];
  accommodations?: AccommodationInput[];
}

function loadMapPrefs(tripId: string, allDayNumbers: number[]) {
  try {
    const raw = localStorage.getItem(`trip_map_prefs_${tripId}`);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return {
      showFlights: typeof parsed.showFlights === "boolean" ? parsed.showFlights : true,
      showAccommodations: typeof parsed.showAccommodations === "boolean" ? parsed.showAccommodations : true,
      selectedDays: Array.isArray(parsed.selectedDays)
        ? new Set<number>(parsed.selectedDays.filter((n: unknown) => allDayNumbers.includes(n as number)))
        : new Set<number>(allDayNumbers),
    };
  } catch {
    return null;
  }
}

export default function TripMapView({ tripId, flights, activities, days, accommodations = [] }: TripMapViewProps) {
  const allDayNumbers = days.map((d) => d.day_number);

  const [data, setData] = useState<TripMapData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [showFlights, setShowFlights] = useState(true);
  const [showAccommodations, setShowAccommodations] = useState(true);
  const [selectedDays, setSelectedDays] = useState<Set<number>>(
    new Set(allDayNumbers)
  );

  // Restore saved prefs on mount (client-only — localStorage unavailable during SSR)
  useEffect(() => {
    const prefs = loadMapPrefs(tripId, allDayNumbers);
    if (!prefs) return;
    setShowFlights(prefs.showFlights);
    setShowAccommodations(prefs.showAccommodations);
    // Only restore selectedDays if the saved set is a non-trivial subset of current days
    if (prefs.selectedDays.size > 0) setSelectedDays(prefs.selectedDays);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Persist prefs whenever they change
  useEffect(() => {
    try {
      localStorage.setItem(
        `trip_map_prefs_${tripId}`,
        JSON.stringify({ showFlights, showAccommodations, selectedDays: Array.from(selectedDays) })
      );
    } catch { /* ignore quota errors */ }
  }, [tripId, showFlights, showAccommodations, selectedDays]);

  const hasFlightRoutes = flights.some((f) => f.departure_iata && f.arrival_iata);
  const hasContent = hasFlightRoutes || activities.some((a) => a.place_name || a.title) || accommodations.length > 0;

  // Build lookup: activity id → day_number
  const activityDayMap = useMemo(() => {
    const m = new Map<string, number>();
    for (const a of activities) {
      if (a.day_number != null) m.set(a.id, a.day_number);
    }
    return m;
  }, [activities]);

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
        accommodations: accommodations.map((a) => ({
          id: a.id,
          name: a.name,
          city: a.city,
          type: a.type,
        })),
      }),
    })
      .then((r) => r.json())
      .then((d: TripMapData & { error?: string }) => {
        if (d.error && d.markers.length === 0) { setError(true); }
        else { setData(d); }
        setLoading(false);
      })
      .catch(() => { setError(true); setLoading(false); });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Filter markers/routes based on control state
  const filteredData = useMemo((): TripMapData | null => {
    if (!data) return null;
    const allDaysSelected = days.every((d) => selectedDays.has(d.day_number));
    const markers = data.markers.filter((m) => {
      if (m.type === "airport") return showFlights;
      if (m.type === "accommodation") return showAccommodations;
      const dayNum = activityDayMap.get(m.id);
      if (dayNum == null) return true;
      return allDaysSelected || selectedDays.has(dayNum);
    });
    const routes = showFlights ? data.routes : [];
    return { markers, routes };
  }, [data, showFlights, showAccommodations, selectedDays, activityDayMap, days]);

  const allDaysSelected = days.every((d) => selectedDays.has(d.day_number));

  function toggleDay(dayNum: number) {
    setSelectedDays((prev) => {
      const next = new Set(prev);
      if (next.has(dayNum)) next.delete(dayNum); else next.add(dayNum);
      return next;
    });
  }

  if (!hasContent) return null;

  const isEmpty = filteredData && filteredData.markers.length === 0 && filteredData.routes.length === 0;

  return (
    <section className="mb-8">
      {/* Header + controls */}
      <div className="mb-3 flex flex-wrap items-center gap-x-3 gap-y-2">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-[#efefef]">Trip Map</h2>

        <div className="flex items-center gap-1.5 flex-wrap">
          {/* Flights toggle — only shown when there are flight routes */}
          {hasFlightRoutes && (
            <button
              onClick={() => setShowFlights((v) => !v)}
              className={`flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium transition-colors ${
                showFlights
                  ? "bg-[#1e1e1e] dark:bg-[#cadede] text-white dark:text-[#1e1e1e]"
                  : "bg-gray-100 dark:bg-[#2e2e2e] text-gray-400 dark:text-[#9fb8b8]"
              }`}
            >
              <svg className="h-3 w-3" viewBox="0 0 24 24" fill="currentColor">
                <path d="M21 16v-2l-8-5V3.5c0-.83-.67-1.5-1.5-1.5S10 2.67 10 3.5V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5l8 2.5z"/>
              </svg>
              Flights
            </button>
          )}

          {/* Accommodations toggle */}
          {accommodations.length > 0 && (
            <button
              onClick={() => setShowAccommodations((v) => !v)}
              className={`flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium transition-colors ${
                showAccommodations
                  ? "bg-[#1e1e1e] dark:bg-[#cadede] text-white dark:text-[#1e1e1e]"
                  : "bg-gray-100 dark:bg-[#2e2e2e] text-gray-400 dark:text-[#9fb8b8]"
              }`}
            >
              <svg className="h-3 w-3" viewBox="0 0 24 24" fill="currentColor">
                <path d="M7 13c1.66 0 3-1.34 3-3S8.66 7 7 7s-3 1.34-3 3 1.34 3 3 3zm12-6h-8v7H3V5H1v15h2v-3h18v3h2v-9c0-2.21-1.79-4-4-4z"/>
              </svg>
              Stays
            </button>
          )}

          {/* Day filter chips — only shown when there are multiple days with activities */}
          {days.length > 1 && (
            <>
              <button
                onClick={() => setSelectedDays(new Set(days.map((d) => d.day_number)))}
                className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-medium transition-colors ${
                  allDaysSelected
                    ? "bg-[#1e1e1e] dark:bg-[#cadede] text-white dark:text-[#1e1e1e]"
                    : "bg-gray-100 dark:bg-[#2e2e2e] text-gray-400 dark:text-[#9fb8b8] hover:bg-gray-200 dark:hover:bg-[#3e3e3e]"
                }`}
              >
                All
              </button>
              <div className="flex items-center gap-1 overflow-x-auto max-w-full">
                {days.map((d) => {
                  const active = !allDaysSelected && selectedDays.has(d.day_number);
                  return (
                    <button
                      key={d.day_number}
                      onClick={() => {
                        if (allDaysSelected) {
                          setSelectedDays(new Set([d.day_number]));
                        } else {
                          toggleDay(d.day_number);
                        }
                      }}
                      className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-medium transition-colors ${
                        active
                          ? "bg-[#1e1e1e] dark:bg-[#cadede] text-white dark:text-[#1e1e1e]"
                          : "bg-gray-100 dark:bg-[#2e2e2e] text-gray-400 dark:text-[#9fb8b8] hover:bg-gray-200 dark:hover:bg-[#3e3e3e]"
                      }`}
                    >
                      {d.day_number}
                    </button>
                  );
                })}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Map — isolate creates a new stacking context so Leaflet's internal
           z-indices don't escape and overlap the sticky nav/dropdown */}
      <div
        className="overflow-hidden rounded-2xl border border-gray-100 dark:border-[#2e2e2e] shadow-sm isolate"
        style={{ height: 380, zIndex: 0 }}
      >
        {loading && (
          <div className="flex h-full items-center justify-center gap-2 bg-gray-50 dark:bg-[#1a1a1a] text-sm text-gray-400">
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-gray-200 border-t-[#9fb8b8]" />
            Plotting your trip…
          </div>
        )}
        {error && !loading && (
          <div className="flex h-full items-center justify-center bg-gray-50 dark:bg-[#1a1a1a] text-sm text-gray-400">
            Map unavailable
          </div>
        )}
        {!loading && !error && isEmpty && (
          <div className="flex h-full items-center justify-center bg-gray-50 dark:bg-[#1a1a1a] text-sm text-gray-400">
            No locations to show
          </div>
        )}
        {filteredData && !isEmpty && <TripMapInner data={filteredData} />}
      </div>
    </section>
  );
}
