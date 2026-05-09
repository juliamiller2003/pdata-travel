"use client";

import { useState, useEffect, useCallback, memo } from "react";
import { createClient } from "@/lib/supabase/client";
import type { ItineraryStyle, Flight, TransportLeg } from "@/types/database";
import { getClockFormat, formatActivityTime, type ClockFormat } from "@/lib/timeFormat";
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
  flights?: Flight[];
  transportLegs?: TransportLeg[];
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
  return new Date(date + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" });
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
  if (iso.includes("T")) {
    try {
      const d = new Date(iso);
      return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
    } catch {
      return iso.slice(11, 16);
    }
  }
  return iso.slice(0, 5);
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
}

function DayHeader({ day, displayNum, isCollapsed, onToggleCollapse, onDelete, dragHandleProps }: DayHeaderProps) {
  return (
    <div className={`flex items-center justify-between ${isCollapsed ? "" : "mb-3"}`}>
      <div className="flex items-center gap-2 min-w-0">
        {dragHandleProps && (
          <button
            {...(dragHandleProps as React.ButtonHTMLAttributes<HTMLButtonElement>)}
            tabIndex={-1}
            className="cursor-grab active:cursor-grabbing touch-none text-gray-300 hover:text-gray-400 transition-colors shrink-0"
            title="Drag to reorder"
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
}

function SortableDayCard({ day, idx, isCollapsed, onToggleCollapse, onDelete, children }: SortableDayCardProps) {
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
  onUpdated: (activity: ActivityRow) => void;
  onCancel: () => void;
}

function EditActivityInline({ activity, onUpdated, onCancel }: EditActivityInlineProps) {
  const [time, setTime] = useState(activity.time?.slice(0, 5) ?? "");
  const [title, setTitle] = useState(activity.title);
  const [place, setPlace] = useState(activity.place_name ?? "");
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    if (!title.trim()) return;
    setSaving(true);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const db = createClient() as any;
    const { data, error } = await db
      .from("activities")
      .update({ time: time || null, title: title.trim(), place_name: place.trim() || null })
      .eq("id", activity.id)
      .select().single();
    setSaving(false);
    if (!error && data) onUpdated(data);
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
}: ItinerarySectionProps) {
  const supabase = createClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabase as any;

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

    // DEBUG: intercept scroll APIs so DevTools shows who is calling them.
    // Open DevTools → Console, run `npm run dev` locally, type in a textarea,
    // and look for [FOCUS] / [SCROLL] / [window.scrollTo] / [scrollIntoView].
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const origScrollTo = (window as any).scrollTo.bind(window);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (window as any).scrollTo = function (...args: unknown[]) {
      // eslint-disable-next-line no-console
      console.trace('[window.scrollTo]', args);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      origScrollTo(...(args as any[]));
    };
    const origScrollIntoView = Element.prototype.scrollIntoView;
    Element.prototype.scrollIntoView = function (this: Element, ...args: unknown[]) {
      // eslint-disable-next-line no-console
      console.trace('[scrollIntoView]', this.tagName, (this as HTMLElement).id || (this as HTMLElement).className?.split(' ')[0]);
      return origScrollIntoView.apply(this, args as Parameters<typeof origScrollIntoView>);
    };
    const onFocusLog = (e: FocusEvent) => {
      const el = e.target as HTMLElement;
      // eslint-disable-next-line no-console
      console.log('[FOCUS]', el.tagName, `"${el.getAttribute('placeholder') || el.id || ''}"`, '| scrollY:', Math.round(window.scrollY));
    };
    let lastY = window.scrollY;
    const onScrollLog = () => {
      const y = window.scrollY;
      if (y !== lastY) {
        // eslint-disable-next-line no-console
        console.log(`[SCROLL] ${Math.round(lastY)} → ${Math.round(y)}`);
        lastY = y;
      }
    };
    document.addEventListener('focus', onFocusLog, true);
    window.addEventListener('scroll', onScrollLog, { passive: true });

    return () => {
      document.removeEventListener('focus', onFocusTa,  true);
      document.removeEventListener('blur',  onBlurTa,   true);
      window.removeEventListener('scroll', onScrollLock);
      document.removeEventListener('focus', onFocusLog, true);
      window.removeEventListener('scroll', onScrollLog);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (window as any).scrollTo = origScrollTo;
      Element.prototype.scrollIntoView = origScrollIntoView;
    };
  }, []);

  useEffect(() => {
    try { localStorage.setItem(`pathway-itinerary-${tripId}`, JSON.stringify(days)); } catch {}
  }, [days, tripId]);

  // Structured mode — which day/activity form is open (not the form values themselves;
  // those live in AddActivityForm / EditActivityInline to avoid parent re-renders)
  const [addingActivity, setAddingActivity] = useState<string | null>(null);
  const [editingActivity, setEditingActivity] = useState<string | null>(null);

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

  // Collapse state
  const [collapsedDays, setCollapsedDays] = useState<Set<string>>(new Set());
  const [sectionCollapsed, setSectionCollapsed] = useState(false);

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
  const [generationScope, setGenerationScope] = useState<"1" | "3" | "full">("full");
  const knownDays = computeDuration(tripStartDate, tripEndDate);
  const [numDaysInput, setNumDaysInput] = useState(String(knownDays ?? 3));
  const [generating, setGenerating] = useState(false);
  const [applying, setApplying] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [structuredSuggestion, setStructuredSuggestion] = useState<SuggestedDay[] | null>(null);
  const [notesSuggestion, setNotesSuggestion] = useState<string | null>(null);
  const [dayNotesSuggestion, setDayNotesSuggestion] = useState<SuggestedDayNotes[] | null>(null);
  const [rejectedActivities, setRejectedActivities] = useState<string[]>([]);

  function dateForDayNum(dayNum: number) {
    if (!tripStartDate) return null;
    const [y, m, d] = tripStartDate.split("-").map(Number);
    return new Date(Date.UTC(y, m - 1, d + dayNum - 1)).toISOString().split("T")[0];
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

  const handleDeleteDay = useCallback(async (dayId: string) => {
    await db.from("itinerary_days").delete().eq("id", dayId);
    setDays((prev) => prev.filter((d) => d.id !== dayId));
    setDayNotes((prev) => { const n = { ...prev }; delete n[dayId]; return n; });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [db]);

  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    setDays((prev) => {
      const oldIndex = prev.findIndex((d) => d.id === active.id);
      const newIndex = prev.findIndex((d) => d.id === over.id);
      const reordered = arrayMove(prev, oldIndex, newIndex);
      reordered.forEach((day, idx) => {
        const newDayNum = idx + 1;
        const newDate = dateForDayNum(newDayNum);
        db.from("itinerary_days")
          .update({ day_number: newDayNum, date: newDate })
          .eq("id", day.id)
          .then(() => {});
      });
      return reordered.map((day, idx) => ({
        ...day,
        day_number: idx + 1,
        date: dateForDayNum(idx + 1),
      }));
    });
  }

  // ── Activity CRUD ─────────────────────────────────────────────

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

  // ── AI generation ─────────────────────────────────────────────

  async function handleGenerate(additionalRejected: string[] = []) {
    setGenerating(true);
    setAiError(null);
    setStructuredSuggestion(null);
    setNotesSuggestion(null);
    setDayNotesSuggestion(null);

    const num_days =
      generationScope === "1" ? 1 :
      generationScope === "3" ? 3 :
      (knownDays ?? parseInt(numDaysInput, 10));

    try {
      const res = await fetch("/api/suggest-itinerary", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          destination,
          num_days,
          style,
          preferences: preferences ?? "",
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
        }),
      });

      const data = await res.json();

      if (!res.ok || data.error) {
        setAiError(data.error ?? "Something went wrong. Try again.");
        return;
      }

      if (style === "structured") {
        setStructuredSuggestion(data.days ?? []);
      } else if (style === "notes") {
        setNotesSuggestion(data.content ?? "");
      } else {
        setDayNotesSuggestion(data.days ?? []);
      }
    } catch {
      setAiError("Something went wrong. Try again.");
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
        const { data: actData } = await db
          .from("activities")
          .insert({ day_id: dayData.id, time: act.time || null, title: act.title, place_name: act.place_name || null, order_index: i })
          .select().single();
        if (actData) activities.push(actData);
      }
      newDays.push({ ...dayData, activities: sortActivities(activities), section_notes: {} });
    }

    setDays((prev) => [...prev, ...newDays]);
    setStructuredSuggestion(null);
    setRejectedActivities([]);
    setShowAI(false);
    setApplying(false);
  }

  async function handleApplyNotes() {
    if (notesSuggestion === null) return;
    setTripNotes(notesSuggestion);
    await db.from("trips").update({ itinerary_notes: notesSuggestion }).eq("id", tripId);
    setNotesSuggestion(null);
    setRejectedActivities([]);
    setShowAI(false);
    setNotesRefreshKey((k) => k + 1);
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
  }

  // ── Shared UI pieces ──────────────────────────────────────────

  const addDayButton = (
    <button
      onClick={handleAddDay}
      className="w-full rounded-xl border-2 border-dashed border-gray-200 dark:border-[#2e2e2e] py-3 text-sm font-medium text-gray-400 dark:text-[#9fb8b8] hover:border-[#9fb8b8] hover:text-[#9fb8b8] transition-colors"
    >
      + Add day
    </button>
  );

  // ── AI panel ──────────────────────────────────────────────────

  const aiPanel = showAI && (
    <div className="mb-4 rounded-xl border border-sky-100 dark:border-[#2e2e2e] bg-sky-50/60 dark:bg-transparent p-4 space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold text-gray-700 dark:text-[#efefef]">AI itinerary suggestions</p>
        <button onClick={() => { setShowAI(false); setStructuredSuggestion(null); setNotesSuggestion(null); setDayNotesSuggestion(null); setAiError(null); setRejectedActivities([]); }} className="text-gray-400 hover:text-gray-600">
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
      </div>

      {aiError && <p className="text-sm text-red-600">{aiError}</p>}

      {!structuredSuggestion && !notesSuggestion && !dayNotesSuggestion && (
        <button onClick={() => handleGenerate()} disabled={generating} className="btn-primary w-full">
          {generating ? (
            <span className="flex items-center justify-center gap-2">
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
              Writing your itinerary…
            </span>
          ) : "Generate suggestions"}
        </button>
      )}

      {/* Structured suggestions preview */}
      {structuredSuggestion && (
        <div className="space-y-3">
          <p className="text-xs text-gray-500 dark:text-[#9fb8b8]">{structuredSuggestion.length} days generated — review below, then add to your itinerary.</p>
          <div className="max-h-72 overflow-y-auto space-y-2 pr-1">
            {structuredSuggestion.map((day) => (
              <div key={day.day_number} className="rounded-lg bg-white dark:bg-transparent border border-gray-100 dark:border-[#2e2e2e] p-3">
                <p className="text-xs font-semibold text-gray-600 dark:text-[#9fb8b8] mb-1.5">Day {day.day_number}</p>
                <ul className="space-y-1">
                  {day.activities.map((act, i) => (
                    <li key={i} className="flex gap-2 text-xs text-gray-600 dark:text-[#9fb8b8]">
                      <span className="shrink-0 w-16 whitespace-nowrap font-mono text-gray-400 dark:text-[#9fb8b8]">{formatActivityTime(act.time, clockFormat)}</span>
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
        onClick={() => { setShowAI((v) => !v); setStructuredSuggestion(null); setNotesSuggestion(null); setDayNotesSuggestion(null); setAiError(null); setRejectedActivities([]); }}
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
                    >
                      <ActivityList day={day} clockFormat={clockFormat} />
                      <TravelEventList day={day} flightsByDate={flightsByDate} transportByDate={transportByDate} clockFormat={clockFormat} />
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
                    >
                      <ActivityList day={day} clockFormat={clockFormat} />
                      <TravelEventList day={day} flightsByDate={flightsByDate} transportByDate={transportByDate} clockFormat={clockFormat} />
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
          >
            <TravelEventList day={day} flightsByDate={flightsByDate} transportByDate={transportByDate} clockFormat={clockFormat} />
            {day.activities.length > 0 && (
              <ul className="space-y-2 mb-3">
                {day.activities.map((act) =>
                  editingActivity === act.id ? (
                    <EditActivityInline
                      key={act.id}
                      activity={act}
                      onUpdated={(updated) => {
                        setDays((prev) => prev.map((d) =>
                          d.id === day.id
                            ? { ...d, activities: sortActivities(d.activities.map((a) => a.id === act.id ? updated : a)) }
                            : d
                        ));
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
              <button onClick={() => { setAddingActivity(day.id); setEditingActivity(null); }} className="text-xs text-gray-400 dark:text-[#9fb8b8] hover:text-[#9fb8b8] transition-colors">
                + Add activity
              </button>
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
