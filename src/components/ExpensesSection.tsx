"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Expense } from "@/types/database";

const CATEGORIES: { value: string; label: string; light: string; dark: string }[] = [
  { value: "food",          label: "Food & Drink",   light: "bg-green-100 text-green-700",   dark: "dark:bg-[#2e2e2e] dark:text-[#cadede]" },
  { value: "transport",     label: "Transport",      light: "bg-blue-100 text-blue-700",     dark: "dark:bg-[#2e2e2e] dark:text-[#cadede]" },
  { value: "accommodation", label: "Accommodation",  light: "bg-purple-100 text-purple-700", dark: "dark:bg-[#2e2e2e] dark:text-[#cadede]" },
  { value: "activities",    label: "Activities",     light: "bg-orange-100 text-orange-700", dark: "dark:bg-[#2e2e2e] dark:text-[#cadede]" },
  { value: "shopping",      label: "Shopping",       light: "bg-pink-100 text-pink-700",     dark: "dark:bg-[#2e2e2e] dark:text-[#cadede]" },
  { value: "health",        label: "Health",         light: "bg-red-100 text-red-700",       dark: "dark:bg-[#2e2e2e] dark:text-[#cadede]" },
  { value: "other",         label: "Other",          light: "bg-gray-100 text-gray-600",     dark: "dark:bg-[#2e2e2e] dark:text-[#cadede]" },
];

function categoryStyle(value: string) {
  const cat = CATEGORIES.find((c) => c.value === value) ?? CATEGORIES[CATEGORIES.length - 1];
  return `${cat.light} ${cat.dark}`;
}

function categoryLabel(value: string) {
  return CATEGORIES.find((c) => c.value === value)?.label ?? "Other";
}

function fmt(n: number) {
  return n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

interface ExpensesSectionProps {
  tripId: string;
  budget: number | null;
  initialExpenses: Expense[];
}

export default function ExpensesSection({ tripId, budget, initialExpenses }: ExpensesSectionProps) {
  const supabase = createClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabase as any;
  const [expenses, setExpenses] = useState<Expense[]>(initialExpenses);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [title, setTitle] = useState("");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState("other");
  const [date, setDate] = useState("");
  const [notes, setNotes] = useState("");

  const totalSpent = expenses.reduce((sum, e) => sum + e.amount, 0);
  const remaining = budget != null ? budget - totalSpent : null;
  const pct = budget ? Math.min((totalSpent / budget) * 100, 100) : 0;
  const barColor = pct >= 90 ? "bg-red-500" : pct >= 75 ? "bg-amber-400" : "bg-green-500";

  // Category breakdown
  const byCategory = CATEGORIES.map((cat) => ({
    ...cat,
    total: expenses.filter((e) => e.category === cat.value).reduce((s, e) => s + e.amount, 0),
  })).filter((c) => c.total > 0);

  function resetForm() {
    setTitle(""); setAmount(""); setCategory("other"); setDate(""); setNotes("");
    setError(null);
  }

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);

    const { data, error } = await db
      .from("expenses")
      .insert({
        trip_id: tripId,
        title: title.trim(),
        amount: parseFloat(amount),
        category,
        date: date || null,
        notes: notes.trim() || null,
      })
      .select()
      .single();

    setSaving(false);
    if (error || !data) { setError(error?.message ?? "Failed to save"); return; }

    setExpenses((prev) => [data, ...prev].sort((a, b) => {
      if (!a.date && !b.date) return 0;
      if (!a.date) return 1;
      if (!b.date) return -1;
      return b.date < a.date ? -1 : 1;
    }));
    setShowForm(false);
    resetForm();
  }

  async function handleDelete(id: string) {
    await db.from("expenses").delete().eq("id", id);
    setExpenses((prev) => prev.filter((e) => e.id !== id));
  }

  return (
    <section className="mb-8">
      <h2 className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">Budget</h2>

      {/* Budget overview */}
      {(budget != null || totalSpent > 0) && (
        <div className="card p-5 mb-4 space-y-4">
          <div className="grid grid-cols-3 gap-4 text-center">
            {budget != null && (
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-gray-400 dark:text-[#9fb8b8]">Budget</p>
                <p className="mt-1 text-xl font-bold text-gray-900 dark:text-[#efefef]">${fmt(budget)}</p>
              </div>
            )}
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-gray-400 dark:text-[#9fb8b8]">Spent</p>
              <p className="mt-1 text-xl font-bold text-gray-900 dark:text-[#efefef]">${fmt(totalSpent)}</p>
            </div>
            {remaining != null && (
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-gray-400 dark:text-[#9fb8b8]">Remaining</p>
                <p className={`mt-1 text-xl font-bold ${remaining >= 0 ? "text-green-600" : "text-red-500"}`}>
                  {remaining < 0 ? "-" : ""}${fmt(Math.abs(remaining))}
                </p>
              </div>
            )}
          </div>

          {budget != null && (
            <div>
              <div className="mb-1 flex justify-between text-xs text-gray-400">
                <span>{pct.toFixed(0)}% used</span>
                {remaining != null && remaining < 0 && (
                  <span className="text-red-500 font-medium">Over budget by ${fmt(Math.abs(remaining))}</span>
                )}
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-gray-100 dark:bg-[#2e2e2e]">
                <div className={`h-full rounded-full transition-all ${barColor}`} style={{ width: `${pct}%` }} />
              </div>
            </div>
          )}

          {byCategory.length > 0 && (
            <div className="flex flex-wrap gap-2 pt-1">
              {byCategory.map((cat) => (
                <span key={cat.value} className={`rounded-full px-2.5 py-1 text-xs font-medium ${categoryStyle(cat.value)}`}>
                  {cat.label} · ${fmt(cat.total)}
                </span>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Expense list */}
      <div className="space-y-2 mb-3">
        {expenses.map((expense) => (
          <div key={expense.id} className="card flex items-center gap-3 px-4 py-3">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <p className="text-sm font-medium text-gray-900 dark:text-[#efefef]">{expense.title}</p>
                <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${categoryStyle(expense.category)}`}>
                  {categoryLabel(expense.category)}
                </span>
              </div>
              {(expense.date || expense.notes) && (
                <p className="mt-0.5 text-xs text-gray-400 dark:text-[#9fb8b8]">
                  {expense.date && new Date(expense.date + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                  {expense.date && expense.notes && " · "}
                  {expense.notes}
                </p>

              )}
            </div>
            <p className="shrink-0 text-sm font-semibold text-gray-900 dark:text-[#efefef]">${fmt(expense.amount)}</p>
            <button
              onClick={() => handleDelete(expense.id)}
              className="shrink-0 text-gray-300 dark:text-[#3a3a3a] hover:text-red-400 transition-colors"
              title="Delete expense"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        ))}
      </div>

      {/* Add expense form */}
      {showForm ? (
        <form onSubmit={handleAdd} className="rounded-xl border border-sky-100 dark:border-[#2e2e2e] bg-sky-50/50 dark:bg-transparent p-4 space-y-3">
          <h4 className="text-sm font-semibold text-gray-700 dark:text-[#efefef]">Add expense</h4>

          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <label className="label">Description *</label>
              <input type="text" required value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Dinner" className="input" />
            </div>
            <div>
              <label className="label">Amount *</label>
              <input type="number" required min="0" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0.00" className="input" />
            </div>
            <div>
              <label className="label">Category</label>
              <select value={category} onChange={(e) => setCategory(e.target.value)} className="input">
                {CATEGORIES.map((c) => (
                  <option key={c.value} value={c.value}>{c.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">Date</label>
              <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="input" />
            </div>
            <div>
              <label className="label">Notes</label>
              <input type="text" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Optional" className="input" />
            </div>
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <div className="flex gap-2">
            <button type="submit" disabled={saving} className="btn-primary flex-1">
              {saving ? "Saving…" : "Add expense"}
            </button>
            <button type="button" onClick={() => { setShowForm(false); resetForm(); }} className="btn-secondary">
              Cancel
            </button>
          </div>
        </form>
      ) : (
        <button
          onClick={() => setShowForm(true)}
          className="w-full rounded-xl border-2 border-dashed border-gray-200 dark:border-[#2e2e2e] py-3 text-sm font-medium text-gray-400 dark:text-[#9fb8b8] hover:border-[#9fb8b8] hover:text-[#9fb8b8] transition-colors"
        >
          + Add expense
        </button>
      )}
    </section>
  );
}
