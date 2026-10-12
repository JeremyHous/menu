-- Menus: one row per menu, with a required title and optional body.
create table public.menus (
  id bigint generated always as identity primary key,
  title text not null check (length(trim(title)) > 0),
  body text,
  created_at timestamptz not null default now()
);

comment on table public.menus is 'Menus created in the app.';

-- Expose the table to the Data API roles used by supabase-js.
grant select, insert, update, delete on public.menus to anon, authenticated;

-- RLS is required for any table reachable through the Data API.
alter table public.menus enable row level security;

-- There is no per-user ownership yet, so these policies let anyone holding
-- the publishable key read and write all menus. Tighten them (e.g. add a
-- user_id column and check auth.uid()) once the app has authentication.
create policy "Anyone can read menus"
  on public.menus for select
  to anon, authenticated
  using (true);

create policy "Anyone can create menus"
  on public.menus for insert
  to anon, authenticated
  with check (true);

create policy "Anyone can update menus"
  on public.menus for update
  to anon, authenticated
  using (true)
  with check (true);

create policy "Anyone can delete menus"
  on public.menus for delete
  to anon, authenticated
  using (true);
