import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import dynamic from "next/dynamic";
import TripCard from "@/components/TripCard";
import TripCountdown from "@/components/TripCountdown";
import TripPlannerWidget from "@/components/TripPlannerWidget";
import TravelPrefsBanner from "@/components/TravelPrefsBanner";

const TravelMap = dynamic(() => import("@/components/TravelMap"), { ssr: false });

export default async function TripsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  // Auto-update trip statuses based on today's date
  const today = new Date().toISOString().split("T")[0];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabase as any;

  await Promise.all([
    // planning → ongoing when start date has arrived
    db
      .from("trips")
      .update({ status: "ongoing", updated_at: new Date().toISOString() })
      .eq("status", "planning")
      .not("start_date", "is", null)
      .lte("start_date", today),

    // ongoing → completed when end date has passed
    db
      .from("trips")
      .update({ status: "completed", updated_at: new Date().toISOString() })
      .eq("status", "ongoing")
      .not("end_date", "is", null)
      .lt("end_date", today),
  ]);

  const [{ data: trips }, { data: settings }] = await Promise.all([
    db.from("trips").select("*").order("created_at", { ascending: false }),
    db.from("user_settings").select("*").eq("user_id", user.id).single(),
  ]);

  const allTrips: import("@/types/database").Trip[] = trips ?? [];
  const mapView = (settings as import("@/types/database").UserSettings | null)?.map_view ?? "world";
  const homeCountryCode = (settings as import("@/types/database").UserSettings | null)?.home_country_code ?? null;

  // Upcoming trips: planning status with a future start date, soonest first
  const upcomingTrips = allTrips
    .filter((t) => t.status === "planning" && t.start_date && t.start_date >= today)
    .sort((a, b) => (a.start_date! > b.start_date! ? 1 : -1));

  // Sort: ongoing → planning (soonest first) → completed (most recent first) → completed no date
  const statusOrder: Record<string, number> = { ongoing: 0, planning: 1, completed: 2, cancelled: 3 };
  const sortedTrips = [...allTrips].sort((a, b) => {
    if (statusOrder[a.status] !== statusOrder[b.status]) {
      return statusOrder[a.status] - statusOrder[b.status];
    }
    if (a.status === "planning") {
      if (!a.start_date && !b.start_date) return 0;
      if (!a.start_date) return 1;
      if (!b.start_date) return -1;
      return a.start_date < b.start_date ? -1 : 1;
    }
    if (a.status === "completed") {
      if (!a.start_date && !b.start_date) return 0;
      if (!a.start_date) return 1;
      if (!b.start_date) return -1;
      return a.start_date > b.start_date ? -1 : 1;
    }
    return 0;
  });

  return (
    <div>
      {/* Travel Map */}
      <TravelMap
        trips={allTrips}
        mapView={mapView}
        homeCountryCode={homeCountryCode}
      />

      {/* Upcoming trip countdowns */}
      <TripCountdown trips={upcomingTrips} />

      {/* AI Trip Planner */}
      <TripPlannerWidget />

      {/* Travel prefs onboarding prompt */}
      <TravelPrefsBanner />

      {/* Header */}
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">My Trips</h1>
          <p className="mt-1 text-sm text-gray-500">
            {allTrips.length === 0
              ? "No trips yet — start planning!"
              : `${allTrips.length} trip${allTrips.length !== 1 ? "s" : ""}`}
          </p>
        </div>
        <Link href="/trips/new" className="inline-flex items-center justify-center rounded-lg bg-gray-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 dark:bg-[#9fb8b8] dark:text-gray-900 dark:hover:bg-[#8aa8a8]">
          + New Trip
        </Link>
      </div>

      {/* Trip grid */}
      {allTrips.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-gray-200 py-24 text-center">
          <svg
            className="mb-4 h-12 w-12 text-gray-300"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={1.5}
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="12" cy="12" r="10" />
            <path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20" />
            <path d="M2 12h20" />
          </svg>
          <p className="text-lg font-medium text-gray-500">No trips yet</p>
          <p className="mt-1 text-sm text-gray-400">Plan your first adventure.</p>
          <Link href="/trips/new" className="btn-primary mt-6">
            + New Trip
          </Link>
        </div>
      ) : (
        <div className="divide-y divide-gray-100 dark:divide-transparent">
          {sortedTrips.map((trip) => (
            <TripCard key={trip.id} trip={trip} />
          ))}
        </div>
      )}
    </div>
  );
}
