import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Suspense } from "react";
import { byAlpha2, ALL_CONTINENTS } from "@/lib/countries";
import StatsPeriodTabs from "@/components/StatsPeriodTabs";

interface StatsPageProps {
  searchParams: { period?: string };
}

function getCutoff(period: string): Date | null {
  const now = new Date();
  if (period === "3m") return new Date(now.getFullYear(), now.getMonth() - 3, now.getDate());
  if (period === "1y") return new Date(now.getFullYear() - 1, now.getMonth(), now.getDate());
  if (period === "ytd") return new Date(now.getFullYear(), 0, 1);
  return null; // all time
}

function daysForTrip(trip: { start_date: string | null; end_date: string | null; status: string }, today: Date): number {
  if (!trip.start_date) return 0;
  const start = new Date(trip.start_date + "T00:00:00");
  const endRaw = trip.end_date
    ? new Date(trip.end_date + "T00:00:00")
    : trip.status === "ongoing" ? today : null;
  if (!endRaw) return 0;
  return Math.max(0, Math.round((endRaw.getTime() - start.getTime()) / 86400000) + 1);
}

export default async function StatsPage({ searchParams }: StatsPageProps) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { period: rawPeriod } = searchParams;
  const period = ["3m", "1y", "ytd", "all"].includes(rawPeriod ?? "") ? (rawPeriod ?? "all") : "all";
  const cutoff = getCutoff(period);
  const today = new Date();

  const [{ data: trips }, { data: flights }] = await Promise.all([
    supabase
      .from("trips")
      .select("country_code, country_codes, status, start_date, end_date, destination, title, id"),
    supabase
      .from("flights")
      .select("distance_miles, flight_date"),
  ]);

  const allTrips = trips ?? [];
  const allFlights = flights ?? [];

  // Filter by period — use start_date for trips, flight_date for flights
  const filteredTrips = cutoff
    ? allTrips.filter((t) => t.start_date && new Date(t.start_date) >= cutoff)
    : allTrips;

  const filteredFlights = cutoff
    ? allFlights.filter((f) => f.flight_date && new Date(f.flight_date) >= cutoff)
    : allFlights;

  const totalMiles = filteredFlights
    .filter((f) => f.distance_miles != null)
    .reduce((sum, f) => sum + (f.distance_miles ?? 0), 0);

  const flightCount = filteredFlights.length;

  const totalDays = filteredTrips
    .filter((t) => t.status === "completed" || t.status === "ongoing")
    .reduce((sum, t) => sum + daysForTrip(t, today), 0);

  const visitedCodes = [
    ...new Set(
      filteredTrips.flatMap((t) =>
        (t.country_codes as string[] | null)?.length
          ? (t.country_codes as string[])
          : t.country_code ? [t.country_code] : []
      )
    ),
  ] as string[];

  const visitedContinents = [
    ...new Set(visitedCodes.map((c) => byAlpha2[c]?.continent).filter(Boolean)),
  ];

  const completedTrips = filteredTrips.filter((t) => t.status === "completed");
  const plannedTrips = allTrips.filter((t) => t.status === "planning"); // always show upcoming

  const byContinent = ALL_CONTINENTS.map((continent) => ({
    continent,
    countries: visitedCodes
      .filter((c) => byAlpha2[c]?.continent === continent)
      .map((c) => byAlpha2[c]),
  })).filter((g) => g.countries.length > 0);

  const periodLabel = { "3m": "past 3 months", "1y": "past year", ytd: "this year", all: "all time" }[period];

  return (
    <div className="mx-auto max-w-2xl">
      <nav className="mb-6 flex items-center gap-2 text-sm text-gray-500">
        <Link href="/trips" className="hover:text-brand-600">My Trips</Link>
        <span>/</span>
        <span className="text-gray-900 dark:text-gray-100 font-medium">Travel Stats</span>
      </nav>

      <h1 className="mb-6 text-2xl font-bold text-gray-900 dark:text-white">Travel Stats</h1>

      <Suspense>
        <StatsPeriodTabs period={period} />
      </Suspense>

      {/* Summary cards */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 mb-8">
        {[
          { value: visitedCodes.length,      label: visitedCodes.length === 1 ? "Country" : "Countries" },
          { value: visitedContinents.length,  label: visitedContinents.length === 1 ? "Continent" : "Continents" },
          { value: filteredTrips.length,      label: "Total Trips" },
          { value: completedTrips.length,     label: "Completed" },
          { value: totalDays,                 label: "Days Traveling" },
          { value: flightCount,               label: flightCount === 1 ? "Flight" : "Flights" },
        ].map(({ value, label }) => (
          <div key={label} className="card p-5 text-center">
            <p className="text-3xl font-bold text-sky-600">{value.toLocaleString()}</p>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{label}</p>
          </div>
        ))}
      </div>

      {/* Miles flown */}
      {totalMiles > 0 && (
        <div className="card p-5 mb-8 flex items-center gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-sky-100 dark:bg-sky-900/40">
            <svg className="h-6 w-6 text-sky-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 12 3.269 3.125A59.769 59.769 0 0 1 21.485 12 59.768 59.768 0 0 1 3.27 20.875L5.999 12Zm0 0h7.5" />
            </svg>
          </div>
          <div>
            <p className="text-2xl font-bold text-sky-600">
              {totalMiles.toLocaleString()}{" "}
              <span className="text-lg font-medium text-gray-500 dark:text-gray-400">miles flown</span>
            </p>
            <p className="text-xs text-gray-400 mt-0.5">Based on flights with distance recorded · {periodLabel}</p>
          </div>
        </div>
      )}

      {/* Countries by continent */}
      {byContinent.length > 0 && (
        <section className="mb-8">
          <h2 className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">Countries by Continent</h2>
          <div className="space-y-4">
            {byContinent.map(({ continent, countries }) => (
              <div key={continent} className="card p-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-semibold text-gray-800 dark:text-gray-200">{continent}</h3>
                  <span className="rounded-full bg-sky-100 dark:bg-sky-900/40 px-2.5 py-0.5 text-xs font-medium text-sky-700 dark:text-sky-300">
                    {countries.length} {countries.length === 1 ? "country" : "countries"}
                  </span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {countries.map((c) => (
                    <span key={c.alpha2} className="rounded-full bg-gray-100 dark:bg-gray-700 px-3 py-1 text-sm text-gray-700 dark:text-gray-300">
                      {c.name}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Continents */}
      <section className="mb-8">
        <h2 className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">Continents</h2>
        <div className="flex flex-wrap gap-2">
          {ALL_CONTINENTS.map((c) => {
            const visited = visitedContinents.includes(c);
            return (
              <span key={c} className={`rounded-full px-3 py-1.5 text-sm font-medium ${visited ? "bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-300" : "bg-gray-100 text-gray-400 dark:bg-gray-800 dark:text-gray-600"}`}>
                {c}
              </span>
            );
          })}
        </div>
      </section>

      {/* Upcoming trips — always shown regardless of period */}
      {plannedTrips.length > 0 && (
        <section>
          <h2 className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">Upcoming Trips</h2>
          <div className="space-y-2">
            {plannedTrips.map((trip) => (
              <Link key={trip.id} href={`/trips/${trip.id}`} className="card flex items-center justify-between p-4 hover:shadow-md transition-shadow">
                <div>
                  <p className="font-medium text-gray-800 dark:text-gray-200">{trip.title}</p>
                  <p className="text-xs text-gray-400">{trip.destination}</p>
                </div>
                <span className="rounded-full bg-amber-100 dark:bg-amber-900/40 px-2.5 py-0.5 text-xs font-medium text-amber-700 dark:text-amber-300">Planning</span>
              </Link>
            ))}
          </div>
        </section>
      )}

      {allTrips.length === 0 && (
        <div className="rounded-2xl border-2 border-dashed border-gray-200 dark:border-gray-700 py-16 text-center text-gray-400">
          <p className="text-lg font-medium">No trips yet</p>
          <p className="text-sm mt-1">Log a visit on the map to see your stats.</p>
        </div>
      )}
    </div>
  );
}
