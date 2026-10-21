-- Menu images: narrow who can delete a file. The previous DELETE policy also
-- allowed deleting any file in the folder of a menu the user can reach, so
-- any signed-in user could delete images in shared menus' folders, including
-- other users' uploads and files that menus still display. That contradicts
-- the rule that the shared basis cannot be deleted, and the app never needs
-- it.
--
-- The app deletes a file in one case only: an upload it has just made for a
-- save that failed. That file belongs to the user and no menu points to it
-- yet, so the policy now allows exactly that: the uploader's own file, while
-- no menu the user can see uses it as its image. (The check goes through
-- public.menus' RLS, so a private menu of another user is not seen.)
--
-- SELECT and INSERT are unchanged. Storage needs SELECT to delete, which the
-- SELECT policy still grants for the user's own uploads.
--
-- Dropped and recreated rather than altered, so the name can match the new
-- rule: renaming a policy needs ownership of storage.objects.
drop policy "menu images: delete for reachable menus" on storage.objects;

create policy "menu images: delete own unused uploads"
on storage.objects for delete to authenticated
using (
  bucket_id = 'menu-images'
  and owner_id = (select auth.uid())::text
  and not exists (
    select 1 from public.menus m
    where m.image_path = storage.objects.name
  )
);
