-- ── food_items ───────────────────────────────────────────────
create table public.food_items (
  id         uuid primary key default uuid_generate_v4(),
  trip_id    uuid not null references public.trips(id) on delete cascade,
  name       text not null,
  notes      text,
  tried      boolean not null default false,
  created_at timestamptz not null default now()
);

alter table public.food_items enable row level security;

create policy "Users manage their own food items"
  on public.food_items
  for all
  using  (trip_id in (select id from public.trips where user_id = auth.uid()))
  with check (trip_id in (select id from public.trips where user_id = auth.uid()));
