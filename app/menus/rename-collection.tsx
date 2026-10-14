"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { renameCollection, type RenameCollectionState } from "./actions";
import styles from "./menus.module.css";

const initialState: RenameCollectionState = {};

type RenameCollectionProps = {
  id: number;
  name: string;
};

// The "Rename" button inside an open collection group. It opens a small form
// filled with the current name; the form closes again once the rename is
// saved.
export function RenameCollection({ id, name }: RenameCollectionProps) {
  const [state, formAction, pending] = useActionState(
    renameCollection,
    initialState,
  );
  const [open, setOpen] = useState(false);
  const toggleRef = useRef<HTMLButtonElement>(null);
  // Set when the form closes, so focus goes back to the button instead of
  // being lost with the removed form.
  const returnFocus = useRef(false);

  // The result the user last dismissed by closing the form. Its error and
  // name are not shown again when the form is reopened.
  const [dismissed, setDismissed] = useState<RenameCollectionState | null>(
    null,
  );
  const current = state === dismissed ? initialState : state;

  function close() {
    setDismissed(state);
    setOpen(false);
    returnFocus.current = true;
  }

  // Close the form after each successful rename. Adjusting state during
  // render avoids an extra render with the stale form still open.
  const [handled, setHandled] = useState(state.renamed);
  if (state.renamed !== handled) {
    setHandled(state.renamed);
    if (state.renamed) {
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

  const inputId = `collection-rename-${id}`;
  const errorId = `${inputId}-error`;

  return (
    <div className={styles.renameCollection}>
      {open ? (
        <form
          action={formAction}
          className={styles.newCollectionForm}
          noValidate
          onKeyDown={(event) => {
            if (event.key === "Escape") close();
          }}
        >
          <input type="hidden" name="id" value={id} />
          <label htmlFor={inputId} className={styles.label}>
            New name for “{name}”
          </label>
          <input
            id={inputId}
            name="name"
            type="text"
            required
            maxLength={100}
            autoFocus
            autoComplete="off"
            defaultValue={current.name ?? name}
            onFocus={(event) => event.currentTarget.select()}
            aria-invalid={current.error ? true : undefined}
            aria-describedby={current.error ? errorId : undefined}
            className={styles.input}
          />
          {current.error && (
            <p id={errorId} role="alert" className={styles.fieldError}>
              {current.error}
            </p>
          )}
          <div className={styles.actions}>
            <button
              type="submit"
              className={`${styles.button} ${styles.buttonSmall}`}
              disabled={pending}
            >
              {pending ? "Saving…" : "Save"}
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
          className={styles.linkButton}
          aria-label={`Rename collection “${name}”`}
          onClick={() => setOpen(true)}
        >
          Rename
        </button>
      )}
      <p role="status" className={styles.status}>
        {!open && current.renamed && `Renamed to “${current.renamed.name}”.`}
      </p>
    </div>
  );
}
