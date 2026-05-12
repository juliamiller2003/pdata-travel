"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import CountryMultiSelect from "@/components/CountryMultiSelect";
import FlightsSection from "@/components/FlightsSection";
import type { TripStatus, Flight, ItineraryStyle } from "@/types/database";
import { effectiveStatus } from "@/lib/tripUtils";
import { ITINERARY_STYLE_OPTIONS } from "@/lib/itineraryStyle";

const STATUS_OPTIONS: { value: TripStatus; label: string }[] = [
  { value: "planning",  label: "Planning" },
  { value: "ongoing",   label: "Ongoing" },
  { value: "completed", label: "Completed" },
  { value: "cancelled", label: "Cancelled" },
];

export default function EditTripPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;
  const supabase = createClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabase as any;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [initialFlights, setInitialFlights] = useState<Flight[]>([]);

  const [title, setTitle] = useState("");
  const [destination, setDestination] = useState("");
  const [countryCodes, setCountryCodes] = useState<string[]>([]);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [status, setStatus] = useState<TripStatus>("planning");
  const [notes, setNotes] = useState("");
  const [externalLink, setExternalLink] = useState("");
  const [budget, setBudget] = useState("");
  const [photos, setPhotos] = useState<string[]>([]);
  const [coverUrl, setCoverUrl] = useState("");
  const [captions, setCaptions] = useState<Record<string, string>>({});
  const [itineraryStyle, setItineraryStyle] = useState<ItineraryStyle>("structured");

  useEffect(() => {
    async function load() {
      const [{ data: trip, error }, { data: flights }] = await Promise.all([
        db.from("trips").select("*").eq("id", id).single(),
        db.from("flights").select("*").eq("trip_id", id).order("flight_date"),
      ]);

      if (error || !trip) {
        router.push("/trips");
        return;
      }

      setTitle(trip.title);
      setDestination(trip.destination);
      setCountryCodes(trip.country_codes ?? (trip.country_code ? [trip.country_code] : []));
      setStartDate(trip.start_date ?? "");
      setEndDate(trip.end_date ?? "");
      setStatus(trip.status);
      setNotes(trip.notes ?? "");
      setExternalLink(trip.external_link ?? "");
      setPhotos(trip.photos ?? []);
      setCoverUrl(trip.cover_photo_url ?? "");
      setCaptions((trip.photo_captions as Record<string, string>) ?? {});
      setBudget(trip.budget != null ? String(trip.budget) : "");
      setItineraryStyle(trip.itinerary_style ?? "structured");
      setInitialFlights(flights ?? []);
      setLoading(false);
    }
    load();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  async function handleDelete() {
    setDeleting(true);
    await db.from("trips").delete().eq("id", id);
    router.push("/trips");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);

    // Re-derive status from the new dates so the DB stays consistent.
    // E.g. if dates moved to the future, a stale "completed" becomes "planning".
    // "cancelled" is always preserved as-is.
    const savedStatus = effectiveStatus({
      status,
      start_date: startDate || null,
      end_date: endDate || null,
    });

    const { error } = await db
      .from("trips")
      .update({
        title: title.trim(),
        destination: destination.trim(),
        country_code: countryCodes[0] ?? null,
        country_codes: countryCodes,
        start_date: startDate || null,
        end_date: endDate || null,
        status: savedStatus,
        notes: notes.trim() || null,
        external_link: externalLink.trim() || null,
        cover_photo_url: coverUrl || null,
        budget: budget ? parseFloat(budget) : null,
        itinerary_style: itineraryStyle,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id);

    setSaving(false);

    if (error) {
      setError(error.message);
      return;
    }

    router.refresh(); // invalidate Router Cache so the trip page re-fetches from DB
    router.push(`/trips/${id}`);
  }

  if (loading) {
    return (
      <div className="mx-auto max-w-xl">
        <div className="h-8 w-48 animate-pulse rounded bg-gray-100 mb-6" />
        <div className="card p-6 space-y-4">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-10 animate-pulse rounded bg-gray-100" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-xl">
      <nav className="mb-6 flex items-center gap-2 text-sm text-gray-500">
        <Link href="/trips" className="hover:text-brand-600">My Trips</Link>
        <span>/</span>
        <Link href={`/trips/${id}`} className="hover:text-brand-600 truncate max-w-[12rem]">{title}</Link>
        <span>/</span>
        <span className="text-gray-900 font-medium">Edit</span>
      </nav>

      <div className="card p-6">
        <h1 className="mb-6 text-xl font-bold text-gray-900">Edit trip</h1>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label htmlFor="title" className="label">Trip name *</label>
            <input
              id="title"
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="input"
            />
          </div>

          <div>
            <label htmlFor="destination" className="label">Destination *</label>
            <p className="text-xs text-gray-400 mb-1">City or region &mdash; shown as the trip&apos;s main label, e.g. &ldquo;Tokyo&rdquo; or &ldquo;Southeast Asia&rdquo;</p>
            <input
              id="destination"
              type="text"
              required
              value={destination}
              onChange={(e) => setDestination(e.target.value)}
              className="input"
            />
          </div>

          <div>
            <label className="label">Countries</label>
            <p className="text-xs text-gray-400 mb-1">Add the countries you will visit — used to show this trip on your travel map.</p>
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

          <div>
            <label htmlFor="notes" className="label">Notes</label>
            <textarea
              id="notes"
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Anything you want to remember about this trip…"
              className="input resize-none"
            />
          </div>

          <div>
            <label htmlFor="link" className="label">Links</label>
            <input
              id="link"
              type="url"
              value={externalLink}
              onChange={(e) => setExternalLink(e.target.value)}
              placeholder="https://…"
              className="input"
            />
          </div>

          <div>
            <label className="label">Itinerary style</label>
            <div className="grid grid-cols-2 gap-2 mt-1">
              {ITINERARY_STYLE_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setItineraryStyle(opt.value)}
                  className={`rounded-lg border p-3 text-left transition-colors ${
                    itineraryStyle === opt.value
                      ? "border-sky-500 bg-sky-50 text-sky-700"
                      : "border-gray-200 text-gray-600 hover:border-gray-300"
                  }`}
                >
                  <p className="text-sm font-medium">{opt.label}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{opt.desc}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Cover photo picker */}
          {photos.length > 0 && (
            <div>
              <label className="label">Cover photo</label>
              <p className="text-xs text-gray-400 mb-2">Click a photo to set it as the cover.</p>
              <div className="grid grid-cols-4 gap-2">
                {photos.map((url) => (
                  <button
                    key={url}
                    type="button"
                    onClick={() => setCoverUrl(url)}
                    className={`relative aspect-square overflow-hidden rounded-lg border-2 transition-colors ${
                      coverUrl === url ? "border-sky-500" : "border-transparent hover:border-gray-300"
                    }`}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={url} alt="" className="h-full w-full object-cover" />
                    {coverUrl === url && (
                      <div className="absolute inset-0 flex items-center justify-center bg-sky-500/20">
                        <span className="rounded-full bg-sky-500 px-1.5 py-0.5 text-[10px] font-semibold text-white">Cover</span>
                      </div>
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}
          {photos.length === 0 && (
            <p className="text-xs text-gray-400">Upload photos on the trip page to set a cover photo.</p>
          )}

          {error && (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
          )}

          <div className="flex gap-3 pt-2">
            <button type="submit" disabled={saving} className="btn-primary flex-1">
              {saving ? "Saving…" : "Save changes"}
            </button>
            <Link href={`/trips/${id}`} className="btn-secondary">Cancel</Link>
          </div>
        </form>

        <div className="mt-6 border-t border-gray-100 pt-6">
          {!confirmDelete ? (
            <button
              type="button"
              onClick={() => setConfirmDelete(true)}
              className="text-sm text-red-400 hover:text-red-600 transition-colors"
            >
              Delete this trip
            </button>
          ) : (
            <div className="rounded-lg bg-red-50 border border-red-100 p-4 space-y-3">
              <p className="text-sm font-medium text-red-700">Are you sure? This will permanently delete the trip and all its flights.</p>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={handleDelete}
                  disabled={deleting}
                  className="rounded-lg bg-red-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-red-700 transition-colors"
                >
                  {deleting ? "Deleting…" : "Yes, delete"}
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmDelete(false)}
                  className="btn-secondary text-sm"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Flights — managed separately from the form */}
      <div className="mt-6">
        <FlightsSection tripId={id} initialFlights={initialFlights} tripStartDate={startDate || null} />
      </div>
    </div>
  );
}
