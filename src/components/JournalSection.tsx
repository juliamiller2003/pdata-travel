"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SupabaseClient = any;

type Entry = {
  id: string;
  day_number: number | null;
  content: string;
  mood: string | null;
  photos: string[];
  created_at: string;
};

type DayOption = {
  id: string;
  day_number: number;
  date: string | null;
};

interface JournalSectionProps {
  tripId: string;
  initialEntries: Entry[];
  initialDays?: DayOption[];
  onProfileUpdated?: (profile: string) => void;
  userId?: string;
}

function formatDayDate(date: string | null) {
  if (!date) return null;
  return new Date(date + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export default function JournalSection({ tripId, initialEntries, initialDays = [], onProfileUpdated, userId }: JournalSectionProps) {
  const supabase = createClient();
  const db = supabase as SupabaseClient;

  const [entries, setEntries] = useState<Entry[]>(initialEntries);

  useEffect(() => {
    try { localStorage.setItem(`pathway-journal-${tripId}`, JSON.stringify(entries)); } catch {}
  }, [entries, tripId]);

  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [content, setContent] = useState("");
  const [dayNumber, setDayNumber] = useState("");
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  function openNew() {
    setEditingId(null);
    setContent("");
    setDayNumber("");
    setShowForm(true);
  }

  function openEdit(entry: Entry) {
    setEditingId(entry.id);
    setContent(entry.content);
    setDayNumber(entry.day_number != null ? String(entry.day_number) : "");
    setShowForm(true);
  }

  function cancelForm() {
    setShowForm(false);
    setEditingId(null);
  }

  // Run journal insight extraction in background after save
  async function extractInsights(allEntries: Entry[]) {
    try {
      const res = await fetch("/api/extract-journal-insights", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ entries: allEntries.slice(0, 10) }),
      });
      const data = await res.json();
      if (data.profile) {
        if (onProfileUpdated) {
          onProfileUpdated(data.profile);
        }
        if (userId) {
          const dbClient = createClient() as SupabaseClient;
          await dbClient.from("user_settings").upsert({
            user_id: userId,
            journal_profile: data.profile,
          });
        }
      }
    } catch {}
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!content.trim()) return;
    setSaving(true);

    const payload = {
      trip_id: tripId,
      content: content.trim(),
      mood: null,
      day_number: dayNumber ? parseInt(dayNumber, 10) : null,
    };

    if (editingId) {
      const { data, error } = await db
        .from("journal_entries")
        .update(payload)
        .eq("id", editingId)
        .select()
        .single();

      if (!error && data) {
        const updatedEntries = entries.map((e) => e.id === editingId ? { ...e, ...data } : e);
        setEntries(updatedEntries);
        // Fire-and-forget insight extraction
        extractInsights(updatedEntries);
      }
    } else {
      const { data, error } = await db
        .from("journal_entries")
        .insert({ ...payload, photos: [] })
        .select()
        .single();

      if (!error && data) {
        const newEntries = [data, ...entries];
        setEntries(newEntries);
        // Fire-and-forget insight extraction
        extractInsights(newEntries);
      }
    }

    setSaving(false);
    setShowForm(false);
    setEditingId(null);
  }

  async function handleDelete(id: string) {
    setDeletingId(id);
    await db.from("journal_entries").delete().eq("id", id);
    setEntries((prev) => prev.filter((e) => e.id !== id));
    setDeletingId(null);
  }

  return (
    <div className="mt-6">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-[#efefef]">Journal</h2>
        {!showForm && (
          <button onClick={openNew} className="flex items-center gap-1 rounded-lg border border-gray-200 dark:border-[#2e2e2e] bg-white dark:bg-transparent px-3 py-1.5 text-xs font-medium text-gray-600 dark:text-[#9fb8b8] hover:border-[#9fb8b8] hover:text-[#9fb8b8] transition-colors">
            + New entry
          </button>
        )}
      </div>

      {/* Entry form */}
      {showForm && (
        <form onSubmit={handleSave} className="mb-4 rounded-xl border border-sky-100 dark:border-[#2e2e2e] bg-sky-50/50 dark:bg-transparent p-4 space-y-3">
          <p className="text-sm font-semibold text-gray-700 dark:text-[#efefef]">{editingId ? "Edit entry" : "New journal entry"}</p>

          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            rows={5}
            placeholder="Write about your day…"
            className="input w-full resize-none text-sm"
            autoFocus
            required
          />

          <div>
            <label className="label">Trip day</label>
            {initialDays.length > 0 ? (
              <select
                value={dayNumber}
                onChange={(e) => setDayNumber(e.target.value)}
                className="input"
              >
                <option value="">No specific day</option>
                {initialDays.map((d) => (
                  <option key={d.id} value={String(d.day_number)}>
                    Day {d.day_number}{d.date ? ` · ${formatDayDate(d.date)}` : ""}
                  </option>
                ))}
              </select>
            ) : (
              <input
                type="number"
                min="1"
                value={dayNumber}
                onChange={(e) => setDayNumber(e.target.value)}
                placeholder="e.g. 3"
                className="input w-24"
              />
            )}
          </div>

          <div className="flex gap-2">
            <button type="submit" disabled={saving || !content.trim()} className="btn-primary flex-1">
              {saving ? "Saving…" : editingId ? "Save changes" : "Add entry"}
            </button>
            <button type="button" onClick={cancelForm} className="btn-secondary">Cancel</button>
          </div>
        </form>
      )}

      {/* Entries list */}
      {entries.length === 0 && !showForm ? (
        <div className="rounded-xl border-2 border-dashed border-gray-200 dark:border-[#2e2e2e] py-12 text-center text-sm text-gray-400 dark:text-[#9fb8b8]">
          No journal entries yet.
        </div>
      ) : (
        <div className="space-y-4">
          {entries.map((entry) => (
            <div key={entry.id} className="card p-5">
              <div className="mb-3 flex items-start justify-between gap-2">
                <span className="text-xs text-gray-400 dark:text-[#9fb8b8]">
                  {entry.day_number ? `Day ${entry.day_number} · ` : ""}
                  <span suppressHydrationWarning>{new Date(entry.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</span>
                </span>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => openEdit(entry)}
                    className="text-gray-300 hover:text-sky-500 transition-colors"
                    title="Edit entry"
                  >
                    <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931z" />
                    </svg>
                  </button>
                  <button
                    onClick={() => handleDelete(entry.id)}
                    disabled={deletingId === entry.id}
                    className="text-gray-300 hover:text-red-400 transition-colors"
                    title="Delete entry"
                  >
                    <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>
              <p className="text-sm text-gray-700 dark:text-[#efefef] whitespace-pre-wrap">{entry.content}</p>
              {entry.photos.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {entry.photos.map((url, i) => (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img key={i} src={url} alt={`Photo ${i + 1}`} className="h-20 w-20 rounded-lg object-cover" style={{ filter: "brightness(0.6) contrast(1.15) saturate(1.05)" }} />
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
