-- Add multi-country support to trips
alter table public.trips
  add column if not exists country_codes text[] not null default '{}';

-- Seed from existing single country_code where not already set
update public.trips
  set country_codes = ARRAY[country_code]
  where country_code is not null
    and (array_length(country_codes, 1) is null or array_length(country_codes, 1) = 0);
