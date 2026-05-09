"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

type TemplateItem = { name: string; category: string };
type CustomTemplate = { id: string; name: string; items: TemplateItem[] };

const CATEGORIES = [
  "Documents", "Clothing", "Toiletries", "Electronics",
  "Health", "Sleep & Hostel", "Money", "Other",
];

export default function PackingTemplatesPage() {
  const router = useRouter();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = createClient() as any;

  const [loading, setLoading] = useState(true);
  const [templates, setTemplates] = useState<CustomTemplate[]>([]);

  // Template editor state
  const [editing, setEditing] = useState<CustomTemplate | null>(null); // null = create new
  const [showEditor, setShowEditor] = useState(false);
  const [tplName, setTplName] = useState("");
  const [tplItems, setTplItems] = useState<TemplateItem[]>([]);
  const [newItemName, setNewItemName] = useState("");
  const [newItemCat, setNewItemCat] = useState("Other");
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  // Inline item editing state
  const [editingItemIdx, setEditingItemIdx] = useState<number | null>(null);
  const [editingItemName, setEditingItemName] = useState("");
  const [editingItemCat, setEditingItemCat] = useState("Other");

  useEffect(() => {
    async function load() {
      const { data: { user } } = await db.auth.getUser();
      if (!user) { router.push("/login"); return; }

      const { data } = await db
        .from("packing_templates")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at");

      setTemplates(
        (data ?? []).map((t: { id: string; name: string; items: TemplateItem[] }) => ({
          id: t.id,
          name: t.name,
          items: t.items ?? [],
        }))
      );
      setLoading(false);
    }
    load();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function openCreate() {
    setEditing(null);
    setTplName("");
    setTplItems([]);
    setNewItemName("");
    setNewItemCat("Other");
    setEditingItemIdx(null);
    setSaveError(null);
    setShowEditor(true);
  }

  function openEdit(tpl: CustomTemplate) {
    setEditing(tpl);
    setTplName(tpl.name);
    setTplItems([...tpl.items]);
    setNewItemName("");
    setNewItemCat("Other");
    setEditingItemIdx(null);
    setSaveError(null);
    setShowEditor(true);
  }

  function cancelEditor() {
    setShowEditor(false);
    setEditing(null);
    setEditingItemIdx(null);
    setSaveError(null);
  }

  function addItem(e: React.FormEvent) {
    e.preventDefault();
    if (!newItemName.trim()) return;
    setTplItems((prev) => [...prev, { name: newItemName.trim(), category: newItemCat }]);
    setNewItemName("");
  }

  function removeItem(idx: number) {
    setTplItems((prev) => prev.filter((_, i) => i !== idx));
    if (editingItemIdx === idx) setEditingItemIdx(null);
  }

  function startEditItem(idx: number) {
    setEditingItemIdx(idx);
    setEditingItemName(tplItems[idx].name);
    setEditingItemCat(tplItems[idx].category);
  }

  function commitEditItem(idx: number) {
    if (!editingItemName.trim()) return;
    setTplItems((prev) =>
      prev.map((item, i) =>
        i === idx ? { name: editingItemName.trim(), category: editingItemCat } : item
      )
    );
    setEditingItemIdx(null);
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!tplName.trim()) return;
    setSaving(true);
    setSaveError(null);

    try {
      if (editing) {
        const { data, error } = await db
          .from("packing_templates")
          .update({ name: tplName.trim(), items: tplItems })
          .eq("id", editing.id)
          .select()
          .single();
        if (error) throw new Error(error.message || "Update failed");
        setTemplates((prev) =>
          prev.map((t) =>
            t.id === editing.id
              ? { id: t.id, name: data?.name ?? tplName.trim(), items: data?.items ?? tplItems }
              : t
          )
        );
      } else {
        const { data: { user } } = await db.auth.getUser();
        if (!user) throw new Error("Not authenticated");
        const { data, error } = await db
          .from("packing_templates")
          .insert({ user_id: user.id, name: tplName.trim(), items: tplItems })
          .select()
          .single();
        if (error) throw new Error(error.message || "Create failed");
        setTemplates((prev) => [
          ...prev,
          { id: data?.id ?? `temp-${Date.now()}`, name: data?.name ?? tplName.trim(), items: data?.items ?? tplItems },
        ]);
      }
      setShowEditor(false);
      setEditing(null);
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this template?")) return;
    await db.from("packing_templates").delete().eq("id", id);
    setTemplates((prev) => prev.filter((t) => t.id !== id));
  }

  if (loading) {
    return (
      <div className="mx-auto max-w-xl">
        <div className="h-8 w-48 animate-pulse rounded bg-gray-100 mb-6" />
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-16 animate-pulse rounded-xl bg-gray-100" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-xl">
      {/* Breadcrumb */}
      <nav className="mb-6 flex items-center gap-2 text-sm text-gray-500">
        <Link href="/trips" className="hover:text-gray-700">My Trips</Link>
        <span>/</span>
        <span className="text-gray-900 dark:text-[#efefef] font-medium">Packing Templates</span>
      </nav>

      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-[#efefef]">Packing Templates</h1>
          <p className="text-sm text-gray-400 dark:text-[#9fb8b8] mt-0.5">
            Your saved templates are available when starting a packing list on any trip.
          </p>
        </div>
        {!showEditor && (
          <button onClick={openCreate} className="flex items-center gap-1 rounded-lg border border-gray-200 dark:border-[#2e2e2e] bg-white dark:bg-transparent px-3 py-1.5 text-xs font-medium text-gray-600 dark:text-[#9fb8b8] hover:border-[#9fb8b8] hover:text-[#9fb8b8] transition-colors shrink-0">
            + New template
          </button>
        )}
      </div>

      {/* ── Editor ── */}
      {showEditor && (
        <form onSubmit={handleSave} className="mb-6 rounded-xl border border-sky-100 dark:border-[#2e2e2e] bg-sky-50/50 dark:bg-transparent p-4 space-y-4">
          <p className="text-sm font-semibold text-gray-700 dark:text-[#efefef]">
            {editing ? "Edit template" : "New template"}
          </p>

          <div>
            <label className="label">Template name *</label>
            <input
              type="text"
              required
              value={tplName}
              onChange={(e) => setTplName(e.target.value)}
              placeholder="e.g. Beach trip, Business travel…"
              className="input"
            />
          </div>

          {/* Item list */}
          {tplItems.length > 0 && (
            <div className="space-y-1">
              {tplItems.map((item, idx) =>
                editingItemIdx === idx ? (
                  // Inline edit row
                  <div key={idx} className="flex items-center gap-2 rounded-lg border border-sky-200 dark:border-[#9fb8b8] bg-white dark:bg-[#1e1e1e] px-3 py-2">
                    <input
                      type="text"
                      value={editingItemName}
                      onChange={(e) => setEditingItemName(e.target.value)}
                      onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); commitEditItem(idx); } if (e.key === "Escape") setEditingItemIdx(null); }}
                      className="flex-1 text-sm bg-transparent border-none outline-none text-gray-800 dark:text-[#efefef]"
                      autoFocus
                    />
                    <select
                      value={editingItemCat}
                      onChange={(e) => setEditingItemCat(e.target.value)}
                      className="text-xs bg-transparent border border-gray-200 dark:border-[#2e2e2e] rounded px-1.5 py-0.5 text-gray-500 dark:text-[#9fb8b8] shrink-0"
                    >
                      {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                    </select>
                    <button type="button" onClick={() => commitEditItem(idx)} className="text-xs font-medium text-[#9fb8b8] hover:text-sky-600 shrink-0">Save</button>
                    <button type="button" onClick={() => setEditingItemIdx(null)} className="text-xs text-gray-400 hover:text-gray-600 shrink-0">✕</button>
                  </div>
                ) : (
                  // Display row
                  <div key={idx} className="flex items-center gap-1.5 rounded-lg border border-gray-100 dark:border-[#2e2e2e] bg-white dark:bg-[#1e1e1e] px-3 py-2">
                    <span className="text-sm text-gray-800 dark:text-[#efefef] truncate mr-1">{item.name}</span>
                    <button
                      type="button"
                      onClick={() => startEditItem(idx)}
                      className="text-gray-300 dark:text-[#3a3a3a] hover:text-sky-500 transition-colors shrink-0"
                      title="Edit item"
                    >
                      <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931z" />
                      </svg>
                    </button>
                    <button
                      type="button"
                      onClick={() => removeItem(idx)}
                      className="text-gray-300 dark:text-[#3a3a3a] hover:text-red-400 transition-colors shrink-0"
                      title="Remove item"
                    >
                      <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                    <span className="ml-auto text-xs text-gray-400 dark:text-[#9fb8b8] shrink-0">{item.category}</span>
                  </div>
                )
              )}
            </div>
          )}

          {/* Add item row */}
          <div className="flex gap-2">
            <input
              type="text"
              value={newItemName}
              onChange={(e) => setNewItemName(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); if (newItemName.trim()) { setTplItems((prev) => [...prev, { name: newItemName.trim(), category: newItemCat }]); setNewItemName(""); } } }}
              placeholder="Add item…"
              className="input flex-1 text-sm"
            />
            <select
              value={newItemCat}
              onChange={(e) => setNewItemCat(e.target.value)}
              className="input w-36 text-sm shrink-0"
            >
              {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
            <button
              type="button"
              onClick={addItem}
              className="rounded-lg border border-gray-200 dark:border-[#2e2e2e] bg-white dark:bg-transparent px-3 py-1.5 text-xs font-medium text-gray-600 dark:text-[#9fb8b8] hover:border-[#9fb8b8] hover:text-[#9fb8b8] transition-colors shrink-0"
            >
              Add
            </button>
          </div>

          {tplItems.length === 0 && (
            <p className="text-xs text-gray-400 dark:text-[#9fb8b8]">No items yet — add some above.</p>
          )}

          {saveError && <p className="text-sm text-red-600 dark:text-red-400">{saveError}</p>}

          <div className="flex gap-2">
            <button type="submit" disabled={saving} className="btn-primary flex-1">
              {saving ? "Saving…" : editing ? "Save changes" : "Create template"}
            </button>
            <button type="button" onClick={cancelEditor} className="btn-secondary">
              Cancel
            </button>
          </div>
        </form>
      )}

      {/* ── Template list ── */}
      {templates.length === 0 && !showEditor ? (
        <div className="rounded-xl border-2 border-dashed border-gray-200 dark:border-[#2e2e2e] py-12 text-center">
          <p className="text-sm text-gray-400 dark:text-[#9fb8b8]">No custom templates yet.</p>
          <button onClick={openCreate} className="mt-3 text-sm font-medium text-[#9fb8b8] hover:underline">
            Create your first template
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {templates.map((tpl) => (
            <div key={tpl.id} className="card p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-medium text-sm text-gray-900 dark:text-[#efefef]">{tpl.name}</p>
                  <p className="text-xs text-gray-400 dark:text-[#9fb8b8] mt-0.5">
                    {tpl.items.length} item{tpl.items.length !== 1 ? "s" : ""}
                    {tpl.items.length > 0 && (
                      <span className="ml-1">
                        · {tpl.items.slice(0, 3).map((i) => i.name).join(", ")}
                        {tpl.items.length > 3 && ` +${tpl.items.length - 3} more`}
                      </span>
                    )}
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => openEdit(tpl)}
                    className="text-gray-300 dark:text-[#3a3a3a] hover:text-sky-500 transition-colors"
                    title="Edit"
                  >
                    <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931z" />
                    </svg>
                  </button>
                  <button
                    onClick={() => handleDelete(tpl.id)}
                    className="text-gray-300 dark:text-[#3a3a3a] hover:text-red-400 transition-colors"
                    title="Delete"
                  >
                    <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
