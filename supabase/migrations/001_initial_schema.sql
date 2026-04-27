-- ============================================================
-- Wanderlog – initial schema
-- ============================================================

-- Enable UUID generation
create extension if not exists "uuid-ossp";

-- ── trips ────────────────────────────────────────────────────
create table public.trips (
  id              uuid primary key default uuid_generate_v4(),
  user_id         uuid not null references auth.users(id) on delete cascade,
  title           text not null,
  destination     text not null,
  start_date      date,
  end_date        date,
  cover_photo_url text,
  status          text not null default 'planning'
                    check (status in ('planning', 'ongoing', 'completed', 'cancelled')),
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

-- ── itinerary_days ───────────────────────────────────────────
create table public.itinerary_days (
  id         uuid primary key default uuid_generate_v4(),
  trip_id    uuid not null references public.trips(id) on delete cascade,
  day_number integer not null,
  date       date,
  created_at timestamptz not null default now(),
  unique (trip_id, day_number)
);

-- ── activities ───────────────────────────────────────────────
create table public.activities (
  id          uuid primary key default uuid_generate_v4(),
  day_id      uuid not null references public.itinerary_days(id) on delete cascade,
  time        time,
  title       text not null,
  notes       text,
  place_name  text,
  lat         numeric(9, 6),
  lng         numeric(9, 6),
  order_index integer not null default 0,
  created_at  timestamptz not null default now()
);

-- ── journal_entries ──────────────────────────────────────────
create table public.journal_entries (
  id         uuid primary key default uuid_generate_v4(),
  trip_id    uuid not null references public.trips(id) on delete cascade,
  day_number integer,
  content    text not null default '',
  photos     text[] not null default '{}',
  mood       text check (mood in ('amazing', 'good', 'okay', 'tough', 'terrible')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ── updated_at triggers ──────────────────────────────────────
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger trips_updated_at
  before update on public.trips
  for each row execute procedure public.set_updated_at();

create trigger journal_entries_updated_at
  before update on public.journal_entries
  for each row execute procedure public.set_updated_at();

-- ── Row Level Security ───────────────────────────────────────
alter table public.trips           enable row level security;
alter table public.itinerary_days  enable row level security;
alter table public.activities      enable row level security;
alter table public.journal_entries enable row level security;

-- trips: owners only
create policy "trips: owner select"
  on public.trips for select
  using (auth.uid() = user_id);

create policy "trips: owner insert"
  on public.trips for insert
  with check (auth.uid() = user_id);

create policy "trips: owner update"
  on public.trips for update
  using (auth.uid() = user_id);

create policy "trips: owner delete"
  on public.trips for delete
  using (auth.uid() = user_id);

-- itinerary_days: follow trip ownership
create policy "itinerary_days: owner select"
  on public.itinerary_days for select
  using (
    exists (
      select 1 from public.trips
      where trips.id = itinerary_days.trip_id
        and trips.user_id = auth.uid()
    )
  );

create policy "itinerary_days: owner insert"
  on public.itinerary_days for insert
  with check (
    exists (
      select 1 from public.trips
      where trips.id = itinerary_days.trip_id
        and trips.user_id = auth.uid()
    )
  );

create policy "itinerary_days: owner update"
  on public.itinerary_days for update
  using (
    exists (
      select 1 from public.trips
      where trips.id = itinerary_days.trip_id
        and trips.user_id = auth.uid()
    )
  );

create policy "itinerary_days: owner delete"
  on public.itinerary_days for delete
  using (
    exists (
      select 1 from public.trips
      where trips.id = itinerary_days.trip_id
        and trips.user_id = auth.uid()
    )
  );

-- activities: follow trip ownership through itinerary_days
create policy "activities: owner select"
  on public.activities for select
  using (
    exists (
      select 1
      from public.itinerary_days d
      join public.trips t on t.id = d.trip_id
      where d.id = activities.day_id
        and t.user_id = auth.uid()
    )
  );

create policy "activities: owner insert"
  on public.activities for insert
  with check (
    exists (
      select 1
      from public.itinerary_days d
      join public.trips t on t.id = d.trip_id
      where d.id = activities.day_id
        and t.user_id = auth.uid()
    )
  );

create policy "activities: owner update"
  on public.activities for update
  using (
    exists (
      select 1
      from public.itinerary_days d
      join public.trips t on t.id = d.trip_id
      where d.id = activities.day_id
        and t.user_id = auth.uid()
    )
  );

create policy "activities: owner delete"
  on public.activities for delete
  using (
    exists (
      select 1
      from public.itinerary_days d
      join public.trips t on t.id = d.trip_id
      where d.id = activities.day_id
        and t.user_id = auth.uid()
    )
  );

-- journal_entries: follow trip ownership
create policy "journal_entries: owner select"
  on public.journal_entries for select
  using (
    exists (
      select 1 from public.trips
      where trips.id = journal_entries.trip_id
        and trips.user_id = auth.uid()
    )
  );

create policy "journal_entries: owner insert"
  on public.journal_entries for insert
  with check (
    exists (
      select 1 from public.trips
      where trips.id = journal_entries.trip_id
        and trips.user_id = auth.uid()
    )
  );

create policy "journal_entries: owner update"
  on public.journal_entries for update
  using (
    exists (
      select 1 from public.trips
      where trips.id = journal_entries.trip_id
        and trips.user_id = auth.uid()
    )
  );

create policy "journal_entries: owner delete"
  on public.journal_entries for delete
  using (
    exists (
      select 1 from public.trips
      where trips.id = journal_entries.trip_id
        and trips.user_id = auth.uid()
    )
  );
