-- Accommodations table
create table if not exists accommodations (
  id               uuid default gen_random_uuid() primary key,
  trip_id          uuid references trips(id) on delete cascade not null,
  name             text not null,
  type             text default 'hostel',
  city             text,
  check_in         date,
  check_out        date,
  rating           integer check (rating between 1 and 5),
  cost_per_night   numeric(10,2),
  notes            text,
  created_at       timestamptz default now()
);

alter table accommodations enable row level security;

create policy "Users manage own accommodations" on accommodations
  using  (trip_id in (select id from trips where user_id = auth.uid()))
  with check (trip_id in (select id from trips where user_id = auth.uid()));

-- Packing items table
create table if not exists packing_items (
  id          uuid default gen_random_uuid() primary key,
  trip_id     uuid references trips(id) on delete cascade not null,
  name        text not null,
  category    text default 'Other',
  packed      boolean default false,
  created_at  timestamptz default now()
);

alter table packing_items enable row level security;

create policy "Users manage own packing items" on packing_items
  using  (trip_id in (select id from trips where user_id = auth.uid()))
  with check (trip_id in (select id from trips where user_id = auth.uid()));
