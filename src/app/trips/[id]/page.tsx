import { createClient } from "@/lib/supabase/server";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import type { TripStatus, Mood } from "@/types/database";

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
  params: Promise<{ id: string }>;
}

export default async function TripDetailPage({ params }: TripPageProps) {
  const { id } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Fetch trip
  const { data: trip } = await supabase
    .from("trips")
    .select("*")
    .eq("id", id)
    .single();

  if (!trip) notFound();

  // Fetch itinerary days + activities
  const { data: days } = await supabase
    .from("itinerary_days")
    .select("*, activities(*)")
    .eq("trip_id", id)
    .order("day_number");

  // Fetch journal entries
  const { data: journal } = await supabase
    .from("journal_entries")
    .select("*")
    .eq("trip_id", id)
    .order("created_at", { ascending: false });

  const itinerary = days ?? [];
  const entries = journal ?? [];

  return (
    <div className="mx-auto max-w-3xl">
      {/* Breadcrumb */}
      <nav className="mb-6 flex items-center gap-2 text-sm text-gray-500">
        <Link href="/trips" className="hover:text-brand-600">My Trips</Link>
        <span>/</span>
        <span className="text-gray-900 font-medium truncate">{trip.title}</span>
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
            <span className={`rounded-full px-3 py-1 text-xs font-semibold ${STATUS_STYLES[trip.status]}`}>
              {trip.status.charAt(0).toUpperCase() + trip.status.slice(1)}
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
              <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_STYLES[trip.status]}`}>
                {trip.status.charAt(0).toUpperCase() + trip.status.slice(1)}
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
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
              {trip.photos.map((url, i) => (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  key={i}
                  src={url}
                  alt={`Photo ${i + 1}`}
                  className={`aspect-square w-full rounded-lg object-cover ${url === trip.cover_photo_url ? "ring-2 ring-sky-500" : ""}`}
                />
              ))}
            </div>
            {trip.cover_photo_url && (
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
      <section className="mb-8">
        <h2 className="mb-4 text-lg font-semibold text-gray-900">Itinerary</h2>

        {itinerary.length === 0 ? (
          <div className="rounded-xl border-2 border-dashed border-gray-200 py-12 text-center text-sm text-gray-400">
            No itinerary days yet.
          </div>
        ) : (
          <div className="space-y-4">
            {itinerary.map((day) => {
              const activities = (day as { activities?: { id: string; time: string | null; title: string; place_name: string | null }[] }).activities ?? [];
              return (
                <div key={day.id} className="card p-4">
                  <div className="mb-3 flex items-center gap-2">
                    <span className="flex h-7 w-7 items-center justify-center rounded-full bg-brand-600 text-xs font-bold text-white">
                      {day.day_number}
                    </span>
                    <span className="text-sm font-medium text-gray-700">
                      Day {day.day_number}
                      {day.date && (
                        <span className="ml-2 text-gray-400">
                          · {new Date(day.date).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                        </span>
                      )}
                    </span>
                  </div>

                  {activities.length === 0 ? (
                    <p className="text-xs text-gray-400">No activities planned.</p>
                  ) : (
                    <ul className="space-y-2">
                      {activities.map((act) => (
                        <li key={act.id} className="flex items-start gap-3 text-sm">
                          <span className="mt-0.5 shrink-0 w-12 text-xs text-gray-400 font-mono">
                            {act.time?.slice(0, 5) ?? "—"}
                          </span>
                          <div>
                            <p className="font-medium text-gray-800">{act.title}</p>
                            {act.place_name && (
                              <p className="text-xs text-gray-400">{act.place_name}</p>
                            )}
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Journal */}
      <section>
        <h2 className="mb-4 text-lg font-semibold text-gray-900">Journal</h2>

        {entries.length === 0 ? (
          <div className="rounded-xl border-2 border-dashed border-gray-200 py-12 text-center text-sm text-gray-400">
            No journal entries yet.
          </div>
        ) : (
          <div className="space-y-4">
            {entries.map((entry) => (
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
                    <span className="text-lg" title={entry.mood}>
                      {MOOD_EMOJI[entry.mood]}
                    </span>
                  )}
                </div>
                <p className="text-sm text-gray-700 whitespace-pre-wrap">{entry.content}</p>
                {entry.photos.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {entry.photos.map((url, i) => (
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
