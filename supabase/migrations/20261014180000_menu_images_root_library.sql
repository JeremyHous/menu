-- Menu images: images at the top level of the menu-images bucket (not in a
-- menu's folder) form a shared library that every signed-in user can list
-- and pick for a menu. They were added in the dashboard, so they have no
-- owner and no menu folder, and the previous SELECT policy hid them.
--
-- Only SELECT changes. Uploads still go into a menu's folder, and the
-- library images cannot be deleted through the app's policies, since they
-- have no owner and no menu folder. Images in menus' folders stay limited to
-- the menus the user can reach.
alter policy "menu images: select for reachable menus"
on storage.objects
using (
  bucket_id = 'menu-images'
  and (
    -- No folder: a library image.
    cardinality(storage.foldername(name)) = 0
    or owner_id = (select auth.uid())::text
    or exists (
      select 1 from public.menus m
      where m.id::text = (storage.foldername(name))[1]
    )
  )
);
