-- Seed the "Chef Speciality" menu as part of the shared basis.
-- user_id is set to null explicitly so the row is shared with every signed-in
-- user rather than relying on auth.uid() being null in the migration session.
-- The insert is skipped if a menu with this title already exists, so the
-- migration is safe to run against a database that has it.
insert into public.menus (title, body, user_id)
select 'Chef Speciality', 'la spécialité du chef', null
where not exists (
  select 1 from public.menus where title = 'Chef Speciality'
);
