"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { useMenuDrag } from "./menu-drag";
import styles from "./menus.module.css";
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
  // null for the "No collection" group.
  collectionId: number | null;
  name: string;
  menus: SidebarMenu[];
  uncollected?: boolean;
};

type SidebarNavProps = {
  groups: SidebarGroupData[];
  // Ids of the tags that exist, so stale ids in the URL are ignored.
  tagIds: number[];
};

// The collection groups, showing only the menus that have every tag selected
// in the URL.
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
  const hasCollections = groups.some((group) => !group.uncollected);

  // Says why a group is empty: the filter, an empty collection, or every
  // menu already being in a collection.
  function emptyText(group: SidebarGroupData & { unfilteredCount: number }) {
    if (filtering && group.unfilteredCount > 0) {
      return "None here have all the selected tags.";
    }
    if (total === 0) return "No menus yet.";
    if (group.uncollected) return "Every menu is in a collection.";
    return "Empty. Pick this collection on a menu’s page to add it here.";
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
      {!hasCollections && (
        <p className={styles.groupEmpty}>
          No collections yet. Use “New collection” below to create one.
        </p>
      )}
      <ul className={styles.groups}>
        {visible.map((group) => (
          <li key={group.key}>
            <SidebarGroup
              name={group.name}
              collectionId={group.collectionId}
              menus={group.menus}
              uncollected={group.uncollected}
              query={query}
              linkQuery={linkQuery}
              emptyText={emptyText(group)}
            />
          </li>
        ))}
      </ul>
      {total > 0 && hasCollections && (
        <p className={styles.dragHint}>
          Drag a menu onto a collection to move it there.
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
  return groups.map((group) => ({
    ...group,
    menus: all
      .filter((entry) => entry.collectionId === group.collectionId)
      .map((entry) => entry.menu),
  }));
}
