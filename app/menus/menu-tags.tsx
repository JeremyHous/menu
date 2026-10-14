"use client";

import type { Tag } from "@/app/lib/db";
import { useActionState } from "react";
import {
  addExistingMenuTag,
  addMenuTag,
  removeMenuTag,
  type MenuTagState,
} from "./actions";
import styles from "./menus.module.css";

const initialState: MenuTagState = {};

type MenuTagsProps = {
  menuId: number;
  tags: Pick<Tag, "id" | "name">[];
  // The existing tags this menu does not have yet, listed in a shared and an
  // own group.
  availableTags: (Pick<Tag, "id" | "name"> & { shared: boolean })[];
};

// Shows a menu's tags on its page, with a list to add an existing tag, a
// form to add one by name, and a button on each tag to take it off this
// menu.
export function MenuTags({ menuId, tags, availableTags }: MenuTagsProps) {
  const [pickState, pickAction, picking] = useActionState(
    addExistingMenuTag,
    initialState,
  );
  const [addState, addAction, adding] = useActionState(
    addMenuTag,
    initialState,
  );
  const [removeState, removeAction, removing] = useActionState(
    removeMenuTag,
    initialState,
  );

  return (
    <div className={styles.picker}>
      <h2 className={styles.label}>Tags</h2>

      {tags.length > 0 ? (
        <ul className={styles.tagList}>
          {tags.map((tag) => (
            <li key={tag.id} className={styles.tag}>
              <span>{tag.name}</span>
              <form action={removeAction}>
                <input type="hidden" name="id" value={menuId} />
                <input type="hidden" name="tag_id" value={tag.id} />
                <input type="hidden" name="tag_name" value={tag.name} />
                <button
                  type="submit"
                  className={styles.tagRemove}
                  disabled={removing}
                  aria-label={`Remove tag “${tag.name}”`}
                >
                  ×
                </button>
              </form>
            </li>
          ))}
        </ul>
      ) : (
        <p className={styles.hint}>
          No tags on this recipe yet. Add one below to filter by it later.
        </p>
      )}
      {removeState.error && (
        <p role="alert" className={styles.fieldError}>
          {removeState.error}
        </p>
      )}
      <p role="status" className={styles.status}>
        {!removing && removeState.message}
      </p>

      {availableTags.length > 0 && (
        <form action={pickAction} noValidate>
          <input type="hidden" name="id" value={menuId} />
          <label htmlFor="tag-existing" className={styles.srOnly}>
            Existing tag
          </label>
          <div className={styles.pickerRow}>
            {/* React resets the form after each submission, so the list
                goes back to its placeholder. */}
            <select
              id="tag-existing"
              name="tag_id"
              defaultValue=""
              aria-invalid={pickState.error ? true : undefined}
              aria-describedby={
                pickState.error ? "tag-existing-error" : undefined
              }
              className={styles.input}
            >
              <option value="">Choose an existing tag</option>
              {[
                { label: "Shared tags", shared: true },
                { label: "My own tags", shared: false },
              ].map((group) => {
                const options = availableTags.filter(
                  (tag) => tag.shared === group.shared,
                );
                return (
                  options.length > 0 && (
                    <optgroup key={group.label} label={group.label}>
                      {options.map((tag) => (
                        <option key={tag.id} value={tag.id}>
                          {tag.name}
                        </option>
                      ))}
                    </optgroup>
                  )
                );
              })}
            </select>
            <button type="submit" className={styles.button} disabled={picking}>
              {picking ? "Adding…" : "Add"}
            </button>
          </div>
          {pickState.error && (
            <p
              id="tag-existing-error"
              role="alert"
              className={styles.fieldError}
            >
              {pickState.error}
            </p>
          )}
          <p role="status" className={styles.status}>
            {!picking && pickState.message}
          </p>
        </form>
      )}

      <form action={addAction} noValidate>
        <input type="hidden" name="id" value={menuId} />
        <label htmlFor="tag-name" className={styles.srOnly}>
          New tag
        </label>
        <div className={styles.pickerRow}>
          {/* React clears the form after each submission; defaultValue puts
              the name back when the add failed. */}
          <input
            id="tag-name"
            name="name"
            type="text"
            required
            maxLength={50}
            autoComplete="off"
            placeholder="Add a tag"
            defaultValue={addState.name ?? ""}
            aria-invalid={addState.error ? true : undefined}
            aria-describedby={addState.error ? "tag-name-error" : undefined}
            className={styles.input}
          />
          <button type="submit" className={styles.button} disabled={adding}>
            {adding ? "Adding…" : "Add"}
          </button>
        </div>
        {addState.error && (
          <p id="tag-name-error" role="alert" className={styles.fieldError}>
            {addState.error}
          </p>
        )}
        <p role="status" className={styles.status}>
          {!adding && addState.message}
        </p>
      </form>
    </div>
  );
}
