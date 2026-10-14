"use client";

import type { Tag } from "@/app/lib/db";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useActionState, useEffect, useRef, useState } from "react";
import {
  deleteTag,
  type DeleteTagState,
  renameTag,
  type RenameTagState,
} from "./actions";
import styles from "./menus.module.css";
import { hrefWithTags, parseSelectedTags, TAG_PARAM } from "./tag-filter";

const initialDeleteState: DeleteTagState = {};
const initialRenameState: RenameTagState = {};

type TagFilterButtonsProps = {
  // menuCount is how many menus have the tag; shared is whether every user
  // sees it.
  tags: (Pick<Tag, "id" | "name"> & { menuCount: number; shared: boolean })[];
};

// The tag toggles in the sidebar, as "Shared tags" and "My own tags".
// Selecting tags updates ?tags= in the URL, keeping the current page, so the
// sidebar and the menus page both filter. "Edit tags" shows a rename button
// on each tag and a delete button on the user's own. Renaming changes the
// name on every menu that has the tag; deleting asks for confirmation first,
// since it takes the tag off every menu.
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
  const [renameState, renameAction, renaming] = useActionState(
    renameTag,
    initialRenameState,
  );
  const [editing, setEditing] = useState(false);
  const [confirmingId, setConfirmingId] = useState<number | null>(null);
  const [renamingId, setRenamingId] = useState<number | null>(null);
  const editToggleRef = useRef<HTMLButtonElement>(null);
  // Set when the confirmation or rename form closes, so focus goes back to
  // the edit toggle instead of being lost with the removed buttons.
  const returnFocus = useRef(false);

  // The rename result the user last dismissed by closing the form. Its error
  // and name are not shown again when a rename form is reopened.
  const [dismissedRename, setDismissedRename] = useState<RenameTagState | null>(
    null,
  );
  const currentRename =
    renameState === dismissedRename ? initialRenameState : renameState;

  // Close the rename form after each successful rename.
  const [handledRename, setHandledRename] = useState(renameState.renamed);
  if (renameState.renamed !== handledRename) {
    setHandledRename(renameState.renamed);
    if (renameState.renamed) {
      setRenamingId(null);
      returnFocus.current = true;
    }
  }

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
    if (confirmingId === null && renamingId === null && returnFocus.current) {
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

  // Only one of the delete confirmation and the rename form is open at a
  // time.
  function openConfirmation(id: number) {
    closeRename(false);
    setConfirmingId(id);
  }

  function openRename(id: number) {
    setConfirmingId(null);
    setDismissedRename(renameState);
    setRenamingId(id);
  }

  function closeRename(restoreFocus = true) {
    setDismissedRename(renameState);
    setRenamingId(null);
    if (restoreFocus) returnFocus.current = true;
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
  const renamingTag = tags.find((tag) => tag.id === renamingId);

  const sharedTags = tags.filter((tag) => tag.shared);
  const ownTags = tags.filter((tag) => !tag.shared);

  // Shared tags can be renamed but not deleted, so they get no delete
  // button.
  function tagList(list: typeof tags) {
    return (
      <ul className={styles.tagList}>
        {list.map((tag) => {
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
                <>
                  <button
                    type="button"
                    className={styles.tagRemove}
                    aria-label={`Rename tag “${tag.name}”`}
                    aria-expanded={renamingId === tag.id}
                    disabled={renaming || deleting}
                    onClick={() => openRename(tag.id)}
                  >
                    <span aria-hidden="true">✎</span>
                  </button>
                  {!tag.shared && (
                    <button
                      type="button"
                      className={styles.tagRemove}
                      aria-label={`Delete tag “${tag.name}”`}
                      aria-expanded={confirmingId === tag.id}
                      disabled={renaming || deleting}
                      onClick={() => openConfirmation(tag.id)}
                    >
                      ×
                    </button>
                  )}
                </>
              )}
            </li>
          );
        })}
      </ul>
    );
  }

  return (
    <div className={styles.tagFilter}>
      {sharedTags.length > 0 && (
        <section
          className={styles.category}
          aria-labelledby="shared-tags-heading"
        >
          <h3 id="shared-tags-heading" className={styles.categoryTitle}>
            Shared tags
          </h3>
          <p className={styles.categoryNote}>
            Every user sees these. They can be renamed, not deleted.
          </p>
          {tagList(sharedTags)}
        </section>
      )}
      <section className={styles.category} aria-labelledby="own-tags-heading">
        <h3 id="own-tags-heading" className={styles.categoryTitle}>
          My own tags
        </h3>
        <p className={styles.categoryNote}>Only you can see these.</p>
        {ownTags.length > 0 ? (
          tagList(ownTags)
        ) : (
          <p className={styles.groupEmpty}>
            You have no tags yet. Type a new tag on one of your recipes’ pages
            to create one.
          </p>
        )}
      </section>

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
      {editing && renamingTag && (
        // Keyed by tag, so switching tags refills the input.
        <form
          key={renamingTag.id}
          action={renameAction}
          className={styles.tagRename}
          noValidate
          onKeyDown={(event) => {
            if (event.key === "Escape") closeRename();
          }}
        >
          <input type="hidden" name="tag_id" value={renamingTag.id} />
          <label htmlFor="tag-rename" className={styles.label}>
            New name for “{renamingTag.name}”
          </label>
          {/* React clears the form after each submission; defaultValue puts
              the name back when the rename failed. */}
          <input
            id="tag-rename"
            name="name"
            type="text"
            required
            maxLength={50}
            autoFocus
            autoComplete="off"
            defaultValue={currentRename.name ?? renamingTag.name}
            onFocus={(event) => event.currentTarget.select()}
            aria-invalid={currentRename.error ? true : undefined}
            aria-describedby={
              currentRename.error ? "tag-rename-error" : undefined
            }
            className={styles.input}
          />
          {currentRename.error && (
            <p id="tag-rename-error" role="alert" className={styles.fieldError}>
              {currentRename.error}
            </p>
          )}
          <p className={styles.hint}>
            {renamingTag.menuCount === 0
              ? "No menu uses this tag yet."
              : `The new name shows on ${renamingTag.menuCount === 1 ? "the menu" : `all ${renamingTag.menuCount} menus`} that use it.`}
            {renamingTag.shared &&
              " This tag is shared: every user sees the new name."}
          </p>
          <div className={styles.actions}>
            <button
              type="submit"
              className={`${styles.button} ${styles.buttonSmall}`}
              disabled={renaming}
            >
              {renaming ? "Saving…" : "Save"}
            </button>
            <button
              type="button"
              className={styles.linkButton}
              onClick={() => closeRename()}
              disabled={renaming}
            >
              Cancel
            </button>
          </div>
        </form>
      )}
      <p role="status" className={styles.status}>
        {renamingId === null &&
          currentRename.renamed &&
          `Renamed “${currentRename.renamed.from}” to “${currentRename.renamed.name}”.`}
      </p>
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
            closeRename(false);
          }}
        >
          {editing ? "Done editing" : "Edit tags"}
        </button>
      </div>
    </div>
  );
}
