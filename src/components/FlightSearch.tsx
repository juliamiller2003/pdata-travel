"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Flight } from "@/types/database";
import type { FlightResult } from "@/app/api/flights/route";

interface FlightSearchProps {
  tripId: string;
  onFlightAdded: (flight: Flight) => void;
}

function formatTime(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

export default function FlightSearch({ tripId, onFlightAdded }: FlightSearchProps) {
  const supabase = createClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabase as any;
  const [showForm, setShowForm] = useState(false);
  const [flightNumber, setFlightNumber] = useState("");
  const [flightDate, setFlightDate] = useState("");
  const [distanceMiles, setDistanceMiles] = useState("");
  const [lookupResult, setLookupResult] = useState<FlightResult | null>(null);
  const [lookupError, setLookupError] = useState<string | null>(null);
  const [looking, setLooking] = useState(false);
  const [saving, setSaving] = useState(false);

  function resetForm() {
    setFlightNumber("");
    setFlightDate("");
    setDistanceMiles("");
    setLookupResult(null);
    setLookupError(null);
  }

  async function handleLookup(e: React.FormEvent) {
    e.preventDefault();
    setLooking(true);
    setLookupResult(null);
    setLookupError(null);

    const res = await fetch(
      `/api/flights?flight=${encodeURIComponent(flightNumber.trim())}&date=${flightDate}`
    );
    const data = await res.json();
    setLooking(false);

    if (!res.ok) {
      setLookupError(data.error ?? "Flight not found. Try checking the number and date.");
      return;
    }
    setLookupResult(data);
  }

  async function handleSave() {
    if (!lookupResult) return;
    setSaving(true);

    const miles = distanceMiles ? parseInt(distanceMiles, 10) : null;

    const { data, error } = await db
      .from("flights")
      .insert({
        trip_id: tripId,
        flight_number: lookupResult.flightNumber,
        airline: lookupResult.airline,
        departure_airport: lookupResult.departureAirport,
        departure_city: lookupResult.departureCity,
        departure_iata: lookupResult.departureIata,
        departure_time: lookupResult.departureTime,
        arrival_airport: lookupResult.arrivalAirport,
        arrival_city: lookupResult.arrivalCity,
        arrival_iata: lookupResult.arrivalIata,
        arrival_time: lookupResult.arrivalTime,
        flight_date: flightDate,
        status: lookupResult.status,
        distance_miles: miles,
      })
      .select()
      .single();

    setSaving(false);
    if (error || !data) return;

    onFlightAdded(data);
    setShowForm(false);
    resetForm();
  }

  async function handleSaveManual(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);

    const miles = distanceMiles ? parseInt(distanceMiles, 10) : null;

    const { data, error } = await db
      .from("flights")
      .insert({
        trip_id: tripId,
        flight_number: flightNumber.trim().toUpperCase(),
        flight_date: flightDate,
        distance_miles: miles,
      })
      .select()
      .single();

    setSaving(false);
    if (error || !data) return;

    onFlightAdded(data);
    setShowForm(false);
    resetForm();
  }

  if (!showForm) {
    return (
      <button
        onClick={() => setShowForm(true)}
        className="w-full rounded-xl border-2 border-dashed border-gray-200 py-3 text-sm font-medium text-gray-400 hover:border-sky-300 hover:text-sky-500 transition-colors"
      >
        + Add flight
      </button>
    );
  }

  return (
    <div className="rounded-xl border border-sky-100 bg-sky-50/50 p-4 space-y-4">
      <h4 className="text-sm font-semibold text-gray-700">Add a flight</h4>

      <form onSubmit={handleLookup} className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">Flight number</label>
            <input
              type="text"
              required
              value={flightNumber}
              onChange={(e) => setFlightNumber(e.target.value.toUpperCase())}
              placeholder="e.g. AA100"
              className="input"
            />
          </div>
          <div>
            <label className="label">Date</label>
            <input
              type="date"
              required
              value={flightDate}
              onChange={(e) => setFlightDate(e.target.value)}
              className="input"
            />
          </div>
        </div>

        <div className="flex gap-2">
          <button type="submit" disabled={looking} className="btn-primary flex-1">
            {looking ? "Looking up…" : "Look up flight"}
          </button>
          <button
            type="button"
            onClick={() => { setShowForm(false); resetForm(); }}
            className="btn-secondary"
          >
            Cancel
          </button>
        </div>
      </form>

      {/* Lookup result */}
      {lookupResult && (
        <div className="rounded-lg border border-sky-200 bg-white p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-bold text-gray-900 text-lg">{lookupResult.flightNumber}</p>
              {lookupResult.airline && <p className="text-xs text-gray-400">{lookupResult.airline}</p>}
            </div>
            {lookupResult.status && (
              <span className="rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-700 capitalize">
                {lookupResult.status}
              </span>
            )}
          </div>

          <div className="flex items-center gap-3">
            <div className="flex-1 text-center">
              <p className="text-2xl font-bold text-gray-900">{lookupResult.departureIata ?? "—"}</p>
              <p className="text-xs text-gray-400 mt-0.5 line-clamp-1">{lookupResult.departureAirport ?? "—"}</p>
              <p className="text-sm font-medium text-gray-700 mt-1">{formatTime(lookupResult.departureTime)}</p>
              <p className="text-xs text-gray-400">
                {lookupResult.departureTime
                  ? new Date(lookupResult.departureTime).toLocaleDateString("en-US", { month: "short", day: "numeric" })
                  : ""}
              </p>
            </div>
            <div className="flex flex-col items-center gap-1 text-gray-300">
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 12h12m0 0l-4-4m4 4l-4 4" />
              </svg>
            </div>
            <div className="flex-1 text-center">
              <p className="text-2xl font-bold text-gray-900">{lookupResult.arrivalIata ?? "—"}</p>
              <p className="text-xs text-gray-400 mt-0.5 line-clamp-1">{lookupResult.arrivalAirport ?? "—"}</p>
              <p className="text-sm font-medium text-gray-700 mt-1">{formatTime(lookupResult.arrivalTime)}</p>
              <p className="text-xs text-gray-400">
                {lookupResult.arrivalTime
                  ? new Date(lookupResult.arrivalTime).toLocaleDateString("en-US", { month: "short", day: "numeric" })
                  : ""}
              </p>
            </div>
          </div>

          <div>
            <label className="label">Distance (miles) <span className="text-gray-400 font-normal">— optional</span></label>
            <input
              type="number"
              min="1"
              value={distanceMiles}
              onChange={(e) => setDistanceMiles(e.target.value)}
              placeholder="e.g. 2,475"
              className="input"
            />
          </div>

          <button
            onClick={handleSave}
            disabled={saving}
            className="btn-primary w-full"
          >
            {saving ? "Saving…" : "Add this flight"}
          </button>
        </div>
      )}

      {/* Lookup error — offer manual save */}
      {lookupError && (
        <div className="rounded-lg border border-amber-100 bg-amber-50 p-3 space-y-3">
          <p className="text-sm text-amber-700">{lookupError}</p>
          {flightNumber && flightDate && (
            <form onSubmit={handleSaveManual} className="space-y-2">
              <div>
                <label className="label">Distance (miles) <span className="text-amber-600 font-normal">— optional</span></label>
                <input
                  type="number"
                  min="1"
                  value={distanceMiles}
                  onChange={(e) => setDistanceMiles(e.target.value)}
                  placeholder="e.g. 2,475"
                  className="input"
                />
              </div>
              <button
                type="submit"
                disabled={saving}
                className="text-sm text-amber-700 underline hover:text-amber-900"
              >
                Save {flightNumber} on {flightDate} without details
              </button>
            </form>
          )}
        </div>
      )}

      {/* No API key configured */}
      {lookupError === "Flight lookup not configured" && (
        <p className="text-xs text-gray-400">
          Add <code>AVIATIONSTACK_API_KEY</code> to your <code>.env.local</code> to enable automatic flight lookup.
        </p>
      )}
    </div>
  );
}

// Reusable flight card for display
export function FlightCard({ flight, onDelete }: { flight: Flight; onDelete: () => void }) {
  function formatTime(iso: string | null) {
    if (!iso) return "—";
    return new Date(iso).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true });
  }

  return (
    <div className="rounded-xl border border-gray-100 bg-gray-50 p-4">
      <div className="flex items-start justify-between mb-3">
        <div>
          <p className="font-bold text-gray-900">{flight.flight_number}</p>
          {flight.airline && <p className="text-xs text-gray-400">{flight.airline}</p>}
        </div>
        <div className="flex items-center gap-2">
          {flight.status && (
            <span className="rounded-full bg-sky-100 px-2 py-0.5 text-xs font-medium text-sky-700 capitalize">
              {flight.status}
            </span>
          )}
          <button
            onClick={onDelete}
            className="text-gray-300 hover:text-red-400 transition-colors"
            title="Remove flight"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>

      {(flight.departure_iata || flight.arrival_iata) ? (
        <div className="flex items-center gap-3">
          <div className="flex-1 text-center">
            <p className="text-xl font-bold text-gray-900">{flight.departure_iata ?? "—"}</p>
            <p className="text-xs text-gray-400 line-clamp-1">{flight.departure_airport ?? ""}</p>
            <p className="text-sm font-medium text-gray-700 mt-1">{formatTime(flight.departure_time)}</p>
          </div>
          <svg className="h-4 w-4 text-gray-300 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 12h12m0 0l-4-4m4 4l-4 4" />
          </svg>
          <div className="flex-1 text-center">
            <p className="text-xl font-bold text-gray-900">{flight.arrival_iata ?? "—"}</p>
            <p className="text-xs text-gray-400 line-clamp-1">{flight.arrival_airport ?? ""}</p>
            <p className="text-sm font-medium text-gray-700 mt-1">{formatTime(flight.arrival_time)}</p>
          </div>
        </div>
      ) : (
        <p className="text-xs text-gray-400">
          {new Date(flight.flight_date + "T00:00:00").toLocaleDateString("en-US", {
            month: "long",
            day: "numeric",
            year: "numeric",
          })}
        </p>
      )}

      {flight.distance_miles != null && (
        <p className="mt-2 text-xs text-gray-400 text-right">
          {flight.distance_miles.toLocaleString()} mi
        </p>
      )}
    </div>
  );
}
