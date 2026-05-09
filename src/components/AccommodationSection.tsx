"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

type AccomType = "hostel" | "hotel" | "airbnb" | "guesthouse" | "camping" | "other";

const TYPES: { value: AccomType; label: string }[] = [
  { value: "hostel",     label: "Hostel"      },
  { value: "hotel",      label: "Hotel"       },
  { value: "airbnb",     label: "Airbnb"      },
  { value: "guesthouse", label: "Guesthouse"  },
  { value: "camping",    label: "Camping"     },
  { value: "other",      label: "Other"       },
];

type Accommodation = {
  id: string;
  name: string;
  type: AccomType;
  city: string | null;
  check_in: string | null;
  check_out: string | null;
  rating: number | null;
  cost_per_night: number | null;
  notes: string | null;
};

interface Props {
  tripId: string;
  initialAccommodations: Accommodation[];
  tripStartDate?: string | null;
  tripEndDate?: string | null;
}

function StarRating({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          onClick={() => onChange(star === value ? 0 : star)}
          className={`text-lg leading-none transition-colors ${star <= value ? "text-[#e5dd83]" : "text-gray-300 dark:text-[#3a3a3a]"}`}
        >
          ★
        </button>
      ))}
    </div>
  );
}

function formatDate(d: string | null) {
  if (!d) return null;
  return new Date(d + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function nights(checkIn: string | null, checkOut: string | null): number | null {
  if (!checkIn || !checkOut) return null;
  const diff = (new Date(checkOut).getTime() - new Date(checkIn).getTime()) / (1000 * 60 * 60 * 24);
  return Math.max(0, Math.round(diff));
}

export default function AccommodationSection({ tripId, initialAccommodations, tripStartDate, tripEndDate }: Props) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = createClient() as any;
  const [items, setItems] = useState<Accommodation[]>(initialAccommodations);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const [name, setName]               = useState("");
  const [type, setType]               = useState<AccomType>("hostel");
  const [city, setCity]               = useState("");
  const [checkIn, setCheckIn]         = useState("");
  const [checkOut, setCheckOut]       = useState("");
  const [rating, setRating]           = useState(0);
  const [costPerNight, setCostPerNight] = useState("");
  const [notes, setNotes]             = useState("");

  function openNew() {
    setEditingId(null);
    setName(""); setType("hostel"); setCity("");
    setCheckIn(tripStartDate ?? "");
    setCheckOut(tripEndDate ?? "");
    setRating(0); setCostPerNight(""); setNotes("");
    setSaveError(null);
    setShowForm(true);
  }

  function openEdit(a: Accommodation) {
    setEditingId(a.id);
    setName(a.name); setType(a.type); setCity(a.city ?? "");
    setCheckIn(a.check_in ?? ""); setCheckOut(a.check_out ?? "");
    setRating(a.rating ?? 0); setCostPerNight(a.cost_per_night ? String(a.cost_per_night) : "");
    setNotes(a.notes ?? "");
    setSaveError(null);
    setShowForm(true);
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setSaveError(null);

    try {
      const payload = {
        trip_id: tripId,
        name: name.trim(),
        type,
        city: city.trim() || null,
        check_in: checkIn || null,
        check_out: checkOut || null,
        rating: rating || null,
        cost_per_night: costPerNight ? parseFloat(costPerNight) : null,
        notes: notes.trim() || null,
      };

      if (editingId) {
        const { data, error } = await db
          .from("accommodations").update(payload).eq("id", editingId).select().single();
        console.log("[AccomSave] update →", { data, error });
        if (error) throw new Error(error.message || "Update failed");
        // Use returned row if available, otherwise patch locally
        setItems((prev) => prev.map((a) =>
          a.id === editingId ? (data ?? { ...a, ...payload }) : a
        ));
      } else {
        const { data, error } = await db
          .from("accommodations").insert(payload).select().single();
        console.log("[AccomSave] insert →", { data, error });
        if (error) throw new Error(error.message || `Insert failed: ${JSON.stringify(error)}`);
        // Use returned row if available, otherwise build from form state
        const newItem: Accommodation = data ?? {
          id: `temp-${Date.now()}`,
          name: payload.name,
          type: payload.type as AccomType,
          city: payload.city,
          check_in: payload.check_in,
          check_out: payload.check_out,
          rating: payload.rating,
          cost_per_night: payload.cost_per_night,
          notes: payload.notes,
        };
        console.log("[AccomSave] adding item to list:", newItem);
        setItems((prev) => [...prev, newItem]);
      }

      setShowForm(false);
      setEditingId(null);
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : "Something went wrong — please try again.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    setDeletingId(id);
    await db.from("accommodations").delete().eq("id", id);
    setItems((prev) => prev.filter((a) => a.id !== id));
    setDeletingId(null);
  }

  return (
    <section className="mb-8">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-[#efefef]">Accommodation</h2>
        {!showForm && (
          <button onClick={openNew} className="flex items-center gap-1 rounded-lg border border-gray-200 dark:border-[#2e2e2e] bg-white dark:bg-transparent px-3 py-1.5 text-xs font-medium text-gray-600 dark:text-[#9fb8b8] hover:border-[#9fb8b8] hover:text-[#9fb8b8] transition-colors">
            + Add stay
          </button>
        )}
      </div>

      {showForm && (
        <form onSubmit={handleSave} className="mb-4 rounded-xl border border-sky-100 dark:border-[#2e2e2e] bg-sky-50/50 dark:bg-transparent p-4 space-y-3">
          <p className="text-sm font-semibold text-gray-700 dark:text-[#efefef]">{editingId ? "Edit stay" : "Add a stay"}</p>

          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <label className="label">Name *</label>
              <input type="text" required value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Lub·d Hostel Bangkok" className="input" />
            </div>
            <div>
              <label className="label">Type</label>
              <select value={type} onChange={(e) => setType(e.target.value as AccomType)} className="input">
                {TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </div>
            <div>
              <label className="label">City</label>
              <input type="text" value={city} onChange={(e) => setCity(e.target.value)} placeholder="e.g. Bangkok" className="input" />
            </div>
            <div>
              <label className="label">Check-in</label>
              <input type="date" value={checkIn} onChange={(e) => setCheckIn(e.target.value)} className="input" />
            </div>
            <div>
              <label className="label">Check-out</label>
              <input type="date" value={checkOut} onChange={(e) => setCheckOut(e.target.value)} className="input" />
            </div>
            <div>
              <label className="label">Cost per night (USD)</label>
              <input type="number" min="0" step="0.01" value={costPerNight} onChange={(e) => setCostPerNight(e.target.value)} placeholder="0.00" className="input" />
            </div>
            <div>
              <label className="label">Rating</label>
              <StarRating value={rating} onChange={setRating} />
            </div>
            <div className="col-span-2">
              <label className="label">Notes</label>
              <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} placeholder="Great location, noisy at night, lockers available…" className="input resize-none text-sm" />
            </div>
          </div>

          {saveError && <p className="text-sm text-red-600 dark:text-red-400">{saveError}</p>}
          <div className="flex gap-2">
            <button type="submit" disabled={saving} className="btn-primary flex-1">{saving ? "Saving…" : editingId ? "Save changes" : "Add stay"}</button>
            <button type="button" onClick={() => { setShowForm(false); setEditingId(null); setSaveError(null); }} className="btn-secondary">Cancel</button>
          </div>
        </form>
      )}

      {items.length === 0 && !showForm ? (
        <div className="rounded-xl border-2 border-dashed border-gray-200 dark:border-[#2e2e2e] py-12 text-center text-sm text-gray-400 dark:text-[#9fb8b8]">
          No stays logged yet.
        </div>
      ) : (
        <div className="space-y-3">
          {items.map((a) => {
            const n = nights(a.check_in, a.check_out);
            const totalCost = n && a.cost_per_night ? n * a.cost_per_night : null;
            return (
              <div key={a.id} className="card p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-medium text-sm text-gray-900 dark:text-[#efefef]">{a.name}</p>
                      <span className="rounded-full bg-[#cadede] dark:bg-[#2e2e2e] px-2 py-0.5 text-[10px] font-medium text-[#1e1e1e] dark:text-[#9fb8b8] capitalize">{a.type}</span>
                    </div>
                    <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-gray-400 dark:text-[#9fb8b8]">
                      {a.city && <span>{a.city}</span>}
                      {(a.check_in || a.check_out) && (
                        <span>{formatDate(a.check_in)}{a.check_out ? ` – ${formatDate(a.check_out)}` : ""}{n != null ? ` · ${n} night${n !== 1 ? "s" : ""}` : ""}</span>
                      )}
                      {totalCost != null && <span>~${totalCost.toFixed(0)} total</span>}
                      {!totalCost && a.cost_per_night && <span>${a.cost_per_night}/night</span>}
                    </div>
                    {a.rating != null && a.rating > 0 && (
                      <div className="mt-1 flex gap-0.5">
                        {[1,2,3,4,5].map((s) => (
                          <span key={s} className={`text-sm ${s <= a.rating! ? "text-[#e5dd83]" : "text-gray-200 dark:text-[#3a3a3a]"}`}>★</span>
                        ))}
                      </div>
                    )}
                    {a.notes && <p className="mt-1.5 text-xs text-gray-500 dark:text-[#9fb8b8] whitespace-pre-wrap">{a.notes}</p>}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button onClick={() => openEdit(a)} className="text-gray-300 hover:text-sky-500 transition-colors" title="Edit">
                      <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931z" />
                      </svg>
                    </button>
                    <button onClick={() => handleDelete(a.id)} disabled={deletingId === a.id} className="text-gray-300 hover:text-red-400 transition-colors" title="Delete">
                      <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
