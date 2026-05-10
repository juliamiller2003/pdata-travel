"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import type { Trip } from "@/types/database";

interface TripCountdownProps {
  trips: Trip[];
}

function daysUntil(dateStr: string): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(dateStr + "T00:00:00");
  return Math.round((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

function countdownLabel(days: number): string {
  if (days === 0) return "Today!";
  if (days === 1) return "Tomorrow";
  return `${days} days away`;
}

export default function TripCountdown({ trips }: TripCountdownProps) {
  // Defer date calculation to the client — Vercel runs UTC but the browser uses the
  // user's local timezone, so computing new Date() on the server produces a different
  // "today" than the client does, causing React hydration errors #418/#425.
  const [dayCounts, setDayCounts] = useState<Map<string, number> | null>(null);

  useEffect(() => {
    const map = new Map<string, number>();
    for (const trip of trips) {
      if (trip.start_date) map.set(trip.id, daysUntil(trip.start_date));
    }
    setDayCounts(map);
  }, [trips]);

  if (trips.length === 0) return null;

  return (
    <div className="mb-8">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {trips.map((trip) => {
          const days = dayCounts?.get(trip.id) ?? null;
          return (
            <Link key={trip.id} href={`/trips/${trip.id}`} className="group block">
              <div className="flex items-center gap-4 p-4 hover:opacity-80 transition-opacity">
                {/* Countdown bubble */}
                <div className="flex h-14 w-14 shrink-0 flex-col items-center justify-center rounded-full bg-[#9fb8b8] dark:bg-[#2e2e2e] text-center">
                  {days === null ? (
                    // Placeholder while client hydrates — keeps server HTML neutral
                    <span className="h-5 w-6 rounded bg-[#efefef]/20 animate-pulse" />
                  ) : days === 0 ? (
                    <span className="text-lg font-bold text-[#efefef]">🎉</span>
                  ) : (
                    <>
                      <span className="text-xl font-bold leading-none text-[#efefef]">{days}</span>
                      <span className="text-[10px] font-medium text-[#efefef]/80">
                        {days === 1 ? "day" : "days"}
                      </span>
                    </>
                  )}
                </div>

                <div className="min-w-0">
                  <p className="font-semibold text-gray-900 dark:text-[#efefef] truncate group-hover:text-sky-600 transition-colors">
                    {trip.title}
                  </p>
                  <p className="text-xs text-gray-400 truncate">{trip.destination}</p>
                  {days !== null && (
                    <p className="mt-0.5 text-xs font-medium text-sky-500">
                      {countdownLabel(days)}
                    </p>
                  )}
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
