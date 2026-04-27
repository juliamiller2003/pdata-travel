import Link from "next/link";
import type { Trip, TripStatus } from "@/types/database";

const STATUS_STYLES: Record<TripStatus, string> = {
  planning:  "bg-amber-100 text-amber-800",
  ongoing:   "bg-green-100 text-green-800",
  completed: "bg-blue-100 text-blue-800",
  cancelled: "bg-gray-100 text-gray-500",
};

const STATUS_LABELS: Record<TripStatus, string> = {
  planning:  "Planning",
  ongoing:   "Ongoing",
  completed: "Completed",
  cancelled: "Cancelled",
};

function formatDateRange(start: string | null, end: string | null): string {
  if (!start && !end) return "Dates TBD";
  const fmt = (d: string) =>
    new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  if (start && end) return `${fmt(start)} – ${fmt(end)}`;
  if (start) return `From ${fmt(start)}`;
  return `Until ${fmt(end!)}`;
}

interface TripCardProps {
  trip: Trip;
}

export default function TripCard({ trip }: TripCardProps) {
  return (
    <Link href={`/trips/${trip.id}`} className="group block">
      <div className="card overflow-hidden transition-shadow hover:shadow-md">
        {/* Cover photo */}
        <div className="relative h-40 w-full bg-gradient-to-br from-brand-600 to-brand-900">
          {trip.cover_photo_url && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={trip.cover_photo_url}
              alt={trip.destination}
              className="h-full w-full object-cover"
            />
          )}
          {/* Destination overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
          <p className="absolute bottom-3 left-3 text-base font-semibold text-white drop-shadow">
            {trip.destination}
          </p>
        </div>

        {/* Body */}
        <div className="p-4">
          <div className="flex items-start justify-between gap-2">
            <h3 className="font-semibold text-gray-900 group-hover:text-brand-700 transition-colors line-clamp-1">
              {trip.title}
            </h3>
            <span
              className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_STYLES[trip.status]}`}
            >
              {STATUS_LABELS[trip.status]}
            </span>
          </div>
          <p className="mt-1.5 text-xs text-gray-500">
            {formatDateRange(trip.start_date, trip.end_date)}
          </p>
        </div>
      </div>
    </Link>
  );
}
