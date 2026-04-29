import { createClient } from "@/lib/supabase/server";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import type { TripStatus, Mood } from "@/types/database";
import FlightsSection from "@/components/FlightsSection";
import ExpensesSection from "@/components/ExpensesSection";
import ItinerarySection from "@/components/ItinerarySection";
import { byAlpha2 } from "@/lib/countries";

const STATUS_STYLES: Record<TripStatus, string> = {
  planning:  "bg-amber-100 text-amber-800",
  ongoing:   "bg-green-100 text-green-800",
  completed: "bg-blue-100 text-blue-800",
  cancelled: "bg-gray-100 text-gray-500",
};

const MOOD_EMOJI: Record<Mood, string> = {
  amazing:  "🤩",
  good:     "😊",
  okay:     "😐",
  tough:    "😔",
  terrible: "😞",
};

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
      <div className="relative mb-8 h-56 w-full overflow-hidden rounded-2xl bg-gradient-to-br from-brand-600 to-brand-900">
        {trip.cover_photo_url && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={trip.cover_photo_url}
            alt={trip.destination}
            className="h-full w-full object-cover"
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
        <div className="absolute bottom-0 left-0 p-6">
          <div className="flex items-center gap-3 mb-2">
            <span className={`rounded-full px-3 py-1 text-xs font-semibold ${STATUS_STYLES[trip.status as TripStatus]}`}>
              {(trip.status as string).charAt(0).toUpperCase() + (trip.status as string).slice(1)}
            </span>
          </div>
          <h1 className="text-2xl font-bold text-white">{trip.title}</h1>
          <p className="text-white/80 text-sm mt-1">{trip.destination}</p>
        </div>
      </div>

      {/* Meta */}
      <div className="card mb-6 p-5 space-y-4">
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
                  <span key={code} className="rounded-full bg-sky-100 px-2.5 py-0.5 text-xs font-medium text-sky-700">
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
              <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_STYLES[trip.status as TripStatus]}`}>
                {(trip.status as string).charAt(0).toUpperCase() + (trip.status as string).slice(1)}
              </span>
            </dd>
          </div>
        </dl>

        {trip.notes && (
          <div className="border-t border-gray-100 pt-4">
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Notes</p>
            <p className="text-sm text-gray-700 whitespace-pre-wrap">{trip.notes}</p>
          </div>
        )}

        {/* Photo gallery */}
        {trip.photos && trip.photos.length > 0 && (
          <div className="border-t border-gray-100 pt-4">
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">Photos</p>
            <div className="grid grid-cols-3 gap-3 sm:grid-cols-4">
              {(trip.photos as string[]).map((url: string, i: number) => {
                const caption = (trip.photo_captions as Record<string, string>)?.[url];
                return (
                  <div key={i} className="space-y-1">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={url}
                      alt={caption ?? `Photo ${i + 1}`}
                      className={`aspect-square w-full rounded-lg object-cover ${url === trip.cover_photo_url ? "ring-2 ring-sky-500" : ""}`}
                    />
                    {caption && (
                      <p className="text-xs text-gray-500 dark:text-gray-400 leading-snug">{caption}</p>
                    )}
                  </div>
                );
              })}
            </div>
            {trip.cover_photo_url && trip.photos.length > 1 && (
              <p className="mt-1.5 text-xs text-gray-400">Ring = cover photo</p>
            )}
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

      {/* Itinerary */}
      <ItinerarySection
        tripId={id}
        initialDays={itinerary}
        tripStartDate={trip.start_date ?? null}
        tripEndDate={trip.end_date ?? null}
        destination={trip.destination}
        style={trip.itinerary_style ?? "structured"}
        initialNotes={trip.itinerary_notes ?? null}
      />

      {/* Flights */}
      <FlightsSection tripId={id} initialFlights={flights} />

      {/* Budget & Expenses */}
      <ExpensesSection tripId={id} budget={trip.budget} initialExpenses={expensesData ?? []} />

      {/* Journal */}
      <section>
        <h2 className="mb-4 text-lg font-semibold text-gray-900">Journal</h2>

        {entries.length === 0 ? (
          <div className="rounded-xl border-2 border-dashed border-gray-200 py-12 text-center text-sm text-gray-400">
            No journal entries yet.
          </div>
        ) : (
          <div className="space-y-4">
            {entries.map((entry: any) => ( // eslint-disable-line @typescript-eslint/no-explicit-any
              <div key={entry.id} className="card p-5">
                <div className="mb-3 flex items-center justify-between">
                  <span className="text-xs text-gray-400">
                    {entry.day_number ? `Day ${entry.day_number} · ` : ""}
                    {new Date(entry.created_at).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </span>
                  {entry.mood && (
                    <span className="text-lg" title={entry.mood as string}>
                      {MOOD_EMOJI[entry.mood as Mood]}
                    </span>
                  )}
                </div>
                <p className="text-sm text-gray-700 whitespace-pre-wrap">{entry.content}</p>
                {entry.photos.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {(entry.photos as string[]).map((url: string, i: number) => (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        key={i}
                        src={url}
                        alt={`Photo ${i + 1}`}
                        className="h-20 w-20 rounded-lg object-cover"
                      />
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
