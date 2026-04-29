"use client";

import { MapContainer, TileLayer } from "react-leaflet";
import "leaflet/dist/leaflet.css";

export default function LoginMapBackground() {
  return (
    <MapContainer
      center={[20, 10]}
      zoom={2}
      zoomControl={false}
      dragging={false}
      scrollWheelZoom={false}
      doubleClickZoom={false}
      touchZoom={false}
      keyboard={false}
      attributionControl={false}
      style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, zIndex: 0, height: "100vh", width: "100vw" }}
    >
      <TileLayer url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png" />
    </MapContainer>
  );
}
