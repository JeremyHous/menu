"use client";

import { useActionState, useState } from "react";
import { deleteMenu, type MenuFormState } from "./actions";
import styles from "./menus.module.css";

const initialState: MenuFormState = {};

// Deleting takes two clicks: the first asks for confirmation, the second
// submits the form to the deleteMenu action.
export function DeleteMenuButton({ id, title }: { id: number; title: string }) {
  const [state, formAction, pending] = useActionState(deleteMenu, initialState);
  const [confirming, setConfirming] = useState(false);

  return (
    <div className={styles.danger}>
      {state.message && (
        <p role="alert" className={styles.formError}>
          {state.message}
        </p>
      )}

      {confirming ? (
        <form action={formAction} className={styles.actions}>
          <input type="hidden" name="id" value={id} />
          <p className={styles.confirm}>
            Delete “{title}”? This cannot be undone.
          </p>
          <button
            type="submit"
            className={`${styles.button} ${styles.buttonDanger}`}
            disabled={pending}
          >
            {pending ? "Deleting…" : "Yes, delete it"}
          </button>
          <button
            type="button"
            className={styles.linkButton}
            onClick={() => setConfirming(false)}
            disabled={pending}
          >
            Cancel
          </button>
        </form>
      ) : (
        <button
          type="button"
          className={styles.linkButton}
          onClick={() => setConfirming(true)}
        >
          Delete recipe
        </button>
      )}
    </div>
  );
}
