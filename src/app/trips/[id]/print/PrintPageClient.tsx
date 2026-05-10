"use client";

import Link from "next/link";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export default function PrintPageClient({ trip, days, flights, legs, accommodations }: { trip: any; days: any[]; flights: any[]; legs: any[]; accommodations: any[] }) {

  function fmt12(time: string | null): string {
    if (!time) return "";
    const t = time.includes("T")
      ? (() => { try { const d = new Date(time); return `${String(d.getHours()).padStart(2,"0")}:${String(d.getMinutes()).padStart(2,"0")}`; } catch { return time.slice(11,16); } })()
      : time.slice(0, 5);
    const [h, m] = t.split(":").map(Number);
    const ampm = h >= 12 ? "pm" : "am";
    const h12 = h % 12 || 12;
    return `${h12}:${String(m).padStart(2,"0")}${ampm}`;
  }

  function fmtDate(d: string | null) {
    if (!d) return "—";
    return new Date(d + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  }

  function copyLink() {
    navigator.clipboard.writeText(window.location.href.replace("/print", "")).catch(() => {});
    alert("Trip link copied to clipboard!");
  }

  // Group flights/legs by date for easy lookup
  const allTransport = [
    ...flights.map((f: any) => ({
      date: f.flight_date,
      label: `${f.flight_number} · ${f.departure_iata ?? f.departure_city ?? "?"} → ${f.arrival_iata ?? f.arrival_city ?? "?"}`,
      times: [f.departure_time ? fmt12(f.departure_time) : null, f.arrival_time ? fmt12(f.arrival_time) : null].filter(Boolean).join(" → "),
    })),
    ...legs.map((l: any) => ({
      date: l.travel_date,
      label: `${l.mode.charAt(0).toUpperCase() + l.mode.slice(1)}: ${l.from_location} → ${l.to_location}`,
      times: [l.departure_time?.slice(0,5) ? fmt12(l.departure_time) : null, l.arrival_time?.slice(0,5) ? fmt12(l.arrival_time) : null].filter(Boolean).join(" → "),
    })),
  ];

  const transportByDate: Record<string, typeof allTransport> = {};
  for (const t of allTransport) {
    if (!transportByDate[t.date]) transportByDate[t.date] = [];
    transportByDate[t.date].push(t);
  }

  const accomByDate: Record<string, any[]> = {};
  for (const a of accommodations) {
    const key = a.check_in;
    if (key) { if (!accomByDate[key]) accomByDate[key] = []; accomByDate[key].push(a); }
  }

  return (
    <div className="min-h-screen bg-white text-gray-900">
      {/* Print toolbar — hidden when printing */}
      <div className="print:hidden sticky top-0 z-10 flex items-center justify-between gap-3 border-b border-gray-100 bg-white px-6 py-3">
        <Link href={`/trips/${trip.id}`} className="text-sm text-gray-500 hover:text-gray-700">
          ← Back to trip
        </Link>
        <div className="flex items-center gap-2">
          <button
            onClick={copyLink}
            className="rounded-lg border border-gray-200 px-3 py-1.5 text-sm font-medium text-gray-600 hover:border-gray-300 transition-colors"
          >
            Copy link
          </button>
          <button
            onClick={() => window.print()}
            className="rounded-lg bg-[#1e1e1e] px-4 py-1.5 text-sm font-medium text-white hover:bg-[#2e2e2e] transition-colors"
          >
            Print / Save PDF
          </button>
        </div>
      </div>

      {/* Printable content */}
      <div className="mx-auto max-w-2xl px-8 py-10 print:py-6 print:px-0">
        {/* Header */}
        <div className="mb-8 border-b border-gray-200 pb-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-1">{trip.title}</h1>
          <p className="text-lg text-gray-500">{trip.destination}</p>
          {trip.countryNames?.length > 0 && (
            <p className="text-sm text-gray-400 mt-0.5">{trip.countryNames.join(", ")}</p>
          )}
          <div className="mt-3 flex flex-wrap gap-4 text-sm text-gray-600">
            {trip.start_date && <span><span className="font-medium">From:</span> {fmtDate(trip.start_date)}</span>}
            {trip.end_date   && <span><span className="font-medium">To:</span> {fmtDate(trip.end_date)}</span>}
            {trip.budget != null && <span><span className="font-medium">Budget:</span> ${Number(trip.budget).toLocaleString()}</span>}
          </div>
          {trip.notes && <p className="mt-3 text-sm text-gray-600 italic">{trip.notes}</p>}
        </div>

        {/* Itinerary */}
        {days.length > 0 && (
          <div className="mb-8">
            <h2 className="mb-4 text-lg font-bold text-gray-900 uppercase tracking-wide text-sm">Itinerary</h2>
            <div className="space-y-6">
              {days.map((day: any, idx: number) => {
                const dateStr = day.date;
                const transport = dateStr ? (transportByDate[dateStr] ?? []) : [];
                const accom = dateStr ? (accomByDate[dateStr] ?? []) : [];
                const activities: any[] = (day.activities ?? []).sort((a: any, b: any) => {
                  if (!a.time && !b.time) return 0;
                  if (!a.time) return 1;
                  if (!b.time) return -1;
                  return a.time.localeCompare(b.time);
                });
                const sectionNotes = day.section_notes as Record<string,string> | null;

                return (
                  <div key={day.id} className="border-l-2 border-[#cadede] pl-4">
                    <div className="flex items-baseline gap-3 mb-2">
                      <h3 className="font-bold text-gray-900">Day {idx + 1}</h3>
                      {day.date && (
                        <span className="text-sm text-gray-400">
                          {new Date(day.date + "T00:00:00").toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}
                        </span>
                      )}
                    </div>

                    {/* Transport events */}
                    {transport.map((t: any, i: number) => (
                      <div key={i} className="mb-1 text-sm text-gray-600">
                        <span className="font-medium">{t.label}</span>
                        {t.times && <span className="ml-2 text-gray-400">{t.times}</span>}
                      </div>
                    ))}

                    {/* Activities */}
                    {activities.map((act: any) => (
                      <div key={act.id} className="flex gap-3 text-sm py-0.5">
                        <span className="w-16 shrink-0 text-gray-400 font-mono text-xs">
                          {act.time ? fmt12(act.time) : ""}
                        </span>
                        <div>
                          <span className="text-gray-900">{act.title}</span>
                          {act.place_name && <span className="text-gray-400 ml-1.5 text-xs">· {act.place_name}</span>}
                        </div>
                      </div>
                    ))}

                    {/* Section notes (notes style) */}
                    {sectionNotes && Object.entries(sectionNotes).filter(([, v]) => v).map(([k, v]) => (
                      <div key={k} className="mt-1">
                        <span className="text-xs font-semibold uppercase tracking-wide text-gray-400 mr-1">{k}:</span>
                        <span className="text-sm text-gray-700">{v}</span>
                      </div>
                    ))}

                    {/* Check-in */}
                    {accom.map((a: any) => (
                      <div key={a.id} className="mt-1 text-xs text-gray-400">
                        Check-in: {a.name}{a.city ? `, ${a.city}` : ""}
                      </div>
                    ))}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Trip notes itinerary */}
        {trip.itinerary_notes && (
          <div className="mb-8">
            <h2 className="mb-3 text-sm font-bold text-gray-900 uppercase tracking-wide">Itinerary Notes</h2>
            <p className="text-sm text-gray-700 whitespace-pre-wrap">{trip.itinerary_notes}</p>
          </div>
        )}

        {/* Transport summary */}
        {(flights.length > 0 || legs.length > 0) && (
          <div className="mb-8">
            <h2 className="mb-3 text-sm font-bold text-gray-900 uppercase tracking-wide">Transport</h2>
            <div className="space-y-1">
              {[...flights.map((f: any) => ({ date: f.flight_date, label: `${f.flight_number}`, from: f.departure_iata ?? f.departure_city, to: f.arrival_iata ?? f.arrival_city, dep: fmt12(f.departure_time), arr: fmt12(f.arrival_time) })),
                ...legs.map((l: any) => ({ date: l.travel_date, label: `${l.mode.charAt(0).toUpperCase() + l.mode.slice(1)}`, from: l.from_location, to: l.to_location, dep: fmt12(l.departure_time), arr: fmt12(l.arrival_time) })),
              ].sort((a, b) => a.date.localeCompare(b.date)).map((t, i) => (
                <div key={i} className="flex items-center gap-2 text-sm">
                  <span className="w-20 shrink-0 text-gray-400 text-xs">{fmtDate(t.date)}</span>
                  <span className="font-medium text-gray-700">{t.label}</span>
                  <span className="text-gray-500">{t.from} → {t.to}</span>
                  {(t.dep || t.arr) && <span className="text-gray-400 text-xs">{t.dep}{t.dep && t.arr ? " → " : ""}{t.arr}</span>}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Accommodations */}
        {accommodations.length > 0 && (
          <div className="mb-8">
            <h2 className="mb-3 text-sm font-bold text-gray-900 uppercase tracking-wide">Accommodation</h2>
            <div className="space-y-1">
              {accommodations.map((a: any) => (
                <div key={a.id} className="flex items-baseline gap-2 text-sm">
                  <span className="w-20 shrink-0 text-gray-400 text-xs">{a.check_in ? fmtDate(a.check_in) : "—"}</span>
                  <span className="font-medium text-gray-700">{a.name}</span>
                  {a.city && <span className="text-gray-400">{a.city}</span>}
                  {a.check_out && <span className="text-gray-400 text-xs">until {fmtDate(a.check_out)}</span>}
                </div>
              ))}
            </div>
          </div>
        )}

        <p className="text-[10px] text-gray-300 text-center mt-12 print:block hidden">
          Generated with Pathway
        </p>
      </div>
    </div>
  );
}
