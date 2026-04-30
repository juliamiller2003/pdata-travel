"use client";

import { useState, useEffect, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Trip, TripStatus } from "@/types/database";
import PhotoUploader from "@/components/PhotoUploader";

interface CountryModalProps {
  countryCode: string;
  countryName: string;
  onClose: () => void;
  onTripSaved: () => void;
}

function formatDate(d: string | null) {
  if (!d) return null;
  return new Date(d + "T00:00:00").toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

const STATUS_STYLES: Record<TripStatus, string> = {
  planning:  "bg-amber-100 text-amber-700",
  ongoing:   "bg-green-100 text-green-700",
  completed: "bg-blue-100 text-blue-700",
  cancelled: "bg-gray-100 text-gray-500",
};

export default function CountryModal({
  countryCode,
  countryName,
  onClose,
  onTripSaved,
}: CountryModalProps) {
  const supabase = createClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabase as any;
  const backdropRef = useRef<HTMLDivElement>(null);

  const [trips, setTrips] = useState<Trip[]>([]);
  const [loadingTrips, setLoadingTrips] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingTrip, setEditingTrip] = useState<Trip | null>(null);

  // Form state
  const [title, setTitle] = useState(`Trip to ${countryName}`);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [photos, setPhotos] = useState<string[]>([]);
  const [coverUrl, setCoverUrl] = useState("");
  const [links, setLinks] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from("trips")
        .select("*")
        .or(`country_codes.cs.{${countryCode}},country_code.eq.${countryCode}`)
        .order("start_date", { ascending: false });
      setTrips(data ?? []);
      setLoadingTrips(false);
    }
    load();
  }, [supabase, countryCode]);

  useEffect(() => {
    if (editingTrip) {
      setTitle(editingTrip.title);
      setStartDate(editingTrip.start_date ?? "");
      setEndDate(editingTrip.end_date ?? "");
      setPhotos(editingTrip.photos ?? []);
      setCoverUrl(editingTrip.cover_photo_url ?? "");
      setLinks(editingTrip.external_link ?? "");
      setNotes(editingTrip.notes ?? "");
      setShowForm(true);
    }
  }, [editingTrip]);

  function resetForm() {
    setTitle(`Trip to ${countryName}`);
    setStartDate("");
    setEndDate("");
    setPhotos([]);
    setCoverUrl("");
    setLinks("");
    setNotes("");
    setEditingTrip(null);
    setError(null);
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const payload = {
      title: title.trim(),
      destination: countryName,
      country_code: countryCode,
      country_codes: editingTrip
        ? (editingTrip.country_codes?.length ? editingTrip.country_codes : [countryCode])
        : [countryCode],
      start_date: startDate || null,
      end_date: endDate || null,
      photos,
      cover_photo_url: coverUrl || null,
      external_link: links.trim() || null,
      notes: notes.trim() || null,
      status: "completed" as TripStatus,
    };

    let err;
    if (editingTrip) {
      ({ error: err } = await db.from("trips").update(payload).eq("id", editingTrip.id));
    } else {
      ({ error: err } = await db.from("trips").insert({ ...payload, user_id: user.id }));
    }

    setSaving(false);
    if (err) { setError(err.message); return; }

    const { data } = await supabase
      .from("trips")
      .select("*")
      .or(`country_codes.cs.{${countryCode}},country_code.eq.${countryCode}`)
      .order("start_date", { ascending: false });
    setTrips(data ?? []);
    setShowForm(false);
    resetForm();
    onTripSaved();
  }

  function handleBackdropClick(e: React.MouseEvent) {
    if (e.target === backdropRef.current) onClose();
  }

  return (
    <div
      ref={backdropRef}
      onClick={handleBackdropClick}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
    >
      <div className="relative w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-2xl bg-white dark:bg-[#2e2e2e] shadow-2xl">
        {/* Header */}
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-gray-100 dark:border-[#3a3a3a] bg-white dark:bg-[#2e2e2e] px-6 py-4">
          <div>
            <h2 className="text-lg font-bold text-gray-900 dark:text-[#efefef]">{countryName}</h2>
            <p className="text-xs text-gray-400 dark:text-[#9fb8b8] mt-0.5">
              {loadingTrips ? "Loading…" : `${trips.length} visit${trips.length !== 1 ? "s" : ""} logged`}
            </p>
          </div>
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-full text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors text-xl"
          >
            ×
          </button>
        </div>

        <div className="px-6 py-5 space-y-5">
          {/* Existing trips */}
          {!loadingTrips && trips.length > 0 && (
            <div className="space-y-3">
              {trips.map((trip) => (
                <div key={trip.id} className="overflow-hidden rounded-xl border border-gray-100 dark:border-[#3a3a3a] bg-gray-50 dark:bg-[#1e1e1e]">
                  {/* Cover photo */}
                  {trip.cover_photo_url && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={trip.cover_photo_url} alt={trip.title} className="h-36 w-full object-cover" />
                  )}
                  <div className="p-3 space-y-1.5">
                    <div className="flex items-start justify-between gap-2">
                      <p className="font-semibold text-gray-800 dark:text-[#efefef] text-sm">{trip.title}</p>
                      <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_STYLES[trip.status]}`}>
                        {trip.status}
                      </span>
                    </div>

                    {(trip.start_date || trip.end_date) && (
                      <p className="text-xs text-gray-400 dark:text-[#9fb8b8]">
                        {formatDate(trip.start_date)}
                        {trip.end_date && trip.start_date !== trip.end_date && ` – ${formatDate(trip.end_date)}`}
                      </p>
                    )}

                    {/* Additional photos strip */}
                    {trip.photos && trip.photos.length > 1 && (
                      <div className="flex gap-1 overflow-x-auto py-1">
                        {trip.photos.filter((p) => p !== trip.cover_photo_url).map((url) => (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img key={url} src={url} alt="" className="h-12 w-12 shrink-0 rounded-md object-cover" />
                        ))}
                      </div>
                    )}

                    {trip.notes && (
                      <p className="text-xs text-gray-500 dark:text-[#9fb8b8] line-clamp-2">{trip.notes}</p>
                    )}

                    {trip.external_link && (
                      <a
                        href={trip.external_link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-xs text-sky-600 hover:underline"
                      >
                        <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                        </svg>
                        View link
                      </a>
                    )}

                    <div className="flex gap-3 pt-1">
                      <a href={`/trips/${trip.id}`} className="text-xs text-gray-400 hover:text-sky-600 hover:underline">
                        Full trip →
                      </a>
                      <button
                        onClick={() => setEditingTrip(trip)}
                        className="text-xs text-gray-400 dark:text-[#9fb8b8] hover:text-[#cadede] hover:underline"
                      >
                        Edit
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Add / Edit form */}
          {!showForm ? (
            <button
              onClick={() => { resetForm(); setShowForm(true); }}
              className="w-full rounded-xl border-2 border-dashed border-gray-200 dark:border-[#3a3a3a] py-4 text-sm font-medium text-gray-400 dark:text-[#9fb8b8] hover:border-[#9fb8b8] hover:text-[#9fb8b8] transition-colors"
            >
              + Log a visit to {countryName}
            </button>
          ) : (
            <form onSubmit={handleSave} className="space-y-4 rounded-xl border border-sky-100 dark:border-[#3a3a3a] bg-sky-50/50 dark:bg-transparent p-4">
              <h3 className="text-sm font-semibold text-gray-700 dark:text-[#efefef]">
                {editingTrip ? "Edit visit" : "Log a visit"}
              </h3>

              <div>
                <label className="label">Trip name *</label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="input"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">Date from</label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="input"
                  />
                </div>
                <div>
                  <label className="label">Date to</label>
                  <input
                    type="date"
                    value={endDate}
                    min={startDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="input"
                  />
                </div>
              </div>

              {/* Photo uploader */}
              <PhotoUploader
                photos={photos}
                coverUrl={coverUrl}
                captions={{}}
                onChange={(newPhotos, newCover) => {
                  setPhotos(newPhotos);
                  setCoverUrl(newCover);
                }}
              />

              <div>
                <label className="label">Links</label>
                <input
                  type="url"
                  value={links}
                  onChange={(e) => setLinks(e.target.value)}
                  placeholder="https://..."
                  className="input"
                />
                <p className="mt-1 text-xs text-gray-400 dark:text-[#9fb8b8]">Old itinerary, blog post, Google Maps, etc.</p>
              </div>

              <div>
                <label className="label">Notes</label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={3}
                  placeholder="Highlights, memories, tips…"
                  className="input resize-none"
                />
              </div>

              {error && <p className="text-sm text-red-600">{error}</p>}

              <div className="flex gap-2">
                <button type="submit" disabled={saving} className="btn-primary flex-1">
                  {saving ? "Saving…" : editingTrip ? "Save changes" : "Log visit"}
                </button>
                <button
                  type="button"
                  onClick={() => { setShowForm(false); resetForm(); }}
                  className="btn-secondary"
                >
                  Cancel
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
