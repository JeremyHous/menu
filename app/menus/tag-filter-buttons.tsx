"use client";

import type { Tag } from "@/app/lib/db";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useActionState, useEffect, useRef, useState } from "react";
import { deleteTag, type DeleteTagState } from "./actions";
import styles from "./menus.module.css";
import { hrefWithTags, parseSelectedTags, TAG_PARAM } from "./tag-filter";

const initialDeleteState: DeleteTagState = {};

type TagFilterButtonsProps = {
  // menuCount is how many menus have the tag.
  tags: (Pick<Tag, "id" | "name"> & { menuCount: number })[];
};

// The tag toggles in the sidebar. Selecting tags updates ?tags= in the URL,
// keeping the current page, so the sidebar and the menus page both filter.
// "Edit tags" shows a delete button on each tag; deleting asks for
// confirmation first, since it takes the tag off every menu.
export function TagFilterButtons({ tags }: TagFilterButtonsProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const selected = parseSelectedTags(
    searchParams.get(TAG_PARAM),
    tags.map((tag) => tag.id),
  );

  const [deleteState, deleteAction, deleting] = useActionState(
    deleteTag,
    initialDeleteState,
  );
  const [editing, setEditing] = useState(false);
  const [confirmingId, setConfirmingId] = useState<number | null>(null);
  const editToggleRef = useRef<HTMLButtonElement>(null);
  // Set when the confirmation closes, so focus goes back to the edit toggle
  // instead of being lost with the removed buttons.
  const returnFocus = useRef(false);

  // Close the confirmation after each successful delete. Adjusting state
  // during render avoids an extra render with the stale confirmation open.
  const [handled, setHandled] = useState(deleteState.deleted);
  if (deleteState.deleted !== handled) {
    setHandled(deleteState.deleted);
    if (deleteState.deleted) {
      setConfirmingId(null);
      returnFocus.current = true;
    }
  }

  // Drop a deleted tag from the URL's selection too. It would be ignored
  // anyway, but this keeps shared links clean.
  const deletedId = deleteState.deleted?.id;
  useEffect(() => {
    if (deletedId === undefined) return;
    const ids = parseSelectedTags(searchParams.get(TAG_PARAM));
    if (ids.includes(deletedId)) {
      router.replace(
        hrefWithTags(
          pathname,
          searchParams,
          ids.filter((id) => id !== deletedId),
        ),
        { scroll: false },
      );
    }
  }, [deletedId, pathname, router, searchParams]);

  useEffect(() => {
    if (confirmingId === null && returnFocus.current) {
      returnFocus.current = false;
      editToggleRef.current?.focus();
    }
  });

  function select(next: number[]) {
    router.push(hrefWithTags(pathname, searchParams, next), { scroll: false });
  }

  function toggle(id: number) {
    select(
      selected.includes(id)
        ? selected.filter((other) => other !== id)
        : [...selected, id],
    );
  }

  function closeConfirmation() {
    setConfirmingId(null);
    returnFocus.current = true;
  }

  const deletedMessage =
    deleteState.deleted &&
    `Deleted “${deleteState.deleted.name || "the tag"}”.`;

  if (tags.length === 0) {
    return (
      <div className={styles.tagFilter}>
        <p className={styles.groupEmpty}>
          No tags yet. Open a menu and add tags there to filter by them.
        </p>
        <p role="status" className={styles.status}>
          {deletedMessage}
        </p>
      </div>
    );
  }

  const selectedNames = tags
    .filter((tag) => selected.includes(tag.id))
    .map((tag) => tag.name);
  const confirming = tags.find((tag) => tag.id === confirmingId);

  return (
    <div className={styles.tagFilter}>
      <ul className={styles.tagList}>
        {tags.map((tag) => {
          const on = selected.includes(tag.id);
          return (
            <li key={tag.id} className={styles.filterTagItem}>
              <button
                type="button"
                aria-pressed={on}
                className={`${styles.filterTag} ${on ? styles.filterTagOn : ""}`}
                onClick={() => toggle(tag.id)}
              >
                {on && <span aria-hidden="true">✓ </span>}
                {tag.name}
              </button>
              {editing && (
                <button
                  type="button"
                  className={styles.tagRemove}
                  aria-label={`Delete tag “${tag.name}”`}
                  aria-expanded={confirmingId === tag.id}
                  disabled={deleting}
                  onClick={() => setConfirmingId(tag.id)}
                >
                  ×
                </button>
              )}
            </li>
          );
        })}
      </ul>

      {editing && confirming && (
        <form
          action={deleteAction}
          className={styles.tagConfirm}
          onKeyDown={(event) => {
            if (event.key === "Escape") closeConfirmation();
          }}
        >
          <input type="hidden" name="tag_id" value={confirming.id} />
          <input type="hidden" name="tag_name" value={confirming.name} />
          <p>
            Delete “{confirming.name}”?{" "}
            {confirming.menuCount === 0
              ? "No menu uses it."
              : `It will be removed from ${confirming.menuCount} ${confirming.menuCount === 1 ? "menu" : "menus"}; the menus are kept.`}{" "}
            This cannot be undone.
          </p>
          <div className={styles.actions}>
            <button
              type="submit"
              className={`${styles.button} ${styles.buttonSmall} ${styles.buttonDanger}`}
              disabled={deleting}
            >
              {deleting ? "Deleting…" : "Delete tag"}
            </button>
            <button
              type="button"
              className={styles.linkButton}
              onClick={closeConfirmation}
              disabled={deleting}
              autoFocus
            >
              Cancel
            </button>
          </div>
        </form>
      )}
      {deleteState.error && (
        <p role="alert" className={styles.fieldError}>
          {deleteState.error}
        </p>
      )}
      <p role="status" className={styles.status}>
        {!deleting && deletedMessage}
      </p>

      <p role="status" className={styles.filterSummary}>
        {selectedNames.length > 0 &&
          `Showing menus tagged ${selectedNames.join(" and ")}.`}
      </p>
      <div className={styles.actions}>
        {selected.length > 0 && (
          <button
            type="button"
            className={styles.linkButton}
            onClick={() => select([])}
          >
            Clear all tags
          </button>
        )}
        <button
          ref={editToggleRef}
          type="button"
          className={styles.linkButton}
          onClick={() => {
            setEditing(!editing);
            setConfirmingId(null);
          }}
        >
          {editing ? "Done editing" : "Edit tags"}
        </button>
      </div>
    </div>
  );
}
