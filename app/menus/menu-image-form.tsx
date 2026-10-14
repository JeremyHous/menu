"use client";

import { type ChangeEvent, useActionState, useState } from "react";
import { type MenuImageState, updateMenuImage } from "./actions";
import {
  IMAGE_ACCEPT,
  IMAGE_MAX_BYTES,
  IMAGE_MAX_LABEL,
  isImageType,
} from "./menu-image";
import styles from "./menus.module.css";

const initialState: MenuImageState = {};

type MenuImageFormProps = {
  menuId: number;
  hasImage: boolean;
};

// The "upload from your device" option on the menu's page. It saves on its
// own, so recipes whose other fields still need fixing can get an image too.
export function MenuImageForm({ menuId, hasImage }: MenuImageFormProps) {
  const [state, formAction, pending] = useActionState(
    updateMenuImage,
    initialState,
  );
  // A problem with the chosen file, found before submitting. The server
  // checks again; this only spares the user a slow upload that would fail.
  const [warning, setWarning] = useState<string | null>(null);
  const [prevState, setPrevState] = useState(state);
  if (state !== prevState) {
    setPrevState(state);
    setWarning(null);
  }
  const error = warning ?? state.error;

  function checkFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.currentTarget.files?.[0];
    let problem: string | null = null;
    if (file && !isImageType(file.type)) {
      problem = "Choose a JPEG, PNG or WebP image.";
    } else if (file && file.size > IMAGE_MAX_BYTES) {
      problem = `Choose an image under ${IMAGE_MAX_LABEL}.`;
    }
    // Clearing the input keeps the unusable file from being sent.
    if (problem) event.currentTarget.value = "";
    setWarning(problem);
  }

  return (
    <form action={formAction} className={styles.picker}>
      <input type="hidden" name="id" value={menuId} />
      <label htmlFor="image" className={styles.srOnly}>
        Image file
      </label>
      <div className={styles.pickerRow}>
        <input
          type="file"
          id="image"
          name="image"
          accept={IMAGE_ACCEPT}
          onChange={checkFile}
          aria-invalid={error ? true : undefined}
          aria-describedby={`image-hint${error ? " image-error" : ""}`}
          className={styles.input}
        />
        <button type="submit" className={styles.button} disabled={pending}>
          {pending ? "Uploading…" : hasImage ? "Upload and replace" : "Upload"}
        </button>
      </div>
      <p id="image-hint" className={styles.hint}>
        JPEG, PNG or WebP, up to {IMAGE_MAX_LABEL}. The file is saved in
        Storage, so you can reuse it later.
      </p>
      {error && (
        <p id="image-error" role="alert" className={styles.fieldError}>
          {error}
        </p>
      )}
      <p role="status" className={styles.status}>
        {!pending && state.message}
      </p>
    </form>
  );
}
