"use client";

import { useState } from "react";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface SavedMapLink {
  id: string;
  trip_id: string;
  label: string;
  url: string | null;
  lat: number | null;
  lng: number | null;
  notes: string | null;
  created_at: string;
}

interface Props {
  tripId: string;
  destination: string;
  initialLinks: SavedMapLink[];
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function googleMapsUrl(destination: string) {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(destination)}`;
}

function mapsmeUrl(destination: string) {
  return `https://maps.me/get/?q=${encodeURIComponent(destination)}`;
}

function coordsToGoogleMaps(lat: number, lng: number) {
  return `https://www.google.com/maps?q=${lat},${lng}`;
}

function copyToClipboard(text: string) {
  navigator.clipboard.writeText(text).catch(() => {});
}

// ─── Saved Location Card ──────────────────────────────────────────────────────

function SavedLinkCard({ link, onDelete }: { link: SavedMapLink; onDelete: () => void }) {
  const [copied, setCopied] = useState(false);

  function handleCopy() {
    const text = link.lat != null && link.lng != null
      ? `${link.lat}, ${link.lng}`
      : link.url ?? "";
    copyToClipboard(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  const hasCoords = link.lat != null && link.lng != null;
  const mapsHref = hasCoords
    ? coordsToGoogleMaps(link.lat!, link.lng!)
    : link.url ?? undefined;

  return (
    <div className="rounded-xl border border-[#e0e0e0] dark:border-[#2e2e2e] bg-white dark:bg-transparent p-3">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <p className="font-medium text-sm text-gray-900 dark:text-[#efefef] truncate">{link.label}</p>
          {hasCoords && (
            <p className="text-xs text-gray-400 dark:text-[#9fb8b8] font-mono mt-0.5">
              {Number(link.lat).toFixed(5)}, {Number(link.lng).toFixed(5)}
            </p>
          )}
          {link.url && !hasCoords && (
            <p className="text-xs text-gray-400 dark:text-[#9fb8b8] truncate mt-0.5">{link.url}</p>
          )}
          {link.notes && (
            <p className="text-xs text-gray-500 dark:text-[#9fb8b8] italic mt-1">{link.notes}</p>
          )}
        </div>
        <button onClick={onDelete} className="shrink-0 text-gray-300 hover:text-red-400 transition-colors mt-0.5">
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <div className="mt-2 flex gap-2">
        <button
          onClick={handleCopy}
          className="rounded-md border border-[#e0e0e0] dark:border-[#2e2e2e] px-2.5 py-1 text-[11px] font-medium text-gray-500 dark:text-[#9fb8b8] hover:border-[#9fb8b8] hover:text-[#9fb8b8] transition-colors"
        >
          {copied ? "✓ Copied" : "Copy coords"}
        </button>
        {mapsHref && (
          <a
            href={mapsHref}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-md border border-[#e0e0e0] dark:border-[#2e2e2e] px-2.5 py-1 text-[11px] font-medium text-gray-500 dark:text-[#9fb8b8] hover:border-[#9fb8b8] hover:text-[#9fb8b8] transition-colors"
          >
            Open in Maps ↗
          </a>
        )}
      </div>
    </div>
  );
}

// ─── Add Location Form ────────────────────────────────────────────────────────

function AddLinkForm({ tripId, onAdded }: { tripId: string; onAdded: (link: SavedMapLink) => void }) {
  const [show, setShow] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ label: "", lat: "", lng: "", url: "", notes: "" });

  function set(k: string, v: string) { setForm((f) => ({ ...f, [k]: v })); }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const { createClient } = await import("@/lib/supabase/client");
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const db = createClient() as any;

    const { data, error } = await db
      .from("saved_map_links")
      .insert({
        trip_id: tripId,
        label: form.label.trim(),
        lat: form.lat ? parseFloat(form.lat) : null,
        lng: form.lng ? parseFloat(form.lng) : null,
        url: form.url.trim() || null,
        notes: form.notes.trim() || null,
      })
      .select()
      .single();

    setSaving(false);
    if (error || !data) return;
    onAdded(data);
    setShow(false);
    setForm({ label: "", lat: "", lng: "", url: "", notes: "" });
  }

  if (!show) {
    return (
      <button
        onClick={() => setShow(true)}
        className="w-full rounded-xl border-2 border-dashed border-gray-200 dark:border-[#2e2e2e] py-3 text-sm font-medium text-gray-400 dark:text-[#9fb8b8] hover:border-[#9fb8b8] hover:text-[#9fb8b8] transition-colors"
      >
        + Save location
      </button>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="rounded-xl border border-[#cadede] dark:border-[#2e2e2e] bg-[#cadede]/10 dark:bg-transparent p-4 space-y-3">
      <h4 className="text-sm font-semibold text-gray-700 dark:text-[#cadede]">Save a location</h4>

      <div>
        <label className="label">Label</label>
        <input required type="text" value={form.label} onChange={(e) => set("label", e.target.value)} placeholder="e.g. Hostel entrance, Bus station, Beach" className="input" />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label">Latitude <span className="text-gray-400 font-normal">(optional)</span></label>
          <input type="number" step="any" value={form.lat} onChange={(e) => set("lat", e.target.value)} placeholder="e.g. 13.7563" className="input" />
        </div>
        <div>
          <label className="label">Longitude <span className="text-gray-400 font-normal">(optional)</span></label>
          <input type="number" step="any" value={form.lng} onChange={(e) => set("lng", e.target.value)} placeholder="e.g. 100.5018" className="input" />
        </div>
      </div>

      <div>
        <label className="label">Map link / URL <span className="text-gray-400 font-normal">(optional)</span></label>
        <input type="url" value={form.url} onChange={(e) => set("url", e.target.value)} placeholder="Paste a Google Maps or Maps.me link" className="input" />
      </div>

      <div>
        <label className="label">Notes <span className="text-gray-400 font-normal">(optional)</span></label>
        <input type="text" value={form.notes} onChange={(e) => set("notes", e.target.value)} placeholder="e.g. Ring bell, gate code 1234" className="input" />
      </div>

      <p className="text-[11px] text-gray-400 dark:text-[#9fb8b8]">
        💡 To get coordinates: long-press a spot in Google Maps, then tap the coordinates at the top.
      </p>

      <div className="flex gap-2">
        <button type="submit" disabled={saving} className="btn-primary flex-1">
          {saving ? "Saving…" : "Save location"}
        </button>
        <button type="button" onClick={() => setShow(false)} className="btn-secondary">Cancel</button>
      </div>
    </form>
  );
}

// ─── Main Section ──────────────────────────────────────────────────────────────

export default function OfflineMapsSection({ tripId, destination, initialLinks }: Props) {
  const [open, setOpen] = useState(false);
  const [links, setLinks] = useState<SavedMapLink[]>(initialLinks);

  async function deleteLink(id: string) {
    const { createClient } = await import("@/lib/supabase/client");
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (createClient() as any).from("saved_map_links").delete().eq("id", id);
    setLinks((prev) => prev.filter((l) => l.id !== id));
  }

  return (
    <div className="mb-8 rounded-xl border border-[#e0e0e0] dark:border-[#2e2e2e] overflow-hidden">
      {/* Header */}
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between gap-3 px-5 py-4 text-left hover:bg-black/[0.02] dark:hover:bg-white/[0.02] transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#cadede] dark:bg-[#2e2e2e]">
            <svg className="h-4 w-4 text-[#1e1e1e] dark:text-[#9fb8b8]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 6.75V15m6-6v8.25m.503 3.498l4.875-2.437c.381-.19.622-.58.622-1.006V4.82c0-.836-.88-1.38-1.628-1.006l-3.869 1.934c-.317.159-.69.159-1.006 0L9.503 3.252a1.125 1.125 0 00-1.006 0L3.622 5.689C3.24 5.88 3 6.27 3 6.695V19.18c0 .836.88 1.38 1.628 1.006l3.869-1.934c.317-.159.69-.159 1.006 0l4.994 2.497c.317.158.69.158 1.006 0z" />
            </svg>
          </div>
          <div>
            <p className="text-sm font-semibold text-gray-900 dark:text-[#efefef]">Offline Maps</p>
            <p className="text-xs text-gray-400 dark:text-[#9fb8b8]">
              Open in map apps · Save key locations for offline access
              {links.length > 0 && ` · ${links.length} saved`}
            </p>
          </div>
        </div>
        <svg
          className={`h-4 w-4 shrink-0 text-gray-400 dark:text-[#9fb8b8] transition-transform ${open ? "rotate-180" : ""}`}
          fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <div className="border-t border-[#e0e0e0] dark:border-[#2e2e2e] px-5 py-4 space-y-5">

          {/* Quick-open in map apps */}
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 dark:text-[#9fb8b8] mb-2">
              Open {destination} in…
            </p>
            <div className="grid grid-cols-2 gap-2">
              <a
                href={googleMapsUrl(destination)}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 rounded-lg border border-[#e0e0e0] dark:border-[#2e2e2e] bg-white dark:bg-transparent px-3 py-2.5 text-xs font-medium text-gray-700 dark:text-[#efefef] hover:border-[#9fb8b8] hover:text-[#9fb8b8] transition-colors"
              >
                <svg className="h-4 w-4 shrink-0 text-blue-500" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
                </svg>
                Google Maps
              </a>
              <a
                href={mapsmeUrl(destination)}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 rounded-lg border border-[#e0e0e0] dark:border-[#2e2e2e] bg-white dark:bg-transparent px-3 py-2.5 text-xs font-medium text-gray-700 dark:text-[#efefef] hover:border-[#9fb8b8] hover:text-[#9fb8b8] transition-colors"
              >
                <svg className="h-4 w-4 shrink-0 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
                </svg>
                Maps.me
              </a>
            </div>
          </div>

          {/* Offline tip */}
          <div className="rounded-lg bg-[#e5dd83]/20 dark:bg-[#2e2e2e] border border-[#e5dd83]/40 dark:border-[#2e2e2e] p-3">
            <p className="text-xs font-semibold text-gray-700 dark:text-[#efefef] mb-1">📥 How to download maps for offline use</p>
            <ul className="text-xs text-gray-500 dark:text-[#9fb8b8] space-y-1 list-disc list-inside">
              <li><strong>Google Maps</strong>: Search the area → tap the name → Download → select region</li>
              <li><strong>Maps.me</strong>: Tap the download icon → select country/region (free, works fully offline)</li>
              <li><strong>OsmAnd</strong>: Settings → Maps → Download map for your destination</li>
            </ul>
          </div>

          {/* Saved locations */}
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 dark:text-[#9fb8b8] mb-2">
              Saved locations
            </p>
            <div className="space-y-2">
              {links.length === 0 && (
                <p className="text-xs text-gray-400 dark:text-[#9fb8b8] italic py-1">
                  Save key spots — your hostel, bus station, beach, ATM — so you can find them offline.
                </p>
              )}
              {links
                .slice()
                .sort((a, b) => a.label.localeCompare(b.label))
                .map((link) => (
                  <SavedLinkCard key={link.id} link={link} onDelete={() => deleteLink(link.id)} />
                ))}
              <AddLinkForm tripId={tripId} onAdded={(l) => setLinks((prev) => [...prev, l])} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
