"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { SORTED_COUNTRIES } from "@/lib/countries";
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
  const [countryCode, setCountryCode] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [status, setStatus] = useState<TripStatus>("planning");
  const [coverUrl, setCoverUrl] = useState("");
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
        country_code: countryCode || null,
        start_date: startDate || null,
        end_date: endDate || null,
        cover_photo_url: coverUrl.trim() || null,
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
            <label htmlFor="country" className="label">Country</label>
            <p className="text-xs text-gray-400 mb-1">Used to show this trip on your travel map.</p>
            <select
              id="country"
              value={countryCode}
              onChange={(e) => setCountryCode(e.target.value)}
              className="input"
            >
              <option value="">— Select a country —</option>
              {SORTED_COUNTRIES.map((c) => (
                <option key={c.alpha2} value={c.alpha2}>
                  {c.name}
                </option>
              ))}
            </select>
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

          <div>
            <label htmlFor="cover" className="label">Cover photo URL</label>
            <input
              id="cover"
              type="url"
              value={coverUrl}
              onChange={(e) => setCoverUrl(e.target.value)}
              placeholder="https://..."
              className="input"
            />
            {coverUrl && (
              <div className="mt-2 overflow-hidden rounded-lg border border-gray-200">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={coverUrl} alt="Cover preview" className="h-32 w-full object-cover" />
              </div>
            )}
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
