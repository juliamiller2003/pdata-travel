"use client";

import { useState } from "react";
import type { Flight } from "@/types/database";
import FlightSearch, { FlightCard } from "./FlightSearch";

// ─── Types ────────────────────────────────────────────────────────────────────

export type TransportMode = "bus" | "train" | "ferry" | "taxi" | "car" | "motorbike" | "subway" | "other";

export interface TransportLeg {
  id: string;
  trip_id: string;
  mode: TransportMode;
  from_location: string;
  to_location: string;
  travel_date: string;
  departure_time: string | null;
  arrival_time: string | null;
  duration: string | null;
  cost: number | null;
  booking_ref: string | null;
  notes: string | null;
  created_at: string;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const MODE_LABELS: Record<TransportMode, string> = {
  bus: "Bus",
  train: "Train",
  ferry: "Ferry",
  taxi: "Taxi / Tuk-tuk",
  car: "Car Rental",
  motorbike: "Motorbike",
  subway: "Subway / Metro",
  other: "Other",
};

const MODE_ICONS: Record<TransportMode, JSX.Element> = {
  bus: (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M8 6v6m0 0v2a2 2 0 002 2h4a2 2 0 002-2v-2m-8 0h8M6 6h12a2 2 0 012 2v8a2 2 0 01-2 2H6a2 2 0 01-2-2V8a2 2 0 012-2z" />
      <circle cx="8.5" cy="17.5" r="1" fill="currentColor" stroke="none" />
      <circle cx="15.5" cy="17.5" r="1" fill="currentColor" stroke="none" />
    </svg>
  ),
  train: (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 3h6l2 5v7a2 2 0 01-2 2H9a2 2 0 01-2-2V8l2-5z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 17l-1 3m7-3l1 3M9 12h6" />
      <circle cx="10" cy="10" r="1" fill="currentColor" stroke="none" />
      <circle cx="14" cy="10" r="1" fill="currentColor" stroke="none" />
    </svg>
  ),
  ferry: (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 17c3.333-2 6.667-2 10 0s6.667 2 10 0M5 13l2-7h10l2 7H5z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6V3" />
    </svg>
  ),
  taxi: (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M7 17H5a2 2 0 01-2-2v-3l2-5h14l2 5v3a2 2 0 01-2 2h-2m-10 0h10" />
      <circle cx="7.5" cy="17.5" r="1.5" fill="currentColor" stroke="none" />
      <circle cx="16.5" cy="17.5" r="1.5" fill="currentColor" stroke="none" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 7V4h6v3" />
    </svg>
  ),
  car: (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 17H3v-5l2-5h14l2 5v5h-2M5 17h14" />
      <circle cx="7.5" cy="17.5" r="1.5" fill="currentColor" stroke="none" />
      <circle cx="16.5" cy="17.5" r="1.5" fill="currentColor" stroke="none" />
    </svg>
  ),
  motorbike: (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <circle cx="5" cy="16" r="3" />
      <circle cx="19" cy="16" r="3" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 16h4l3-7h5l2 4H19M12 9l2 4" />
    </svg>
  ),
  subway: (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <rect x="5" y="3" width="14" height="14" rx="2" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 17l-1.5 4m7.5-4l1.5 4M9 12h6M9 8h6" />
      <circle cx="9.5" cy="10" r="0.75" fill="currentColor" stroke="none" />
      <circle cx="14.5" cy="10" r="0.75" fill="currentColor" stroke="none" />
    </svg>
  ),
  other: (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 6.75V15m6-6v8.25m.503 3.498l4.875-2.437c.381-.19.622-.58.622-1.006V4.82c0-.836-.88-1.38-1.628-1.006l-3.869 1.934c-.317.159-.69.159-1.006 0L9.503 3.252a1.125 1.125 0 00-1.006 0L3.622 5.689C3.24 5.88 3 6.27 3 6.695V19.18c0 .836.88 1.38 1.628 1.006l3.869-1.934c.317-.159.69-.159 1.006 0l4.994 2.497c.317.158.69.158 1.006 0z" />
    </svg>
  ),
};

// ─── Transport Leg Card ────────────────────────────────────────────────────────

function LegCard({ leg, onDelete }: { leg: TransportLeg; onDelete: () => void }) {
  function fmt(t: string | null) {
    if (!t) return null;
    const [h, m] = t.split(":");
    const d = new Date();
    d.setHours(Number(h), Number(m));
    return d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true });
  }

  return (
    <div className="rounded-xl border border-[#e0e0e0] bg-[#efefef] dark:border-[#2e2e2e] dark:bg-transparent p-4">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#cadede] dark:bg-[#2e2e2e] text-[#1e1e1e] dark:text-[#9fb8b8]">
            {MODE_ICONS[leg.mode]}
          </span>
          <div>
            <p className="font-semibold text-sm text-gray-900 dark:text-[#efefef]">{MODE_LABELS[leg.mode]}</p>
            <p className="text-xs text-gray-400 dark:text-[#9fb8b8]">
              {new Date(leg.travel_date + "T00:00:00").toLocaleDateString("en-US", {
                month: "short", day: "numeric", year: "numeric",
              })}
            </p>
          </div>
        </div>
        <button onClick={onDelete} className="text-gray-300 hover:text-red-400 transition-colors" title="Remove">
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Route */}
      <div className="flex items-center gap-1.5 mb-2 min-w-0">
        <p className="font-medium text-gray-900 dark:text-[#efefef] text-sm truncate">{leg.from_location}</p>
        {leg.departure_time && <span className="text-xs text-gray-400 dark:text-[#9fb8b8] shrink-0">· {fmt(leg.departure_time)}</span>}
        <svg className="h-3.5 w-3.5 text-gray-300 shrink-0 mx-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M6 12h12m0 0l-4-4m4 4l-4 4" />
        </svg>
        <p className="font-medium text-gray-900 dark:text-[#efefef] text-sm truncate">{leg.to_location}</p>
        {leg.arrival_time && <span className="text-xs text-gray-400 dark:text-[#9fb8b8] shrink-0">· {fmt(leg.arrival_time)}</span>}
      </div>

      {/* Meta row */}
      <div className="flex flex-wrap gap-3 text-xs text-gray-400 dark:text-[#9fb8b8]">
        {leg.duration && <span>{leg.duration}</span>}
        {leg.cost != null && <span>{leg.cost.toLocaleString("en-US")}</span>}
        {leg.booking_ref && <span>{leg.booking_ref}</span>}
      </div>

      {leg.notes && (
        <p className="mt-2 text-xs text-gray-500 dark:text-[#9fb8b8] italic">{leg.notes}</p>
      )}
    </div>
  );
}

// ─── Add Leg Form ──────────────────────────────────────────────────────────────

function AddLegForm({ tripId, tripStartDate, onAdded }: { tripId: string; tripStartDate: string | null; onAdded: (leg: TransportLeg) => void }) {
  const [show, setShow] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [form, setForm] = useState({
    mode: "bus" as TransportMode,
    from_location: "",
    to_location: "",
    travel_date: tripStartDate ?? "",
    departure_time: "",
    arrival_time: "",
    duration: "",
    cost: "",
    booking_ref: "",
    notes: "",
  });

  function set(k: string, v: string) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setSaveError(null);
    const { createClient } = await import("@/lib/supabase/client");
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const db = createClient() as any;

    const { data, error } = await db
      .from("transport_legs")
      .insert({
        trip_id: tripId,
        mode: form.mode,
        from_location: form.from_location.trim(),
        to_location: form.to_location.trim(),
        travel_date: form.travel_date,
        departure_time: form.departure_time || null,
        arrival_time: form.arrival_time || null,
        duration: form.duration.trim() || null,
        cost: form.cost ? parseFloat(form.cost) : null,
        booking_ref: form.booking_ref.trim() || null,
        notes: form.notes.trim() || null,
      })
      .select()
      .single();

    setSaving(false);
    if (error || !data) {
      setSaveError(error?.message ?? "Could not save. Make sure you've run the transport_legs migration in Supabase.");
      return;
    }

    onAdded(data);
    setShow(false);
    setForm({ mode: "bus", from_location: "", to_location: "", travel_date: tripStartDate ?? "", departure_time: "", arrival_time: "", duration: "", cost: "", booking_ref: "", notes: "" });
  }

  if (!show) {
    return (
      <button
        onClick={() => setShow(true)}
        className="w-full rounded-xl border-2 border-dashed border-gray-200 dark:border-[#2e2e2e] py-3 text-sm font-medium text-gray-400 dark:text-[#9fb8b8] hover:border-[#9fb8b8] hover:text-[#9fb8b8] transition-colors"
      >
        + Add transport
      </button>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="rounded-xl border border-[#cadede] dark:border-[#2e2e2e] bg-[#cadede]/10 dark:bg-transparent p-4 space-y-3">
      <h4 className="text-sm font-semibold text-gray-700 dark:text-[#cadede]">Add transport</h4>

      {/* Mode */}
      <div>
        <label className="label">Mode</label>
        <select value={form.mode} onChange={(e) => set("mode", e.target.value)} className="input">
          {(Object.keys(MODE_LABELS) as TransportMode[]).map((m) => (
            <option key={m} value={m}>{MODE_LABELS[m]}</option>
          ))}
        </select>
      </div>

      {/* From / To */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label">From</label>
          <input required type="text" value={form.from_location} onChange={(e) => set("from_location", e.target.value)} placeholder="City or station" className="input" />
        </div>
        <div>
          <label className="label">To</label>
          <input required type="text" value={form.to_location} onChange={(e) => set("to_location", e.target.value)} placeholder="City or station" className="input" />
        </div>
      </div>

      {/* Date */}
      <div>
        <label className="label">Date</label>
        <input required type="date" value={form.travel_date} onChange={(e) => set("travel_date", e.target.value)} className="input" />
      </div>

      {/* Times */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label">Departure <span className="text-gray-400 font-normal">(optional)</span></label>
          <input type="time" value={form.departure_time} onChange={(e) => set("departure_time", e.target.value)} className="input" />
        </div>
        <div>
          <label className="label">Arrival <span className="text-gray-400 font-normal">(optional)</span></label>
          <input type="time" value={form.arrival_time} onChange={(e) => set("arrival_time", e.target.value)} className="input" />
        </div>
      </div>

      {/* Duration / Cost */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label">Duration <span className="text-gray-400 font-normal">(optional)</span></label>
          <input type="text" value={form.duration} onChange={(e) => set("duration", e.target.value)} placeholder="e.g. 3h 30m" className="input" />
        </div>
        <div>
          <label className="label">Cost <span className="text-gray-400 font-normal">(optional)</span></label>
          <input type="number" min="0" step="0.01" value={form.cost} onChange={(e) => set("cost", e.target.value)} placeholder="0.00" className="input" />
        </div>
      </div>

      {/* Booking ref */}
      <div>
        <label className="label">Booking ref / ticket # <span className="text-gray-400 font-normal">(optional)</span></label>
        <input type="text" value={form.booking_ref} onChange={(e) => set("booking_ref", e.target.value)} placeholder="e.g. ABC123" className="input" />
      </div>

      {/* Notes */}
      <div>
        <label className="label">Notes <span className="text-gray-400 font-normal">(optional)</span></label>
        <textarea rows={2} value={form.notes} onChange={(e) => set("notes", e.target.value)} placeholder="Platform number, pickup spot, etc." className="input resize-none text-sm" />
      </div>

      {saveError && (
        <p className="text-xs text-red-500 rounded-lg bg-red-50 dark:bg-transparent border border-red-200 dark:border-red-900 px-3 py-2">{saveError}</p>
      )}

      <div className="flex gap-2">
        <button type="submit" disabled={saving} className="btn-primary flex-1">
          {saving ? "Saving…" : "Add"}
        </button>
        <button type="button" onClick={() => { setShow(false); setSaveError(null); }} className="btn-secondary">Cancel</button>
      </div>
    </form>
  );
}

// ─── Main Section ──────────────────────────────────────────────────────────────

interface TransportationSectionProps {
  tripId: string;
  tripStartDate: string | null;
  initialFlights: Flight[];
  initialLegs: TransportLeg[];
}

export default function TransportationSection({ tripId, tripStartDate, initialFlights, initialLegs }: TransportationSectionProps) {
  const [tab, setTab] = useState<"flights" | "ground" | "route">("flights");
  const [flights, setFlights] = useState<Flight[]>(initialFlights);
  const [legs, setLegs] = useState<TransportLeg[]>(initialLegs);

  async function deleteFlight(id: string) {
    const { createClient } = await import("@/lib/supabase/client");
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (createClient() as any).from("flights").delete().eq("id", id);
    setFlights((prev) => prev.filter((f) => f.id !== id));
  }

  async function deleteLeg(id: string) {
    const { createClient } = await import("@/lib/supabase/client");
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (createClient() as any).from("transport_legs").delete().eq("id", id);
    setLegs((prev) => prev.filter((l) => l.id !== id));
  }

  return (
    <section className="mb-8">
      <h2 className="mb-4 text-lg font-semibold text-gray-900 dark:text-[#efefef]">Transportation</h2>

      {/* Tabs */}
      <div className="mb-4 flex gap-1 rounded-lg bg-[#e0e0e0] dark:bg-[#2e2e2e] p-1">
        <button
          onClick={() => setTab("flights")}
          className={`flex-1 rounded-md py-1.5 text-xs font-semibold transition-colors ${
            tab === "flights"
              ? "bg-white dark:bg-[#1e1e1e] text-gray-900 dark:text-[#efefef] shadow-sm"
              : "text-gray-500 dark:text-[#9fb8b8] hover:text-gray-700 dark:hover:text-[#efefef]"
          }`}
        >
          Flights {flights.length > 0 && `(${flights.length})`}
        </button>
        <button
          onClick={() => setTab("ground")}
          className={`flex-1 rounded-md py-1.5 text-xs font-semibold transition-colors ${
            tab === "ground"
              ? "bg-white dark:bg-[#1e1e1e] text-gray-900 dark:text-[#efefef] shadow-sm"
              : "text-gray-500 dark:text-[#9fb8b8] hover:text-gray-700 dark:hover:text-[#efefef]"
          }`}
        >
          <span className="hidden sm:inline">Ground &amp; Sea</span>
          <span className="sm:hidden">Ground</span>
          {legs.length > 0 && ` (${legs.length})`}
        </button>
        <button
          onClick={() => setTab("route")}
          className={`flex-1 rounded-md py-1.5 text-xs font-semibold transition-colors ${
            tab === "route"
              ? "bg-white dark:bg-[#1e1e1e] text-gray-900 dark:text-[#efefef] shadow-sm"
              : "text-gray-500 dark:text-[#9fb8b8] hover:text-gray-700 dark:hover:text-[#efefef]"
          }`}
        >
          Route
        </button>
      </div>

      {/* Flights tab */}
      {tab === "flights" && (
        <div className="space-y-3">
          {flights.map((f) => (
            <FlightCard key={f.id} flight={f} onDelete={() => deleteFlight(f.id)} />
          ))}
          <FlightSearch tripId={tripId} onFlightAdded={(f) => setFlights((prev) => [...prev, f])} defaultDate={tripStartDate} />
        </div>
      )}

      {/* Ground & Sea tab */}
      {tab === "ground" && (
        <div className="space-y-3">
          {legs.length === 0 && (
            <p className="text-sm text-gray-400 dark:text-[#9fb8b8] text-center py-2">
              No ground or sea transport yet.
            </p>
          )}
          {legs
            .slice()
            .sort((a, b) => a.travel_date.localeCompare(b.travel_date))
            .map((leg) => (
              <LegCard key={leg.id} leg={leg} onDelete={() => deleteLeg(leg.id)} />
            ))}
          <AddLegForm tripId={tripId} tripStartDate={tripStartDate} onAdded={(leg) => setLegs((prev) => [...prev, leg])} />
        </div>
      )}

      {/* Route overview tab */}
      {tab === "route" && (() => {
        const startMs = tripStartDate
          ? (() => { const [y, m, d] = tripStartDate.split("-").map(Number); return Date.UTC(y, m - 1, d); })()
          : null;

        function dateToDay(dateStr: string): number | null {
          if (!startMs) return null;
          const [y, m, d] = dateStr.split("-").map(Number);
          return Math.round((Date.UTC(y, m - 1, d) - startMs) / 86_400_000) + 1;
        }

        type RouteEvent = {
          date: string;
          dayNum: number | null;
          sortKey: string;
          kind: "flight" | "ground";
          from: string;
          to: string;
          mode: string;
          depTime: string | null;
          arrTime: string | null;
          label: string;
        };

        const events: RouteEvent[] = [
          ...flights.map((f) => ({
            date: f.flight_date,
            dayNum: dateToDay(f.flight_date),
            sortKey: f.flight_date + (f.departure_time ?? ""),
            kind: "flight" as const,
            from: f.departure_iata ?? f.departure_city ?? "?",
            to: f.arrival_iata ?? f.arrival_city ?? "?",
            mode: "flight",
            depTime: f.departure_time
              ? (() => { const t = f.departure_time!.includes("T") ? (() => { const d = new Date(f.departure_time!); return `${String(d.getHours()).padStart(2,"0")}:${String(d.getMinutes()).padStart(2,"0")}`; })() : f.departure_time!.slice(0,5); return t; })()
              : null,
            arrTime: f.arrival_time
              ? (() => { const t = f.arrival_time!.includes("T") ? (() => { const d = new Date(f.arrival_time!); return `${String(d.getHours()).padStart(2,"0")}:${String(d.getMinutes()).padStart(2,"0")}`; })() : f.arrival_time!.slice(0,5); return t; })()
              : null,
            label: f.flight_number,
          })),
          ...legs.map((l) => ({
            date: l.travel_date,
            dayNum: dateToDay(l.travel_date),
            sortKey: l.travel_date + (l.departure_time ?? ""),
            kind: "ground" as const,
            from: l.from_location,
            to: l.to_location,
            mode: l.mode,
            depTime: l.departure_time?.slice(0, 5) ?? null,
            arrTime: l.arrival_time?.slice(0, 5) ?? null,
            label: MODE_LABELS[l.mode as TransportMode] ?? l.mode,
          })),
        ].sort((a, b) => a.sortKey.localeCompare(b.sortKey));

        if (events.length === 0) {
          return (
            <div className="rounded-xl border-2 border-dashed border-gray-200 dark:border-[#2e2e2e] py-10 text-center text-sm text-gray-400 dark:text-[#9fb8b8]">
              Add flights and transport legs to see your route.
            </div>
          );
        }

        return (
          <div className="space-y-1">
            {events.map((ev, i) => (
              <div key={i} className="flex items-start gap-3">
                {/* Timeline spine */}
                <div className="flex flex-col items-center shrink-0 pt-1">
                  <div className={`h-2.5 w-2.5 rounded-full border-2 ${ev.kind === "flight" ? "border-[#9fb8b8] bg-[#9fb8b8]" : "border-[#cadede] bg-[#cadede]"}`} />
                  {i < events.length - 1 && <div className="w-px flex-1 bg-gray-200 dark:bg-[#2e2e2e] mt-0.5 min-h-[2rem]" />}
                </div>

                {/* Content */}
                <div className="pb-4 min-w-0 flex-1">
                  <div className="flex items-baseline gap-2 mb-0.5">
                    <span className="text-[10px] font-semibold text-gray-400 dark:text-[#9fb8b8] shrink-0">
                      {ev.dayNum != null ? `Day ${ev.dayNum} ·` : ""}{" "}
                      {new Date(ev.date + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                    </span>
                    <span className="text-[10px] text-gray-400 dark:text-[#9fb8b8] shrink-0 capitalize">{ev.label}</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-sm font-medium text-gray-800 dark:text-[#efefef]">
                    <span className="truncate">{ev.from}</span>
                    <svg className="h-3.5 w-3.5 text-gray-300 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 12h12m0 0l-4-4m4 4l-4 4" />
                    </svg>
                    <span className="truncate">{ev.to}</span>
                  </div>
                  {(ev.depTime || ev.arrTime) && (
                    <p className="text-[10px] text-gray-400 dark:text-[#9fb8b8] mt-0.5">
                      {ev.depTime && `departs ${ev.depTime}`}
                      {ev.depTime && ev.arrTime && " · "}
                      {ev.arrTime && `arrives ${ev.arrTime}`}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        );
      })()}
    </section>
  );
}
