"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

type PackingItem = {
  id: string;
  name: string;
  category: string;
  packed: boolean;
};

const CATEGORIES = [
  "Documents", "Clothing", "Toiletries", "Electronics", "Health", "Sleep & Hostel", "Money", "Other",
];

const TEMPLATES: Record<string, { name: string; category: string }[]> = {
  backpacker: [
    // Documents
    { name: "Passport + copies", category: "Documents" },
    { name: "Travel insurance details", category: "Documents" },
    { name: "Visas / e-visas", category: "Documents" },
    { name: "Booking confirmations", category: "Documents" },
    // Clothing
    { name: "T-shirts (3–4)", category: "Clothing" },
    { name: "Underwear (4–5)", category: "Clothing" },
    { name: "Socks (4–5)", category: "Clothing" },
    { name: "Long pants / jeans (1)", category: "Clothing" },
    { name: "Shorts (2)", category: "Clothing" },
    { name: "Light jacket / hoodie", category: "Clothing" },
    { name: "Rain jacket", category: "Clothing" },
    { name: "Swimwear", category: "Clothing" },
    { name: "Flip flops (hostel showers)", category: "Clothing" },
    { name: "Walking shoes", category: "Clothing" },
    // Toiletries
    { name: "Toothbrush & toothpaste", category: "Toiletries" },
    { name: "Shampoo / bar soap", category: "Toiletries" },
    { name: "Deodorant", category: "Toiletries" },
    { name: "Sunscreen", category: "Toiletries" },
    { name: "Insect repellent", category: "Toiletries" },
    { name: "Razor", category: "Toiletries" },
    // Electronics
    { name: "Phone + charger", category: "Electronics" },
    { name: "Power bank / portable charger", category: "Electronics" },
    { name: "Universal adapter", category: "Electronics" },
    { name: "Earphones / headphones", category: "Electronics" },
    // Health
    { name: "Painkillers", category: "Health" },
    { name: "Antihistamines", category: "Health" },
    { name: "Diarrhea medication", category: "Health" },
    { name: "Plasters / band-aids", category: "Health" },
    { name: "Prescribed medication", category: "Health" },
    // Sleep & Hostel
    { name: "Padlock (for hostel lockers)", category: "Sleep & Hostel" },
    { name: "Quick-dry travel towel", category: "Sleep & Hostel" },
    { name: "Earplugs", category: "Sleep & Hostel" },
    { name: "Eye mask", category: "Sleep & Hostel" },
    { name: "Sleeping bag liner", category: "Sleep & Hostel" },
    // Money
    { name: "Local cash", category: "Money" },
    { name: "Travel card / debit card", category: "Money" },
    { name: "Emergency backup card", category: "Money" },
  ],
  carryon: [
    { name: "Passport + copies", category: "Documents" },
    { name: "Travel insurance details", category: "Documents" },
    { name: "T-shirts (2)", category: "Clothing" },
    { name: "Underwear (3)", category: "Clothing" },
    { name: "Socks (3)", category: "Clothing" },
    { name: "1 versatile outfit", category: "Clothing" },
    { name: "Light layer / jacket", category: "Clothing" },
    { name: "Toothbrush & toothpaste (travel size)", category: "Toiletries" },
    { name: "Deodorant (travel size)", category: "Toiletries" },
    { name: "Sunscreen (travel size)", category: "Toiletries" },
    { name: "Phone + charger", category: "Electronics" },
    { name: "Power bank", category: "Electronics" },
    { name: "Universal adapter", category: "Electronics" },
    { name: "Basic meds (painkillers, antihistamines)", category: "Health" },
    { name: "Padlock", category: "Sleep & Hostel" },
    { name: "Travel card / debit card", category: "Money" },
    { name: "Local cash", category: "Money" },
  ],
  weekend: [
    { name: "Passport / ID", category: "Documents" },
    { name: "T-shirts (2)", category: "Clothing" },
    { name: "Underwear (2)", category: "Clothing" },
    { name: "Socks (2)", category: "Clothing" },
    { name: "1 going-out outfit", category: "Clothing" },
    { name: "Toiletry bag", category: "Toiletries" },
    { name: "Phone + charger", category: "Electronics" },
    { name: "Power bank", category: "Electronics" },
    { name: "Painkillers", category: "Health" },
    { name: "Cash + card", category: "Money" },
  ],
};

interface Props {
  tripId: string;
  initialItems: PackingItem[];
}

export default function PackingListSection({ tripId, initialItems }: Props) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = createClient() as any;
  const [items, setItems] = useState<PackingItem[]>(initialItems);
  const [newItem, setNewItem] = useState("");
  const [newCategory, setNewCategory] = useState("Other");
  const [showAdd, setShowAdd] = useState(false);
  const [showTemplates, setShowTemplates] = useState(items.length === 0);
  const [loading, setLoading] = useState(false);

  const packed = items.filter((i) => i.packed).length;
  const pct = items.length > 0 ? Math.round((packed / items.length) * 100) : 0;

  const grouped = CATEGORIES.map((cat) => ({
    cat,
    items: items.filter((i) => i.category === cat),
  })).filter((g) => g.items.length > 0);

  const uncategorized = items.filter((i) => !CATEGORIES.includes(i.category));
  if (uncategorized.length > 0) grouped.push({ cat: "Other", items: uncategorized });

  async function togglePacked(item: PackingItem) {
    const updated = !item.packed;
    await db.from("packing_items").update({ packed: updated }).eq("id", item.id);
    setItems((prev) => prev.map((i) => i.id === item.id ? { ...i, packed: updated } : i));
  }

  async function addItem(e: React.FormEvent) {
    e.preventDefault();
    if (!newItem.trim()) return;
    const { data, error } = await db.from("packing_items").insert({
      trip_id: tripId, name: newItem.trim(), category: newCategory, packed: false,
    }).select().single();
    if (!error && data) setItems((prev) => [...prev, data]);
    setNewItem("");
    setShowAdd(false);
  }

  async function deleteItem(id: string) {
    await db.from("packing_items").delete().eq("id", id);
    setItems((prev) => prev.filter((i) => i.id !== id));
  }

  async function applyTemplate(key: keyof typeof TEMPLATES) {
    setLoading(true);
    setShowTemplates(false);
    const templateItems = TEMPLATES[key];
    const toInsert = templateItems.map((t) => ({ trip_id: tripId, name: t.name, category: t.category, packed: false }));
    const { data, error } = await db.from("packing_items").insert(toInsert).select();
    if (!error && data) setItems((prev) => [...prev, ...data]);
    setLoading(false);
  }

  async function clearAll() {
    if (!confirm("Clear all packing items?")) return;
    await db.from("packing_items").delete().eq("trip_id", tripId);
    setItems([]);
    setShowTemplates(true);
  }

  return (
    <section className="mb-8">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-[#efefef] shrink-0">Packing List</h2>
          {items.length > 0 && (
            <span className="text-xs text-gray-400 dark:text-[#9fb8b8]">{packed}/{items.length} packed</span>
          )}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {items.length > 0 && (
            <button onClick={clearAll} className="text-xs text-gray-400 dark:text-[#9fb8b8] hover:text-red-400 transition-colors">
              Clear all
            </button>
          )}
          <button onClick={() => setShowAdd((v) => !v)} className="flex items-center gap-1 rounded-lg border border-gray-200 dark:border-[#2e2e2e] bg-white dark:bg-transparent px-3 py-1.5 text-xs font-medium text-gray-600 dark:text-[#9fb8b8] hover:border-[#9fb8b8] hover:text-[#9fb8b8] transition-colors">
            + Add item
          </button>
        </div>
      </div>

      {/* Progress bar */}
      {items.length > 0 && (
        <div className="mb-4">
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-gray-100 dark:bg-[#2e2e2e]">
            <div
              className="h-full rounded-full bg-[#9fb8b8] transition-all"
              style={{ width: `${pct}%` }}
            />
          </div>
          {pct === 100 && (
            <p className="mt-1.5 text-xs font-medium text-[#9fb8b8] text-center">All packed!</p>
          )}
        </div>
      )}

      {/* Templates */}
      {showTemplates && (
        <div className="mb-4 rounded-xl border border-[#e0e0e0] dark:border-[#2e2e2e] p-4">
          <p className="text-xs font-semibold text-gray-500 dark:text-[#9fb8b8] mb-3">Start with a template</p>
          <div className="grid grid-cols-3 gap-2">
            {([
              { key: "backpacker", label: "Backpacker", sub: "50L pack · 30+ items" },
              { key: "carryon",    label: "Carry-on",   sub: "Minimal · 16 items"  },
              { key: "weekend",    label: "Weekend",    sub: "Short trip · 10 items"},
            ] as const).map(({ key, label, sub }) => (
              <button
                key={key}
                onClick={() => applyTemplate(key)}
                disabled={loading}
                className="rounded-lg border border-[#e0e0e0] dark:border-[#2e2e2e] p-3 text-left hover:border-[#9fb8b8] transition-colors"
              >
                <p className="text-sm font-semibold text-gray-800 dark:text-[#efefef]">{label}</p>
                <p className="text-[10px] text-gray-400 dark:text-[#9fb8b8] mt-0.5">{sub}</p>
              </button>
            ))}
          </div>
          {items.length > 0 && (
            <button onClick={() => setShowTemplates(false)} className="mt-3 text-xs text-gray-400 hover:underline">
              Cancel
            </button>
          )}
        </div>
      )}

      {/* Add item form */}
      {showAdd && (
        <form onSubmit={addItem} className="mb-4 flex gap-2">
          <input
            type="text"
            value={newItem}
            onChange={(e) => setNewItem(e.target.value)}
            placeholder="Item name"
            className="input flex-1"
            autoFocus
          />
          <select value={newCategory} onChange={(e) => setNewCategory(e.target.value)} className="input w-36 shrink-0">
            {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
          <button type="submit" className="btn-primary shrink-0">Add</button>
          <button type="button" onClick={() => setShowAdd(false)} className="btn-secondary shrink-0">Cancel</button>
        </form>
      )}

      {/* List */}
      {items.length === 0 && !showTemplates && !loading ? (
        <div className="rounded-xl border-2 border-dashed border-gray-200 dark:border-[#2e2e2e] py-12 text-center text-sm text-gray-400 dark:text-[#9fb8b8]">
          No items yet.{" "}
          <button onClick={() => setShowTemplates(true)} className="underline hover:text-[#9fb8b8]">
            Start from a template
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {grouped.map(({ cat, items: catItems }) => (
            <div key={cat}>
              <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-400 dark:text-[#9fb8b8] mb-2">{cat}</p>
              <div className="space-y-1">
                {catItems.map((item) => (
                  <div key={item.id} className="flex items-center gap-3 group">
                    <button
                      onClick={() => togglePacked(item)}
                      className={`h-4 w-4 shrink-0 rounded border transition-colors flex items-center justify-center ${
                        item.packed
                          ? "border-[#9fb8b8] bg-[#9fb8b8]"
                          : "border-gray-300 dark:border-[#3a3a3a] bg-white dark:bg-transparent"
                      }`}
                    >
                      {item.packed && (
                        <svg className="h-2.5 w-2.5 text-white dark:text-[#1e1e1e]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                        </svg>
                      )}
                    </button>
                    <span className={`flex-1 text-sm transition-colors ${item.packed ? "line-through text-gray-300 dark:text-[#3a3a3a]" : "text-gray-700 dark:text-[#efefef]"}`}>
                      {item.name}
                    </span>
                    <button
                      onClick={() => deleteItem(item.id)}
                      className="opacity-0 group-hover:opacity-100 text-gray-300 hover:text-red-400 transition-all"
                    >
                      <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
