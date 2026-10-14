import {
  type Collection,
  DatabaseError,
  isShared,
  listCollections,
  listMenus,
  listMenuTagLinks,
  listTags,
  type Menu,
  type MenuTagLink,
  type Tag,
} from "@/app/lib/db";
import { requireUser } from "@/lib/supabase/auth";
import styles from "./menus.module.css";
import type { SidebarMenu } from "./sidebar-group";
import { type SidebarGroupData, SidebarNav } from "./sidebar-nav";
import { tagsByMenu } from "./tag-filter";

// Lists the shared collections, then the user's own, each with its menus
// and followed by that category's menus in no collection. The tags selected
// in the URL filter the menus in the browser.
// Call it inside a <Suspense> boundary.
export async function Sidebar() {
  // Signed-in only, like the pages beside it.
  await requireUser();
  let collections: Collection[];
  let menus: Menu[];
  let tags: Tag[];
  let links: MenuTagLink[];
  try {
    [collections, menus, tags, links] = await Promise.all([
      listCollections(),
      listMenus(),
      listTags(),
      listMenuTagLinks(),
    ]);
  } catch (error) {
    if (!(error instanceof DatabaseError)) throw error;
    return (
      <p className={styles.groupEmpty}>
        The collections could not be loaded. Refresh the page to try again.
      </p>
    );
  }

  // Only the id, title, tag ids and whether it is shared reach the client.
  const menuTags = tagsByMenu(links);
  const byCollection = new Map<number, SidebarMenu[]>();
  const sharedUncollected: SidebarMenu[] = [];
  const ownUncollected: SidebarMenu[] = [];
  for (const row of menus) {
    const { id, title, collection_id } = row;
    const menu = {
      id,
      title,
      tagIds: [...(menuTags.get(id) ?? [])],
      shared: isShared(row),
    };
    if (collection_id === null) {
      (menu.shared ? sharedUncollected : ownUncollected).push(menu);
    } else {
      const group = byCollection.get(collection_id) ?? [];
      group.push(menu);
      byCollection.set(collection_id, group);
    }
  }

  // Each category lists its collections, then its menus in no collection.
  function category(shared: boolean): SidebarGroupData[] {
    return [
      ...collections
        .filter((collection) => isShared(collection) === shared)
        .map((collection) => ({
          key: String(collection.id),
          collectionId: collection.id,
          name: collection.name,
          shared,
          menus: byCollection.get(collection.id) ?? [],
        })),
      {
        key: shared ? "shared-none" : "own-none",
        collectionId: null,
        name: "No collection",
        shared,
        menus: shared ? sharedUncollected : ownUncollected,
        uncollected: true,
      },
    ];
  }
  const groups = [...category(true), ...category(false)];

  return <SidebarNav groups={groups} tagIds={tags.map((tag) => tag.id)} />;
}
