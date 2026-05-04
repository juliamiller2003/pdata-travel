-- Ground / sea transport legs (bus, train, ferry, taxi, etc.)
create table if not exists transport_legs (
  id               uuid default gen_random_uuid() primary key,
  trip_id          uuid references trips(id) on delete cascade not null,
  mode             text not null default 'bus',   -- bus | train | ferry | taxi | car | motorbike | subway | other
  from_location    text not null,
  to_location      text not null,
  travel_date      date not null,
  departure_time   text,                          -- stored as "HH:MM"
  arrival_time     text,                          -- stored as "HH:MM"
  duration         text,                          -- e.g. "3h 30m"
  cost             numeric(10,2),
  booking_ref      text,
  notes            text,
  created_at       timestamptz default now()
);

alter table transport_legs enable row level security;

drop policy if exists "Users manage own transport legs" on transport_legs;
create policy "Users manage own transport legs" on transport_legs
  using  (trip_id in (select id from trips where user_id = auth.uid()))
  with check (trip_id in (select id from trips where user_id = auth.uid()));


-- Saved map locations for offline reference
create table if not exists saved_map_links (
  id          uuid default gen_random_uuid() primary key,
  trip_id     uuid references trips(id) on delete cascade not null,
  label       text not null,
  url         text,
  lat         numeric(10,7),
  lng         numeric(10,7),
  notes       text,
  created_at  timestamptz default now()
);

alter table saved_map_links enable row level security;

drop policy if exists "Users manage own map links" on saved_map_links;
create policy "Users manage own map links" on saved_map_links
  using  (trip_id in (select id from trips where user_id = auth.uid()))
  with check (trip_id in (select id from trips where user_id = auth.uid()));
