"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { createCollection, type CollectionFormState } from "./actions";
import styles from "./menus.module.css";

const initialState: CollectionFormState = {};

// The "New collection" button. It opens a small form that asks for a name;
// the form closes again once the collection is created.
export function NewCollection() {
  const [state, formAction, pending] = useActionState(
    createCollection,
    initialState,
  );
  const [open, setOpen] = useState(false);
  const toggleRef = useRef<HTMLButtonElement>(null);
  // Set when the form closes, so focus goes back to the button instead of
  // being lost with the removed form.
  const returnFocus = useRef(false);

  // The result the user last dismissed by closing the form. Its error and
  // name are not shown again when the form is reopened.
  const [dismissed, setDismissed] = useState<CollectionFormState | null>(null);
  const current = state === dismissed ? initialState : state;

  function close() {
    setDismissed(state);
    setOpen(false);
    returnFocus.current = true;
  }

  // Close the form after each successful creation. Adjusting state during
  // render avoids an extra render with the stale form still open.
  const [handled, setHandled] = useState(state.created);
  if (state.created !== handled) {
    setHandled(state.created);
    if (state.created) {
      setOpen(false);
      returnFocus.current = true;
    }
  }

  useEffect(() => {
    if (!open && returnFocus.current) {
      returnFocus.current = false;
      toggleRef.current?.focus();
    }
  }, [open]);

  return (
    <div className={styles.newCollection}>
      {open ? (
        <form
          action={formAction}
          className={styles.newCollectionForm}
          noValidate
          onKeyDown={(event) => {
            if (event.key === "Escape") close();
          }}
        >
          <label htmlFor="collection-name" className={styles.label}>
            Collection name
          </label>
          <input
            id="collection-name"
            name="name"
            type="text"
            required
            maxLength={100}
            autoFocus
            autoComplete="off"
            defaultValue={current.name ?? ""}
            aria-invalid={current.error ? true : undefined}
            aria-describedby={
              current.error ? "collection-name-error" : undefined
            }
            className={styles.input}
          />
          {current.error && (
            <p id="collection-name-error" className={styles.fieldError}>
              {current.error}
            </p>
          )}
          <div className={styles.actions}>
            <button
              type="submit"
              className={`${styles.button} ${styles.buttonSmall}`}
              disabled={pending}
            >
              {pending ? "Creating…" : "Create"}
            </button>
            <button
              type="button"
              className={styles.linkButton}
              onClick={close}
              disabled={pending}
            >
              Cancel
            </button>
          </div>
        </form>
      ) : (
        <button
          ref={toggleRef}
          type="button"
          className={`${styles.button} ${styles.buttonSmall}`}
          onClick={() => setOpen(true)}
        >
          New collection
        </button>
      )}
      <p role="status" className={styles.status}>
        {!open && current.created && `Created “${current.created.name}”.`}
      </p>
    </div>
  );
}
