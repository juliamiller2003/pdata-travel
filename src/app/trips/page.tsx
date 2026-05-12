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

  // Auto-update trip statuses based on today's date.
  // Fire-and-forget: kick off status updates and data fetches in parallel
  // so status corrections don't block rendering on this visit.
  const today = new Date().toISOString().split("T")[0];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabase as any;

  const statusUpdatePromise = Promise.all([
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

  // Allow status updates to settle in the background — not awaited so they
  // don't block this render. On the next page load statuses will be correct.
  void statusUpdatePromise;

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
        <div className="rounded-2xl border border-gray-200 dark:border-[#2e2e2e] overflow-hidden">
          {/* Welcome header */}
          <div className="bg-[#cadede]/40 dark:bg-[#2e2e2e]/60 px-6 py-8 text-center">
            <p className="text-2xl font-bold text-gray-900 dark:text-[#efefef]">Welcome to Pathway 👋</p>
            <p className="mt-2 text-sm text-gray-500 dark:text-[#9fb8b8] max-w-sm mx-auto">
              Your trip planner for backpackers. Create your first trip to get started.
            </p>
            <Link href="/trips/new" className="btn-primary mt-5 inline-block">
              + Create your first trip
            </Link>
          </div>
          {/* Feature highlights */}
          <div className="grid grid-cols-1 sm:grid-cols-3 divide-y sm:divide-y-0 sm:divide-x divide-gray-100 dark:divide-[#2e2e2e]">
            {[
              { emoji: "🗺️", title: "Itinerary", desc: "Plan day-by-day or let AI build a draft for you" },
              { emoji: "💸", title: "Budget tracker", desc: "Log expenses by category and track your spend" },
              { emoji: "🎒", title: "Packing lists", desc: "Build from templates and check items off as you go" },
            ].map(({ emoji, title, desc }) => (
              <div key={title} className="px-6 py-5 text-center">
                <p className="text-2xl">{emoji}</p>
                <p className="mt-2 text-sm font-semibold text-gray-700 dark:text-[#efefef]">{title}</p>
                <p className="mt-1 text-xs text-gray-400 dark:text-[#9fb8b8]">{desc}</p>
              </div>
            ))}
          </div>
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
