"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import CountryMultiSelect from "@/components/CountryMultiSelect";
import type { TripStatus } from "@/types/database";

const STATUS_OPTIONS: { value: TripStatus; label: string }[] = [
  { value: "planning", label: "Planning" },
  { value: "ongoing",  label: "Ongoing" },
  { value: "completed", label: "Completed" },
  { value: "cancelled", label: "Cancelled" },
];

export default function NewTripPage() {
  const router = useRouter();
  const supabase = createClient();

  const [title, setTitle] = useState("");
  const [destination, setDestination] = useState("");
  const [countryCodes, setCountryCodes] = useState<string[]>([]);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [status, setStatus] = useState<TripStatus>("planning");
  const [budget, setBudget] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      router.push("/login");
      return;
    }

    const { data, error } = await supabase
      .from("trips")
      .insert({
        user_id: user.id,
        title: title.trim(),
        destination: destination.trim(),
        country_code: countryCodes[0] ?? null,
        country_codes: countryCodes,
        start_date: startDate || null,
        end_date: endDate || null,
        budget: budget ? parseFloat(budget) : null,
        status,
      })
      .select()
      .single();

    setLoading(false);

    if (error) {
      setError(error.message);
      return;
    }

    router.push(`/trips/${data.id}`);
  }

  return (
    <div className="mx-auto max-w-xl">
      {/* Breadcrumb */}
      <nav className="mb-6 flex items-center gap-2 text-sm text-gray-500">
        <Link href="/trips" className="hover:text-brand-600">My Trips</Link>
        <span>/</span>
        <span className="text-gray-900 font-medium">New Trip</span>
      </nav>

      <div className="card p-6">
        <h1 className="mb-6 text-xl font-bold text-gray-900">Plan a new trip</h1>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label htmlFor="title" className="label">Trip name *</label>
            <input
              id="title"
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Summer in Japan"
              className="input"
            />
          </div>

          <div>
            <label htmlFor="destination" className="label">Destination *</label>
            <input
              id="destination"
              type="text"
              required
              value={destination}
              onChange={(e) => setDestination(e.target.value)}
              placeholder="Tokyo, Japan"
              className="input"
            />
          </div>

          <div>
            <label className="label">Countries</label>
            <p className="text-xs text-gray-400 mb-1">Used to show this trip on your travel map. Add all countries you visited.</p>
            <CountryMultiSelect value={countryCodes} onChange={setCountryCodes} />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="start" className="label">Start date</label>
              <input
                id="start"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="input"
              />
            </div>
            <div>
              <label htmlFor="end" className="label">End date</label>
              <input
                id="end"
                type="date"
                value={endDate}
                min={startDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="input"
              />
            </div>
          </div>

          <div>
            <label htmlFor="budget" className="label">Budget</label>
            <div className="relative">
              <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-gray-400 text-sm">$</span>
              <input
                id="budget"
                type="number"
                min="0"
                step="0.01"
                value={budget}
                onChange={(e) => setBudget(e.target.value)}
                placeholder="0.00"
                className="input pl-7"
              />
            </div>
          </div>

          <div>
            <label htmlFor="status" className="label">Status</label>
            <select
              id="status"
              value={status}
              onChange={(e) => setStatus(e.target.value as TripStatus)}
              className="input"
            >
              {STATUS_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>

{error && (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
          )}

          <div className="flex gap-3 pt-2">
            <button type="submit" disabled={loading} className="btn-primary flex-1">
              {loading ? "Creating…" : "Create Trip"}
            </button>
            <Link href="/trips" className="btn-secondary">Cancel</Link>
          </div>
        </form>
      </div>
    </div>
  );
}
