"use client";

import { useState, useCallback } from "react";
import { ComposableMap, Geographies, Geography, ZoomableGroup } from "react-simple-maps";
import type { Trip } from "@/types/database";
import { numericToAlpha2, byAlpha2 } from "@/lib/countries";
import CountryModal from "@/components/CountryModal";

const GEO_URL = "https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json";

interface SelectedCountry {
  code: string;
  name: string;
}

interface TravelMapProps {
  trips: Trip[];
  mapView: "world" | "country";
  homeCountryCode: string | null;
}

export default function TravelMap({ trips, mapView, homeCountryCode }: TravelMapProps) {
  const [visitedMap, setVisitedMap] = useState(() => buildVisitedMap(trips));
  const [selected, setSelected] = useState<SelectedCountry | null>(null);
  const [tooltip, setTooltip] = useState<{ name: string; x: number; y: number } | null>(null);

  function buildVisitedMap(tripList: Trip[]) {
    const map = new Map<string, number>();
    for (const trip of tripList) {
      if (trip.status !== "completed" && trip.status !== "ongoing") continue;
      const codes = trip.country_codes?.length
        ? trip.country_codes
        : trip.country_code ? [trip.country_code] : [];
      for (const code of codes) {
        map.set(code, (map.get(code) ?? 0) + 1);
      }
    }
    return map;
  }

  const visitedCount = visitedMap.size;
  const homeCountry = homeCountryCode ? byAlpha2[homeCountryCode] : null;
  const center: [number, number] =
    mapView === "country" && homeCountry ? homeCountry.center : [10, 20];
  const zoom = mapView === "country" ? 3.5 : 1;

  const handleMouseEnter = useCallback(
    (e: React.MouseEvent<SVGPathElement>, geoId: string, geoName?: string) => {
      const alpha2 = numericToAlpha2[geoId];
      const country = alpha2 ? byAlpha2[alpha2] : null;
      const name = country?.name ?? geoName;
      if (name) setTooltip({ name, x: e.clientX, y: e.clientY });
    },
    []
  );

  const handleMouseMove = useCallback((e: React.MouseEvent<SVGPathElement>) => {
    setTooltip((t) => (t ? { ...t, x: e.clientX, y: e.clientY } : null));
  }, []);

  const handleClick = useCallback((geoId: string) => {
    const alpha2 = numericToAlpha2[geoId];
    if (!alpha2) return;
    const country = byAlpha2[alpha2];
    if (!country) return;
    setSelected({ code: alpha2, name: country.name });
    setTooltip(null);
  }, []);

  // After a trip is saved in the modal, re-fetch the visited map
  function handleTripSaved() {
    // Refetch via a lightweight state update — the page will reload counts
    // We re-derive by re-querying from supabase in the modal itself,
    // and trigger a window reload of just the map badge via a small trick:
    setVisitedMap((prev) => {
      if (selected) {
        const updated = new Map(prev);
        if (!updated.has(selected.code)) updated.set(selected.code, 1);
        return updated;
      }
      return prev;
    });
  }

  return (
    <>
      <div className="overflow-hidden mb-8 bg-sky-50 dark:bg-black">
        <div className="relative" style={{ height: 480 }}>
          <ComposableMap
            projection="geoNaturalEarth1"
            projectionConfig={{ scale: 175, center: [0, 0] }}
            style={{ width: "100%", height: "100%" }}
          >
            <ZoomableGroup center={center} zoom={zoom} maxZoom={12}>
              <Geographies geography={GEO_URL}>
                {({ geographies }: { geographies: { id: unknown; rsmKey: string; properties?: Record<string, unknown> }[] }) =>
                  geographies.map((geo: { id: unknown; rsmKey: string; properties?: Record<string, unknown> }) => {
                    const geoId = String(geo.id ?? "");
                    const alpha2 = numericToAlpha2[geoId];
                    const isVisited = alpha2 ? visitedMap.has(alpha2) : false;
                    const isHome = !!alpha2 && alpha2 === homeCountryCode;
                    const isSelected =
                      selected !== null &&
                      alpha2 !== undefined &&
                      selected.code === alpha2;

                    const defaultFill = isSelected
                      ? "#0284c7"
                      : isVisited
                      ? "#38bdf8"
                      : isHome
                      ? "#bae6fd"
                      : "#cbd5e1";

                    const hoverFill = isVisited
                      ? "#0284c7"
                      : isHome
                      ? "#7dd3fc"
                      : "#94a3b8";

                    return (
                      <Geography
                        key={geo.rsmKey}
                        geography={geo}
                        onClick={() => handleClick(geoId)}
                        onMouseEnter={(e: React.MouseEvent<SVGPathElement>) => handleMouseEnter(e, geoId, geo.properties?.name as string | undefined)}
                        onMouseMove={handleMouseMove}
                        onMouseLeave={() => setTooltip(null)}
                        style={{
                          default: {
                            fill: defaultFill,
                            stroke: "var(--map-border)",
                            strokeWidth: 0.4,
                            outline: "none",
                            cursor: "pointer",
                            transition: "fill 0.1s",
                          },
                          hover: {
                            fill: hoverFill,
                            stroke: "var(--map-border)",
                            strokeWidth: 0.4,
                            outline: "none",
                            cursor: "pointer",
                          },
                          pressed: { fill: "#0369a1", outline: "none" },
                        }}
                      />
                    );
                  })
                }
              </Geographies>
            </ZoomableGroup>
          </ComposableMap>

          {/* Hint */}
          <div className="absolute top-3 right-3 rounded-full bg-white/90 backdrop-blur px-3 py-1 text-xs text-gray-500 shadow border border-gray-200">
            Click any country to log a visit
          </div>

          {/* Visited count badge */}
          <div className="absolute bottom-3 right-3 rounded-full bg-white/90 backdrop-blur px-3 py-1 text-xs font-medium text-gray-600 shadow border border-gray-200">
            {visitedCount === 0
              ? "No countries yet"
              : `${visitedCount} ${visitedCount === 1 ? "country" : "countries"} visited`}
          </div>

          {tooltip && (
            <div
              className="pointer-events-none fixed z-50 rounded-lg bg-gray-900 px-2.5 py-1 text-xs text-white shadow-lg"
              style={{ left: tooltip.x + 12, top: tooltip.y - 32 }}
            >
              {tooltip.name}
            </div>
          )}
        </div>
      </div>

      {/* Country modal */}
      {selected && (
        <CountryModal
          countryCode={selected.code}
          countryName={selected.name}
          onClose={() => setSelected(null)}
          onTripSaved={handleTripSaved}
        />
      )}
    </>
  );
}
