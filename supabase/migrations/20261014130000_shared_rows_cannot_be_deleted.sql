-- Shared rows (user_id is null) can still be read and edited by every
-- signed-in user, but no longer deleted. Users delete only their own rows.
--
-- Shared and own items no longer mix: a shared menu may only go into a
-- shared collection, and a user's own menu only into one of their own
-- collections. Before this, an own menu could also go into a shared
-- collection.

-- Deleting: own rows only.

drop policy "Users delete shared and own collections" on public.collections;
create policy "Users delete own collections"
  on public.collections for delete to authenticated
  using (user_id = (select auth.uid()));

drop policy "Users delete shared and own tags" on public.tags;
create policy "Users delete own tags"
  on public.tags for delete to authenticated
  using (user_id = (select auth.uid()));

drop policy "Users delete shared and own menus" on public.menus;
create policy "Users delete own menus"
  on public.menus for delete to authenticated
  using (user_id = (select auth.uid()));

-- Filing: a menu's collection must have the same owner as the menu, or be
-- none. Both are null for shared rows, hence "is not distinct from".

drop policy "Users create own menus" on public.menus;
create policy "Users create own menus"
  on public.menus for insert to authenticated
  with check (
    user_id = (select auth.uid())
    and (
      collection_id is null
      or exists (
        select 1 from public.collections c
        where c.id = menus.collection_id
          and c.user_id = (select auth.uid())
      )
    )
  );

drop policy "Users update shared and own menus" on public.menus;
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
          and c.user_id is not distinct from menus.user_id
      )
    )
  );
