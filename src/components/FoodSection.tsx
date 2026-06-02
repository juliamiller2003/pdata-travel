"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { FoodItem } from "@/types/database";

interface Props {
  tripId: string;
  initialItems: FoodItem[];
}

export default function FoodSection({ tripId, initialItems }: Props) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = createClient() as any;

  const [items, setItems] = useState<FoodItem[]>(initialItems);
  const [collapsed, setCollapsed] = useState(false);
  const [adding, setAdding] = useState(false);
  const [newName, setNewName] = useState("");
  const [newNotes, setNewNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editNotes, setEditNotes] = useState("");

  const tried = items.filter((i) => i.tried).length;

  async function handleAdd() {
    if (!newName.trim()) return;
    setSaving(true);
    const { data, error } = await db
      .from("food_items")
      .insert({ trip_id: tripId, name: newName.trim(), notes: newNotes.trim() || null })
      .select()
      .single();
    setSaving(false);
    if (!error && data) {
      setItems((prev) => [...prev, data]);
      setNewName("");
      setNewNotes("");
      setAdding(false);
    }
  }

  async function handleToggleTried(item: FoodItem) {
    const updated = !item.tried;
    await db.from("food_items").update({ tried: updated }).eq("id", item.id);
    setItems((prev) => prev.map((i) => i.id === item.id ? { ...i, tried: updated } : i));
  }

  async function handleDelete(id: string) {
    await db.from("food_items").delete().eq("id", id);
    setItems((prev) => prev.filter((i) => i.id !== id));
  }

  async function handleSaveEdit(id: string) {
    if (!editName.trim()) return;
    await db.from("food_items").update({ name: editName.trim(), notes: editNotes.trim() || null }).eq("id", id);
    setItems((prev) => prev.map((i) => i.id === id ? { ...i, name: editName.trim(), notes: editNotes.trim() || null } : i));
    setEditingId(null);
  }

  function startEdit(item: FoodItem) {
    setEditingId(item.id);
    setEditName(item.name);
    setEditNotes(item.notes ?? "");
    setAdding(false);
  }

  return (
    <section className="card p-5 mb-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <h2 className="text-base font-semibold text-gray-900 dark:text-[#efefef]">Food to Try</h2>
          {items.length > 0 && (
            <span className="text-xs text-gray-400 dark:text-[#9fb8b8]">
              {tried}/{items.length} tried
            </span>
          )}
        </div>
        <button
          onClick={() => setCollapsed((c) => !c)}
          className="text-gray-400 hover:text-gray-600 dark:hover:text-[#efefef] transition-colors"
          aria-label={collapsed ? "Expand" : "Collapse"}
        >
          <svg className={`h-4 w-4 transition-transform ${collapsed ? "-rotate-90" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        </button>
      </div>

      {!collapsed && (
        <>
          {/* Progress bar */}
          {items.length > 0 && (
            <div className="mb-4">
              <div className="h-1.5 w-full rounded-full bg-gray-100 dark:bg-[#2e2e2e]">
                <div
                  className="h-1.5 rounded-full bg-[#9fb8b8] transition-all duration-300"
                  style={{ width: `${Math.round((tried / items.length) * 100)}%` }}
                />
              </div>
            </div>
          )}

          {/* List */}
          {items.length === 0 && !adding && (
            <p className="text-sm text-gray-400 dark:text-[#9fb8b8] mb-3">
              No food items yet — add dishes, drinks, or restaurants you want to try.
            </p>
          )}

          {items.length > 0 && (
            <ul className="space-y-1.5 mb-3">
              {items.map((item) =>
                editingId === item.id ? (
                  <li key={item.id} className="rounded-lg border border-sky-100 dark:border-[#2e2e2e] bg-sky-50/50 dark:bg-transparent p-3 space-y-2">
                    <input
                      type="text"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      className="input w-full text-sm"
                      placeholder="Dish or restaurant *"
                      autoFocus
                      onKeyDown={(e) => { if (e.key === "Enter") handleSaveEdit(item.id); if (e.key === "Escape") setEditingId(null); }}
                    />
                    <input
                      type="text"
                      value={editNotes}
                      onChange={(e) => setEditNotes(e.target.value)}
                      className="input w-full text-sm"
                      placeholder="Notes (optional)"
                      onKeyDown={(e) => { if (e.key === "Enter") handleSaveEdit(item.id); if (e.key === "Escape") setEditingId(null); }}
                    />
                    <div className="flex gap-2">
                      <button onClick={() => handleSaveEdit(item.id)} disabled={!editName.trim()} className="btn-primary px-3 py-1 text-sm">Save</button>
                      <button onClick={() => setEditingId(null)} className="btn-secondary px-3 py-1 text-sm">Cancel</button>
                    </div>
                  </li>
                ) : (
                  <li key={item.id} className="flex items-start gap-3 text-sm group">
                    <button
                      onClick={() => handleToggleTried(item)}
                      className={`mt-0.5 h-4 w-4 shrink-0 rounded-full border-2 transition-colors ${
                        item.tried
                          ? "border-[#9fb8b8] bg-[#9fb8b8]"
                          : "border-gray-300 dark:border-[#555] hover:border-[#9fb8b8]"
                      }`}
                      title={item.tried ? "Mark as not tried" : "Mark as tried"}
                    >
                      {item.tried && (
                        <svg className="h-2.5 w-2.5 mx-auto mt-0.5 text-white" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth={2.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M2 6l3 3 5-5" />
                        </svg>
                      )}
                    </button>
                    <button
                      onClick={() => startEdit(item)}
                      className={`flex-1 min-w-0 text-left transition-opacity hover:opacity-70 ${item.tried ? "opacity-50" : ""}`}
                    >
                      <p className={`font-medium text-gray-800 dark:text-[#efefef] ${item.tried ? "line-through" : ""}`}>{item.name}</p>
                      {item.notes && <p className="text-xs text-gray-400 dark:text-[#9fb8b8]">{item.notes}</p>}
                    </button>
                    <button
                      onClick={() => handleDelete(item.id)}
                      className="mt-0.5 shrink-0 text-gray-200 dark:text-[#444] hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100"
                      title="Delete"
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

          {/* Add form */}
          {adding ? (
            <div className="space-y-2 rounded-lg border border-sky-100 dark:border-[#2e2e2e] bg-sky-50/50 dark:bg-transparent p-3">
              <input
                type="text"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                className="input w-full text-sm"
                placeholder="Dish or restaurant *"
                autoFocus
                onKeyDown={(e) => { if (e.key === "Enter") handleAdd(); if (e.key === "Escape") setAdding(false); }}
              />
              <input
                type="text"
                value={newNotes}
                onChange={(e) => setNewNotes(e.target.value)}
                className="input w-full text-sm"
                placeholder="Notes (optional) — where to find it, what to order…"
                onKeyDown={(e) => { if (e.key === "Enter") handleAdd(); if (e.key === "Escape") setAdding(false); }}
              />
              <div className="flex gap-2">
                <button onClick={handleAdd} disabled={saving || !newName.trim()} className="btn-primary px-3 py-1 text-sm">
                  {saving ? "Saving…" : "Add"}
                </button>
                <button onClick={() => { setAdding(false); setNewName(""); setNewNotes(""); }} className="btn-secondary px-3 py-1 text-sm">
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => { setAdding(true); setEditingId(null); }}
              className="text-xs text-gray-400 dark:text-[#9fb8b8] hover:text-[#9fb8b8] transition-colors"
            >
              + Add food
            </button>
          )}
        </>
      )}
    </section>
  );
}
