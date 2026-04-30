"use client";

import { useState, useRef } from "react";

interface PlanResult {
  destination: string | null;
  overview: string | null;
  duration: string | null;
  bestTime: string | null;
  estimatedBudget: string | null;
  highlights: string[];
  tips: string[];
}

export default function TripPlannerWidget() {
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<PlanResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!query.trim()) return;
    setLoading(true);
    setResult(null);
    setError(null);

    const res = await fetch("/api/plan-trip", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query }),
    });

    const data = await res.json();
    setLoading(false);

    if (!res.ok || data.error) {
      setError(data.error ?? "Something went wrong.");
      return;
    }

    if (!data.destination) {
      setError('Try asking something like "Help me plan a trip to Japan".');
      return;
    }

    setResult(data);
  }

  function handleReset() {
    setResult(null);
    setError(null);
    setQuery("");
    setTimeout(() => inputRef.current?.focus(), 50);
  }

  return (
    <div className="mb-8">
      {!result ? (
        <form onSubmit={handleSubmit} className="flex gap-2">
          <div className="relative flex-1">
            <svg
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#9fb8b8]"
              viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
            </svg>
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Plan a trip for me… e.g. help me plan a trip to Vietnam"
              className="input pl-9"
              disabled={loading}
            />
          </div>
          <button
            type="submit"
            disabled={loading || !query.trim()}
            className="btn-primary shrink-0"
          >
            {loading ? (
              <span className="flex items-center gap-2">
                <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" />
                Planning…
              </span>
            ) : "Plan"}
          </button>
        </form>
      ) : (
        <div className="space-y-4">
          {/* Header */}
          <div className="flex items-start justify-between gap-4">
            <div>
              <h3 className="text-xl font-bold text-[#1e1e1e] dark:text-[#efefef]">{result.destination}</h3>
              <p className="mt-1 text-sm text-gray-500 dark:text-[#9fb8b8]">{result.overview}</p>
            </div>
            <button
              onClick={handleReset}
              className="shrink-0 text-gray-400 dark:text-[#9fb8b8] hover:text-gray-600 dark:hover:text-[#efefef] transition-colors"
              title="Start over"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Meta pills */}
          <div className="flex flex-wrap gap-2">
            {result.duration && (
              <span className="flex items-center gap-1.5 rounded-full bg-[#cadede] dark:bg-[#2e2e2e] px-3 py-1 text-xs font-medium text-[#1e1e1e] dark:text-[#cadede]">
                <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                {result.duration}
              </span>
            )}
            {result.bestTime && (
              <span className="flex items-center gap-1.5 rounded-full bg-[#cadede] dark:bg-[#2e2e2e] px-3 py-1 text-xs font-medium text-[#1e1e1e] dark:text-[#cadede]">
                <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v2.25m6.364.386l-1.591 1.591M21 12h-2.25m-.386 6.364l-1.591-1.591M12 18.75V21m-4.773-4.227l-1.591 1.591M5.25 12H3m4.227-4.773L5.636 5.636" />
                </svg>
                {result.bestTime}
              </span>
            )}
            {result.estimatedBudget && (
              <span className="flex items-center gap-1.5 rounded-full bg-[#cadede] dark:bg-[#2e2e2e] px-3 py-1 text-xs font-medium text-[#1e1e1e] dark:text-[#cadede]">
                <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33" />
                </svg>
                {result.estimatedBudget}
              </span>
            )}
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            {/* Highlights */}
            {result.highlights?.length > 0 && (
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 dark:text-[#9fb8b8] mb-2">Highlights</p>
                <ul className="space-y-1.5">
                  {result.highlights.map((h, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-[#1e1e1e] dark:text-[#efefef]">
                      <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-[#9fb8b8]" />
                      {h}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Tips */}
            {result.tips?.length > 0 && (
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 dark:text-[#9fb8b8] mb-2">Tips</p>
                <ul className="space-y-1.5">
                  {result.tips.map((t, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-[#1e1e1e] dark:text-[#efefef]">
                      <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-[#e5dd83] dark:bg-[#f5ee9e]" />
                      {t}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          <button onClick={handleReset} className="text-xs text-gray-400 dark:text-[#9fb8b8] hover:underline">
            ← Ask something else
          </button>
        </div>
      )}

      {error && (
        <p className="mt-2 text-xs text-red-500">{error}</p>
      )}
    </div>
  );
}
