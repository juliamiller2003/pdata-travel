"use client";

import { useEffect } from "react";
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import type { TripMapData, MapMarker } from "@/app/api/trip-map/route";

// Compute intermediate points along a great-circle-approximating arc
function arcPoints(from: [number, number], to: [number, number], steps = 60): [number, number][] {
  const points: [number, number][] = [];
  const midLat = (from[0] + to[0]) / 2;
  const midLng = (from[1] + to[1]) / 2;
  const dist = Math.sqrt((to[0] - from[0]) ** 2 + (to[1] - from[1]) ** 2);
  const lift = dist * 0.18;
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const lat = (1 - t) ** 2 * from[0] + 2 * (1 - t) * t * (midLat + lift) + t ** 2 * to[0];
    const lng = (1 - t) ** 2 * from[1] + 2 * (1 - t) * t * midLng + t ** 2 * to[1];
    points.push([lat, lng]);
  }
  return points;
}

function makeIcon(type: MapMarker["type"]) {
  const isAirport = type === "airport";
  // Palette: dark charcoal for airports, teal accent for activities
  const bg = isAirport ? "#1e1e1e" : "#9fb8b8";
  const border = isAirport ? "rgba(255,255,255,0.15)" : "rgba(255,255,255,0.6)";
  const svg = isAirport
    ? `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="white" width="13" height="13"><path d="M21 16v-2l-8-5V3.5c0-.83-.67-1.5-1.5-1.5S10 2.67 10 3.5V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5l8 2.5z"/></svg>`
    : `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="white" width="11" height="11"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/></svg>`;
  return L.divIcon({
    className: "",
    html: `<div style="background:${bg};width:28px;height:28px;border-radius:50%;display:flex;align-items:center;justify-content:center;border:2px solid ${border};box-shadow:0 2px 8px rgba(0,0,0,0.18);">${svg}</div>`,
    iconSize: [28, 28],
    iconAnchor: [14, 14],
    popupAnchor: [0, -16],
  });
}

function FitBounds({ markers }: { markers: TripMapData["markers"] }) {
  const map = useMap();
  useEffect(() => {
    if (markers.length === 0) return;
    const bounds = L.latLngBounds(markers.map((m) => [m.lat, m.lng]));
    map.fitBounds(bounds, { padding: [48, 48], maxZoom: 12 });
  }, [map, markers]);
  return null;
}

interface TripMapInnerProps {
  data: TripMapData;
}

export default function TripMapInner({ data }: TripMapInnerProps) {
  const { markers, routes } = data;

  const center: [number, number] =
    markers.length > 0
      ? [markers.reduce((s, m) => s + m.lat, 0) / markers.length, markers.reduce((s, m) => s + m.lng, 0) / markers.length]
      : [20, 0];

  return (
    <MapContainer center={center} zoom={3} style={{ height: "100%", width: "100%" }} zoomControl={true}>
      <TileLayer
        attribution='&copy; <a href="https://carto.com/">CartoDB</a>'
        url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
      />
      <FitBounds markers={markers} />

      {routes.map((route) => (
        <Polyline
          key={route.id}
          positions={arcPoints(route.from, route.to)}
          pathOptions={{ color: "#9fb8b8", weight: 2, opacity: 0.6, dashArray: "5 5" }}
        />
      ))}

      {markers.map((marker) => (
        <Marker key={marker.id} position={[marker.lat, marker.lng]} icon={makeIcon(marker.type)}>
          <Popup>
            <div className="text-sm">
              <p className="font-semibold">{marker.label}</p>
              {marker.sublabel && <p className="text-gray-500 text-xs mt-0.5">{marker.sublabel}</p>}
            </div>
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  );
}
