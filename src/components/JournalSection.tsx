"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Mood } from "@/types/database";

const MOOD_EMOJI: Record<Mood, string> = {
  amazing: "🤩",
  good:    "😊",
  okay:    "😐",
  tough:   "😔",
  terrible:"😞",
};

const MOODS: Mood[] = ["amazing", "good", "okay", "tough", "terrible"];

type Entry = {
  id: string;
  day_number: number | null;
  content: string;
  mood: string | null;
  photos: string[];
  created_at: string;
};

interface JournalSectionProps {
  tripId: string;
  initialEntries: Entry[];
}

export default function JournalSection({ tripId, initialEntries }: JournalSectionProps) {
  const supabase = createClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabase as any;

  const [entries, setEntries] = useState<Entry[]>(initialEntries);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [content, setContent] = useState("");
  const [mood, setMood] = useState<Mood | "">("");
  const [dayNumber, setDayNumber] = useState("");
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  function openNew() {
    setEditingId(null);
    setContent("");
    setMood("");
    setDayNumber("");
    setShowForm(true);
  }

  function openEdit(entry: Entry) {
    setEditingId(entry.id);
    setContent(entry.content);
    setMood((entry.mood as Mood) ?? "");
    setDayNumber(entry.day_number != null ? String(entry.day_number) : "");
    setShowForm(true);
  }

  function cancelForm() {
    setShowForm(false);
    setEditingId(null);
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!content.trim()) return;
    setSaving(true);

    const payload = {
      trip_id: tripId,
      content: content.trim(),
      mood: mood || null,
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
        setEntries((prev) => prev.map((e) => e.id === editingId ? { ...e, ...data } : e));
      }
    } else {
      const { data, error } = await db
        .from("journal_entries")
        .insert({ ...payload, photos: [] })
        .select()
        .single();

      if (!error && data) {
        setEntries((prev) => [data, ...prev]);
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
        <h2 className="text-lg font-semibold text-gray-900">Journal</h2>
        {!showForm && (
          <button onClick={openNew} className="flex items-center gap-1 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-600 hover:border-sky-300 hover:text-sky-600 transition-colors">
            + New entry
          </button>
        )}
      </div>

      {/* Entry form */}
      {showForm && (
        <form onSubmit={handleSave} className="mb-4 rounded-xl border border-sky-100 bg-sky-50/50 p-4 space-y-3">
          <p className="text-sm font-semibold text-gray-700">{editingId ? "Edit entry" : "New journal entry"}</p>

          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            rows={5}
            placeholder="Write about your day…"
            className="input w-full resize-none text-sm"
            autoFocus
            required
          />

          <div className="flex flex-wrap gap-4">
            <div>
              <label className="label">Mood</label>
              <div className="flex gap-1 mt-1">
                {MOODS.map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setMood(mood === m ? "" : m)}
                    title={m}
                    className={`text-xl rounded-lg p-1 transition-colors ${mood === m ? "bg-sky-100 ring-2 ring-sky-400" : "hover:bg-gray-100"}`}
                  >
                    {MOOD_EMOJI[m]}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="label">Day number</label>
              <input
                type="number"
                min="1"
                value={dayNumber}
                onChange={(e) => setDayNumber(e.target.value)}
                placeholder="e.g. 3"
                className="input w-24 mt-1"
              />
            </div>
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
        <div className="rounded-xl border-2 border-dashed border-gray-200 py-12 text-center text-sm text-gray-400">
          No journal entries yet.
        </div>
      ) : (
        <div className="space-y-4">
          {entries.map((entry) => (
            <div key={entry.id} className="card p-5">
              <div className="mb-3 flex items-start justify-between gap-2">
                <span className="text-xs text-gray-400">
                  {entry.day_number ? `Day ${entry.day_number} · ` : ""}
                  {new Date(entry.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                </span>
                <div className="flex items-center gap-2 shrink-0">
                  {entry.mood && (
                    <span className="text-lg" title={entry.mood}>
                      {MOOD_EMOJI[entry.mood as Mood]}
                    </span>
                  )}
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
              <p className="text-sm text-gray-700 whitespace-pre-wrap">{entry.content}</p>
              {entry.photos.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {entry.photos.map((url, i) => (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img key={i} src={url} alt={`Photo ${i + 1}`} className="h-20 w-20 rounded-lg object-cover" />
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
