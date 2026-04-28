-- Add budget to trips
alter table public.trips
  add column if not exists budget numeric;

-- Expenses table
create table if not exists public.expenses (
  id          uuid primary key default uuid_generate_v4(),
  trip_id     uuid not null references public.trips(id) on delete cascade,
  title       text not null,
  amount      numeric not null,
  category    text not null default 'other',
  date        date,
  notes       text,
  created_at  timestamptz not null default now()
);

alter table public.expenses enable row level security;

create policy "expenses: owner select"
  on public.expenses for select
  using (exists (
    select 1 from public.trips
    where trips.id = expenses.trip_id and trips.user_id = auth.uid()
  ));

create policy "expenses: owner insert"
  on public.expenses for insert
  with check (exists (
    select 1 from public.trips
    where trips.id = expenses.trip_id and trips.user_id = auth.uid()
  ));

create policy "expenses: owner delete"
  on public.expenses for delete
  using (exists (
    select 1 from public.trips
    where trips.id = expenses.trip_id and trips.user_id = auth.uid()
  ));

grant select, insert, update, delete on public.expenses to authenticated;
