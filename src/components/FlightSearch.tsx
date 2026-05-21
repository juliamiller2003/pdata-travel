"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Flight } from "@/types/database";
import type { FlightResult } from "@/app/api/flights/route";

interface FlightSearchProps {
  tripId: string;
  onFlightAdded: (flight: Flight) => void;
  defaultDate?: string | null;
}

function formatTime(iso: string | null) {
  if (!iso) return "—";
  // Extract HH:MM directly from the string so we always show the local departure/arrival
  // time as stored — no Date() construction means no timezone conversion that would
  // cause server/client hydration mismatches.
  // Handles both ISO "T" separator ("2026-06-04T18:20:00+09:00")
  // and AeroDataBox space separator ("2026-06-04 18:20+09:00").
  const timePart = iso.length >= 16 && (iso[10] === "T" || iso[10] === " ")
    ? iso.slice(11, 16)
    : iso.slice(0, 5);
  if (!timePart.includes(":")) return iso;
  const [hStr, mStr] = timePart.split(":");
  const h = parseInt(hStr, 10);
  const m = parseInt(mStr, 10);
  if (isNaN(h) || isNaN(m)) return iso;
  const period = h >= 12 ? "PM" : "AM";
  const hour12 = h % 12 || 12;
  return `${hour12}:${String(m).padStart(2, "0")} ${period}`;
}

/** Extracts HH:MM from any time string for use in <input type="time"> */
function toTimeInput(iso: string | null): string {
  if (!iso) return "";
  if (iso.length >= 16 && (iso[10] === "T" || iso[10] === " ")) return iso.slice(11, 16);
  if (iso.length >= 5 && iso[2] === ":") return iso.slice(0, 5);
  return "";
}

export default function FlightSearch({ tripId, onFlightAdded, defaultDate }: FlightSearchProps) {
  const supabase = createClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabase as any;
  const [showForm, setShowForm] = useState(false);
  const [flightNumber, setFlightNumber] = useState("");
  const [flightDate, setFlightDate] = useState(defaultDate ?? "");
  const [distanceMiles, setDistanceMiles] = useState("");
  const [lookupResult, setLookupResult] = useState<FlightResult | null>(null);
  const [editDepartureIata, setEditDepartureIata] = useState("");
  const [editArrivalIata, setEditArrivalIata] = useState("");
  const [editDepartureCity, setEditDepartureCity] = useState("");
  const [editArrivalCity, setEditArrivalCity] = useState("");
  const [editDepartureTime, setEditDepartureTime] = useState("");
  const [editArrivalTime, setEditArrivalTime] = useState("");
  const [lookupError, setLookupError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [looking, setLooking] = useState(false);
  const [saving, setSaving] = useState(false);

  function resetForm() {
    setFlightNumber("");
    setFlightDate(defaultDate ?? "");
    setDistanceMiles("");
    setLookupResult(null);
    setLookupError(null);
    setEditDepartureIata("");
    setEditArrivalIata("");
    setEditDepartureCity("");
    setEditArrivalCity("");
    setEditDepartureTime("");
    setEditArrivalTime("");
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
    setEditDepartureTime(toTimeInput(data.departureTime));
    setEditArrivalTime(toTimeInput(data.arrivalTime));
    if (data.distanceMiles) setDistanceMiles(String(data.distanceMiles));
  }

  async function handleSave() {
    if (!lookupResult) return;
    setSaving(true);
    setSaveError(null);

    const miles = distanceMiles ? parseInt(distanceMiles, 10) : null;

    const { data, error } = await db
      .from("flights")
      .insert({
        trip_id: tripId,
        flight_number: lookupResult.flightNumber,
        airline: lookupResult.airline,
        // If the IATA code was changed, the original airport name is wrong — clear it.
        departure_airport: editDepartureIata === (lookupResult.departureIata ?? "") ? lookupResult.departureAirport : null,
        departure_city: editDepartureCity || (editDepartureIata !== (lookupResult.departureIata ?? "") ? null : lookupResult.departureCity),
        departure_iata: editDepartureIata || lookupResult.departureIata,
        departure_time: editDepartureTime ? `${flightDate}T${editDepartureTime}:00` : null,
        arrival_airport: editArrivalIata === (lookupResult.arrivalIata ?? "") ? lookupResult.arrivalAirport : null,
        arrival_city: editArrivalCity || (editArrivalIata !== (lookupResult.arrivalIata ?? "") ? null : lookupResult.arrivalCity),
        arrival_iata: editArrivalIata || lookupResult.arrivalIata,
        arrival_time: editArrivalTime ? `${flightDate}T${editArrivalTime}:00` : null,
        flight_date: flightDate,
        status: lookupResult.status,
        distance_miles: miles,
      })
      .select()
      .single();

    setSaving(false);
    if (error || !data) {
      setSaveError(error?.message ?? "Failed to save flight — please try again.");
      return;
    }

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
            <div className="flex items-center gap-2">
              {lookupResult.source === "ai" && (
                <span className="rounded-full bg-amber-100 dark:bg-amber-900/30 px-2.5 py-0.5 text-xs font-medium text-amber-700 dark:text-amber-400">
                  {lookupResult.partial ? "Airline only" : "AI estimate"}
                </span>
              )}
              {lookupResult.status && (
                <span className="rounded-full bg-green-100 dark:bg-[#cadede] px-2.5 py-0.5 text-xs font-medium text-green-700 dark:text-[#1e1e1e] capitalize">
                  {lookupResult.status}
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            <div className="flex-1 space-y-1">
              <input
                type="text"
                maxLength={3}
                value={editDepartureIata}
                onChange={(e) => setEditDepartureIata(e.target.value.toUpperCase())}
                placeholder="DEP"
                autoFocus={lookupResult.partial}
                className="input text-center text-xl font-bold uppercase tracking-widest"
              />
              <input
                type="text"
                value={editDepartureCity}
                onChange={(e) => setEditDepartureCity(e.target.value)}
                placeholder="City"
                className="input text-center text-xs"
              />
              <input
                type="text"
                value={editDepartureTime}
                onChange={(e) => setEditDepartureTime(e.target.value)}
                placeholder="HH:MM"
                maxLength={5}
                className="input text-center text-sm"
              />
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
              <input
                type="text"
                value={editArrivalTime}
                onChange={(e) => setEditArrivalTime(e.target.value)}
                placeholder="HH:MM"
                maxLength={5}
                className="input text-center text-sm"
              />
            </div>
          </div>
          {lookupResult.source === "ai" ? (
            <p className="text-xs text-amber-600">
              ⚠️ Route estimated by AI — may be incorrect. Edit the airport codes and cities above if needed.
            </p>
          ) : (
            <p className="text-xs text-gray-400">
              Route incorrect? Edit the airport codes and cities above before saving.
            </p>
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

          {saveError && (
            <p className="text-sm text-red-600 dark:text-red-400">{saveError}</p>
          )}
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

// Reusable flight card for display + inline editing
export function FlightCard({ flight, onDelete, onUpdated }: {
  flight: Flight;
  onDelete: () => void;
  onUpdated?: (flight: Flight) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  // Edit field state — initialised from the flight prop
  const [flightNumber, setFlightNumber] = useState(flight.flight_number);
  const [airline, setAirline] = useState(flight.airline ?? "");
  const [flightDate, setFlightDate] = useState(flight.flight_date);
  const [depIata, setDepIata] = useState(flight.departure_iata ?? "");
  const [depCity, setDepCity] = useState(flight.departure_city ?? "");
  const [depTime, setDepTime] = useState(toTimeInput(flight.departure_time));
  const [arrIata, setArrIata] = useState(flight.arrival_iata ?? "");
  const [arrCity, setArrCity] = useState(flight.arrival_city ?? "");
  const [arrTime, setArrTime] = useState(toTimeInput(flight.arrival_time));
  const [distanceMiles, setDistanceMiles] = useState(flight.distance_miles != null ? String(flight.distance_miles) : "");

  function openEdit() {
    // Re-sync fields from prop in case the flight was updated externally
    setFlightNumber(flight.flight_number);
    setAirline(flight.airline ?? "");
    setFlightDate(flight.flight_date);
    setDepIata(flight.departure_iata ?? "");
    setDepCity(flight.departure_city ?? "");
    setDepTime(toTimeInput(flight.departure_time));
    setArrIata(flight.arrival_iata ?? "");
    setArrCity(flight.arrival_city ?? "");
    setArrTime(toTimeInput(flight.arrival_time));
    setDistanceMiles(flight.distance_miles != null ? String(flight.distance_miles) : "");
    setSaveError(null);
    setEditing(true);
  }

  async function handleSave() {
    if (!flightNumber.trim()) return;
    setSaving(true);
    setSaveError(null);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const db = createClient() as any;
    const { data, error } = await db
      .from("flights")
      .update({
        flight_number: flightNumber.trim().toUpperCase(),
        airline: airline.trim() || null,
        flight_date: flightDate,
        departure_iata: depIata.trim().toUpperCase() || null,
        departure_city: depCity.trim() || null,
        departure_time: depTime ? `${flightDate}T${depTime}:00` : null,
        arrival_iata: arrIata.trim().toUpperCase() || null,
        arrival_city: arrCity.trim() || null,
        arrival_time: arrTime ? `${flightDate}T${arrTime}:00` : null,
        distance_miles: distanceMiles ? parseInt(distanceMiles, 10) : null,
      })
      .eq("id", flight.id)
      .select()
      .single();
    setSaving(false);
    if (error || !data) {
      setSaveError(error?.message ?? "Failed to save — please try again.");
      return;
    }
    onUpdated?.(data);
    setEditing(false);
  }

  function formatTime(iso: string | null) {
    if (!iso) return "—";
    const timePart = iso.length >= 16 && (iso[10] === "T" || iso[10] === " ")
      ? iso.slice(11, 16)
      : iso.slice(0, 5);
    if (!timePart.includes(":")) return iso;
    const [hStr, mStr] = timePart.split(":");
    const h = parseInt(hStr, 10);
    const m = parseInt(mStr, 10);
    if (isNaN(h) || isNaN(m)) return iso;
    const period = h >= 12 ? "PM" : "AM";
    const hour12 = h % 12 || 12;
    return `${hour12}:${String(m).padStart(2, "0")} ${period}`;
  }

  if (editing) {
    return (
      <div className="rounded-xl border border-sky-200 dark:border-[#2e2e2e] bg-white dark:bg-transparent p-4 space-y-3">
        {/* Flight number + airline + date */}
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="label">Flight number</label>
            <input type="text" value={flightNumber} onChange={(e) => setFlightNumber(e.target.value.toUpperCase())} className="input" />
          </div>
          <div>
            <label className="label">Date</label>
            <input type="date" value={flightDate} onChange={(e) => setFlightDate(e.target.value)} className="input" />
          </div>
          <div className="col-span-2">
            <label className="label">Airline</label>
            <input type="text" value={airline} onChange={(e) => setAirline(e.target.value)} placeholder="e.g. Thai VietJet Air" className="input" />
          </div>
        </div>

        {/* Route */}
        <div className="flex items-start gap-2 sm:gap-3">
          <div className="flex-1 space-y-1">
            <input type="text" maxLength={3} value={depIata} onChange={(e) => setDepIata(e.target.value.toUpperCase())} placeholder="DEP" className="input text-center text-xl font-bold uppercase tracking-widest" />
            <input type="text" value={depCity} onChange={(e) => setDepCity(e.target.value)} placeholder="City" className="input text-center text-xs" />
            <input type="text" value={depTime} onChange={(e) => setDepTime(e.target.value)} placeholder="HH:MM" maxLength={5} className="input text-center text-sm" />
          </div>
          <div className="flex items-center justify-center pt-3 text-gray-300 shrink-0">
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 12h12m0 0l-4-4m4 4l-4 4" />
            </svg>
          </div>
          <div className="flex-1 space-y-1">
            <input type="text" maxLength={3} value={arrIata} onChange={(e) => setArrIata(e.target.value.toUpperCase())} placeholder="ARR" className="input text-center text-xl font-bold uppercase tracking-widest" />
            <input type="text" value={arrCity} onChange={(e) => setArrCity(e.target.value)} placeholder="City" className="input text-center text-xs" />
            <input type="text" value={arrTime} onChange={(e) => setArrTime(e.target.value)} placeholder="HH:MM" maxLength={5} className="input text-center text-sm" />
          </div>
        </div>

        {/* Distance */}
        <div>
          <label className="label">Distance (miles)</label>
          <input type="number" min="1" value={distanceMiles} onChange={(e) => setDistanceMiles(e.target.value)} placeholder="e.g. 2,475" className="input" />
        </div>

        {saveError && <p className="text-sm text-red-600 dark:text-red-400">{saveError}</p>}

        <div className="flex gap-2">
          <button onClick={handleSave} disabled={saving || !flightNumber.trim()} className="btn-primary flex-1">
            {saving ? "Saving…" : "Save changes"}
          </button>
          <button onClick={() => setEditing(false)} className="btn-secondary">Cancel</button>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-[#e0e0e0] bg-[#efefef] dark:border-[#2e2e2e] dark:bg-transparent p-4">
      <div className="flex items-start justify-between mb-3">
        <div>
          <p className="font-bold text-gray-900 dark:text-[#efefef]">{flight.flight_number}</p>
          <p className="text-xs text-gray-400 dark:text-[#9fb8b8]">
            {new Date(flight.flight_date + "T00:00:00").toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}
            {flight.airline && <span> · {flight.airline}</span>}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {flight.status && (
            <span className="rounded-full bg-sky-100 dark:bg-[#cadede] px-2 py-0.5 text-xs font-medium text-sky-700 dark:text-[#1e1e1e] capitalize">
              {flight.status}
            </span>
          )}
          <button onClick={openEdit} className="text-gray-300 hover:text-sky-500 transition-colors" title="Edit flight">
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931z" />
            </svg>
          </button>
          <button onClick={onDelete} className="text-gray-300 hover:text-red-400 transition-colors" title="Remove flight">
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>

      {(flight.departure_iata || flight.arrival_iata) ? (
        <div className="flex items-center gap-2 sm:gap-3">
          <div className="flex-1 text-center">
            <p className="text-xl font-bold text-gray-900 dark:text-[#efefef]">{flight.departure_iata ?? "—"}</p>
            <p className="text-xs text-gray-400 dark:text-[#9fb8b8] line-clamp-1">{flight.departure_city ?? flight.departure_airport ?? ""}</p>
            <p className="text-sm font-medium text-gray-700 dark:text-[#efefef] mt-1">{formatTime(flight.departure_time)}</p>
          </div>
          <svg className="h-4 w-4 text-gray-300 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 12h12m0 0l-4-4m4 4l-4 4" />
          </svg>
          <div className="flex-1 text-center">
            <p className="text-xl font-bold text-gray-900 dark:text-[#efefef]">{flight.arrival_iata ?? "—"}</p>
            <p className="text-xs text-gray-400 dark:text-[#9fb8b8] line-clamp-1">{flight.arrival_city ?? flight.arrival_airport ?? ""}</p>
            <p className="text-sm font-medium text-gray-700 dark:text-[#efefef] mt-1">{formatTime(flight.arrival_time)}</p>
          </div>
        </div>
      ) : null}

      {flight.distance_miles != null && (
        <p className="mt-2 text-xs text-gray-400 dark:text-[#9fb8b8] text-right">
          {flight.distance_miles.toLocaleString("en-US")} mi
        </p>
      )}
    </div>
  );
}
