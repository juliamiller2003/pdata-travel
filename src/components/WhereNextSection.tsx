"use client";

import { useState } from "react";

interface Suggestion {
  destination: string;
  tagline: string;
  distance: string;
  why: string;
  transport: string;
  fare: string;
  schedule: string;
  duration: string;
}

interface Props {
  currentDestination: string;
}

export default function WhereNextSection({ currentDestination }: Props) {
  const [open, setOpen] = useState(false);
  const [currentLocation, setCurrentLocation] = useState(currentDestination);
  const [preferences, setPreferences] = useState("");
  const [loading, setLoading] = useState(false);
  const [suggestions, setSuggestions] = useState<Suggestion[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleGenerate(e: React.FormEvent) {
    e.preventDefault();
    if (!currentLocation.trim()) return;
    setLoading(true);
    setError(null);
    setSuggestions(null);

    const res = await fetch("/api/where-next", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        currentLocation: currentLocation.trim(),
        destination: currentDestination,
        preferences,
      }),
    });

    const data = await res.json();
    setLoading(false);

    if (!res.ok || data.error) {
      setError(data.error ?? "Something went wrong. Try again.");
      return;
    }
    setSuggestions(data.suggestions ?? []);
  }

  function reset() {
    setSuggestions(null);
    setError(null);
    setPreferences("");
    setCurrentLocation(currentDestination);
  }

  return (
    <div className="mb-8 rounded-xl border border-[#e0e0e0] dark:border-[#2e2e2e] overflow-hidden">
      {/* Header — always visible */}
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
            <p className="text-sm font-semibold text-gray-900 dark:text-[#efefef]">Where Next?</p>
            <p className="text-xs text-gray-400 dark:text-[#9fb8b8]">AI suggestions for nearby destinations with routes and fares</p>
          </div>
        </div>
        <svg
          className={`h-4 w-4 shrink-0 text-gray-400 dark:text-[#9fb8b8] transition-transform ${open ? "rotate-180" : ""}`}
          fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Body */}
      {open && (
        <div className="border-t border-[#e0e0e0] dark:border-[#2e2e2e] px-5 py-4 space-y-4">
          {!suggestions ? (
            <form onSubmit={handleGenerate} className="space-y-3">
              <div>
                <label className="label">Where are you right now?</label>
                <input
                  type="text"
                  required
                  value={currentLocation}
                  onChange={(e) => setCurrentLocation(e.target.value)}
                  placeholder="e.g. Bangkok, Chiang Mai, Pai"
                  className="input"
                />
              </div>
              <div>
                <label className="label">What are you looking for? <span className="text-gray-400 font-normal">(optional)</span></label>
                <textarea
                  value={preferences}
                  onChange={(e) => setPreferences(e.target.value)}
                  rows={2}
                  placeholder="e.g. beaches, temples, something off the beaten path, max 3 hours away"
                  className="input resize-none text-sm"
                />
              </div>
              {error && <p className="text-sm text-red-500">{error}</p>}
              <button type="submit" disabled={loading} className="btn-primary w-full">
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" />
                    Finding options…
                  </span>
                ) : "Get suggestions →"}
              </button>
            </form>
          ) : (
            <div className="space-y-3">
              {suggestions.map((s) => (
                <div key={s.destination} className="rounded-xl border border-[#e0e0e0] dark:border-[#2e2e2e] p-4 space-y-3">
                  {/* Destination header */}
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold text-gray-900 dark:text-[#efefef]">{s.destination}</p>
                      <p className="text-xs text-gray-400 dark:text-[#9fb8b8]">{s.distance}</p>
                    </div>
                    <span className="shrink-0 rounded-full bg-[#cadede] dark:bg-[#2e2e2e] px-2.5 py-1 text-[10px] font-semibold text-[#1e1e1e] dark:text-[#cadede]">
                      {s.duration}
                    </span>
                  </div>

                  <p className="text-xs italic text-gray-500 dark:text-[#9fb8b8]">{s.tagline}</p>
                  <p className="text-xs text-gray-600 dark:text-[#efefef]">{s.why}</p>

                  {/* Transport grid */}
                  <div className="grid grid-cols-3 gap-2">
                    <div className="rounded-lg bg-[#efefef] dark:bg-[#2e2e2e] p-2.5">
                      <p className="text-[9px] font-semibold uppercase tracking-wide text-gray-400 dark:text-[#9fb8b8] mb-0.5">Transport</p>
                      <p className="text-xs text-gray-700 dark:text-[#efefef] font-medium">{s.transport}</p>
                    </div>
                    <div className="rounded-lg bg-[#efefef] dark:bg-[#2e2e2e] p-2.5">
                      <p className="text-[9px] font-semibold uppercase tracking-wide text-gray-400 dark:text-[#9fb8b8] mb-0.5">Fare</p>
                      <p className="text-xs text-gray-700 dark:text-[#efefef]">{s.fare}</p>
                    </div>
                    <div className="rounded-lg bg-[#efefef] dark:bg-[#2e2e2e] p-2.5">
                      <p className="text-[9px] font-semibold uppercase tracking-wide text-gray-400 dark:text-[#9fb8b8] mb-0.5">Schedule</p>
                      <p className="text-xs text-gray-700 dark:text-[#efefef]">{s.schedule}</p>
                    </div>
                  </div>
                </div>
              ))}

              <button onClick={reset} className="text-xs text-gray-400 dark:text-[#9fb8b8] hover:underline">
                ← Search again
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
