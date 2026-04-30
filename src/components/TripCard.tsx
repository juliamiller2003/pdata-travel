import Link from "next/link";
import type { Trip, TripStatus } from "@/types/database";

const STATUS_DOT: Record<TripStatus, string> = {
  planning:  "bg-[#e5dd83]",
  ongoing:   "bg-[#cadede]",
  completed: "bg-[#9fb8b8]",
  cancelled: "bg-gray-400",
};

const STATUS_LABELS: Record<TripStatus, string> = {
  planning:  "Planning",
  ongoing:   "Ongoing",
  completed: "Completed",
  cancelled: "Cancelled",
};

const STATUS_TEXT: Record<TripStatus, string> = {
  planning:  "text-[#1e1e1e] dark:text-[#e5dd83]",
  ongoing:   "text-[#1e1e1e] dark:text-[#cadede]",
  completed: "text-[#1e1e1e] dark:text-[#9fb8b8]",
  cancelled: "text-gray-400",
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
      <div className="flex items-center justify-between py-4 border-b border-[#e0e0e0] dark:border-[#2e2e2e] hover:opacity-70 transition-opacity">
        {/* Left: photo thumbnail + text */}
        <div className="flex items-center gap-4 min-w-0">
          {/* Thumbnail */}
          <div className="h-14 w-14 shrink-0 rounded-lg overflow-hidden bg-[#e0e0e0] dark:bg-[#2e2e2e]">
            {trip.cover_photo_url && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={trip.cover_photo_url}
                alt={trip.destination}
                className="h-full w-full object-cover"
              />
            )}
          </div>

          {/* Text */}
          <div className="min-w-0">
            <p className="font-semibold text-gray-900 dark:text-[#efefef] truncate">
              {trip.title}
            </p>
            <p className="text-sm text-gray-500 dark:text-[#9fb8b8] truncate">
              {trip.destination}
            </p>
            <p className="text-xs text-gray-400 dark:text-[#9fb8b8] mt-0.5">
              {formatDateRange(trip.start_date, trip.end_date)}
            </p>
          </div>
        </div>

        {/* Right: status */}
        <div className="shrink-0 flex items-center gap-2 ml-4">
          <span className={`h-2 w-2 rounded-full ${STATUS_DOT[trip.status]}`} />
          <span className={`text-xs font-medium hidden sm:block ${STATUS_TEXT[trip.status]}`}>
            {STATUS_LABELS[trip.status]}
          </span>
        </div>
      </div>
    </Link>
  );
}
