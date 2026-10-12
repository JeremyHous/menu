-- Collections: named groups of menus, with a required name.
create table public.collections (
  id bigint generated always as identity primary key,
  name text not null check (length(trim(name)) > 0),
  created_at timestamptz not null default now()
);

comment on table public.collections is 'Named collections of menus.';
comment on column public.collections.name is 'Collection name; must not be blank.';

-- Expose the table to the Data API roles used by supabase-js.
grant select, insert, update, delete on public.collections to anon, authenticated;

-- RLS is required for any table reachable through the Data API.
alter table public.collections enable row level security;

-- Same open access as public.menus: there is no per-user ownership yet, so
-- anyone holding the publishable key can read and write all collections.
-- Tighten these together with the menus policies once the app has
-- authentication.
create policy "Anyone can read collections"
  on public.collections for select
  to anon, authenticated
  using (true);

create policy "Anyone can create collections"
  on public.collections for insert
  to anon, authenticated
  with check (true);

create policy "Anyone can update collections"
  on public.collections for update
  to anon, authenticated
  using (true)
  with check (true);

create policy "Anyone can delete collections"
  on public.collections for delete
  to anon, authenticated
  using (true);
