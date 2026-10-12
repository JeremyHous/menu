-- Menus: track when each menu was last changed.
--
-- Adds only the missing updated_at column; id, title, body and created_at
-- already exist. Existing rows start with updated_at = created_at, since they
-- have no recorded change time. Safe to run more than once: the column step
-- is skipped if updated_at already exists, so real values are never reset.

do $$
begin
  if not exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'menus'
      and column_name = 'updated_at'
  ) then
    alter table public.menus add column updated_at timestamptz;

    update public.menus set updated_at = created_at;

    alter table public.menus
      alter column updated_at set default now(),
      alter column updated_at set not null;
  end if;
end $$;

comment on column public.menus.updated_at is 'When the menu was last changed. Set automatically on every update.';

-- Keeps updated_at current on every update, whichever client makes it, so
-- the app does not need to send it. An empty search_path stops the function
-- from resolving objects through a caller-controlled schema.
create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists menus_set_updated_at on public.menus;

create trigger menus_set_updated_at
  before update on public.menus
  for each row
  execute function public.set_updated_at();
