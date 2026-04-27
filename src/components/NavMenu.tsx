"use client";

import { useState, useRef, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { byAlpha2, ALL_CONTINENTS } from "@/lib/countries";

interface Stats {
  visitedCountries: number;
  visitedContinents: number;
  totalTrips: number;
  completedTrips: number;
  visitedCodes: string[];
}

export default function NavMenu() {
  const [open, setOpen] = useState(false);
  const [stats, setStats] = useState<Stats | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const supabase = createClient();

  useEffect(() => {
    async function loadStats() {
      const { data: trips } = await supabase
        .from("trips")
        .select("country_code, status");
      if (!trips) return;
      const codes = [...new Set(trips.map((t) => t.country_code).filter(Boolean))] as string[];
      const continents = new Set(codes.map((c) => byAlpha2[c]?.continent).filter(Boolean));
      setStats({
        visitedCountries: codes.length,
        visitedContinents: continents.size,
        totalTrips: trips.length,
        completedTrips: trips.filter((t) => t.status === "completed").length,
        visitedCodes: codes,
      });
    }
    loadStats();
  }, [supabase]);

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <div ref={menuRef} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        aria-label="Menu"
        className="flex h-9 w-9 items-center justify-center rounded-lg text-gray-500 hover:bg-gray-100 transition-colors"
      >
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      </button>

      {open && (
        <div className="absolute left-0 top-full mt-2 w-64 rounded-xl bg-white shadow-xl border border-gray-100 overflow-hidden z-50">
          {/* Navigation */}
          <div className="px-3 py-2 text-xs font-semibold text-gray-400 uppercase tracking-wide border-b border-gray-100">
            Navigate
          </div>
          <a href="/trips" className="flex items-center gap-2 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50">
            <svg className="h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064" />
            </svg>
            My Trips
          </a>
          <a href="/trips/new" className="flex items-center gap-2 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50">
            <svg className="h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            New Trip
          </a>
          <a href="/settings" className="flex items-center gap-2 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 border-b border-gray-100">
            <svg className="h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            Map Settings
          </a>

          {/* Stats */}
          <div className="px-3 py-2 text-xs font-semibold text-gray-400 uppercase tracking-wide">
            Travel Stats
          </div>
          {stats ? (
            <>
              <div className="px-4 py-3 grid grid-cols-2 gap-2">
                {[
                  { value: stats.visitedCountries, label: stats.visitedCountries === 1 ? "Country" : "Countries" },
                  { value: stats.visitedContinents, label: stats.visitedContinents === 1 ? "Continent" : "Continents" },
                  { value: stats.totalTrips, label: "Total Trips" },
                  { value: stats.completedTrips, label: "Completed" },
                ].map(({ value, label }) => (
                  <div key={label} className="rounded-lg bg-sky-50 p-2.5 text-center">
                    <p className="text-xl font-bold text-sky-600">{value}</p>
                    <p className="text-xs text-gray-500 mt-0.5">{label}</p>
                  </div>
                ))}
              </div>

              {stats.visitedCountries > 0 && (
                <div className="px-4 pb-3">
                  <p className="text-xs text-gray-400 mb-1.5">Continents visited</p>
                  <div className="flex flex-wrap gap-1">
                    {ALL_CONTINENTS.map((c) => {
                      const visited = stats.visitedCodes.some(
                        (code) => byAlpha2[code]?.continent === c
                      );
                      return (
                        <span key={c} className={`rounded-full px-2 py-0.5 text-xs font-medium ${visited ? "bg-sky-100 text-sky-700" : "bg-gray-100 text-gray-400"}`}>
                          {c}
                        </span>
                      );
                    })}
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="px-4 py-4 flex justify-center">
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-sky-500 border-t-transparent" />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
