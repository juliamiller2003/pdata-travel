-- Add country_code (ISO 3166-1 alpha-2) to trips
alter table public.trips add column if not exists country_code text;

-- User settings
create table if not exists public.user_settings (
  user_id          uuid primary key references auth.users(id) on delete cascade,
  map_view         text not null default 'world'
                     check (map_view in ('world', 'country')),
  home_country_code text,
  updated_at       timestamptz not null default now()
);

alter table public.user_settings enable row level security;

create policy "user_settings: owner select"
  on public.user_settings for select
  using (auth.uid() = user_id);

create policy "user_settings: owner insert"
  on public.user_settings for insert
  with check (auth.uid() = user_id);

create policy "user_settings: owner update"
  on public.user_settings for update
  using (auth.uid() = user_id);

create trigger user_settings_updated_at
  before update on public.user_settings
  for each row execute procedure public.set_updated_at();
