"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { ItineraryStyle } from "@/types/database";

type SectionNotes = Record<string, string>;

type ActivityRow = {
  id: string;
  day_id: string;
  time: string | null;
  title: string;
  notes: string | null;
  place_name: string | null;
  order_index: number;
};

type DayRow = {
  id: string;
  trip_id: string;
  day_number: number;
  date: string | null;
  section_notes: SectionNotes;
  activities: ActivityRow[];
};

interface ItinerarySectionProps {
  tripId: string;
  initialDays: DayRow[];
  tripStartDate: string | null;
  style: ItineraryStyle;
  initialNotes: string | null;
}

const SECTION_CONFIG: Record<string, { key: string; label: string }[]> = {
  notes_day_night: [
    { key: "day", label: "Day" },
    { key: "night", label: "Night" },
  ],
  notes_day_afternoon_night: [
    { key: "day", label: "Day" },
    { key: "afternoon", label: "Afternoon" },
    { key: "night", label: "Night" },
  ],
};

function formatDayDate(date: string | null) {
  if (!date) return null;
  return new Date(date + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export default function ItinerarySection({
  tripId,
  initialDays,
  tripStartDate,
  style,
  initialNotes,
}: ItinerarySectionProps) {
  const supabase = createClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabase as any;

  const [days, setDays] = useState<DayRow[]>(initialDays);

  // Structured mode
  const [addingActivity, setAddingActivity] = useState<string | null>(null);
  const [actTime, setActTime] = useState("");
  const [actTitle, setActTitle] = useState("");
  const [actPlace, setActPlace] = useState("");
  const [saving, setSaving] = useState(false);

  // Notes mode
  const [tripNotes, setTripNotes] = useState(initialNotes ?? "");
  const [dayNotes, setDayNotes] = useState<Record<string, SectionNotes>>(() => {
    const init: Record<string, SectionNotes> = {};
    for (const day of initialDays) init[day.id] = (day.section_notes as SectionNotes) ?? {};
    return init;
  });

  async function handleAddDay() {
    const nextNum = days.length > 0 ? Math.max(...days.map((d) => d.day_number)) + 1 : 1;
    const date = tripStartDate
      ? new Date(new Date(tripStartDate + "T00:00:00").getTime() + (nextNum - 1) * 86400000)
          .toISOString().split("T")[0]
      : null;
    const { data, error } = await db
      .from("itinerary_days")
      .insert({ trip_id: tripId, day_number: nextNum, date })
      .select()
      .single();
    if (!error && data) {
      setDays((prev) => [...prev, { ...data, activities: [], section_notes: {} }]);
      setDayNotes((prev) => ({ ...prev, [data.id]: {} }));
    }
  }

  async function handleDeleteDay(dayId: string) {
    await db.from("itinerary_days").delete().eq("id", dayId);
    setDays((prev) => prev.filter((d) => d.id !== dayId));
    setDayNotes((prev) => { const n = { ...prev }; delete n[dayId]; return n; });
  }

  async function handleAddActivity(dayId: string) {
    if (!actTitle.trim()) return;
    setSaving(true);
    const orderIndex = days.find((d) => d.id === dayId)?.activities.length ?? 0;
    const { data, error } = await db
      .from("activities")
      .insert({ day_id: dayId, time: actTime || null, title: actTitle.trim(), place_name: actPlace.trim() || null, order_index: orderIndex })
      .select().single();
    setSaving(false);
    if (!error && data) {
      setDays((prev) => prev.map((d) => d.id === dayId ? { ...d, activities: [...d.activities, data] } : d));
      setAddingActivity(null);
    }
  }

  async function handleDeleteActivity(activityId: string, dayId: string) {
    await db.from("activities").delete().eq("id", activityId);
    setDays((prev) => prev.map((d) =>
      d.id === dayId ? { ...d, activities: d.activities.filter((a) => a.id !== activityId) } : d
    ));
  }

  async function handleTripNotesBlur() {
    await db.from("trips").update({ itinerary_notes: tripNotes || null }).eq("id", tripId);
  }

  async function handleSectionNotesBlur(dayId: string) {
    await db.from("itinerary_days").update({ section_notes: dayNotes[dayId] ?? {} }).eq("id", dayId);
  }

  function updateSectionNote(dayId: string, key: string, value: string) {
    setDayNotes((prev) => ({ ...prev, [dayId]: { ...prev[dayId], [key]: value } }));
  }

  const addDayButton = (
    <button
      onClick={handleAddDay}
      className="w-full rounded-xl border-2 border-dashed border-gray-200 py-3 text-sm font-medium text-gray-400 hover:border-sky-300 hover:text-sky-500 transition-colors"
    >
      + Add day
    </button>
  );

  function DayHeader({ day }: { day: DayRow }) {
    return (
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-brand-600 text-xs font-bold text-white">
            {day.day_number}
          </span>
          <span className="text-sm font-medium text-gray-700">
            Day {day.day_number}
            {day.date && <span className="ml-2 text-gray-400">· {formatDayDate(day.date)}</span>}
          </span>
        </div>
        <button onClick={() => handleDeleteDay(day.id)} className="text-gray-300 hover:text-red-400 transition-colors" title="Delete day">
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    );
  }

  // ── Blank notes ──────────────────────────────────────────────
  if (style === "notes") {
    return (
      <section className="mb-8">
        <h2 className="mb-4 text-lg font-semibold text-gray-900">Itinerary</h2>
        <textarea
          value={tripNotes}
          onChange={(e) => setTripNotes(e.target.value)}
          onBlur={handleTripNotesBlur}
          rows={14}
          placeholder="Write your itinerary here…"
          className="input w-full resize-y"
        />
      </section>
    );
  }

  // ── Per-day notes ────────────────────────────────────────────
  if (style === "notes_day_night" || style === "notes_day_afternoon_night") {
    const sections = SECTION_CONFIG[style];
    return (
      <section className="mb-8">
        <h2 className="mb-4 text-lg font-semibold text-gray-900">Itinerary</h2>
        {days.length === 0 && (
          <div className="rounded-xl border-2 border-dashed border-gray-200 py-10 text-center text-sm text-gray-400 mb-3">
            No days yet — add your first day below.
          </div>
        )}
        <div className="space-y-4 mb-3">
          {days.map((day) => (
            <div key={day.id} className="card p-4">
              <DayHeader day={day} />
              <div className="space-y-3">
                {sections.map(({ key, label }) => (
                  <div key={key}>
                    <p className="mb-1 text-xs font-medium uppercase tracking-wide text-gray-400">{label}</p>
                    <textarea
                      value={dayNotes[day.id]?.[key] ?? ""}
                      onChange={(e) => updateSectionNote(day.id, key, e.target.value)}
                      onBlur={() => handleSectionNotesBlur(day.id)}
                      rows={3}
                      placeholder={`${label} plans…`}
                      className="input w-full resize-none text-sm"
                    />
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
        {addDayButton}
      </section>
    );
  }

  // ── Structured (default) ─────────────────────────────────────
  return (
    <section className="mb-8">
      <h2 className="mb-4 text-lg font-semibold text-gray-900">Itinerary</h2>
      {days.length === 0 && (
        <div className="rounded-xl border-2 border-dashed border-gray-200 py-10 text-center text-sm text-gray-400 mb-3">
          No days yet — add your first day below.
        </div>
      )}
      <div className="space-y-4 mb-3">
        {days.map((day) => (
          <div key={day.id} className="card p-4">
            <DayHeader day={day} />
            {day.activities.length > 0 && (
              <ul className="space-y-2 mb-3">
                {day.activities.map((act) => (
                  <li key={act.id} className="group flex items-start gap-3 text-sm">
                    <span className="mt-0.5 w-12 shrink-0 font-mono text-xs text-gray-400">{act.time?.slice(0, 5) ?? "—"}</span>
                    <div className="flex-1">
                      <p className="font-medium text-gray-800">{act.title}</p>
                      {act.place_name && <p className="text-xs text-gray-400">{act.place_name}</p>}
                    </div>
                    <button onClick={() => handleDeleteActivity(act.id, day.id)} className="shrink-0 text-gray-300 opacity-0 transition-colors hover:text-red-400 group-hover:opacity-100" title="Delete activity">
                      <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </li>
                ))}
              </ul>
            )}
            {day.activities.length === 0 && addingActivity !== day.id && (
              <p className="mb-2 text-xs text-gray-400">No activities yet.</p>
            )}
            {addingActivity === day.id ? (
              <div className="space-y-2 rounded-lg border border-sky-100 bg-sky-50/50 p-3">
                <div className="grid grid-cols-3 gap-2">
                  <input type="time" value={actTime} onChange={(e) => setActTime(e.target.value)} className="input text-sm" />
                  <input type="text" value={actTitle} onChange={(e) => setActTitle(e.target.value)} className="input col-span-2 text-sm" placeholder="Activity name *" autoFocus />
                </div>
                <input type="text" value={actPlace} onChange={(e) => setActPlace(e.target.value)} className="input w-full text-sm" placeholder="Place name (optional)" />
                <div className="flex gap-2">
                  <button onClick={() => handleAddActivity(day.id)} disabled={saving || !actTitle.trim()} className="btn-primary px-3 py-1 text-sm">
                    {saving ? "Saving…" : "Add"}
                  </button>
                  <button onClick={() => setAddingActivity(null)} className="btn-secondary px-3 py-1 text-sm">Cancel</button>
                </div>
              </div>
            ) : (
              <button onClick={() => { setAddingActivity(day.id); setActTime(""); setActTitle(""); setActPlace(""); }} className="text-xs text-gray-400 hover:text-sky-500 transition-colors">
                + Add activity
              </button>
            )}
          </div>
        ))}
      </div>
      {addDayButton}
    </section>
  );
}
