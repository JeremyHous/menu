import { DatabaseError, listMenuImages, menuImageUrl } from "@/app/lib/db";
import { requireUser } from "@/lib/supabase/auth";
import styles from "./menus.module.css";
import { StorageImagePicker } from "./storage-image-picker";

type StorageImagesProps = {
  menuId: number;
  currentPath: string | null;
};

// Loads the images in the menu-images bucket and offers them for this menu.
// Signed-in only, like the page around it; Storage's policies decide which
// images the user may see.
export async function StorageImages({
  menuId,
  currentPath,
}: StorageImagesProps) {
  await requireUser();
  let images;
  try {
    images = await listMenuImages();
  } catch (error) {
    if (!(error instanceof DatabaseError)) throw error;
    return (
      <p role="alert" className={styles.fieldError}>
        The images in Storage could not be loaded. Refresh the page to try
        again.
      </p>
    );
  }

  return (
    <StorageImagePicker
      menuId={menuId}
      currentPath={currentPath}
      images={images.map((image) => ({
        ...image,
        url: menuImageUrl(image.path),
      }))}
    />
  );
}
