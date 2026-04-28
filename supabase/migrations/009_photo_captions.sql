alter table public.trips
  add column if not exists photo_captions jsonb not null default '{}';
