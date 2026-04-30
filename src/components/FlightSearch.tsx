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
  const [editDepartureIata, setEditDepartureIata] = useState("");
  const [editArrivalIata, setEditArrivalIata] = useState("");
  const [editDepartureCity, setEditDepartureCity] = useState("");
  const [editArrivalCity, setEditArrivalCity] = useState("");
  const [lookupError, setLookupError] = useState<string | null>(null);
  const [looking, setLooking] = useState(false);
  const [saving, setSaving] = useState(false);

  function resetForm() {
    setFlightNumber("");
    setFlightDate("");
    setDistanceMiles("");
    setLookupResult(null);
    setLookupError(null);
    setEditDepartureIata("");
    setEditArrivalIata("");
    setEditDepartureCity("");
    setEditArrivalCity("");
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
    setEditDepartureIata(data.departureIata ?? "");
    setEditArrivalIata(data.arrivalIata ?? "");
    setEditDepartureCity(data.departureCity ?? "");
    setEditArrivalCity(data.arrivalCity ?? "");
    if (data.distanceMiles) setDistanceMiles(String(data.distanceMiles));
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
        departure_city: editDepartureCity || lookupResult.departureCity,
        departure_iata: editDepartureIata || lookupResult.departureIata,
        departure_time: lookupResult.departureTime,
        arrival_airport: lookupResult.arrivalAirport,
        arrival_city: editArrivalCity || lookupResult.arrivalCity,
        arrival_iata: editArrivalIata || lookupResult.arrivalIata,
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
        className="w-full rounded-xl border-2 border-dashed border-gray-200 dark:border-[#2e2e2e] py-3 text-sm font-medium text-gray-400 dark:text-[#9fb8b8] hover:border-[#9fb8b8] hover:text-[#9fb8b8] transition-colors"
      >
        + Add flight
      </button>
    );
  }

  return (
    <div className="rounded-xl border border-sky-100 bg-sky-50/50 dark:border-[#2e2e2e] dark:bg-transparent p-4 space-y-4">
      <h4 className="text-sm font-semibold text-gray-700 dark:text-[#cadede]">Add a flight</h4>

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
        <div className="rounded-lg border border-sky-200 bg-white dark:border-[#2e2e2e] dark:bg-transparent p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-bold text-gray-900 dark:text-[#efefef] text-lg">{lookupResult.flightNumber}</p>
              {lookupResult.airline && <p className="text-xs text-gray-400 dark:text-[#9fb8b8]">{lookupResult.airline}</p>}
            </div>
            {lookupResult.status && (
              <span className="rounded-full bg-green-100 dark:bg-[#cadede] px-2.5 py-0.5 text-xs font-medium text-green-700 dark:text-[#1e1e1e] capitalize">
                {lookupResult.status}
              </span>
            )}
          </div>

          <div className="flex items-center gap-3">
            <div className="flex-1 space-y-1">
              <input
                type="text"
                maxLength={3}
                value={editDepartureIata}
                onChange={(e) => setEditDepartureIata(e.target.value.toUpperCase())}
                placeholder="DEP"
                className="input text-center text-xl font-bold uppercase tracking-widest"
              />
              <input
                type="text"
                value={editDepartureCity}
                onChange={(e) => setEditDepartureCity(e.target.value)}
                placeholder="City"
                className="input text-center text-xs"
              />
              {lookupResult.departureTime && (
                <p className="text-sm font-medium text-gray-700 dark:text-[#efefef] text-center">{formatTime(lookupResult.departureTime)}</p>
              )}
            </div>
            <div className="flex flex-col items-center gap-1 text-gray-300 shrink-0">
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 12h12m0 0l-4-4m4 4l-4 4" />
              </svg>
            </div>
            <div className="flex-1 space-y-1">
              <input
                type="text"
                maxLength={3}
                value={editArrivalIata}
                onChange={(e) => setEditArrivalIata(e.target.value.toUpperCase())}
                placeholder="ARR"
                className="input text-center text-xl font-bold uppercase tracking-widest"
              />
              <input
                type="text"
                value={editArrivalCity}
                onChange={(e) => setEditArrivalCity(e.target.value)}
                placeholder="City"
                className="input text-center text-xs"
              />
              {lookupResult.arrivalTime && (
                <p className="text-sm font-medium text-gray-700 text-center">{formatTime(lookupResult.arrivalTime)}</p>
              )}
            </div>
          </div>
          {(!editDepartureIata || !editArrivalIata) && (
            <p className="text-xs text-amber-600">Enter the 3-letter airport codes above to enable the trip map.</p>
          )}

          <div>
            <label className="label">Distance (miles)</label>
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
                <label className="label">Distance (miles)</label>
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
    <div className="rounded-xl border border-gray-100 bg-gray-50 dark:border-[#2e2e2e] dark:bg-transparent p-4">
      <div className="flex items-start justify-between mb-3">
        <div>
          <p className="font-bold text-gray-900 dark:text-[#efefef]">{flight.flight_number}</p>
          {flight.airline && <p className="text-xs text-gray-400 dark:text-[#9fb8b8]">{flight.airline}</p>}
        </div>
        <div className="flex items-center gap-2">
          {flight.status && (
            <span className="rounded-full bg-sky-100 dark:bg-[#cadede] px-2 py-0.5 text-xs font-medium text-sky-700 dark:text-[#1e1e1e] capitalize">
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
            <p className="text-xl font-bold text-gray-900 dark:text-[#efefef]">{flight.departure_iata ?? "—"}</p>
            <p className="text-xs text-gray-400 dark:text-[#9fb8b8] line-clamp-1">{flight.departure_airport ?? ""}</p>
            <p className="text-sm font-medium text-gray-700 dark:text-[#efefef] mt-1">{formatTime(flight.departure_time)}</p>
          </div>
          <svg className="h-4 w-4 text-gray-300 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 12h12m0 0l-4-4m4 4l-4 4" />
          </svg>
          <div className="flex-1 text-center">
            <p className="text-xl font-bold text-gray-900 dark:text-[#efefef]">{flight.arrival_iata ?? "—"}</p>
            <p className="text-xs text-gray-400 dark:text-[#9fb8b8] line-clamp-1">{flight.arrival_airport ?? ""}</p>
            <p className="text-sm font-medium text-gray-700 dark:text-[#efefef] mt-1">{formatTime(flight.arrival_time)}</p>
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
        <p className="mt-2 text-xs text-gray-400 dark:text-[#9fb8b8] text-right">
          {flight.distance_miles.toLocaleString()} mi
        </p>
      )}
    </div>
  );
}
