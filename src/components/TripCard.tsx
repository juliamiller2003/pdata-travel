import Link from "next/link";
import type { Trip, TripStatus } from "@/types/database";

const STATUS_STYLES: Record<TripStatus, string> = {
  planning:  "bg-amber-100 text-amber-800 dark:bg-[#f5ee9e] dark:text-gray-800",
  ongoing:   "bg-green-100 text-green-800 dark:bg-[#cadede] dark:text-gray-800",
  completed: "bg-blue-100 text-blue-800 dark:bg-[#9fb8b8] dark:text-gray-800",
  cancelled: "bg-gray-100 text-gray-500 dark:bg-[#efefef] dark:text-gray-600",
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
      <div className="overflow-hidden rounded-xl transition-opacity hover:opacity-90 dark:bg-[#2e2e2e] bg-white shadow-sm border border-gray-100 dark:border-transparent flex flex-col">
        {/* Cover photo */}
        <div className="relative h-48 w-full bg-gradient-to-b from-gray-200 to-gray-300 dark:from-[#3a3a3a] dark:to-[#2e2e2e]">
          {trip.cover_photo_url && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={trip.cover_photo_url}
              alt={trip.destination}
              className="h-full w-full object-cover"
            />
          )}
          {/* Destination overlay — only show on photos */}
          {trip.cover_photo_url && (
            <>
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
              <p className="absolute bottom-3 left-3 text-base font-semibold text-white drop-shadow">
                {trip.destination}
              </p>
            </>
          )}
        </div>

        {/* Body */}
        <div className="p-4 flex-1 flex flex-col justify-between">
          {!trip.cover_photo_url && (
            <p className="mb-1 text-xs text-gray-400 dark:text-[#9fb8b8]">{trip.destination}</p>
          )}
          <div className="flex items-start justify-between gap-2">
            <h3 className="font-semibold text-gray-900 dark:text-[#efefef] group-hover:text-brand-700 transition-colors line-clamp-1">
              {trip.title}
            </h3>
            <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_STYLES[trip.status]}`}>
              {STATUS_LABELS[trip.status]}
            </span>
          </div>
          <p className="mt-1.5 text-xs text-gray-500 dark:text-[#9fb8b8]">
            {formatDateRange(trip.start_date, trip.end_date)}
          </p>
        </div>
      </div>
    </Link>
  );
}
