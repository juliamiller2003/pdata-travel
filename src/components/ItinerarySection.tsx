"use client";

import { useState, useEffect, useCallback, memo } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { ItineraryStyle, Flight, TransportLeg } from "@/types/database";
import { getClockFormat, formatActivityTime, type ClockFormat } from "@/lib/timeFormat";
import { getTravelPrefs, formatTravelPrefsForPrompt } from "@/lib/travelPrefs";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
  arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

type SectionNotes = Record<string, string>;

type AccommodationRow = {
  id: string;
  name: string;
  type: string;
  city: string | null;
  check_in: string | null;
  check_out: string | null;
};

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

type SuggestedActivity = {
  time: string | null;
  title: string;
  place_name: string | null;
  cost?: string | null;
  transport?: string | null;
  local_tip?: string | null;
  watch_out?: string | null;
};
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
  flights?: Flight[];
  transportLegs?: TransportLeg[];
  tripCountries?: string[];
  journalProfile?: string | null;
  accommodations?: AccommodationRow[];
}

function sortActivities(activities: ActivityRow[]): ActivityRow[] {
  return [...activities].sort((a, b) => {
    if (!a.time && !b.time) return 0;
    if (!a.time) return 1;
    if (!b.time) return -1;
    return a.time.slice(0, 5).localeCompare(b.time.slice(0, 5));
  });
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
  return new Date(date + "T00:00:00").toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
}

function computeDuration(start: string | null, end: string | null): number | null {
  if (!start || !end) return null;
  const diff = Math.round(
    (new Date(end).getTime() - new Date(start).getTime()) / (1000 * 60 * 60 * 24)
  ) + 1;
  return Math.max(1, diff);
}

// ── Module-level helpers (no closure deps) ────────────────────────────────────

function flightTimeToHHMM(iso: string | null): string {
  if (!iso) return "";
  // Extract HH:MM directly from the string — no Date() construction so there is
  // no timezone conversion that would differ between server (UTC) and browser.
  return iso.slice(11, 16) || iso.slice(0, 5);
}

/**
 * Builds a plain-text summary of flights and transport legs grouped by day number,
 * relative to the trip start date. Passed to the AI prompt so it can schedule
 * activities around fixed travel times.
 */
function buildTravelEventsContext(
  flights: Flight[],
  transportLegs: TransportLeg[],
  tripStartDate: string | null
): string {
  if (!tripStartDate || (flights.length === 0 && transportLegs.length === 0)) return "";

  const [sy, sm, sd] = tripStartDate.split("-").map(Number);
  const startMs = Date.UTC(sy, sm - 1, sd);

  function dateToDay(dateStr: string): number {
    const [dy, dm, dd] = dateStr.split("-").map(Number);
    return Math.round((Date.UTC(dy, dm - 1, dd) - startMs) / 86_400_000) + 1;
  }

  type Ev = { day: number; sortKey: string; text: string };
  const events: Ev[] = [];

  for (const f of flights) {
    const day = dateToDay(f.flight_date);
    const from = f.departure_iata ?? f.departure_city ?? "?";
    const to   = f.arrival_iata   ?? f.arrival_city   ?? "?";
    const dep  = flightTimeToHHMM(f.departure_time);
    const arr  = flightTimeToHHMM(f.arrival_time);
    let text = `Flight ${f.flight_number} ${from}→${to}`;
    if (dep) text += `, departs ${dep}`;
    if (arr) text += `, arrives ${arr}`;
    events.push({ day, sortKey: dep || "99:99", text });
  }

  for (const t of transportLegs) {
    const day = dateToDay(t.travel_date);
    const dep = t.departure_time?.slice(0, 5) ?? null;
    const arr = t.arrival_time?.slice(0, 5) ?? null;
    const mode = t.mode.charAt(0).toUpperCase() + t.mode.slice(1);
    let text = `${mode}: ${t.from_location}→${t.to_location}`;
    if (dep) text += `, departs ${dep}`;
    if (arr) text += `, arrives ${arr}`;
    events.push({ day, sortKey: dep || "99:99", text });
  }

  if (events.length === 0) return "";

  // Group by day, sorted chronologically within each day
  const byDay = new Map<number, string[]>();
  for (const ev of events.sort((a, b) => a.day - b.day || a.sortKey.localeCompare(b.sortKey))) {
    const arr = byDay.get(ev.day) ?? [];
    arr.push(ev.text);
    byDay.set(ev.day, arr);
  }

  return [...byDay.entries()]
    .sort(([a], [b]) => a - b)
    .map(([day, texts]) => `Day ${day}: ${texts.join("; ")}`)
    .join("\n");
}


/**
 * Returns a short text badge if a day has notable travel events,
 * so users know at a glance that the day is dominated by transit.
 */
function getTravelBadge(
  day: DayRow,
  flightsByDate: Map<string, Flight[]>,
  transportByDate: Map<string, TransportLeg[]>
): string | null {
  if (!day.date) return null;
  const dayFlights = flightsByDate.get(day.date) ?? [];
  const dayLegs   = transportByDate.get(day.date) ?? [];
  if (dayFlights.length === 0 && dayLegs.length === 0) return null;

  // Collect departure and arrival times
  const deps = [
    ...dayFlights.map((f) => flightTimeToHHMM(f.departure_time)).filter(Boolean),
    ...dayLegs.map((l) => l.departure_time?.slice(0, 5) ?? "").filter(Boolean),
  ];
  const arrs = [
    ...dayFlights.map((f) => flightTimeToHHMM(f.arrival_time)).filter(Boolean),
    ...dayLegs.map((l) => l.arrival_time?.slice(0, 5) ?? "").filter(Boolean),
  ];

  const earlyDep = deps.some((t) => t < "06:00");
  const lateArr  = arrs.some((t) => t >= "21:00");
  const total    = dayFlights.length + dayLegs.length;
  const hasFlight = dayFlights.length > 0;
  const mode = dayLegs[0]?.mode ?? null;

  if (earlyDep && hasFlight) return "Early flight";
  if (earlyDep)              return "Early departure";
  if (lateArr && hasFlight)  return "Late arrival";
  if (lateArr)               return "Late arrival";
  if (total >= 2)            return "Multi-hop day";
  if (hasFlight)             return "Flight day";
  if (mode === "train")      return "Train day";
  if (mode === "ferry")      return "Ferry day";
  if (mode === "bus")        return "Bus day";
  return "Transit day";
}

// ── Module-level sub-components ───────────────────────────────────────────────
// These MUST live outside ItinerarySection so React sees a stable component
// type on every render. Defining them inside would cause unmount/remount on
// every keystroke, which scrolls the page back to the top.

interface DayHeaderProps {
  day: DayRow;
  displayNum: number;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  onDelete: () => void;
  dragHandleProps?: Record<string, unknown>;
  travelBadge?: string | null;
}

function DayHeader({ day, displayNum, isCollapsed, onToggleCollapse, onDelete, dragHandleProps, travelBadge }: DayHeaderProps) {
  return (
    <div className={`flex items-center justify-between ${isCollapsed ? "" : "mb-3"}`}>
      <div className="flex items-center gap-2 min-w-0">
        {dragHandleProps && (
          <button
            {...(dragHandleProps as React.ButtonHTMLAttributes<HTMLButtonElement>)}
            tabIndex={-1}
            className="cursor-grab active:cursor-grabbing touch-none text-gray-300 hover:text-gray-400 transition-colors shrink-0"
            title="Drag to reorder"
            suppressHydrationWarning
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 8h16M4 16h16" />
            </svg>
          </button>
        )}
        <button
          onClick={onToggleCollapse}
          className="flex items-center gap-2 min-w-0 hover:opacity-70 transition-opacity"
        >
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-brand-600 text-xs font-bold text-white dark:text-[#1e1e1e]">
            {displayNum}
          </span>
          <span className="text-sm font-medium text-gray-700 dark:text-[#efefef] truncate">
            Day {displayNum}
            {day.date && <span className="ml-2 text-gray-400 dark:text-[#9fb8b8]">· {formatDayDate(day.date)}</span>}
          </span>
          {travelBadge && (
            <span className="shrink-0 rounded-full bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 px-2 py-0.5 text-[10px] font-semibold text-amber-600 dark:text-amber-400">
              {travelBadge}
            </span>
          )}
          <svg
            className={`h-3.5 w-3.5 shrink-0 text-gray-400 transition-transform duration-150 ${isCollapsed ? "-rotate-90" : ""}`}
            fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        </button>
      </div>
      <button onClick={onDelete} className="ml-2 shrink-0 text-gray-300 hover:text-red-400 transition-colors" title="Delete day">
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  );
}

interface SortableDayCardProps {
  day: DayRow;
  idx: number;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  onDelete: () => void;
  children: React.ReactNode;
  travelBadge?: string | null;
}

function SortableDayCard({ day, idx, isCollapsed, onToggleCollapse, onDelete, children, travelBadge }: SortableDayCardProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: day.id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 10 : undefined,
  };
  return (
    <div ref={setNodeRef} style={style}>
      <div className="card p-4">
        <DayHeader
          day={day}
          displayNum={idx + 1}
          isCollapsed={isCollapsed}
          onToggleCollapse={onToggleCollapse}
          onDelete={onDelete}
          dragHandleProps={{ ...attributes, ...listeners } as Record<string, unknown>}
          travelBadge={travelBadge}
        />
        {!isCollapsed && children}
      </div>
    </div>
  );
}

interface ActivityListProps {
  day: DayRow;
  clockFormat: ClockFormat;
}

function ActivityList({ day, clockFormat }: ActivityListProps) {
  if (day.activities.length === 0) return null;
  return (
    <ul className="mb-3 space-y-1.5 border-b border-gray-100 dark:border-[#2e2e2e] pb-3">
      {day.activities.map((act) => (
        <li key={act.id} className="flex items-start gap-3 text-sm">
          <span className="w-16 shrink-0 whitespace-nowrap font-mono text-xs text-gray-400 dark:text-[#9fb8b8] mt-0.5">
            {formatActivityTime(act.time, clockFormat)}
          </span>
          <div className="min-w-0">
            <p className="font-medium text-gray-800 dark:text-[#efefef]">{act.title}</p>
            {act.place_name && <p className="text-xs text-gray-400 dark:text-[#9fb8b8]">{act.place_name}</p>}
          </div>
        </li>
      ))}
    </ul>
  );
}

interface TravelEventListProps {
  day: DayRow;
  flightsByDate: Map<string, Flight[]>;
  transportByDate: Map<string, TransportLeg[]>;
  clockFormat: ClockFormat;
}

function TravelEventList({ day, flightsByDate, transportByDate, clockFormat }: TravelEventListProps) {
  if (!day.date) return null;
  const dayFlights = flightsByDate.get(day.date) ?? [];
  const dayTransport = transportByDate.get(day.date) ?? [];
  if (dayFlights.length === 0 && dayTransport.length === 0) return null;

  type TravelEvent =
    | { kind: "flight"; data: Flight; sortKey: string }
    | { kind: "transport"; data: TransportLeg; sortKey: string };

  const events: TravelEvent[] = [
    ...dayFlights.map((f) => ({
      kind: "flight" as const,
      data: f,
      sortKey: flightTimeToHHMM(f.departure_time) || "99:99",
    })),
    ...dayTransport.map((t) => ({
      kind: "transport" as const,
      data: t,
      sortKey: t.departure_time ? t.departure_time.slice(0, 5) : "99:99",
    })),
  ].sort((a, b) => a.sortKey.localeCompare(b.sortKey));

  return (
    <div className="mb-3 space-y-1.5">
      {events.map((ev, i) => {
        if (ev.kind === "flight") {
          const f = ev.data;
          const depTime = flightTimeToHHMM(f.departure_time);
          const arrTime = flightTimeToHHMM(f.arrival_time);
          const depFormatted = depTime ? formatActivityTime(depTime, clockFormat) : null;
          const arrFormatted = arrTime ? formatActivityTime(arrTime, clockFormat) : null;
          return (
            <div key={i} className="flex items-center gap-2 rounded-lg bg-[#f5f5f5] dark:bg-[#252525] px-2.5 py-2 text-xs">
              <svg className="h-3.5 w-3.5 shrink-0 text-gray-400 dark:text-[#9fb8b8]" viewBox="0 0 24 24" fill="currentColor">
                <path d="M21 16v-2l-8-5V3.5c0-.83-.67-1.5-1.5-1.5S10 2.67 10 3.5V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5l8 2.5z"/>
              </svg>
              {depFormatted && (
                <span className="w-16 shrink-0 whitespace-nowrap font-mono text-gray-400 dark:text-[#9fb8b8]">{depFormatted}</span>
              )}
              <div className="min-w-0 flex-1">
                <span className="font-medium text-gray-700 dark:text-[#efefef]">{f.flight_number}</span>
                {(f.departure_iata || f.arrival_iata) && (
                  <span className="ml-1.5 text-gray-400 dark:text-[#9fb8b8]">
                    {f.departure_iata ?? f.departure_city ?? "—"} → {f.arrival_iata ?? f.arrival_city ?? "—"}
                  </span>
                )}
              </div>
              {arrFormatted && (
                <span className="shrink-0 text-gray-400 dark:text-[#9fb8b8]">arr. {arrFormatted}</span>
              )}
            </div>
          );
        } else {
          const t = ev.data;
          const depFormatted = t.departure_time ? formatActivityTime(t.departure_time.slice(0, 5), clockFormat) : null;
          const arrFormatted = t.arrival_time ? formatActivityTime(t.arrival_time.slice(0, 5), clockFormat) : null;
          return (
            <div key={i} className="flex items-center gap-2 rounded-lg bg-[#f5f5f5] dark:bg-[#252525] px-2.5 py-2 text-xs">
              {depFormatted && (
                <span className="w-16 shrink-0 whitespace-nowrap font-mono text-gray-400 dark:text-[#9fb8b8]">{depFormatted}</span>
              )}
              <div className="min-w-0 flex-1">
                <span className="font-medium text-gray-700 dark:text-[#efefef] capitalize">{t.mode}</span>
                <span className="ml-1.5 text-gray-400 dark:text-[#9fb8b8]">{t.from_location} → {t.to_location}</span>
              </div>
              {arrFormatted && (
                <span className="shrink-0 text-gray-400 dark:text-[#9fb8b8]">arr. {arrFormatted}</span>
              )}
            </div>
          );
        }
      })}
    </div>
  );
}

interface AccommodationEventListProps {
  day: DayRow;
  checkInByDate: Map<string, AccommodationRow[]>;
  checkOutByDate: Map<string, AccommodationRow[]>;
}

function AccommodationEventList({ day, checkInByDate, checkOutByDate }: AccommodationEventListProps) {
  if (!day.date) return null;
  const checkIns  = checkInByDate.get(day.date)  ?? [];
  const checkOuts = checkOutByDate.get(day.date) ?? [];
  if (checkIns.length === 0 && checkOuts.length === 0) return null;

  return (
    <div className="mb-3 space-y-1.5">
      {checkIns.map((a) => (
        <div key={`ci-${a.id}`} className="flex items-center gap-2 rounded-lg bg-[#f5f5f5] dark:bg-[#252525] px-2.5 py-2 text-xs">
          <svg className="h-3.5 w-3.5 shrink-0 text-gray-400 dark:text-[#9fb8b8]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12l8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" />
          </svg>
          <div className="min-w-0 flex-1">
            <span className="font-medium text-gray-700 dark:text-[#efefef]">Check-in</span>
            <span className="ml-1.5 text-gray-400 dark:text-[#9fb8b8]">{a.name}{a.city ? `, ${a.city}` : ""}</span>
          </div>
          <span className="shrink-0 rounded-full bg-[#cadede] dark:bg-[#2e2e2e] px-2 py-0.5 text-[10px] font-medium text-[#1e1e1e] dark:text-[#9fb8b8] capitalize">{a.type}</span>
        </div>
      ))}
      {checkOuts.map((a) => (
        <div key={`co-${a.id}`} className="flex items-center gap-2 rounded-lg bg-[#f5f5f5] dark:bg-[#252525] px-2.5 py-2 text-xs">
          <svg className="h-3.5 w-3.5 shrink-0 text-gray-400 dark:text-[#9fb8b8]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12l8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" />
          </svg>
          <div className="min-w-0 flex-1">
            <span className="font-medium text-gray-700 dark:text-[#efefef]">Check-out</span>
            <span className="ml-1.5 text-gray-400 dark:text-[#9fb8b8]">{a.name}{a.city ? `, ${a.city}` : ""}</span>
          </div>
          <span className="shrink-0 rounded-full bg-[#cadede] dark:bg-[#2e2e2e] px-2 py-0.5 text-[10px] font-medium text-[#1e1e1e] dark:text-[#9fb8b8] capitalize">{a.type}</span>
        </div>
      ))}
    </div>
  );
}

// ── NotesTextarea ─────────────────────────────────────────────────────────────
// Uncontrolled textarea — the browser manages the value natively so React
// never touches the DOM on every keystroke. The parent learns the new value
// only on blur (onBlur). When the parent needs to push new content in (e.g.
// after AI applies suggestions), it bumps refreshKey which changes the `key`
// prop and remounts the textarea with the fresh defaultValue.

interface NotesTextareaProps {
  initialValue: string;
  rows: number;
  placeholder: string;
  onBlur: (value: string) => void;
  refreshKey: number;
}

function NotesTextarea({ initialValue, rows, placeholder, onBlur, refreshKey }: NotesTextareaProps) {
  return (
    <textarea
      key={refreshKey}
      defaultValue={initialValue}
      onBlur={(e) => onBlur(e.target.value)}
      rows={rows}
      placeholder={placeholder}
      className="input w-full resize-none text-sm"
    />
  );
}

// ── AddActivityForm ───────────────────────────────────────────────────────────
// Owns its own time/title/place/saving state so typing never re-renders
// ItinerarySection (and never triggers dnd-kit's scroll-to-top side-effect).

interface AddActivityFormProps {
  dayId: string;
  orderIndex: number;
  onAdded: (activity: ActivityRow) => void;
  onCancel: () => void;
}

function AddActivityForm({ dayId, orderIndex, onAdded, onCancel }: AddActivityFormProps) {
  const [time, setTime] = useState("");
  const [title, setTitle] = useState("");
  const [place, setPlace] = useState("");
  const [saving, setSaving] = useState(false);

  async function handleSubmit() {
    if (!title.trim()) return;
    setSaving(true);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const db = createClient() as any;
    const { data, error } = await db
      .from("activities")
      .insert({ day_id: dayId, time: time || null, title: title.trim(), place_name: place.trim() || null, order_index: orderIndex })
      .select().single();
    setSaving(false);
    if (!error && data) onAdded(data);
  }

  return (
    <div className="space-y-2 rounded-lg border border-sky-100 dark:border-[#2e2e2e] bg-sky-50/50 dark:bg-transparent p-3">
      <div className="grid grid-cols-3 gap-2">
        <input type="time" value={time} onChange={(e) => setTime(e.target.value)} className="input text-sm" />
        <input
          type="text" value={title} onChange={(e) => setTitle(e.target.value)}
          className="input col-span-2 text-sm" placeholder="Activity name *" autoFocus
          onKeyDown={(e) => { if (e.key === "Enter") handleSubmit(); if (e.key === "Escape") onCancel(); }}
        />
      </div>
      <input
        type="text" value={place} onChange={(e) => setPlace(e.target.value)}
        className="input w-full text-sm" placeholder="Place name (optional)"
        onKeyDown={(e) => { if (e.key === "Enter") handleSubmit(); if (e.key === "Escape") onCancel(); }}
      />
      <div className="flex gap-2">
        <button onClick={handleSubmit} disabled={saving || !title.trim()} className="btn-primary px-3 py-1 text-sm">
          {saving ? "Saving…" : "Add"}
        </button>
        <button onClick={onCancel} className="btn-secondary px-3 py-1 text-sm">Cancel</button>
      </div>
    </div>
  );
}

// ── EditActivityInline ────────────────────────────────────────────────────────
// Same rationale — owns its own state so editing never re-renders the parent.

interface EditActivityInlineProps {
  activity: ActivityRow;
  currentDayId: string;
  availableDays: { id: string; day_number: number; date: string | null }[];
  onUpdated: (activity: ActivityRow) => void;
  onCancel: () => void;
}

function EditActivityInline({ activity, currentDayId, availableDays, onUpdated, onCancel }: EditActivityInlineProps) {
  const [time, setTime] = useState(activity.time?.slice(0, 5) ?? "");
  const [title, setTitle] = useState(activity.title);
  const [place, setPlace] = useState(activity.place_name ?? "");
  const [selectedDayId, setSelectedDayId] = useState(currentDayId);
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    if (!title.trim()) return;
    setSaving(true);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const db = createClient() as any;
    const updates: Record<string, unknown> = {
      time: time || null,
      title: title.trim(),
      place_name: place.trim() || null,
    };
    if (selectedDayId !== currentDayId) updates.day_id = selectedDayId;
    const { data, error } = await db
      .from("activities")
      .update(updates)
      .eq("id", activity.id)
      .select().single();
    setSaving(false);
    if (!error && data) onUpdated({ ...data, day_id: selectedDayId });
  }

  return (
    <li className="rounded-lg border border-sky-100 dark:border-[#2e2e2e] bg-sky-50/50 dark:bg-transparent p-3 space-y-2">
      <div className="grid grid-cols-3 gap-2">
        <input type="time" value={time} onChange={(e) => setTime(e.target.value)} className="input text-sm" />
        <input
          type="text" value={title} onChange={(e) => setTitle(e.target.value)}
          className="input col-span-2 text-sm" placeholder="Activity name *" autoFocus
          onKeyDown={(e) => { if (e.key === "Enter") handleSave(); if (e.key === "Escape") onCancel(); }}
        />
      </div>
      <input
        type="text" value={place} onChange={(e) => setPlace(e.target.value)}
        className="input w-full text-sm" placeholder="Place name (optional)"
        onKeyDown={(e) => { if (e.key === "Enter") handleSave(); if (e.key === "Escape") onCancel(); }}
      />
      {availableDays.length > 1 && (
        <select
          value={selectedDayId}
          onChange={(e) => setSelectedDayId(e.target.value)}
          className="input text-sm"
        >
          {availableDays.map((d) => (
            <option key={d.id} value={d.id}>
              Day {d.day_number}{d.date ? ` · ${formatDayDate(d.date)}` : ""}
            </option>
          ))}
        </select>
      )}
      <div className="flex gap-2">
        <button onClick={handleSave} disabled={saving || !title.trim()} className="btn-primary px-3 py-1 text-sm">
          {saving ? "Saving…" : "Save"}
        </button>
        <button onClick={onCancel} className="btn-secondary px-3 py-1 text-sm">Cancel</button>
      </div>
    </li>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

function ItinerarySection({
  tripId,
  initialDays,
  tripStartDate,
  tripEndDate,
  destination,
  style,
  initialNotes,
  flights = [],
  transportLegs = [],
  tripCountries = [],
  journalProfile,
  accommodations = [],
}: ItinerarySectionProps) {
  const supabase = createClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabase as any;
  const router = useRouter();

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 8 } })
  );

  const [days, setDays] = useState<DayRow[]>(
    initialDays.map((d) => ({ ...d, activities: sortActivities(d.activities) }))
  );
  const [clockFormat, setClockFormatState] = useState<ClockFormat>("12h");

  useEffect(() => {
    setClockFormatState(getClockFormat());
  }, []);

  // Scroll-lock: when any textarea on this page has focus, intercept a large
  // upward scroll (the bug) and immediately restore the previous position.
  // "Large upward" = page went from >200 px down to <50 px — i.e. jumped to top.
  // Normal user scrolling (wheel / scrollbar) updates the reference so it is
  // always allowed; only the sudden jump-to-top is blocked.
  useEffect(() => {
    // Keep a direct reference to the native scrollTo so our restore call
    // doesn't go through any other interceptor that might log / re-enter.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const nativeScrollTo = (window as any).scrollTo.bind(window) as (x: number, y: number) => void;

    let lockedY: number | null = null; // null = no textarea focused

    const onFocusTa = (e: FocusEvent) => {
      if ((e.target as HTMLElement).tagName === 'TEXTAREA') {
        lockedY = window.scrollY;
      }
    };
    const onBlurTa = (e: FocusEvent) => {
      if ((e.target as HTMLElement).tagName === 'TEXTAREA') {
        lockedY = null;
      }
    };
    const onScrollLock = () => {
      if (lockedY === null) return;
      const y = window.scrollY;
      if (y < 50 && lockedY > 200) {
        // Page jumped to near-top while textarea was focused far from top → bug, restore
        nativeScrollTo(0, lockedY);
      } else {
        // Legitimate scroll (user wheeling, small movement) — keep reference current
        lockedY = y;
      }
    };

    document.addEventListener('focus', onFocusTa, true);
    document.addEventListener('blur',  onBlurTa,  true);
    window.addEventListener('scroll', onScrollLock, { passive: true });

    return () => {
      document.removeEventListener('focus', onFocusTa, true);
      document.removeEventListener('blur',  onBlurTa,  true);
      window.removeEventListener('scroll', onScrollLock);
    };
  }, []);

  useEffect(() => {
    try { localStorage.setItem(`pathway-itinerary-${tripId}`, JSON.stringify(days)); } catch {}
  }, [days, tripId]);

  // On mount: silently fix any gaps in day_number / date caused by prior deletions
  // (e.g. days stored as [1,2,5,6,7] get renumbered to [1,2,3,4,5])
  useEffect(() => {
    const sorted = [...initialDays].sort((a, b) => a.day_number - b.day_number);
    const hasGaps = sorted.some((d, i) => d.day_number !== i + 1);
    const missingDates = sorted.some((d) => !d.date && tripStartDate);
    if (!hasGaps && !missingDates) return;

    const updated = sorted.map((day, idx) => ({
      ...day,
      day_number: idx + 1,
      date: tripStartDate ? dateForDayNum(idx + 1) : day.date,
    }));
    // Two-phase update to avoid unique(trip_id, day_number) violations
    const offset = 10000;
    Promise.all(updated.map((day) =>
      db.from("itinerary_days").update({ day_number: day.day_number + offset }).eq("id", day.id)
    )).then(() =>
      Promise.all(updated.map((day) =>
        db.from("itinerary_days").update({ day_number: day.day_number, date: day.date }).eq("id", day.id)
      ))
    ).catch(() => {});
    setDays(updated.map((d) => ({ ...d, activities: sortActivities(d.activities) })));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // intentionally runs once on mount only

  // Structured mode — which day/activity form is open (not the form values themselves;
  // those live in AddActivityForm / EditActivityInline to avoid parent re-renders)
  const [addingActivity, setAddingActivity] = useState<string | null>(null);
  const [editingActivity, setEditingActivity] = useState<string | null>(null);
  const [movingAllFromDay, setMovingAllFromDay] = useState<string | null>(null);

  // Notes mode
  const [tripNotes, setTripNotes] = useState(initialNotes ?? "");
  const [dayNotes, setDayNotes] = useState<Record<string, SectionNotes>>(() => {
    const init: Record<string, SectionNotes> = {};
    for (const day of initialDays) init[day.id] = (day.section_notes as SectionNotes) ?? {};
    return init;
  });
  // Incrementing this forces NotesTextarea components to re-sync from parent
  // (only needed after AI applies new content, not during normal typing)
  const [notesRefreshKey, setNotesRefreshKey] = useState(0);

  // Build date-keyed lookup maps for flights and transport
  const flightsByDate = new Map<string, Flight[]>();
  for (const f of flights) {
    if (!f.flight_date) continue;
    const arr = flightsByDate.get(f.flight_date) ?? [];
    arr.push(f);
    flightsByDate.set(f.flight_date, arr);
  }
  const transportByDate = new Map<string, TransportLeg[]>();
  for (const t of transportLegs) {
    if (!t.travel_date) continue;
    const arr = transportByDate.get(t.travel_date) ?? [];
    arr.push(t);
    transportByDate.set(t.travel_date, arr);
  }

  const accomCheckInByDate  = new Map<string, AccommodationRow[]>();
  const accomCheckOutByDate = new Map<string, AccommodationRow[]>();
  for (const a of accommodations) {
    if (a.check_in) {
      const arr = accomCheckInByDate.get(a.check_in) ?? [];
      arr.push(a);
      accomCheckInByDate.set(a.check_in, arr);
    }
    if (a.check_out) {
      const arr = accomCheckOutByDate.get(a.check_out) ?? [];
      arr.push(a);
      accomCheckOutByDate.set(a.check_out, arr);
    }
  }

  // Collapse state — persisted to localStorage so refreshing keeps days collapsed.
  // Must be loaded in a useEffect (not useState initializer) because Next.js SSR
  // renders this component on the server where localStorage is unavailable, and
  // React reuses that server state during hydration without re-running the initializer.
  const collapseKey = `pathway-collapsed-days-${tripId}`;
  const [collapsedDays, setCollapsedDays] = useState<Set<string>>(new Set());
  const [collapseStorageLoaded, setCollapseStorageLoaded] = useState(false);
  const [sectionCollapsed, setSectionCollapsed] = useState(false);

  // Load saved collapsed days from localStorage after mount (client-only)
  useEffect(() => {
    try {
      const stored = localStorage.getItem(collapseKey);
      if (stored) {
        const ids = JSON.parse(stored);
        if (Array.isArray(ids)) setCollapsedDays(new Set<string>(ids));
      }
    } catch {}
    setCollapseStorageLoaded(true);
  }, [collapseKey]);

  // Save to localStorage whenever collapsed state changes, but not before the
  // initial load completes (otherwise the empty initial state would overwrite the data).
  useEffect(() => {
    if (!collapseStorageLoaded) return;
    try {
      localStorage.setItem(collapseKey, JSON.stringify([...collapsedDays]));
    } catch {}
  }, [collapsedDays, collapseKey, collapseStorageLoaded]);

  const toggleDayCollapsed = useCallback((dayId: string) => {
    setCollapsedDays((prev) => {
      const next = new Set(prev);
      if (next.has(dayId)) next.delete(dayId); else next.add(dayId);
      return next;
    });
  }, []);

  function collapseAll() {
    setCollapsedDays(new Set(days.map((d) => d.id)));
  }

  function expandAll() {
    setCollapsedDays(new Set());
  }

  // AI suggestions
  const [showAI, setShowAI] = useState(false);
  const [preferences, setPreferences] = useState("");
  const [hasPrefs, setHasPrefs] = useState(true); // assume true until checked client-side

  useEffect(() => {
    try {
      const p = getTravelPrefs();
      setHasPrefs(!!(p.pace || p.style || p.interests.length > 0 || p.dietary.length > 0));
    } catch {
      setHasPrefs(true);
    }
  }, []);
  const [generationScope, setGenerationScope] = useState<"1" | "3" | "full">("full");
  const knownDays = computeDuration(tripStartDate, tripEndDate);
  const [numDaysInput, setNumDaysInput] = useState(String(knownDays ?? 3));
  const [generating, setGenerating] = useState(false);
  const [generatingMsgIdx, setGeneratingMsgIdx] = useState(0);
  const [applying, setApplying] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [structuredSuggestion, setStructuredSuggestion] = useState<SuggestedDay[] | null>(null);
  const [notesSuggestion, setNotesSuggestion] = useState<string | null>(null);
  const [dayNotesSuggestion, setDayNotesSuggestion] = useState<SuggestedDayNotes[] | null>(null);
  const [travelerNote, setTravelerNote] = useState<string | null>(null);
  const [rejectedActivities, setRejectedActivities] = useState<string[]>([]);

  function dateForDayNum(dayNum: number) {
    if (!tripStartDate) return null;
    const [y, m, d] = tripStartDate.split("-").map(Number);
    return new Date(Date.UTC(y, m - 1, d + dayNum - 1)).toISOString().split("T")[0];
  }

  // ── Day CRUD ─────────────────────────────────────────────────

  const [addingDay, setAddingDay] = useState(false);

  async function handleAddDay() {
    setAddingDay(true);

    // Query the DB for the real current max so we never conflict with
    // any in-flight normalization updates that haven't persisted yet.
    const { data: existing } = await db
      .from("itinerary_days")
      .select("day_number")
      .eq("trip_id", tripId)
      .order("day_number", { ascending: false })
      .limit(1)
      .maybeSingle();

    const nextNum = existing ? existing.day_number + 1 : 1;
    const { data, error } = await db
      .from("itinerary_days")
      .insert({ trip_id: tripId, day_number: nextNum, date: dateForDayNum(nextNum) })
      .select().single();

    setAddingDay(false);

    if (error || !data) {
      console.error("[handleAddDay] insert failed:", error);
      return;
    }

    setDays((prev) => [...prev, { ...data, activities: [], section_notes: {} }]);
    setDayNotes((prev) => ({ ...prev, [data.id]: {} }));
  }

  async function handleDeleteDay(dayId: string) {
    await db.from("itinerary_days").delete().eq("id", dayId);

    const remaining = days
      .filter((d) => d.id !== dayId)
      .map((day, idx) => ({ ...day, day_number: idx + 1, date: dateForDayNum(idx + 1) }));

    setDays(remaining);
    setDayNotes((prev) => { const n = { ...prev }; delete n[dayId]; return n; });

    // Two-phase renumber to avoid unique(trip_id, day_number) violations
    const offset = 10000;
    await Promise.all(remaining.map((day) =>
      db.from("itinerary_days").update({ day_number: day.day_number + offset }).eq("id", day.id)
    ));
    await Promise.all(remaining.map((day) =>
      db.from("itinerary_days").update({ day_number: day.day_number, date: day.date }).eq("id", day.id)
    ));
  }

  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = days.findIndex((d) => d.id === active.id);
    const newIndex = days.findIndex((d) => d.id === over.id);
    const reordered = arrayMove(days, oldIndex, newIndex).map((day, idx) => ({
      ...day,
      day_number: idx + 1,
      date: dateForDayNum(idx + 1),
    }));

    // Optimistic update
    setDays(reordered);

    // Two-phase DB update to avoid unique(trip_id, day_number) constraint violations.
    // Phase 1: shift all to a high offset so no two rows clash during the transition.
    const offset = 10000;
    await Promise.all(
      reordered.map((day) =>
        db.from("itinerary_days").update({ day_number: day.day_number + offset }).eq("id", day.id)
      )
    );
    // Phase 2: set the real final values.
    await Promise.all(
      reordered.map((day) =>
        db.from("itinerary_days").update({ day_number: day.day_number, date: day.date }).eq("id", day.id)
      )
    );
  }

  // ── Activity CRUD ─────────────────────────────────────────────

  async function handleDeleteActivity(activityId: string, dayId: string) {
    await db.from("activities").delete().eq("id", activityId);
    setDays((prev) => prev.map((d) =>
      d.id === dayId ? { ...d, activities: d.activities.filter((a) => a.id !== activityId) } : d
    ));
  }

  async function handleMoveAllActivities(fromDayId: string, toDayId: string) {
    const fromDay = days.find((d) => d.id === fromDayId);
    if (!fromDay || fromDay.activities.length === 0) return;

    await db.from("activities").update({ day_id: toDayId }).eq("day_id", fromDayId);

    setDays((prev) => prev.map((d) => {
      if (d.id === fromDayId) return { ...d, activities: [] };
      if (d.id === toDayId) return {
        ...d,
        activities: sortActivities([
          ...d.activities,
          ...fromDay.activities.map((a) => ({ ...a, day_id: toDayId })),
        ]),
      };
      return d;
    }));
    setMovingAllFromDay(null);
  }

  // ── Notes saves ───────────────────────────────────────────────

  async function handleTripNotesBlur() {
    await db.from("trips").update({ itinerary_notes: tripNotes || null }).eq("id", tripId);
  }

  // ── AI generation ─────────────────────────────────────────────

  async function handleGenerate(additionalRejected: string[] = []) {
    setGenerating(true);
    setAiError(null);
    setStructuredSuggestion(null);
    setNotesSuggestion(null);
    setDayNotesSuggestion(null);
    setTravelerNote(null);

    // Load travel prefs from localStorage — pace/style go as structured fields;
    // interests/dietary are appended to preferences text.
    let effectivePrefs = preferences ?? "";
    let user_pace = "";
    let user_style = "";
    let storedPrefs = { pace: "", style: "", interests: [] as string[], dietary: [] as string[], daily_budget: null as number | null, currency: undefined as string | undefined, fitness: undefined as string | undefined, avoid: undefined as string | undefined };
    try {
      const p = getTravelPrefs();
      storedPrefs = { ...storedPrefs, ...p };
      user_pace = p.pace ?? "";
      user_style = p.style ?? "";
      const prefsText = formatTravelPrefsForPrompt(p);
      if (prefsText) effectivePrefs = prefsText + (effectivePrefs ? ". " + effectivePrefs : "");
    } catch {}

    const num_days =
      generationScope === "1" ? 1 :
      generationScope === "3" ? 3 :
      (knownDays ?? parseInt(numDaysInput, 10));

    try {
      const res = await fetch("/api/suggest-itinerary", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: AbortSignal.timeout(55_000), // 55 s — just under Vercel's 60 s limit
        body: JSON.stringify({
          destination,
          num_days,
          style,
          preferences: effectivePrefs,
          user_pace,
          user_style,
          existing_day_count: days.length,
          existing_activities: [
            ...days.flatMap((d) =>
              d.activities.map((a) => a.place_name ? `${a.title} (${a.place_name})` : a.title)
            ),
            ...rejectedActivities,
            ...additionalRejected,
          ],
          existing_notes: days
            .flatMap((d) => Object.values(dayNotes[d.id] ?? {}).filter(Boolean))
            .join("\n\n"),
          travel_events: buildTravelEventsContext(flights, transportLegs, tripStartDate),
          trip_start_date: tripStartDate ?? undefined,
          trip_end_date: tripEndDate ?? undefined,
          trip_countries: tripCountries.length > 0 ? tripCountries : undefined,
          daily_budget: storedPrefs.daily_budget ?? undefined,
          currency: storedPrefs.currency ?? undefined,
          fitness: storedPrefs.fitness ?? undefined,
          avoid: storedPrefs.avoid ?? undefined,
          journal_profile: journalProfile ?? undefined,
        }),
      });

      let data: Record<string, unknown>;
      try {
        data = await res.json();
      } catch {
        setAiError(`Server returned an unreadable response (HTTP ${res.status}). Please try again.`);
        return;
      }

      if (!res.ok || data.error) {
        const msg = typeof data.error === "string" ? data.error : null;
        if (res.status === 529 || (msg && msg.toLowerCase().includes("overload"))) {
          setAiError("The AI is overloaded right now. Wait a few seconds and try again.");
        } else if (res.status === 408 || res.status === 504 || (msg && msg.toLowerCase().includes("timeout"))) {
          setAiError("The request timed out — try generating fewer days at once.");
        } else if (res.status === 500 && msg && msg.includes("Truncated")) {
          setAiError("The AI response was cut off. Try generating 1–2 days at a time.");
        } else {
          setAiError(msg ?? `Generation failed (HTTP ${res.status}). Please try again.`);
        }
        return;
      }

      if (style === "structured") {
        setStructuredSuggestion(data.days as never[] ?? []);
        if (data.traveler_note) setTravelerNote(data.traveler_note as string);
      } else if (style === "notes") {
        setNotesSuggestion((data.content as string) ?? "");
      } else {
        setDayNotesSuggestion(data.days as never[] ?? []);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      const isAbort = err instanceof DOMException && (err.name === "TimeoutError" || err.name === "AbortError");
      if (isAbort || msg.toLowerCase().includes("timeout") || msg.toLowerCase().includes("timed out") || msg.toLowerCase().includes("aborted")) {
        setAiError("The request timed out — the AI took too long. Try generating 1–2 days at a time.");
      } else if (msg.includes("fetch") || msg.includes("network") || msg.includes("Failed to fetch")) {
        setAiError("Network error — check your connection and try again.");
      } else {
        setAiError(`Something went wrong: ${msg}`);
      }
    } finally {
      setGenerating(false);
    }
  }

  async function handleApplyStructured() {
    if (!structuredSuggestion) return;
    setApplying(true);
    setAiError(null);

    const { data: existingDays } = await db
      .from("itinerary_days")
      .select("day_number")
      .eq("trip_id", tripId);
    const maxDayNum = existingDays && existingDays.length > 0
      ? Math.max(...existingDays.map((d: { day_number: number }) => d.day_number))
      : 0;
    const startNum = maxDayNum + 1;
    const newDays: DayRow[] = [];

    for (const sugDay of structuredSuggestion) {
      const dayNum = startNum + sugDay.day_number - 1;
      const { data: dayData, error: dayError } = await db
        .from("itinerary_days")
        .insert({ trip_id: tripId, day_number: dayNum, date: dateForDayNum(dayNum) })
        .select().single();
      if (dayError || !dayData) {
        setAiError(`Failed to add Day ${sugDay.day_number}: ${dayError?.message ?? "unknown error"}`);
        setApplying(false);
        return;
      }

      const activities: ActivityRow[] = [];
      for (let i = 0; i < sugDay.activities.length; i++) {
        const act = sugDay.activities[i];
        const actNotes = [
          act.cost      && `Cost: ${act.cost}`,
          act.transport && `Getting there: ${act.transport}`,
          act.local_tip && `Tip: ${act.local_tip}`,
          act.watch_out && `⚠️ ${act.watch_out}`,
        ].filter(Boolean).join('\n') || null;
        const { data: actData } = await db
          .from("activities")
          .insert({ day_id: dayData.id, time: act.time || null, title: act.title, place_name: act.place_name || null, notes: actNotes, order_index: i })
          .select().single();
        if (actData) activities.push(actData);
      }
      newDays.push({ ...dayData, activities: sortActivities(activities), section_notes: {} });
    }

    setDays((prev) => [...prev, ...newDays]);
    setStructuredSuggestion(null);
    setTravelerNote(null);
    setRejectedActivities([]);
    setShowAI(false);
    setApplying(false);
    router.refresh(); // invalidate Router Cache so navigate-away-and-back sees fresh DB data
  }

  async function handleApplyNotes() {
    if (notesSuggestion === null) return;
    setTripNotes(notesSuggestion);
    await db.from("trips").update({ itinerary_notes: notesSuggestion }).eq("id", tripId);
    setNotesSuggestion(null);
    setRejectedActivities([]);
    setShowAI(false);
    setNotesRefreshKey((k) => k + 1);
    router.refresh(); // invalidate Router Cache so navigate-away-and-back sees fresh DB data
  }

  async function handleApplyDayNotes() {
    if (!dayNotesSuggestion) return;
    setApplying(true);
    setAiError(null);

    const { data: existingDays } = await db
      .from("itinerary_days")
      .select("day_number")
      .eq("trip_id", tripId);
    const maxDayNum = existingDays && existingDays.length > 0
      ? Math.max(...existingDays.map((d: { day_number: number }) => d.day_number))
      : 0;
    const startNum = maxDayNum + 1;
    const newDays: DayRow[] = [];
    const newDayNotes: Record<string, SectionNotes> = {};

    for (const sugDay of dayNotesSuggestion) {
      const dayNum = startNum + sugDay.day_number - 1;
      const { data: dayData, error: dayError } = await db
        .from("itinerary_days")
        .insert({ trip_id: tripId, day_number: dayNum, date: dateForDayNum(dayNum), section_notes: sugDay.sections })
        .select().single();
      if (dayError || !dayData) {
        setAiError(`Failed to add Day ${sugDay.day_number}: ${dayError?.message ?? "unknown error"}`);
        setApplying(false);
        return;
      }
      newDays.push({ ...dayData, activities: [], section_notes: sugDay.sections });
      newDayNotes[dayData.id] = sugDay.sections;
    }

    setDays((prev) => [...prev, ...newDays]);
    setDayNotes((prev) => ({ ...prev, ...newDayNotes }));
    setDayNotesSuggestion(null);
    setRejectedActivities([]);
    setShowAI(false);
    setApplying(false);
    setNotesRefreshKey((k) => k + 1);
    router.refresh(); // invalidate Router Cache so navigate-away-and-back sees fresh DB data
  }

  // ── Shared UI pieces ──────────────────────────────────────────

  const addDayButton = (
    <button
      onClick={handleAddDay}
      disabled={addingDay}
      className="w-full rounded-xl border-2 border-dashed border-gray-200 dark:border-[#2e2e2e] py-3 text-sm font-medium text-gray-400 dark:text-[#9fb8b8] hover:border-[#9fb8b8] hover:text-[#9fb8b8] transition-colors disabled:opacity-50"
    >
      {addingDay ? "Adding…" : "+ Add day"}
    </button>
  );

  // ── Rotating generation messages ─────────────────────────────
  const GENERATING_MESSAGES = [
    "Writing your itinerary…",
    "Finding the best local spots…",
    "Checking what's worth seeing…",
    "Planning your days…",
    "Adding local tips…",
    "Mapping out the route…",
    "Crafting your adventure…",
  ];
  useEffect(() => {
    if (!generating) return;
    setGeneratingMsgIdx(0);
    const interval = setInterval(() => {
      setGeneratingMsgIdx((i) => (i + 1) % GENERATING_MESSAGES.length);
    }, 2500);
    return () => clearInterval(interval);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [generating]);

  // ── AI panel ──────────────────────────────────────────────────

  const aiPanel = showAI && (
    <div className="mb-4 rounded-xl border border-sky-100 dark:border-[#2e2e2e] bg-sky-50/60 dark:bg-transparent p-4 space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold text-gray-700 dark:text-[#efefef]">AI itinerary suggestions</p>
        <button onClick={() => { setShowAI(false); setStructuredSuggestion(null); setNotesSuggestion(null); setDayNotesSuggestion(null); setTravelerNote(null); setAiError(null); setRejectedActivities([]); }} className="text-gray-400 hover:text-gray-600">
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Scope selector */}
      <div>
        <label className="label">Generate for</label>
        <div className="flex gap-2 flex-wrap">
          {(["1", "3", "full"] as const).map((scope) => {
            const label =
              scope === "1" ? "1 day" :
              scope === "3" ? "3 days" :
              knownDays ? `Full trip (${knownDays} day${knownDays === 1 ? "" : "s"})` : "Full trip";
            return (
              <button
                key={scope}
                onClick={() => setGenerationScope(scope)}
                className={`rounded-full px-3 py-1 text-xs font-semibold transition-colors ${
                  generationScope === scope
                    ? "bg-[#1e1e1e] dark:bg-[#cadede] text-white dark:text-[#1e1e1e]"
                    : "bg-[#e0e0e0] dark:bg-[#2e2e2e] text-gray-600 dark:text-[#9fb8b8] hover:bg-[#cadede] dark:hover:bg-[#3e3e3e]"
                }`}
              >
                {label}
              </button>
            );
          })}
        </div>
        {generationScope === "full" && !knownDays && (
          <div className="mt-2">
            <input
              type="number"
              min="1"
              max="30"
              value={numDaysInput}
              onChange={(e) => setNumDaysInput(e.target.value)}
              placeholder="Number of days"
              className="input w-32"
            />
          </div>
        )}
      </div>

      <div>
        <label className="label">Preferences <span className="text-gray-400 font-normal">— optional</span></label>
        <input
          type="text"
          value={preferences}
          onChange={(e) => setPreferences(e.target.value)}
          placeholder="e.g. focus on food, avoid tourist traps, relaxed pace"
          className="input w-full"
        />
        {!hasPrefs && (
          <p className="mt-1.5 text-xs text-gray-400 dark:text-[#9fb8b8]">
            <a href="/settings" className="underline hover:text-[#9fb8b8] transition-colors">
              Set up travel preferences
            </a>
            {" "}to automatically personalise every suggestion.
          </p>
        )}
      </div>

      {aiError && <p className="text-sm text-red-600">{aiError}</p>}

      {!structuredSuggestion && !notesSuggestion && !dayNotesSuggestion && (
        <button onClick={() => handleGenerate()} disabled={generating} className="btn-primary w-full">
          {generating ? (
            <span className="flex items-center justify-center gap-2">
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
              <span className="transition-all">{GENERATING_MESSAGES[generatingMsgIdx]}</span>
            </span>
          ) : "Generate suggestions"}
        </button>
      )}

      {/* Structured suggestions preview */}
      {structuredSuggestion && (
        <div className="space-y-3">
          {travelerNote && (
            <p className="text-xs italic text-gray-400 dark:text-[#9fb8b8] border-l-2 border-gray-200 dark:border-[#3e3e3e] pl-2">{travelerNote}</p>
          )}
          <p className="text-xs text-gray-500 dark:text-[#9fb8b8]">{structuredSuggestion.length} days generated — review below, then add to your itinerary.</p>
          <div className="max-h-72 overflow-y-auto space-y-2 pr-1">
            {structuredSuggestion.map((day) => (
              <div key={day.day_number} className="rounded-lg bg-white dark:bg-transparent border border-gray-100 dark:border-[#2e2e2e] p-3">
                <p className="text-xs font-semibold text-gray-600 dark:text-[#9fb8b8] mb-1.5">Day {day.day_number}</p>
                <ul className="space-y-2">
                  {day.activities.map((act, i) => (
                    <li key={i} className="text-xs text-gray-600 dark:text-[#9fb8b8]">
                      <div className="flex gap-2">
                        <span className="shrink-0 w-12 sm:w-16 whitespace-nowrap font-mono text-gray-400 dark:text-[#9fb8b8]">{formatActivityTime(act.time, clockFormat)}</span>
                        <div className="min-w-0">
                          <span className="font-medium">{act.title}</span>
                          {act.place_name && <span className="ml-1 text-gray-400">· {act.place_name}</span>}
                          {act.cost && <p className="mt-0.5 text-[10px] text-gray-400 dark:text-[#9fb8b8]">{act.cost}</p>}
                          {act.transport && <p className="mt-0.5 text-[10px] text-gray-400 dark:text-[#9fb8b8]">{act.transport}</p>}
                          {act.local_tip && <p className="mt-0.5 text-[10px] text-gray-400 dark:text-[#9fb8b8] italic">Tip: {act.local_tip}</p>}
                          {act.watch_out && <p className="mt-0.5 text-[10px] text-amber-500 dark:text-amber-400">⚠️ {act.watch_out}</p>}
                        </div>
                      </div>
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
            <button
              onClick={() => {
                const rejected = structuredSuggestion.flatMap((day) =>
                  day.activities.map((act) => act.place_name ? `${act.title} (${act.place_name})` : act.title)
                );
                setRejectedActivities((prev) => [...prev, ...rejected]);
                setStructuredSuggestion(null);
                handleGenerate(rejected);
              }}
              className="btn-secondary"
            >Try again</button>
          </div>
        </div>
      )}

      {/* Notes suggestion preview */}
      {notesSuggestion && (
        <div className="space-y-3">
          <div className="max-h-60 overflow-y-auto rounded-lg bg-white dark:bg-transparent border border-gray-100 dark:border-[#2e2e2e] p-3">
            <p className="text-sm text-gray-700 dark:text-[#efefef] whitespace-pre-wrap">{notesSuggestion}</p>
          </div>
          <div className="flex gap-2">
            <button onClick={handleApplyNotes} className="btn-primary flex-1">Apply</button>
            <button
              onClick={() => {
                setNotesSuggestion(null);
                handleGenerate();
              }}
              className="btn-secondary"
            >Try again</button>
          </div>
        </div>
      )}

      {/* Day notes suggestion preview */}
      {dayNotesSuggestion && (
        <div className="space-y-3">
          <p className="text-xs text-gray-500 dark:text-[#9fb8b8]">{dayNotesSuggestion.length} days generated.</p>
          <div className="max-h-72 overflow-y-auto space-y-2 pr-1">
            {dayNotesSuggestion.map((day) => (
              <div key={day.day_number} className="rounded-lg bg-white dark:bg-transparent border border-gray-100 dark:border-[#2e2e2e] p-3 space-y-2">
                <p className="text-xs font-semibold text-gray-600 dark:text-[#9fb8b8]">Day {day.day_number}</p>
                {Object.entries(day.sections).map(([key, val]) => (
                  <div key={key}>
                    <p className="text-xs font-medium uppercase tracking-wide text-gray-400 dark:text-[#9fb8b8]">{key}</p>
                    <p className="text-xs text-gray-600 dark:text-[#efefef] mt-0.5">{val}</p>
                  </div>
                ))}
              </div>
            ))}
          </div>
          <div className="flex gap-2">
            <button onClick={handleApplyDayNotes} disabled={applying} className="btn-primary flex-1">
              {applying ? "Adding…" : "Add to itinerary"}
            </button>
            <button
              onClick={() => {
                setDayNotesSuggestion(null);
                handleGenerate();
              }}
              className="btn-secondary"
            >Try again</button>
          </div>
        </div>
      )}
    </div>
  );

  const allDaysCollapsed = days.length > 0 && days.every((d) => collapsedDays.has(d.id));

  const sectionHeader = (
    <div className="mb-4 flex items-center justify-between">
      <div className="flex items-center gap-2">
        <button
          onClick={() => setSectionCollapsed((v) => !v)}
          className="flex items-center gap-2 hover:opacity-70 transition-opacity"
        >
          <h2 className="text-lg font-semibold text-gray-900 dark:text-[#efefef]">Itinerary</h2>
          <svg
            className={`h-4 w-4 text-gray-400 transition-transform duration-150 ${sectionCollapsed ? "-rotate-90" : ""}`}
            fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        </button>
        {!sectionCollapsed && days.length > 1 && (
          <button
            onClick={allDaysCollapsed ? expandAll : collapseAll}
            className="text-xs text-gray-400 dark:text-[#9fb8b8] hover:text-gray-600 dark:hover:text-[#efefef] transition-colors"
          >
            {allDaysCollapsed ? "expand all" : "collapse all"}
          </button>
        )}
      </div>
      <button
        onClick={() => { setShowAI((v) => !v); setStructuredSuggestion(null); setNotesSuggestion(null); setDayNotesSuggestion(null); setTravelerNote(null); setAiError(null); setRejectedActivities([]); }}
        className="flex items-center gap-1.5 rounded-lg border border-gray-200 dark:border-[#3a3a3a] bg-white dark:bg-[#2e2e2e] px-3 py-1.5 text-xs font-medium text-gray-600 dark:text-[#9fb8b8] hover:border-[#9fb8b8] hover:text-[#9fb8b8] transition-colors"
      >
        <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
        </svg>
        Suggest with AI
      </button>
    </div>
  );

  // ── Blank notes (per day) ─────────────────────────────────────
  if (style === "notes") {
    return (
      <section className="mb-8">
        {sectionHeader}
        {!sectionCollapsed && (
          <>
            {aiPanel}
            {days.length === 0 && (
              <div className="rounded-xl border-2 border-dashed border-gray-200 dark:border-[#2e2e2e] py-10 text-center text-sm text-gray-400 dark:text-[#9fb8b8] mb-3">
                No days yet — add your first day below.
              </div>
            )}
            <DndContext id="itinerary-notes-dnd" sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd} autoScroll={false}>
              <SortableContext items={days.map((d) => d.id)} strategy={verticalListSortingStrategy}>
                <div className="space-y-4 mb-3">
                  {days.map((day, idx) => (
                    <SortableDayCard
                      key={day.id}
                      day={day}
                      idx={idx}
                      isCollapsed={collapsedDays.has(day.id)}
                      onToggleCollapse={() => toggleDayCollapsed(day.id)}
                      onDelete={() => handleDeleteDay(day.id)}
                      travelBadge={getTravelBadge(day, flightsByDate, transportByDate)}
                    >
                      <ActivityList day={day} clockFormat={clockFormat} />
                      <TravelEventList day={day} flightsByDate={flightsByDate} transportByDate={transportByDate} clockFormat={clockFormat} />
                      <AccommodationEventList day={day} checkInByDate={accomCheckInByDate} checkOutByDate={accomCheckOutByDate} />
                      <NotesTextarea
                        initialValue={dayNotes[day.id]?.["notes"] ?? ""}
                        rows={4}
                        placeholder="Notes for this day…"
                        refreshKey={notesRefreshKey}
                        onBlur={(value) => {
                          setDayNotes((prev) => {
                            const updated = { ...prev, [day.id]: { ...prev[day.id], notes: value } };
                            db.from("itinerary_days").update({ section_notes: updated[day.id] }).eq("id", day.id).then(() => {});
                            return updated;
                          });
                        }}
                      />
                    </SortableDayCard>
                  ))}
                </div>
              </SortableContext>
            </DndContext>
            {addDayButton}
          </>
        )}
      </section>
    );
  }

  // ── Per-day notes ─────────────────────────────────────────────
  if (style === "notes_day_night" || style === "notes_day_afternoon_night") {
    const sections = SECTION_CONFIG[style];
    return (
      <section className="mb-8">
        {sectionHeader}
        {!sectionCollapsed && (
          <>
            {aiPanel}
            {days.length === 0 && (
              <div className="rounded-xl border-2 border-dashed border-gray-200 dark:border-[#2e2e2e] py-10 text-center text-sm text-gray-400 dark:text-[#9fb8b8] mb-3">
                No days yet — add your first day below.
              </div>
            )}
            <DndContext id="itinerary-day-notes-dnd" sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd} autoScroll={false}>
              <SortableContext items={days.map((d) => d.id)} strategy={verticalListSortingStrategy}>
                <div className="space-y-4 mb-3">
                  {days.map((day, idx) => (
                    <SortableDayCard
                      key={day.id}
                      day={day}
                      idx={idx}
                      isCollapsed={collapsedDays.has(day.id)}
                      onToggleCollapse={() => toggleDayCollapsed(day.id)}
                      onDelete={() => handleDeleteDay(day.id)}
                      travelBadge={getTravelBadge(day, flightsByDate, transportByDate)}
                    >
                      <ActivityList day={day} clockFormat={clockFormat} />
                      <TravelEventList day={day} flightsByDate={flightsByDate} transportByDate={transportByDate} clockFormat={clockFormat} />
                      <AccommodationEventList day={day} checkInByDate={accomCheckInByDate} checkOutByDate={accomCheckOutByDate} />
                      <div className="space-y-3">
                        {sections.map(({ key, label }) => (
                          <div key={key}>
                            <p className="mb-1 text-xs font-medium uppercase tracking-wide text-gray-400 dark:text-[#9fb8b8]">{label}</p>
                            <NotesTextarea
                              initialValue={dayNotes[day.id]?.[key] ?? ""}
                              rows={3}
                              placeholder={`${label} plans…`}
                              refreshKey={notesRefreshKey}
                              onBlur={(value) => {
                                setDayNotes((prev) => {
                                  const updated = { ...prev, [day.id]: { ...prev[day.id], [key]: value } };
                                  db.from("itinerary_days").update({ section_notes: updated[day.id] }).eq("id", day.id).then(() => {});
                                  return updated;
                                });
                              }}
                            />
                          </div>
                        ))}
                      </div>
                    </SortableDayCard>
                  ))}
                </div>
              </SortableContext>
            </DndContext>
            {addDayButton}
          </>
        )}
      </section>
    );
  }

  // ── Structured (default) ──────────────────────────────────────
  return (
    <section className="mb-8">
      {sectionHeader}
      {!sectionCollapsed && (
      <>
      {aiPanel}
      {days.length === 0 && (
        <div className="rounded-xl border-2 border-dashed border-gray-200 py-10 text-center text-sm text-gray-400 mb-3">
          No days yet — add your first day below.
        </div>
      )}
      <DndContext id="itinerary-structured-dnd" sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd} autoScroll={false}>
        <SortableContext items={days.map((d) => d.id)} strategy={verticalListSortingStrategy}>
      <div className="space-y-4 mb-3">
        {days.map((day, idx) => (
          <SortableDayCard
            key={day.id}
            day={day}
            idx={idx}
            isCollapsed={collapsedDays.has(day.id)}
            onToggleCollapse={() => toggleDayCollapsed(day.id)}
            onDelete={() => handleDeleteDay(day.id)}
            travelBadge={getTravelBadge(day, flightsByDate, transportByDate)}
          >
            <TravelEventList day={day} flightsByDate={flightsByDate} transportByDate={transportByDate} clockFormat={clockFormat} />
            <AccommodationEventList day={day} checkInByDate={accomCheckInByDate} checkOutByDate={accomCheckOutByDate} />
            {day.activities.length > 0 && (
              <ul className="space-y-2 mb-3">
                {day.activities.map((act) =>
                  editingActivity === act.id ? (
                    <EditActivityInline
                      key={act.id}
                      activity={act}
                      currentDayId={day.id}
                      availableDays={days.map((d) => ({ id: d.id, day_number: d.day_number, date: d.date }))}
                      onUpdated={(updated) => {
                        if (updated.day_id === day.id) {
                          // Same day — update in place
                          setDays((prev) => prev.map((d) =>
                            d.id === day.id
                              ? { ...d, activities: sortActivities(d.activities.map((a) => a.id === act.id ? updated : a)) }
                              : d
                          ));
                        } else {
                          // Moved to a different day — remove from source, add to target
                          setDays((prev) => prev.map((d) => {
                            if (d.id === day.id) return { ...d, activities: d.activities.filter((a) => a.id !== act.id) };
                            if (d.id === updated.day_id) return { ...d, activities: sortActivities([...d.activities, updated]) };
                            return d;
                          }));
                        }
                        setEditingActivity(null);
                      }}
                      onCancel={() => setEditingActivity(null)}
                    />
                  ) : (
                    <li key={act.id} className="flex items-start gap-3 text-sm">
                      <span className="mt-0.5 w-16 shrink-0 whitespace-nowrap font-mono text-xs text-gray-400 dark:text-[#9fb8b8]">{formatActivityTime(act.time, clockFormat)}</span>
                      <button
                        onClick={() => { setEditingActivity(act.id); setAddingActivity(null); }}
                        className="flex-1 min-w-0 text-left hover:opacity-70 transition-opacity"
                        title="Edit activity"
                      >
                        <p className="font-medium text-gray-800 dark:text-[#efefef]">{act.title}</p>
                        {act.place_name && <p className="text-xs text-gray-400 dark:text-[#9fb8b8]">{act.place_name}</p>}
                      </button>
                      <button
                        onClick={() => handleDeleteActivity(act.id, day.id)}
                        className="mt-0.5 shrink-0 text-gray-300 hover:text-red-400 transition-colors"
                        title="Delete activity"
                      >
                        <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </li>
                  )
                )}
              </ul>
            )}
            {day.activities.length === 0 && addingActivity !== day.id && (
              <p className="mb-2 text-xs text-gray-400 dark:text-[#9fb8b8]">No activities yet.</p>
            )}
            {addingActivity === day.id ? (
              <AddActivityForm
                dayId={day.id}
                orderIndex={day.activities.length}
                onAdded={(newAct) => {
                  setDays((prev) => prev.map((d) =>
                    d.id === day.id ? { ...d, activities: sortActivities([...d.activities, newAct]) } : d
                  ));
                  setAddingActivity(null);
                }}
                onCancel={() => setAddingActivity(null)}
              />
            ) : (
              <div className="flex items-center justify-between gap-3">
                <button onClick={() => { setAddingActivity(day.id); setEditingActivity(null); setMovingAllFromDay(null); }} className="text-xs text-gray-400 dark:text-[#9fb8b8] hover:text-[#9fb8b8] transition-colors">
                  + Add activity
                </button>
                {day.activities.length > 0 && days.length > 1 && (
                  movingAllFromDay === day.id ? (
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs text-gray-400 dark:text-[#9fb8b8] shrink-0">Move all to</span>
                      <select
                        className="input text-xs py-0.5 px-2 h-auto"
                        defaultValue=""
                        autoFocus
                        onChange={(e) => {
                          if (e.target.value) handleMoveAllActivities(day.id, e.target.value);
                        }}
                      >
                        <option value="" disabled>Day…</option>
                        {days.filter((d) => d.id !== day.id).map((d) => (
                          <option key={d.id} value={d.id}>
                            Day {d.day_number}{d.date ? ` · ${formatDayDate(d.date)}` : ""}
                          </option>
                        ))}
                      </select>
                      <button
                        onClick={() => setMovingAllFromDay(null)}
                        className="text-xs text-gray-400 hover:text-gray-600 dark:hover:text-[#efefef] transition-colors"
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => { setMovingAllFromDay(day.id); setAddingActivity(null); setEditingActivity(null); }}
                      className="text-xs text-gray-400 dark:text-[#9fb8b8] hover:text-[#9fb8b8] transition-colors"
                    >
                      Move all →
                    </button>
                  )
                )}
              </div>
            )}
          </SortableDayCard>
        ))}
      </div>
        </SortableContext>
      </DndContext>
      {addDayButton}
      </>
      )}
    </section>
  );
}

export default memo(ItinerarySection);
