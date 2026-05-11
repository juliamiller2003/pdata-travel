"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { getTravelPrefs } from "@/lib/travelPrefs";

const VIBES = [
  { value: "nature",             label: "Nature"             },
  { value: "beach",              label: "Beach"              },
  { value: "culture",            label: "Culture"            },
  { value: "food",               label: "Food"               },
  { value: "adventure",          label: "Adventure"          },
  { value: "road less traveled", label: "Road Less Traveled" },
];

const DISTANCES = [
  { value: "under 2 hours by flight or drive",  label: "< 2 hrs"  },
  { value: "2 to 5 hours by flight or drive",   label: "2–5 hrs"  },
  { value: "5 to 10 hours by flight",           label: "5–10 hrs" },
  { value: "anywhere in the world",             label: "Anywhere" },
];

interface TripSuggestion {
  title: string;
  destination: string;
  country_code: string;
  tagline: string;
  why: string;
  highlights: string[];
  best_time: string;
  backpacker_note?: string | null;
}

export default function TakeAChancePage() {
  const router = useRouter();
  const supabase = createClient();

  const [location, setLocation]     = useState("");
  const [distance, setDistance]     = useState(DISTANCES[0].value);
  const [duration, setDuration]     = useState("7");
  const [travelDate, setTravelDate] = useState("");
  const [budget, setBudget]         = useState("");
  const [requests, setRequests]     = useState("");
  const [vibes, setVibes]           = useState<string[]>([]);

  const [loading, setLoading]       = useState(false);
  const [error, setError]           = useState<string | null>(null);
  const [suggestions, setSuggestions] = useState<TripSuggestion[] | null>(null);
  const [creating, setCreating]     = useState<string | null>(null);

  function toggleVibe(v: string) {
    setVibes((prev) => prev.includes(v) ? prev.filter((x) => x !== v) : [...prev, v]);
  }

  async function handleGenerate(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuggestions(null);

    let user_style = "";
    let user_pace = "";
    try {
      const prefs = getTravelPrefs();
      user_style = prefs.style ?? "";
      user_pace = prefs.pace ?? "";
    } catch {}

    const res = await fetch("/api/take-a-chance", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        location,
        distance,
        duration: parseInt(duration),
        travelDate: travelDate || null,
        budget: budget ? parseInt(budget) : null,
        requests,
        vibes,
        user_style,
        user_pace,
      }),
    });

    setLoading(false);

    if (!res.ok) { setError("Something went wrong. Try again."); return; }

    const data = await res.json();
    if (data.error) { setError(data.error); return; }
    setSuggestions(data.trips);
  }

  async function handleCreate(trip: TripSuggestion) {
    setCreating(trip.destination);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { router.push("/login"); return; }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase as any)
      .from("trips")
      .insert({
        user_id: user.id,
        title: trip.title,
        destination: trip.destination,
        country_code: trip.country_code,
        country_codes: [trip.country_code],
        status: "planning",
      })
      .select()
      .single();

    setCreating(null);
    if (!error && data) router.push(`/trips/${data.id}/edit`);
  }

  return (
    <div className="mx-auto max-w-2xl">
      <nav className="mb-6 flex items-center gap-2 text-sm text-gray-500">
        <Link href="/trips" className="hover:text-brand-600">My Trips</Link>
        <span>/</span>
        <span className="text-gray-900 dark:text-gray-100 font-medium">Take a Chance</span>
      </nav>

      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Take a Chance</h1>
        <p className="mt-1 text-gray-500 dark:text-gray-400">
          Tell us your constraints. We&apos;ll find your next adventure.
        </p>
      </div>

      <div className="card p-6 mb-8">
        <form onSubmit={handleGenerate} className="space-y-6">
          {/* Location */}
          <div>
            <label className="label">Starting from *</label>
            <input
              type="text"
              required
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="e.g. New York, London, Tokyo"
              className="input"
            />
          </div>

          {/* Distance */}
          <div>
            <label className="label">How far are you willing to travel?</label>
            <div className="grid grid-cols-4 gap-2 mt-1">
              {DISTANCES.map((d) => (
                <button
                  key={d.value}
                  type="button"
                  onClick={() => setDistance(d.value)}
                  className={`rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${
                    distance === d.value
                      ? "border-sky-500 bg-sky-50 text-sky-700 dark:bg-sky-900/30 dark:text-sky-300 dark:border-sky-600"
                      : "border-gray-200 text-gray-600 hover:border-gray-300 dark:border-gray-700 dark:text-gray-400"
                  }`}
                >
                  {d.label}
                </button>
              ))}
            </div>
          </div>

          {/* Duration */}
          <div>
            <label className="label">Trip length (days) *</label>
            <input
              type="number"
              required
              min="1"
              max="365"
              value={duration}
              onChange={(e) => setDuration(e.target.value)}
              className="input"
            />
          </div>

          {/* Travel date */}
          <div>
            <label className="label">When are you looking to travel? (optional)</label>
            <input
              type="month"
              value={travelDate}
              onChange={(e) => setTravelDate(e.target.value)}
              className="input"
            />
            <p className="mt-1 text-xs text-gray-400 dark:text-[#9fb8b8]">Helps tailor recommendations for weather, events, and crowds</p>
          </div>

          {/* Budget */}
          <div>
            <label className="label">Total budget in USD (optional)</label>
            <div className="relative">
              <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-gray-400">$</span>
              <input
                type="number"
                min="0"
                value={budget}
                onChange={(e) => setBudget(e.target.value)}
                placeholder="e.g. 3000"
                className="input pl-6"
              />
            </div>
            <p className="mt-1 text-xs text-gray-400 dark:text-[#9fb8b8]">Includes flights and accommodation</p>
          </div>

          {/* Specific Requests */}
          <div>
            <label className="label">Anything specific? (optional)</label>
            <textarea
              value={requests}
              onChange={(e) => setRequests(e.target.value)}
              placeholder="e.g. I want somewhere warm with good food and easy hiking, avoid big tourist crowds"
              rows={3}
              className="input resize-none"
            />
          </div>

          {/* Vibe */}
          <div>
            <label className="label">Vibe (optional)</label>
            <div className="flex flex-wrap gap-2 mt-1">
              {VIBES.map((v) => (
                <button
                  key={v.value}
                  type="button"
                  onClick={() => toggleVibe(v.value)}
                  className={`rounded-full border px-3 py-1.5 text-sm font-medium transition-colors ${
                    vibes.includes(v.value)
                      ? "border-sky-500 bg-sky-50 text-sky-700 dark:bg-sky-900/30 dark:text-sky-300 dark:border-sky-600"
                      : "border-gray-200 text-gray-600 hover:border-gray-300 dark:border-gray-700 dark:text-gray-400"
                  }`}
                >
                  {v.label}
                </button>
              ))}
            </div>
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <button type="submit" disabled={loading} className="btn-primary w-full">
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                Finding your adventure…
              </span>
            ) : (
              "Generate Trip Ideas"
            )}
          </button>
        </form>
      </div>

      {suggestions && (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Your options</h2>
          {suggestions.map((trip) => (
            <div key={trip.destination} className="card p-5 space-y-3">
              <div>
                <h3 className="text-lg font-bold text-gray-900 dark:text-white">{trip.title}</h3>
                <p className="text-sm text-sky-600 dark:text-sky-400">{trip.destination}</p>
              </div>

              <p className="text-sm italic text-gray-500 dark:text-gray-400">{trip.tagline}</p>
              <p className="text-sm text-gray-700 dark:text-gray-300">{trip.why}</p>

              <ul className="space-y-1">
                {trip.highlights.map((h, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-gray-600 dark:text-gray-400">
                    <span className="mt-0.5 shrink-0 text-sky-500">•</span>
                    {h}
                  </li>
                ))}
              </ul>

              {trip.best_time && (
                <p className="text-xs text-gray-400 dark:text-gray-500">Best time: {trip.best_time}</p>
              )}

              {trip.backpacker_note && (
                <div className="flex items-start gap-2 rounded-lg bg-[#cadede]/20 dark:bg-[#2a3f3f]/40 border border-[#cadede] dark:border-[#2a3f3f] px-3 py-2">
                  <svg className="h-3.5 w-3.5 shrink-0 mt-0.5 text-[#1e2d2d] dark:text-[#cadede]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
                  </svg>
                  <p className="text-xs text-[#1e2d2d] dark:text-[#cadede]">{trip.backpacker_note}</p>
                </div>
              )}

              <button
                onClick={() => handleCreate(trip)}
                disabled={creating !== null}
                className="btn-primary w-full"
              >
                {creating === trip.destination ? "Creating…" : "Plan this trip →"}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
