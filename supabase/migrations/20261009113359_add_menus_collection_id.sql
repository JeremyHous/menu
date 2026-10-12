-- Menus: each menu can optionally belong to one collection.
--
-- The column is nullable with no default, so existing menus stay valid and
-- unassigned. Deleting a collection keeps its menus and sets their
-- collection_id back to null.
alter table public.menus
  add column collection_id bigint
    references public.collections (id) on delete set null;

comment on column public.menus.collection_id is 'Collection this menu belongs to, or null if unassigned.';

-- Postgres does not index foreign keys automatically. This index serves
-- "menus in a collection" lookups and the on delete set null update.
create index menus_collection_id_idx on public.menus (collection_id);
