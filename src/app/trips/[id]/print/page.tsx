import { createClient } from "@/lib/supabase/server";
import { notFound, redirect } from "next/navigation";
import { byAlpha2 } from "@/lib/countries";
import { effectiveStatus } from "@/lib/tripUtils";
import PrintPageClient from "./PrintPageClient";

interface Props { params: { id: string } }

export default async function PrintItineraryPage({ params }: Props) {
  const { id } = params;
  const supabase = await createClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabase as any;

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: trip } = await db.from("trips").select("*").eq("id", id).single();
  if (!trip) notFound();

  const [{ data: days }, { data: flights }, { data: legs }, { data: accommodations }] = await Promise.all([
    db.from("itinerary_days").select("*, activities(*)").eq("trip_id", id).order("day_number"),
    db.from("flights").select("*").eq("trip_id", id).order("flight_date"),
    db.from("transport_legs").select("*").eq("trip_id", id).order("travel_date"),
    db.from("accommodations").select("*").eq("trip_id", id).order("check_in"),
  ]);

  const tripStatus = effectiveStatus(trip);
  const countryNames = (trip.country_codes as string[] ?? []).map((c: string) => byAlpha2[c]?.name ?? c);

  return (
    <PrintPageClient
      trip={{ ...trip, status: tripStatus, countryNames }}
      days={days ?? []}
      flights={flights ?? []}
      legs={legs ?? []}
      accommodations={accommodations ?? []}
    />
  );
}
