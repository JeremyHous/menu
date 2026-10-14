"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { type DragEvent, useState } from "react";
import { useMenuDrag } from "./menu-drag";
import styles from "./menus.module.css";
import { RenameCollection } from "./rename-collection";

export type SidebarMenu = { id: number; title: string; tagIds: number[] };

type SidebarGroupProps = {
  name: string;
  // The collection's id, or null for the menus that belong to none. Menus
  // dropped on the group move there.
  collectionId: number | null;
  menus: SidebarMenu[];
  // Styles the group for menus that belong to no collection.
  uncollected?: boolean;
  // The tag filter's query string, e.g. "?tags=1,4", or "" when no tags are
  // selected.
  query?: string;
  // The query string menu links keep, e.g. "?tags=1,4&q=soup". Defaults to
  // query.
  linkQuery?: string;
  // Shown when the group has no menus to list.
  emptyText: string;
};

// One expandable group in the sidebar. It starts closed, except that it opens
// whenever the menu being viewed or edited belongs to it, and whenever a tag
// filter is applied that some of its menus match. It is also a drop target
// for menus dragged from the list or from other groups.
export function SidebarGroup({
  name,
  collectionId,
  menus,
  uncollected,
  query = "",
  linkQuery = query,
  emptyText,
}: SidebarGroupProps) {
  const pathname = usePathname();
  const activeId = /^\/menus\/(\d+)(?:\/|$)/.exec(pathname)?.[1];
  const hasActive = menus.some((menu) => String(menu.id) === activeId);

  const filterMatch = query !== "" && menus.length > 0 ? query : "";

  const [open, setOpen] = useState(hasActive || filterMatch !== "");
  const { dragging, dragProps, canDrop, isDragEvent, drop } = useMenuDrag();
  const target = { id: collectionId, name };
  const droppable = canDrop(target);
  // True while a menu is dragged over this group.
  const [over, setOver] = useState(false);
  if (over && !dragging) setOver(false);

  function handleDragOver(event: DragEvent) {
    if (!isDragEvent(event) || !droppable) return;
    // Allowing the drop is what makes the browser show a move cursor.
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
    if (!over) setOver(true);
  }

  function handleDragLeave(event: DragEvent) {
    // dragleave also fires when moving onto a child; only leaving the group
    // counts.
    if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
      setOver(false);
    }
  }

  function handleDrop(event: DragEvent) {
    if (!isDragEvent(event)) return;
    event.preventDefault();
    setOver(false);
    drop(target);
  }
  // Opens the group when navigation lands on one of its menus, without
  // closing it again when navigation leaves. Adjusting state during render
  // avoids an extra render with the group closed.
  const [prevHasActive, setPrevHasActive] = useState(hasActive);
  if (hasActive !== prevHasActive) {
    setPrevHasActive(hasActive);
    if (hasActive) setOpen(true);
  }
  // Same for a newly applied filter with matches in this group.
  const [prevFilterMatch, setPrevFilterMatch] = useState(filterMatch);
  if (filterMatch !== prevFilterMatch) {
    setPrevFilterMatch(filterMatch);
    if (filterMatch) setOpen(true);
  }

  return (
    <details
      className={[
        styles.group,
        uncollected ? styles.uncollected : "",
        droppable ? styles.dropTarget : "",
        droppable && over ? styles.dropOver : "",
      ].join(" ")}
      open={open}
      onToggle={(event) => setOpen(event.currentTarget.open)}
      onDragEnter={handleDragOver}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <summary className={styles.groupSummary}>
        <span className={styles.groupName}>{name}</span>
        <span className={styles.count}>
          {menus.length}
          <span className={styles.srOnly}>
            {menus.length === 1 ? " menu" : " menus"}
          </span>
        </span>
      </summary>
      {menus.length > 0 ? (
        <ul className={styles.groupMenus}>
          {menus.map((menu) => (
            <li key={menu.id}>
              <Link
                {...dragProps({ id: menu.id, title: menu.title, collectionId })}
                href={`/menus/${menu.id}${linkQuery}`}
                className={`${styles.groupLink} ${dragging?.id === menu.id ? styles.dragged : ""}`}
                aria-current={String(menu.id) === activeId ? "page" : undefined}
              >
                {menu.title}
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <p className={styles.groupEmpty}>{emptyText}</p>
      )}
      {collectionId !== null && (
        <RenameCollection id={collectionId} name={name} />
      )}
    </details>
  );
}
