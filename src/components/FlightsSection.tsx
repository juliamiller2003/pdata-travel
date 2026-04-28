"use client";

import { useState } from "react";
import type { Flight } from "@/types/database";
import FlightSearch, { FlightCard } from "./FlightSearch";

interface FlightsSectionProps {
  tripId: string;
  initialFlights: Flight[];
}

export default function FlightsSection({ tripId, initialFlights }: FlightsSectionProps) {
  const [flights, setFlights] = useState<Flight[]>(initialFlights);

  async function handleDelete(flightId: string) {
    const { createClient } = await import("@/lib/supabase/client");
    const supabase = createClient();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase as any).from("flights").delete().eq("id", flightId);
    setFlights((prev) => prev.filter((f) => f.id !== flightId));
  }

  return (
    <section className="mb-8">
      <h2 className="mb-4 text-lg font-semibold text-gray-900">Flights</h2>

      <div className="space-y-3">
        {flights.map((flight) => (
          <FlightCard
            key={flight.id}
            flight={flight}
            onDelete={() => handleDelete(flight.id)}
          />
        ))}

        <FlightSearch
          tripId={tripId}
          onFlightAdded={(flight) => setFlights((prev) => [...prev, flight])}
        />
      </div>
    </section>
  );
}
