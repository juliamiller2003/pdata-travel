-- Add photos array to trips
alter table public.trips add column if not exists photos text[] not null default '{}';

-- Create storage bucket for trip photos (run this in the Supabase dashboard SQL editor)
insert into storage.buckets (id, name, public)
values ('trip-photos', 'trip-photos', true)
on conflict (id) do nothing;

-- Storage RLS: authenticated users upload to their own folder
create policy "Users upload own trip photos"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'trip-photos'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

-- Storage RLS: public read
create policy "Trip photos public read"
  on storage.objects for select
  using (bucket_id = 'trip-photos');

-- Storage RLS: users delete own photos
create policy "Users delete own trip photos"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'trip-photos'
    and auth.uid()::text = (storage.foldername(name))[1]
  );
