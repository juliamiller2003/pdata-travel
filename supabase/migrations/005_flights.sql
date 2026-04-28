create table if not exists public.flights (
  id               uuid primary key default uuid_generate_v4(),
  trip_id          uuid not null references public.trips(id) on delete cascade,
  flight_number    text not null,
  airline          text,
  departure_airport text,
  departure_city   text,
  departure_iata   text,
  departure_time   timestamptz,
  arrival_airport  text,
  arrival_city     text,
  arrival_iata     text,
  arrival_time     timestamptz,
  flight_date      date not null,
  status           text,
  created_at       timestamptz not null default now()
);

alter table public.flights enable row level security;

create policy "flights: owner select"
  on public.flights for select
  using (
    exists (
      select 1 from public.trips
      where trips.id = flights.trip_id
        and trips.user_id = auth.uid()
    )
  );

create policy "flights: owner insert"
  on public.flights for insert
  with check (
    exists (
      select 1 from public.trips
      where trips.id = flights.trip_id
        and trips.user_id = auth.uid()
    )
  );

create policy "flights: owner delete"
  on public.flights for delete
  using (
    exists (
      select 1 from public.trips
      where trips.id = flights.trip_id
        and trips.user_id = auth.uid()
    )
  );

grant select, insert, update, delete on public.flights to authenticated;
