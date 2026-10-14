"use client";

import {
  createContext,
  type DragEvent,
  type ReactNode,
  useContext,
  useOptimistic,
  useState,
  useTransition,
} from "react";
import { assignMenuCollection } from "./actions";
import styles from "./menus.module.css";

// Drag and drop for moving menus between collections. Menus in the list and
// in the sidebar can be dragged; the sidebar's collection groups, including
// "No collection", are the drop targets. Dropping calls the same action as
// the collection picker on a menu's page.

// The drag data type. A custom type keeps a dragged menu from being dropped
// as text into inputs or other apps.
const MENU_TYPE = "application/x-menu-id";

export type DraggableMenu = {
  id: number;
  title: string;
  // The collection the server says the menu is in, or null for none.
  collectionId: number | null;
  // Whether the menu is shared with every user rather than owned by one.
  shared: boolean;
};

// shared is true for the groups under "Shared collections", including its
// "No collection" group.
export type DropTarget = { id: number | null; name: string; shared: boolean };

type MoveStatus = { kind: "message" | "error"; text: string } | null;

type MenuDragContextValue = {
  // The menu being dragged, with its current collection, or null.
  dragging: DraggableMenu | null;
  // Moves still waiting for the server, by menu id, so the sidebar shows them
  // straight away. They are dropped once the refreshed data arrives, or
  // undone if the move fails.
  pendingMoves: ReadonlyMap<number, number | null>;
  moving: boolean;
  status: MoveStatus;
  dragProps: (menu: DraggableMenu) => {
    draggable: true;
    onDragStart: (event: DragEvent) => void;
    onDragEnd: () => void;
  };
  // Whether dropping the dragged menu here would change anything.
  canDrop: (target: DropTarget) => boolean;
  isDragEvent: (event: DragEvent) => boolean;
  drop: (target: DropTarget) => void;
};

const MenuDragContext = createContext<MenuDragContextValue | null>(null);

export function useMenuDrag() {
  const value = useContext(MenuDragContext);
  if (!value) throw new Error("useMenuDrag needs a <MenuDragProvider>.");
  return value;
}

type Move = { menuId: number; collectionId: number | null };

export function MenuDragProvider({ children }: { children: ReactNode }) {
  const [dragging, setDragging] = useState<DraggableMenu | null>(null);
  const [status, setStatus] = useState<MoveStatus>(null);
  const [moving, startTransition] = useTransition();
  const [pendingMoves, addPendingMove] = useOptimistic(
    new Map<number, number | null>() as ReadonlyMap<number, number | null>,
    (moves, move: Move) => new Map(moves).set(move.menuId, move.collectionId),
  );

  // Where a menu is now, counting moves that have not finished yet.
  function currentCollection(menu: DraggableMenu) {
    return pendingMoves.has(menu.id)
      ? (pendingMoves.get(menu.id) ?? null)
      : menu.collectionId;
  }

  function dragProps(menu: DraggableMenu) {
    return {
      draggable: true as const,
      onDragStart: (event: DragEvent) => {
        // Links inside the item add their own URL data; this adds ours.
        event.dataTransfer.setData(MENU_TYPE, String(menu.id));
        event.dataTransfer.effectAllowed = "move";
        setDragging({ ...menu, collectionId: currentCollection(menu) });
        setStatus(null);
      },
      onDragEnd: () => setDragging(null),
    };
  }

  // Shared and own items do not mix (RLS enforces this too): a shared menu
  // only goes into the shared groups, an own menu only into the user's own.
  function canDrop(target: DropTarget) {
    return (
      dragging !== null &&
      dragging.shared === target.shared &&
      dragging.collectionId !== target.id
    );
  }

  function isDragEvent(event: DragEvent) {
    return event.dataTransfer.types.includes(MENU_TYPE);
  }

  function drop(target: DropTarget) {
    const menu = dragging;
    // The dragged item can be re-rendered in its new group before dragend
    // fires on it, so the drop clears the drag state too.
    setDragging(null);
    if (!menu || menu.collectionId === target.id) return;

    startTransition(async () => {
      addPendingMove({ menuId: menu.id, collectionId: target.id });
      const formData = new FormData();
      formData.set("id", String(menu.id));
      formData.set(
        "collection_id",
        target.id === null ? "" : String(target.id),
      );
      try {
        const result = await assignMenuCollection({}, formData);
        if (result.error) {
          setStatus({
            kind: "error",
            text: `“${menu.title}”: ${result.error}`,
          });
        } else {
          setStatus({
            kind: "message",
            text:
              target.id === null
                ? `Removed “${menu.title}” from its collection.`
                : `Moved “${menu.title}” to “${target.name}”.`,
          });
        }
      } catch {
        setStatus({
          kind: "error",
          text: `“${menu.title}” could not be moved. Check your connection and try again.`,
        });
      }
    });
  }

  return (
    <MenuDragContext.Provider
      value={{
        dragging,
        pendingMoves,
        moving,
        status,
        dragProps,
        canDrop,
        isDragEvent,
        drop,
      }}
    >
      {children}
    </MenuDragContext.Provider>
  );
}

// A menu in the main list that can be dragged onto a collection.
export function DraggableDish({
  menu,
  children,
}: {
  menu: DraggableMenu;
  children: ReactNode;
}) {
  const { dragging, dragProps } = useMenuDrag();
  const isDragged = dragging?.id === menu.id;
  return (
    <li
      {...dragProps(menu)}
      className={`${styles.dish} ${styles.draggable} ${isDragged ? styles.dragged : ""}`}
    >
      {children}
    </li>
  );
}
