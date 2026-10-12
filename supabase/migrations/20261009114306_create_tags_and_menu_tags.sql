-- Tags, and a many-to-many link between menus and tags: a menu can have
-- many tags, and a tag can be on many menus.

create table public.tags (
  id bigint generated always as identity primary key,
  name text not null check (length(trim(name)) > 0),
  created_at timestamptz not null default now()
);

comment on table public.tags is 'Labels that can be attached to menus.';
comment on column public.tags.name is 'Tag name; must not be blank.';

-- One row per tag on a menu. The composite primary key stops the same tag
-- being attached to the same menu twice. Deleting a menu or a tag deletes
-- its rows here, so no link points at a missing menu or tag.
create table public.menu_tags (
  menu_id bigint not null references public.menus (id) on delete cascade,
  tag_id bigint not null references public.tags (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (menu_id, tag_id)
);

comment on table public.menu_tags is 'Which tags are attached to which menus.';

-- The primary key already serves lookups by menu_id (its first column).
-- This index serves the reverse, "menus with this tag", and the cascade
-- when a tag is deleted.
create index menu_tags_tag_id_idx on public.menu_tags (tag_id);

-- Expose both tables to the Data API roles used by supabase-js.
grant select, insert, update, delete on public.tags to anon, authenticated;
grant select, insert, update, delete on public.menu_tags to anon, authenticated;

-- RLS is required for any table reachable through the Data API.
alter table public.tags enable row level security;
alter table public.menu_tags enable row level security;

-- Same open access as public.menus and public.collections: there is no
-- per-user ownership yet, so anyone holding the publishable key can read and
-- write all tags and menu tags. Tighten these together with the other
-- policies once the app has authentication.
create policy "Anyone can read tags"
  on public.tags for select
  to anon, authenticated
  using (true);

create policy "Anyone can create tags"
  on public.tags for insert
  to anon, authenticated
  with check (true);

create policy "Anyone can update tags"
  on public.tags for update
  to anon, authenticated
  using (true)
  with check (true);

create policy "Anyone can delete tags"
  on public.tags for delete
  to anon, authenticated
  using (true);

create policy "Anyone can read menu tags"
  on public.menu_tags for select
  to anon, authenticated
  using (true);

create policy "Anyone can create menu tags"
  on public.menu_tags for insert
  to anon, authenticated
  with check (true);

create policy "Anyone can update menu tags"
  on public.menu_tags for update
  to anon, authenticated
  using (true)
  with check (true);

create policy "Anyone can delete menu tags"
  on public.menu_tags for delete
  to anon, authenticated
  using (true);
