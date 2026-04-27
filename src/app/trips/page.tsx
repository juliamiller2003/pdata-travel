import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import dynamic from "next/dynamic";
import TripCard from "@/components/TripCard";

const TravelMap = dynamic(() => import("@/components/TravelMap"), { ssr: false });

export default async function TripsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const [{ data: trips }, { data: settings }] = await Promise.all([
    supabase.from("trips").select("*").order("created_at", { ascending: false }),
    supabase.from("user_settings").select("*").eq("user_id", user.id).single(),
  ]);

  const allTrips = trips ?? [];
  const mapView = settings?.map_view ?? "world";
  const homeCountryCode = settings?.home_country_code ?? null;

  return (
    <div>
      {/* Travel Map */}
      <TravelMap
        trips={allTrips}
        mapView={mapView}
        homeCountryCode={homeCountryCode}
      />

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
        <Link href="/trips/new" className="btn-primary">
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
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {allTrips.map((trip) => (
            <TripCard key={trip.id} trip={trip} />
          ))}
        </div>
      )}
    </div>
  );
}
