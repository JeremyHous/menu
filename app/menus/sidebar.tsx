import {
  type Collection,
  DatabaseError,
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

// Lists every collection with its menus, then the menus that belong to no
// collection. The tags selected in the URL filter the menus in the browser.
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

  // Only the id, title and tag ids reach the client.
  const menuTags = tagsByMenu(links);
  const byCollection = new Map<number, SidebarMenu[]>();
  const uncollected: SidebarMenu[] = [];
  for (const { id, title, collection_id } of menus) {
    const menu = { id, title, tagIds: [...(menuTags.get(id) ?? [])] };
    if (collection_id === null) {
      uncollected.push(menu);
    } else {
      const group = byCollection.get(collection_id) ?? [];
      group.push(menu);
      byCollection.set(collection_id, group);
    }
  }

  const groups: SidebarGroupData[] = [
    ...collections.map((collection) => ({
      key: String(collection.id),
      collectionId: collection.id,
      name: collection.name,
      menus: byCollection.get(collection.id) ?? [],
    })),
    {
      key: "none",
      collectionId: null,
      name: "No collection",
      menus: uncollected,
      uncollected: true,
    },
  ];

  return <SidebarNav groups={groups} tagIds={tags.map((tag) => tag.id)} />;
}
