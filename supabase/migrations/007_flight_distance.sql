alter table public.flights
  add column if not exists distance_miles integer;
