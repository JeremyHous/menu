-- Menus: each menu can optionally have an image.
--
-- The column holds only the path of the image file in storage, never the
-- image data itself (no Base64 in the database). It is nullable with no
-- default, so existing menus stay valid and simply have no image.
alter table public.menus
  add column image_path text;

comment on column public.menus.image_path is 'Storage path of the menu image, or null if the menu has no image.';
