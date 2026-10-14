"use client";

import Image from "next/image";
import { useActionState, useEffect, useRef, useState } from "react";
import { chooseMenuImage, type MenuImageState } from "./actions";
import styles from "./menus.module.css";

const initialState: MenuImageState = {};

type StorageImagePickerProps = {
  menuId: number;
  currentPath: string | null;
  images: { path: string; name: string; url: string }[];
};

// The "choose from Storage" option on the menu's page. The images stay out
// of sight, and are not even loaded, until the user asks to browse them;
// then they appear as thumbnails. Picking one only saves its path; nothing
// is uploaded.
export function StorageImagePicker({
  menuId,
  currentPath,
  images,
}: StorageImagePickerProps) {
  const [state, formAction, pending] = useActionState(
    chooseMenuImage,
    initialState,
  );
  const [open, setOpen] = useState(false);
  // Once an image has been chosen, the thumbnails close again.
  const [prevState, setPrevState] = useState(state);
  if (state !== prevState) {
    setPrevState(state);
    if (state.message) setOpen(false);
  }

  // Closing after a choice removes the button that had focus, so focus moves
  // back to the browse button.
  const toggleRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (state.message) toggleRef.current?.focus();
  }, [state]);

  // The current image comes first; the rest stay newest first.
  const ordered = [
    ...images.filter((image) => image.path === currentPath),
    ...images.filter((image) => image.path !== currentPath),
  ];

  if (images.length === 0) {
    return (
      <p className={styles.hint}>
        There are no images in Storage yet. Upload one from your device and it
        will be listed here.
      </p>
    );
  }

  return (
    <form action={formAction}>
      <input type="hidden" name="id" value={menuId} />
      <button
        ref={toggleRef}
        type="button"
        className={styles.buttonOutline}
        aria-expanded={open}
        aria-controls="storage-images"
        onClick={() => setOpen(!open)}
      >
        {open ? "Hide images" : `Browse images in Storage (${images.length})`}
      </button>
      {open && (
        <>
          {/* Keyed on the saved path so the current image is selected again
              once the page refreshes after a change. */}
          <fieldset
            key={currentPath ?? "none"}
            id="storage-images"
            className={styles.storageGrid}
          >
            <legend className={styles.srOnly}>Images in Storage</legend>
            {ordered.map((image) => {
              const current = image.path === currentPath;
              return (
                <label key={image.path} className={styles.storageOption}>
                  <input
                    type="radio"
                    name="image_path"
                    value={image.path}
                    defaultChecked={current}
                  />
                  <span className={styles.thumb}>
                    {/* The file name below describes the choice. */}
                    <Image src={image.url} alt="" fill sizes="6.5rem" />
                  </span>
                  <span className={styles.storageName} title={image.path}>
                    {image.name}
                  </span>
                  {current && (
                    <span className={styles.ownerBadge}>Current</span>
                  )}
                </label>
              );
            })}
          </fieldset>
          <div className={styles.actions}>
            <button type="submit" className={styles.button} disabled={pending}>
              {pending ? "Saving…" : "Use this image"}
            </button>
          </div>
        </>
      )}
      {state.error && (
        <p role="alert" className={styles.fieldError}>
          {state.error}
        </p>
      )}
      <p role="status" className={styles.status}>
        {!pending && state.message}
      </p>
    </form>
  );
}
