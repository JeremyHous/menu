-- Structured ingredients with a quantity for one adult portion.
--
-- menus.ingredient_items holds a JSON array of
--   {"name": text, "amount": number, "unit": text}
-- in the order the user entered them. unit is one of g, kg, ml, l, piece,
-- tsp, tbsp. Ingredients copied from the old name-only list have no quantity
-- yet: their amount and unit are null, and the app asks for them on the next
-- edit.
--
-- The old menus.ingredients text[] column is kept, and the app keeps writing
-- the ingredient names to it, so no data is dropped.

-- True when items is an array of well-formed ingredients. CASE keeps each
-- cast from running before its type check.
create function public.valid_ingredient_items(items jsonb)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select jsonb_typeof(items) = 'array'
    and not exists (
      select 1
      from jsonb_array_elements(items) as item
      where case
        when jsonb_typeof(item) <> 'object' then true
        when coalesce(jsonb_typeof(item -> 'name'), 'missing') <> 'string'
          then true
        when length(trim(item ->> 'name')) = 0 then true
        -- No quantity yet: only for ingredients copied from the old list.
        when coalesce(jsonb_typeof(item -> 'amount'), 'null') = 'null'
          and coalesce(jsonb_typeof(item -> 'unit'), 'null') = 'null'
          then false
        when coalesce(jsonb_typeof(item -> 'amount'), 'missing') <> 'number'
          then true
        when (item ->> 'amount')::numeric <= 0 then true
        when coalesce(jsonb_typeof(item -> 'unit'), 'missing') <> 'string'
          then true
        else (item ->> 'unit') not in
          ('g', 'kg', 'ml', 'l', 'piece', 'tsp', 'tbsp')
      end
    );
$$;

alter table public.menus
  add column ingredient_items jsonb not null default '[]'::jsonb
    constraint menus_ingredient_items_valid
      check (public.valid_ingredient_items(ingredient_items));

comment on column public.menus.ingredient_items is
  'Ingredients for one adult portion: [{name, amount, unit}], in order. amount and unit are null only for ingredients copied from the old name-only list.';

-- Copy the existing names over, in order, without a quantity. The
-- updated_at trigger is paused so this copy does not count as an edit.
alter table public.menus disable trigger menus_set_updated_at;

update public.menus
set ingredient_items = coalesce(
  (
    select jsonb_agg(
      jsonb_build_object('name', trim(item), 'amount', null, 'unit', null)
      order by ord
    )
    from unnest(ingredients) with ordinality as list (item, ord)
    where length(trim(item)) > 0
  ),
  '[]'::jsonb
);

alter table public.menus enable trigger menus_set_updated_at;

-- Signed-in users may write the new column, like the other recipe columns.
grant update (ingredient_items) on public.menus to authenticated;
