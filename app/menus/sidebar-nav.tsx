"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { useMenuDrag } from "./menu-drag";
import styles from "./menus.module.css";
import { NewCollection } from "./new-collection";
import { filtersQuery, SEARCH_PARAM } from "./search";
import { type SidebarMenu, SidebarGroup } from "./sidebar-group";
import {
  hasAllTags,
  hrefWithTags,
  parseSelectedTags,
  TAG_PARAM,
  tagQuery,
} from "./tag-filter";

export type SidebarGroupData = {
  key: string;
  // null for the "No collection" groups.
  collectionId: number | null;
  name: string;
  // Whether the group is under "Shared collections" rather than "My own
  // collections". Each category has its own "No collection" group.
  shared: boolean;
  menus: SidebarMenu[];
  uncollected?: boolean;
};

type SidebarNavProps = {
  groups: SidebarGroupData[];
  // Ids of the tags that exist, so stale ids in the URL are ignored.
  tagIds: number[];
};

// The collection groups in two categories, "Shared collections" and "My own
// collections", showing only the menus that have every tag selected in the
// URL. "New collection" sits under "My own collections", since new
// collections are always the user's own.
export function SidebarNav({ groups, tagIds }: SidebarNavProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const selected = parseSelectedTags(searchParams.get(TAG_PARAM), tagIds);
  const filtering = selected.length > 0;
  const query = tagQuery(selected);
  // Menu links keep the tags and the search query, so both survive opening
  // a menu. The sidebar itself is filtered by tags only.
  const linkQuery = filtersQuery(
    selected,
    searchParams.get(SEARCH_PARAM) ?? "",
  );

  const { pendingMoves, moving, status } = useMenuDrag();
  // Shows dropped menus in their new group before the server confirms. If
  // the move fails, pendingMoves is emptied and they jump back.
  const placed = regroup(groups, pendingMoves);

  const visible = placed.map((group) => ({
    ...group,
    // Before filtering, to tell a filtered-out group from an empty one.
    unfilteredCount: group.menus.length,
    menus: group.menus.filter((menu) =>
      hasAllTags(new Set(menu.tagIds), selected),
    ),
  }));
  const matches = visible.reduce((sum, group) => sum + group.menus.length, 0);
  const total = groups.reduce((sum, group) => sum + group.menus.length, 0);
  const ownTotal = groups
    .filter((group) => !group.shared)
    .reduce((sum, group) => sum + group.menus.length, 0);
  const hasOwnCollections = groups.some(
    (group) => !group.shared && !group.uncollected,
  );
  const shared = visible.filter((group) => group.shared);
  const own = visible.filter((group) => !group.shared);

  // Says why a group is empty: the filter, an empty collection, or every
  // menu already being in a collection.
  function emptyText(group: SidebarGroupData & { unfilteredCount: number }) {
    if (filtering && group.unfilteredCount > 0) {
      return "None here have all the selected tags.";
    }
    if (group.shared) {
      return group.uncollected
        ? "Every shared recipe is in a collection."
        : "Empty. Pick this collection on a shared recipe’s page to add it here.";
    }
    if (group.uncollected) {
      return ownTotal === 0
        ? "You have no recipes yet. Use “Add a menu with its recipe” to create one."
        : "Every one of your recipes is in a collection.";
    }
    return "Empty. Pick this collection on one of your recipes’ pages to add it here.";
  }

  function groupList(list: typeof visible) {
    return (
      <ul className={styles.groups}>
        {list.map((group) => (
          <li key={group.key}>
            <SidebarGroup
              name={group.name}
              collectionId={group.collectionId}
              shared={group.shared}
              menus={group.menus}
              uncollected={group.uncollected}
              query={query}
              linkQuery={linkQuery}
              emptyText={emptyText(group)}
            />
          </li>
        ))}
      </ul>
    );
  }

  return (
    <nav aria-label="Menus by collection">
      {filtering && (
        <div className={styles.sidebarFilterStatus}>
          <p role="status" className={styles.filterSummary}>
            {matches === 0
              ? "No menus have all the selected tags."
              : `${matches} of ${total} ${total === 1 ? "menu matches" : "menus match"} the selected tags.`}
          </p>
          {/* Keeps ?q=, like the toggles in the Tags section. */}
          <Link
            href={hrefWithTags(pathname, searchParams, [])}
            scroll={false}
            className={styles.linkButton}
          >
            Clear tags
          </Link>
        </div>
      )}
      {/* Results of drag and drop moves. */}
      <p role="status" className={styles.status}>
        {moving ? "Moving…" : status?.kind === "message" && status.text}
      </p>
      {!moving && status?.kind === "error" && (
        <p role="alert" className={styles.fieldError}>
          {status.text}
        </p>
      )}
      <section
        className={styles.category}
        aria-labelledby="shared-collections-heading"
      >
        <h3 id="shared-collections-heading" className={styles.categoryTitle}>
          Shared collections
        </h3>
        <p className={styles.categoryNote}>
          Every user sees these and their edits. They cannot be deleted.
        </p>
        {groupList(shared)}
      </section>

      <section
        className={styles.category}
        aria-labelledby="own-collections-heading"
      >
        <h3 id="own-collections-heading" className={styles.categoryTitle}>
          My own collections
        </h3>
        <p className={styles.categoryNote}>Only you can see these.</p>
        {!hasOwnCollections && (
          <p className={styles.groupEmpty}>
            You have no collections yet. Use “New collection” below to create
            one.
          </p>
        )}
        {groupList(own)}
        <NewCollection />
      </section>

      {total > 0 && (
        <p className={styles.dragHint}>
          Drag a menu onto a collection to move it there. Shared recipes go in
          shared collections, your own recipes in yours.
        </p>
      )}
    </nav>
  );
}

// Moves each menu with a pending move into its target group, keeping the
// groups' order and the menus' order within them.
function regroup(
  groups: SidebarGroupData[],
  pendingMoves: ReadonlyMap<number, number | null>,
): SidebarGroupData[] {
  if (pendingMoves.size === 0) return groups;
  const all = groups.flatMap((group) =>
    group.menus.map((menu) => ({
      menu,
      collectionId: pendingMoves.has(menu.id)
        ? (pendingMoves.get(menu.id) ?? null)
        : group.collectionId,
    })),
  );
  // Matching on shared too keeps each menu in its own category's "No
  // collection" group.
  return groups.map((group) => ({
    ...group,
    menus: all
      .filter(
        (entry) =>
          entry.collectionId === group.collectionId &&
          entry.menu.shared === group.shared,
      )
      .map((entry) => entry.menu),
  }));
}
