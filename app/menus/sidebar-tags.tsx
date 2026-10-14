import {
  DatabaseError,
  listMenuTagLinks,
  listTags,
  type MenuTagLink,
  type Tag,
} from "@/app/lib/db";
import { requireUser } from "@/lib/supabase/auth";
import styles from "./menus.module.css";
import { TagFilterButtons } from "./tag-filter-buttons";

// Lists every tag in the sidebar as a filter toggle, with how many menus use
// it so deleting can say what it affects. Call it inside a <Suspense>
// boundary.
export async function SidebarTags() {
  // Signed-in only, like the pages beside it.
  await requireUser();
  let tags: Tag[];
  let links: MenuTagLink[];
  try {
    [tags, links] = await Promise.all([listTags(), listMenuTagLinks()]);
  } catch (error) {
    if (!(error instanceof DatabaseError)) throw error;
    return (
      <p className={styles.groupEmpty}>
        The tags could not be loaded. Refresh the page to try again.
      </p>
    );
  }

  const counts = new Map<number, number>();
  for (const { tag_id } of links) {
    counts.set(tag_id, (counts.get(tag_id) ?? 0) + 1);
  }

  return (
    <TagFilterButtons
      tags={tags.map(({ id, name }) => ({
        id,
        name,
        menuCount: counts.get(id) ?? 0,
      }))}
    />
  );
}
