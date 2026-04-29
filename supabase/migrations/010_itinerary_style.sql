alter table public.trips
  add column if not exists itinerary_style text not null default 'structured'
    check (itinerary_style in ('structured', 'notes', 'notes_day_night', 'notes_day_afternoon_night')),
  add column if not exists itinerary_notes text;

alter table public.itinerary_days
  add column if not exists section_notes jsonb not null default '{}';
