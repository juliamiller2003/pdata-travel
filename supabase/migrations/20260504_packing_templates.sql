-- Custom packing templates table
create table if not exists packing_templates (
  id          uuid default gen_random_uuid() primary key,
  user_id     uuid references auth.users(id) on delete cascade not null,
  name        text not null,
  items       jsonb default '[]',
  created_at  timestamptz default now()
);

alter table packing_templates enable row level security;

drop policy if exists "Users manage own packing templates" on packing_templates;
create policy "Users manage own packing templates" on packing_templates
  using  (user_id = auth.uid())
  with check (user_id = auth.uid());

grant select, insert, update, delete on table packing_templates to authenticated;
grant select, insert, update, delete on table packing_templates to anon;
