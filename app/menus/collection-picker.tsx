"use client";

import type { Collection } from "@/app/lib/db";
import { useActionState } from "react";
import { assignMenuCollection, type AssignCollectionState } from "./actions";
import styles from "./menus.module.css";

const initialState: AssignCollectionState = {};

type CollectionPickerProps = {
  menuId: number;
  currentId: number | null;
  collections: Pick<Collection, "id" | "name">[];
};

// Lets the user move a menu into a collection, or out of every collection,
// from the menu's page.
export function CollectionPicker({
  menuId,
  currentId,
  collections,
}: CollectionPickerProps) {
  const [state, formAction, pending] = useActionState(
    assignMenuCollection,
    initialState,
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
      {collections.length === 0 && (
        <p className={styles.hint}>
          No collections yet. Create one with “New collection” in the sidebar,
          then pick it here.
        </p>
      )}
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
