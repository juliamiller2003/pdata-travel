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

type SuggestedActivity = { time: string | null; title: string; place_name: string | null };
type SuggestedDay = { day_number: number; activities: SuggestedActivity[] };
type SuggestedDayNotes = { day_number: number; sections: Record<string, string> };

interface ItinerarySectionProps {
  tripId: string;
  initialDays: DayRow[];
  tripStartDate: string | null;
  tripEndDate: string | null;
  destination: string;
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

function computeDuration(start: string | null, end: string | null): number | null {
  if (!start || !end) return null;
  const diff = Math.round(
    (new Date(end).getTime() - new Date(start).getTime()) / (1000 * 60 * 60 * 24)
  ) + 1;
  return Math.max(1, diff);
}

export default function ItinerarySection({
  tripId,
  initialDays,
  tripStartDate,
  tripEndDate,
  destination,
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

  // AI suggestions
  const [showAI, setShowAI] = useState(false);
  const [preferences, setPreferences] = useState("");
  const knownDays = computeDuration(tripStartDate, tripEndDate);
  const [numDaysInput, setNumDaysInput] = useState(String(knownDays ?? 3));
  const [generating, setGenerating] = useState(false);
  const [applying, setApplying] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [structuredSuggestion, setStructuredSuggestion] = useState<SuggestedDay[] | null>(null);
  const [notesSuggestion, setNotesSuggestion] = useState<string | null>(null);
  const [dayNotesSuggestion, setDayNotesSuggestion] = useState<SuggestedDayNotes[] | null>(null);

  function dateForDayNum(dayNum: number) {
    if (!tripStartDate) return null;
    return new Date(new Date(tripStartDate + "T00:00:00").getTime() + (dayNum - 1) * 86400000)
      .toISOString().split("T")[0];
  }

  // ── Day CRUD ─────────────────────────────────────────────────

  async function handleAddDay() {
    const nextNum = days.length > 0 ? Math.max(...days.map((d) => d.day_number)) + 1 : 1;
    const { data, error } = await db
      .from("itinerary_days")
      .insert({ trip_id: tripId, day_number: nextNum, date: dateForDayNum(nextNum) })
      .select().single();
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

  // ── Activity CRUD ─────────────────────────────────────────────

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

  // ── Notes saves ───────────────────────────────────────────────

  async function handleTripNotesBlur() {
    await db.from("trips").update({ itinerary_notes: tripNotes || null }).eq("id", tripId);
  }

  async function handleSectionNotesBlur(dayId: string) {
    await db.from("itinerary_days").update({ section_notes: dayNotes[dayId] ?? {} }).eq("id", dayId);
  }

  function updateSectionNote(dayId: string, key: string, value: string) {
    setDayNotes((prev) => ({ ...prev, [dayId]: { ...prev[dayId], [key]: value } }));
  }

  // ── AI generation ─────────────────────────────────────────────

  async function handleGenerate() {
    setGenerating(true);
    setAiError(null);
    setStructuredSuggestion(null);
    setNotesSuggestion(null);
    setDayNotesSuggestion(null);

    const num_days = knownDays ?? parseInt(numDaysInput, 10);

    const res = await fetch("/api/suggest-itinerary", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ destination, num_days, style, preferences }),
    });

    setGenerating(false);

    if (!res.ok) { setAiError("Something went wrong. Try again."); return; }

    const data = await res.json();
    if (data.error) { setAiError(data.error); return; }

    if (style === "structured") setStructuredSuggestion(data.days);
    else if (style === "notes") setNotesSuggestion(data.content);
    else setDayNotesSuggestion(data.days);
  }

  async function handleApplyStructured() {
    if (!structuredSuggestion) return;
    setApplying(true);
    const startNum = days.length > 0 ? Math.max(...days.map((d) => d.day_number)) + 1 : 1;
    const newDays: DayRow[] = [];

    for (const sugDay of structuredSuggestion) {
      const dayNum = startNum + sugDay.day_number - 1;
      const { data: dayData } = await db
        .from("itinerary_days")
        .insert({ trip_id: tripId, day_number: dayNum, date: dateForDayNum(dayNum) })
        .select().single();
      if (!dayData) continue;

      const activities: ActivityRow[] = [];
      for (let i = 0; i < sugDay.activities.length; i++) {
        const act = sugDay.activities[i];
        const { data: actData } = await db
          .from("activities")
          .insert({ day_id: dayData.id, time: act.time || null, title: act.title, place_name: act.place_name || null, order_index: i })
          .select().single();
        if (actData) activities.push(actData);
      }
      newDays.push({ ...dayData, activities, section_notes: {} });
    }

    setDays((prev) => [...prev, ...newDays]);
    setStructuredSuggestion(null);
    setShowAI(false);
    setApplying(false);
  }

  async function handleApplyNotes() {
    if (notesSuggestion === null) return;
    setTripNotes(notesSuggestion);
    await db.from("trips").update({ itinerary_notes: notesSuggestion }).eq("id", tripId);
    setNotesSuggestion(null);
    setShowAI(false);
  }

  async function handleApplyDayNotes() {
    if (!dayNotesSuggestion) return;
    setApplying(true);
    const startNum = days.length > 0 ? Math.max(...days.map((d) => d.day_number)) + 1 : 1;
    const newDays: DayRow[] = [];
    const newDayNotes: Record<string, SectionNotes> = {};

    for (const sugDay of dayNotesSuggestion) {
      const dayNum = startNum + sugDay.day_number - 1;
      const { data: dayData } = await db
        .from("itinerary_days")
        .insert({ trip_id: tripId, day_number: dayNum, date: dateForDayNum(dayNum), section_notes: sugDay.sections })
        .select().single();
      if (!dayData) continue;
      newDays.push({ ...dayData, activities: [], section_notes: sugDay.sections });
      newDayNotes[dayData.id] = sugDay.sections;
    }

    setDays((prev) => [...prev, ...newDays]);
    setDayNotes((prev) => ({ ...prev, ...newDayNotes }));
    setDayNotesSuggestion(null);
    setShowAI(false);
    setApplying(false);
  }

  // ── Shared UI pieces ──────────────────────────────────────────

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

  // ── AI panel ──────────────────────────────────────────────────

  const aiPanel = showAI && (
    <div className="mb-4 rounded-xl border border-sky-100 bg-sky-50/60 p-4 space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold text-gray-700">AI itinerary suggestions</p>
        <button onClick={() => { setShowAI(false); setStructuredSuggestion(null); setNotesSuggestion(null); setDayNotesSuggestion(null); setAiError(null); }} className="text-gray-400 hover:text-gray-600">
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {!knownDays && (
        <div>
          <label className="label">Number of days</label>
          <input type="number" min="1" max="30" value={numDaysInput} onChange={(e) => setNumDaysInput(e.target.value)} className="input w-28" />
        </div>
      )}

      <div>
        <label className="label">Preferences <span className="text-gray-400 font-normal">— optional</span></label>
        <input
          type="text"
          value={preferences}
          onChange={(e) => setPreferences(e.target.value)}
          placeholder="e.g. focus on food, avoid tourist traps, relaxed pace"
          className="input w-full"
        />
      </div>

      {aiError && <p className="text-sm text-red-600">{aiError}</p>}

      {!structuredSuggestion && !notesSuggestion && !dayNotesSuggestion && (
        <button onClick={handleGenerate} disabled={generating} className="btn-primary w-full">
          {generating ? (
            <span className="flex items-center justify-center gap-2">
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
              Generating…
            </span>
          ) : "Generate suggestions"}
        </button>
      )}

      {/* Structured suggestions preview */}
      {structuredSuggestion && (
        <div className="space-y-3">
          <p className="text-xs text-gray-500">{structuredSuggestion.length} days generated — review below, then add to your itinerary.</p>
          <div className="max-h-72 overflow-y-auto space-y-2 pr-1">
            {structuredSuggestion.map((day) => (
              <div key={day.day_number} className="rounded-lg bg-white border border-gray-100 p-3">
                <p className="text-xs font-semibold text-gray-600 mb-1.5">Day {day.day_number}</p>
                <ul className="space-y-1">
                  {day.activities.map((act, i) => (
                    <li key={i} className="flex gap-2 text-xs text-gray-600">
                      <span className="shrink-0 w-10 font-mono text-gray-400">{act.time ?? "—"}</span>
                      <span className="font-medium">{act.title}</span>
                      {act.place_name && <span className="text-gray-400">· {act.place_name}</span>}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
          <div className="flex gap-2">
            <button onClick={handleApplyStructured} disabled={applying} className="btn-primary flex-1">
              {applying ? "Adding…" : "Add to itinerary"}
            </button>
            <button onClick={() => { setStructuredSuggestion(null); }} className="btn-secondary">Try again</button>
          </div>
        </div>
      )}

      {/* Notes suggestion preview */}
      {notesSuggestion && (
        <div className="space-y-3">
          <div className="max-h-60 overflow-y-auto rounded-lg bg-white border border-gray-100 p-3">
            <p className="text-sm text-gray-700 whitespace-pre-wrap">{notesSuggestion}</p>
          </div>
          <div className="flex gap-2">
            <button onClick={handleApplyNotes} className="btn-primary flex-1">Apply</button>
            <button onClick={() => setNotesSuggestion(null)} className="btn-secondary">Try again</button>
          </div>
        </div>
      )}

      {/* Day notes suggestion preview */}
      {dayNotesSuggestion && (
        <div className="space-y-3">
          <p className="text-xs text-gray-500">{dayNotesSuggestion.length} days generated.</p>
          <div className="max-h-72 overflow-y-auto space-y-2 pr-1">
            {dayNotesSuggestion.map((day) => (
              <div key={day.day_number} className="rounded-lg bg-white border border-gray-100 p-3 space-y-2">
                <p className="text-xs font-semibold text-gray-600">Day {day.day_number}</p>
                {Object.entries(day.sections).map(([key, val]) => (
                  <div key={key}>
                    <p className="text-xs font-medium uppercase tracking-wide text-gray-400">{key}</p>
                    <p className="text-xs text-gray-600 mt-0.5">{val}</p>
                  </div>
                ))}
              </div>
            ))}
          </div>
          <div className="flex gap-2">
            <button onClick={handleApplyDayNotes} disabled={applying} className="btn-primary flex-1">
              {applying ? "Adding…" : "Add to itinerary"}
            </button>
            <button onClick={() => setDayNotesSuggestion(null)} className="btn-secondary">Try again</button>
          </div>
        </div>
      )}
    </div>
  );

  const sectionHeader = (
    <div className="mb-4 flex items-center justify-between">
      <h2 className="text-lg font-semibold text-gray-900">Itinerary</h2>
      <button
        onClick={() => { setShowAI((v) => !v); setStructuredSuggestion(null); setNotesSuggestion(null); setDayNotesSuggestion(null); setAiError(null); }}
        className="flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-600 hover:border-sky-300 hover:text-sky-600 transition-colors"
      >
        <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
        </svg>
        Suggest with AI
      </button>
    </div>
  );

  // ── Blank notes ───────────────────────────────────────────────
  if (style === "notes") {
    return (
      <section className="mb-8">
        {sectionHeader}
        {aiPanel}
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

  // ── Per-day notes ─────────────────────────────────────────────
  if (style === "notes_day_night" || style === "notes_day_afternoon_night") {
    const sections = SECTION_CONFIG[style];
    return (
      <section className="mb-8">
        {sectionHeader}
        {aiPanel}
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

  // ── Structured (default) ──────────────────────────────────────
  return (
    <section className="mb-8">
      {sectionHeader}
      {aiPanel}
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
