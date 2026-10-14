"use client";

import type { Collection } from "@/app/lib/db";
import { useActionState } from "react";
import { assignMenuCollection, type AssignCollectionState } from "./actions";
import styles from "./menus.module.css";

const initialState: AssignCollectionState = {};

type CollectionPickerProps = {
  menuId: number;
  currentId: number | null;
  // Whether the menu is shared with every user rather than owned by one.
  menuShared: boolean;
  collections: (Pick<Collection, "id" | "name"> & { shared: boolean })[];
};

// Lets the user move a menu into a collection, or out of every collection,
// from the menu's page. Shared and own items do not mix, so only collections
// with the same owner as the menu are offered.
export function CollectionPicker({
  menuId,
  currentId,
  menuShared,
  collections: allCollections,
}: CollectionPickerProps) {
  const [state, formAction, pending] = useActionState(
    assignMenuCollection,
    initialState,
  );
  const collections = allCollections.filter(
    (collection) => collection.shared === menuShared,
  );

  return (
    <form action={formAction} className={styles.picker}>
      <input type="hidden" name="id" value={menuId} />
      <label htmlFor="collection_id" className={styles.label}>
        Collection
      </label>
      <div className={styles.pickerRow}>
        {/* Keyed on the saved value so the select shows it again once the
            page refreshes after a save. */}
        <select
          key={currentId ?? "none"}
          id="collection_id"
          name="collection_id"
          defaultValue={currentId ?? ""}
          aria-invalid={state.error ? true : undefined}
          aria-describedby={state.error ? "collection_id-error" : undefined}
          className={styles.input}
        >
          <option value="">No collection</option>
          {collections.map((collection) => (
            <option key={collection.id} value={collection.id}>
              {collection.name}
            </option>
          ))}
        </select>
        <button type="submit" className={styles.button} disabled={pending}>
          {pending ? "Saving…" : "Save"}
        </button>
      </div>
      <p className={styles.hint}>
        {menuShared
          ? "This recipe is shared, so only shared collections are listed."
          : collections.length === 0
            ? "You have no collections yet. Create one with “New collection” under “My own collections” in the sidebar, then pick it here."
            : "This recipe is yours, so only your own collections are listed."}
      </p>
      {state.error && (
        <p id="collection_id-error" role="alert" className={styles.fieldError}>
          {state.error}
        </p>
      )}
      <p role="status" className={styles.status}>
        {!pending && state.message}
      </p>
    </form>
  );
}
