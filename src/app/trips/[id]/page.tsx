import { createClient } from "@/lib/supabase/server";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import type { TripStatus } from "@/types/database";
import FlightsSection from "@/components/FlightsSection";
import ExpensesSection from "@/components/ExpensesSection";
import ItinerarySection from "@/components/ItinerarySection";
import TripMapView from "@/components/TripMapView";
import TripPhotosSection from "@/components/TripPhotosSection";
import JournalSection from "@/components/JournalSection";
import SectionGuard from "@/components/SectionGuard";
import { byAlpha2 } from "@/lib/countries";
import CountryProfileSection from "@/components/CountryProfileSection";

const STATUS_STYLES: Record<TripStatus, string> = {
  planning:  "bg-[#e5dd83] dark:bg-[#f5ee9e] text-[#1e1e1e]",
  ongoing:   "bg-[#cadede] text-[#1e1e1e]",
  completed: "bg-[#9fb8b8] text-[#1e1e1e]",
  cancelled: "bg-[#e0e0e0] text-[#1e1e1e]",
};


function effectiveStatus(trip: { status: string; start_date: string | null; end_date: string | null }): TripStatus {
  const status = trip.status as TripStatus;
  if (status === "cancelled") return "cancelled";
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  if (trip.end_date) {
    const end = new Date(trip.end_date);
    end.setHours(0, 0, 0, 0);
    if (today > end && status !== "completed") return "completed";
  }
  if (trip.start_date) {
    const start = new Date(trip.start_date);
    start.setHours(0, 0, 0, 0);
    if (today >= start && (!trip.end_date || today <= new Date(trip.end_date)) && status === "planning") return "ongoing";
  }
  return status;
}

function formatDate(d: string | null) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

interface TripPageProps {
  params: { id: string };
}

export default async function TripDetailPage({ params }: TripPageProps) {
  const { id } = params;
  const supabase = await createClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabase as any;

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Fetch trip
  const { data: trip } = await db
    .from("trips")
    .select("*")
    .eq("id", id)
    .single();

  if (!trip) notFound();

  // Fetch itinerary days + activities
  const { data: days } = await db
    .from("itinerary_days")
    .select("*, activities(*)")
    .eq("trip_id", id)
    .order("day_number");

  // Fetch journal entries, flights, and expenses in parallel
  const [{ data: journal }, { data: flightsData }, { data: expensesData }] = await Promise.all([
    db
      .from("journal_entries")
      .select("*")
      .eq("trip_id", id)
      .order("created_at", { ascending: false }),
    db
      .from("flights")
      .select("*")
      .eq("trip_id", id)
      .order("flight_date"),
    db
      .from("expenses")
      .select("*")
      .eq("trip_id", id)
      .order("date", { ascending: false }),
  ]);

  const itinerary = days ?? [];
  const entries = journal ?? [];
  const flights = flightsData ?? [];
  const tripStatus = effectiveStatus(trip);

  // Flatten all activities across itinerary days for the map
  const allActivities = itinerary.flatMap((day: any) => // eslint-disable-line @typescript-eslint/no-explicit-any
    ((day.activities ?? []) as { id: string; title: string; place_name: string | null; lat: number | null; lng: number | null }[])
  );

  return (
    <div className="mx-auto max-w-3xl">
      {/* Breadcrumb */}
      <nav className="mb-6 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <Link href="/trips" className="hover:text-brand-600">My Trips</Link>
          <span>/</span>
          <span className="text-gray-900 font-medium truncate">{trip.title}</span>
        </div>
        <Link
          href={`/trips/${id}/edit`}
          className="flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm font-medium text-gray-600 hover:border-sky-300 hover:text-sky-600 transition-colors"
        >
          <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125" />
          </svg>
          Edit
        </Link>
      </nav>

      {/* Hero */}
      {trip.cover_photo_url ? (
        <div className="relative mb-8 h-56 w-full overflow-hidden rounded-2xl">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={trip.cover_photo_url}
            alt={trip.destination}
            className="h-full w-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
          <div className="absolute bottom-0 left-0 p-6">
            <div className="flex items-center gap-3 mb-2">
              <span className={`rounded-full px-3 py-1 text-xs font-semibold ${STATUS_STYLES[tripStatus]}`}>
                {tripStatus.charAt(0).toUpperCase() + tripStatus.slice(1)}
              </span>
            </div>
            <h1 className="text-2xl font-bold text-white">{trip.title}</h1>
            <p className="text-white/80 text-sm mt-1">{trip.destination}</p>
          </div>
        </div>
      ) : (
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">{trip.title}</h1>
        </div>
      )}

      {/* Meta */}
      <div className="mb-6 p-5 space-y-4">
        <dl className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <div>
            <dt className="text-xs font-medium text-gray-500 uppercase tracking-wide">Destination</dt>
            <dd className="mt-1 text-sm text-gray-900 font-medium">{trip.destination}</dd>
          </div>
          {trip.country_codes && trip.country_codes.length > 0 && (
            <div className="col-span-2 sm:col-span-4">
              <dt className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1.5">
                {trip.country_codes.length === 1 ? "Country" : "Countries"}
              </dt>
              <dd className="flex flex-wrap gap-1.5">
                {(trip.country_codes as string[]).map((code: string) => (
                  <span key={code} className="rounded-full bg-[#cadede] px-2.5 py-0.5 text-xs font-medium text-[#1e1e1e]">
                    {byAlpha2[code]?.name ?? code}
                  </span>
                ))}
              </dd>
            </div>
          )}
          <div>
            <dt className="text-xs font-medium text-gray-500 uppercase tracking-wide">Start</dt>
            <dd className="mt-1 text-sm text-gray-900 font-medium">{formatDate(trip.start_date)}</dd>
          </div>
          <div>
            <dt className="text-xs font-medium text-gray-500 uppercase tracking-wide">End</dt>
            <dd className="mt-1 text-sm text-gray-900 font-medium">{formatDate(trip.end_date)}</dd>
          </div>
          <div>
            <dt className="text-xs font-medium text-gray-500 uppercase tracking-wide">Status</dt>
            <dd className="mt-1">
              <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_STYLES[tripStatus]}`}>
                {tripStatus.charAt(0).toUpperCase() + tripStatus.slice(1)}
              </span>
            </dd>
          </div>
        </dl>

        {trip.country_codes && trip.country_codes.length > 0 && tripStatus !== "completed" && (
          <CountryProfileSection
            countryCodes={trip.country_codes as string[]}
            startDate={trip.start_date ?? null}
          />
        )}

        {trip.notes && (
          <div className="border-t border-gray-100 pt-4">
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Notes</p>
            <p className="text-sm text-gray-700 whitespace-pre-wrap">{trip.notes}</p>
          </div>
        )}


        {trip.external_link && (
          <div className="border-t border-gray-100 pt-4">
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Links</p>
            <a
              href={trip.external_link}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-sm text-sky-600 hover:underline"
            >
              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
              {trip.external_link}
            </a>
          </div>
        )}
      </div>

      <SectionGuard section="itinerary">
        <ItinerarySection
          tripId={id}
          initialDays={itinerary}
          tripStartDate={trip.start_date ?? null}
          tripEndDate={trip.end_date ?? null}
          destination={trip.destination}
          style={trip.itinerary_style ?? "structured"}
          initialNotes={trip.itinerary_notes ?? null}
        />
      </SectionGuard>

      <SectionGuard section="map">
        <TripMapView flights={flights} activities={allActivities} />
      </SectionGuard>

      <SectionGuard section="flights">
        <FlightsSection tripId={id} initialFlights={flights} />
      </SectionGuard>

      <SectionGuard section="expenses">
        <ExpensesSection tripId={id} budget={trip.budget} initialExpenses={expensesData ?? []} />
      </SectionGuard>

      <SectionGuard section="journal">
        <section>
          <TripPhotosSection
            tripId={id}
            initialPhotos={(trip.photos as string[]) ?? []}
            initialCaptions={(trip.photo_captions as Record<string, string>) ?? {}}
          />
          <JournalSection
            tripId={id}
            initialEntries={entries ?? []}
            initialDays={itinerary.map((d: any) => ({ id: d.id, day_number: d.day_number, date: d.date }))} // eslint-disable-line @typescript-eslint/no-explicit-any
          />
        </section>
      </SectionGuard>
    </div>
  );
}
