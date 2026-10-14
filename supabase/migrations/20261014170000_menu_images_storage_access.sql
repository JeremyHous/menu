-- Menu images: let signed-in users attach an image to the menus they can
-- reach. The image file lives in the menu-images Storage bucket; the menu
-- row only keeps its path in image_path.
--
-- Paths have the form <menu id>/<random uuid>.<ext>, so the first folder
-- names the menu. The policies below reuse public.menus' own RLS through an
-- exists subquery: a user can manage the images of exactly the menus they
-- can read and edit (shared menus and their own).

-- The app checks the size and type too; the bucket enforces them for any
-- client that talks to Storage directly with the publishable key.
update storage.buckets
set
  file_size_limit = 5242880, -- 5 MB
  allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp']
where id = 'menu-images';

-- authenticated only has UPDATE on the columns the app writes; image_path
-- joins them now that the app writes it.
grant update (image_path) on public.menus to authenticated;

-- Comparing id::text avoids a cast error on paths whose first folder is not
-- a number.
create policy "menu images: insert for reachable menus"
on storage.objects for insert to authenticated
with check (
  bucket_id = 'menu-images'
  and exists (
    select 1 from public.menus m
    where m.id::text = (storage.foldername(name))[1]
  )
);

-- Storage needs SELECT as well as DELETE to remove an object. The bucket is
-- public, so serving images by URL does not depend on this policy.
create policy "menu images: select for reachable menus"
on storage.objects for select to authenticated
using (
  bucket_id = 'menu-images'
  and (
    owner_id = (select auth.uid())::text
    or exists (
      select 1 from public.menus m
      where m.id::text = (storage.foldername(name))[1]
    )
  )
);

-- The uploader can always delete their own file, so a recipe's image can be
-- removed after the recipe itself has been deleted.
create policy "menu images: delete for reachable menus"
on storage.objects for delete to authenticated
using (
  bucket_id = 'menu-images'
  and (
    owner_id = (select auth.uid())::text
    or exists (
      select 1 from public.menus m
      where m.id::text = (storage.foldername(name))[1]
    )
  )
);
