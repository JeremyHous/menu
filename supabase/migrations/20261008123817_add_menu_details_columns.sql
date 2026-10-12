-- Menu details: ingredients, environmental impact, popularity and sourcing.
alter table public.menus
  add column ingredients text[] not null default '{}',
  add column carbon_footprint_kg numeric(6, 2) check (carbon_footprint_kg >= 0),
  add column fans_appreciation numeric(2, 1) check (fans_appreciation between 0 and 5),
  add column supplier_name text;

comment on column public.menus.ingredients is 'List of ingredients in the menu.';
comment on column public.menus.carbon_footprint_kg is 'Carbon footprint per serving, in kg CO2e.';
comment on column public.menus.fans_appreciation is 'Average fan rating, from 0 to 5.';
comment on column public.menus.supplier_name is 'Name of the main supplier.';
