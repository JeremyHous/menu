-- Per-user ownership for menus, collections and tags, enforced by RLS.
--
-- Every row that exists before this migration is part of the shared basis:
-- its user_id stays null, and every signed-in user can read, edit and delete
-- it. Rows created from now on belong to their creator (user_id defaults to
-- auth.uid()) and only that user can reach them. menu_tags has no owner of
-- its own: a link is reachable when both its menu and its tag are.
--
-- Signed-out requests (the anon role) lose all access to these tables.

-- Ownership columns. Deleting a user deletes their rows.

alter table public.collections
  add column user_id uuid default auth.uid()
    references auth.users (id) on delete cascade;
alter table public.tags
  add column user_id uuid default auth.uid()
    references auth.users (id) on delete cascade;
alter table public.menus
  add column user_id uuid default auth.uid()
    references auth.users (id) on delete cascade;

comment on column public.collections.user_id is
  'Owner. Null for the shared rows that existed before ownership was added.';
comment on column public.tags.user_id is
  'Owner. Null for the shared rows that existed before ownership was added.';
comment on column public.menus.user_id is
  'Owner. Null for the shared rows that existed before ownership was added.';

-- The RLS policies filter on user_id.
create index collections_user_id_idx on public.collections (user_id);
create index tags_user_id_idx on public.tags (user_id);
create index menus_user_id_idx on public.menus (user_id);

-- Privileges. Only signed-in users get access. UPDATE is granted per column
-- and leaves out user_id, so no one can take over a shared row or hand a row
-- to someone else.

revoke all on public.menus, public.collections, public.tags, public.menu_tags
  from anon, authenticated;

grant select, insert, delete
  on public.menus, public.collections, public.tags, public.menu_tags
  to authenticated;
grant update (name) on public.collections, public.tags to authenticated;
grant update (
  title, body, ingredients, carbon_footprint_kg, fans_appreciation,
  supplier_name, collection_id
) on public.menus to authenticated;

-- Replace the open policies.

drop policy "Anyone can read collections" on public.collections;
drop policy "Anyone can create collections" on public.collections;
drop policy "Anyone can update collections" on public.collections;
drop policy "Anyone can delete collections" on public.collections;

drop policy "Anyone can read tags" on public.tags;
drop policy "Anyone can create tags" on public.tags;
drop policy "Anyone can update tags" on public.tags;
drop policy "Anyone can delete tags" on public.tags;

drop policy "Anyone can read menus" on public.menus;
drop policy "Anyone can create menus" on public.menus;
drop policy "Anyone can update menus" on public.menus;
drop policy "Anyone can delete menus" on public.menus;

drop policy "Anyone can read menu tags" on public.menu_tags;
drop policy "Anyone can create menu tags" on public.menu_tags;
drop policy "Anyone can update menu tags" on public.menu_tags;
drop policy "Anyone can delete menu tags" on public.menu_tags;

alter table public.collections enable row level security;
alter table public.tags enable row level security;
alter table public.menus enable row level security;
alter table public.menu_tags enable row level security;

-- Collections: shared rows and the user's own.

create policy "Users read shared and own collections"
  on public.collections for select to authenticated
  using (user_id is null or user_id = (select auth.uid()));

create policy "Users create own collections"
  on public.collections for insert to authenticated
  with check (user_id = (select auth.uid()));

create policy "Users update shared and own collections"
  on public.collections for update to authenticated
  using (user_id is null or user_id = (select auth.uid()))
  with check (user_id is null or user_id = (select auth.uid()));

create policy "Users delete shared and own collections"
  on public.collections for delete to authenticated
  using (user_id is null or user_id = (select auth.uid()));

-- Tags: the same rules.

create policy "Users read shared and own tags"
  on public.tags for select to authenticated
  using (user_id is null or user_id = (select auth.uid()));

create policy "Users create own tags"
  on public.tags for insert to authenticated
  with check (user_id = (select auth.uid()));

create policy "Users update shared and own tags"
  on public.tags for update to authenticated
  using (user_id is null or user_id = (select auth.uid()))
  with check (user_id is null or user_id = (select auth.uid()));

create policy "Users delete shared and own tags"
  on public.tags for delete to authenticated
  using (user_id is null or user_id = (select auth.uid()));

-- Menus: the same rules, plus a check on collection_id. Foreign keys ignore
-- RLS, so without it a user could file a menu into someone else's private
-- collection. A shared menu may only go into a shared collection, so that
-- every user who sees it can also see its collection. A user's own menu may
-- go into a shared collection or one of theirs.

create policy "Users read shared and own menus"
  on public.menus for select to authenticated
  using (user_id is null or user_id = (select auth.uid()));

create policy "Users create own menus"
  on public.menus for insert to authenticated
  with check (
    user_id = (select auth.uid())
    and (
      collection_id is null
      or exists (
        select 1 from public.collections c
        where c.id = menus.collection_id
          and (c.user_id is null or c.user_id = (select auth.uid()))
      )
    )
  );

create policy "Users update shared and own menus"
  on public.menus for update to authenticated
  using (user_id is null or user_id = (select auth.uid()))
  with check (
    (user_id is null or user_id = (select auth.uid()))
    and (
      collection_id is null
      or exists (
        select 1 from public.collections c
        where c.id = menus.collection_id
          and (
            c.user_id is null
            or (
              c.user_id = (select auth.uid())
              and menus.user_id = (select auth.uid())
            )
          )
      )
    )
  );

create policy "Users delete shared and own menus"
  on public.menus for delete to authenticated
  using (user_id is null or user_id = (select auth.uid()));

-- Menu tags: reachable when the user can reach both the menu and the tag.
-- The subqueries run under the menus and tags policies above. Links are
-- never updated, only added and removed.

create policy "Users read links between visible menus and tags"
  on public.menu_tags for select to authenticated
  using (
    exists (select 1 from public.menus m where m.id = menu_tags.menu_id)
    and exists (select 1 from public.tags t where t.id = menu_tags.tag_id)
  );

create policy "Users link visible menus and tags"
  on public.menu_tags for insert to authenticated
  with check (
    exists (select 1 from public.menus m where m.id = menu_tags.menu_id)
    and exists (select 1 from public.tags t where t.id = menu_tags.tag_id)
  );

create policy "Users unlink visible menus and tags"
  on public.menu_tags for delete to authenticated
  using (
    exists (select 1 from public.menus m where m.id = menu_tags.menu_id)
    and exists (select 1 from public.tags t where t.id = menu_tags.tag_id)
  );
