"use client";

import { useActionState, useEffect, useRef } from "react";
import { type MenuImageState, updateMenuImage } from "./actions";
import styles from "./menus.module.css";

const initialState: MenuImageState = {};

type RemoveMenuImageProps = {
  menuId: number;
  currentPath: string | null;
};

// The image section's heading, with a button to take the image off the menu
// when it has one. The file stays in Storage.
export function RemoveMenuImage({ menuId, currentPath }: RemoveMenuImageProps) {
  const [state, formAction, pending] = useActionState(
    updateMenuImage,
    initialState,
  );
  const hasImage = currentPath !== null;

  // The button disappears once the image is gone, so focus moves to the
  // heading instead of being lost.
  const headingRef = useRef<HTMLHeadingElement>(null);
  const hadImage = useRef(hasImage);
  useEffect(() => {
    if (hadImage.current && !hasImage) headingRef.current?.focus();
    hadImage.current = hasImage;
  }, [hasImage]);

  return (
    <div>
      <div className={styles.imageHeader}>
        <h2 ref={headingRef} tabIndex={-1} className={styles.label}>
          Image
        </h2>
        {hasImage && (
          <form action={formAction}>
            <input type="hidden" name="id" value={menuId} />
            <input type="hidden" name="intent" value="remove" />
            <button
              type="submit"
              className={styles.linkButton}
              disabled={pending}
            >
              {pending ? "Removing…" : "Remove image"}
            </button>
          </form>
        )}
      </div>
      <p className={styles.hint}>
        {hasImage
          ? "This recipe’s image is shown beside its title. To change it, use one of the two options below."
          : "This recipe has no image yet. Add one in either of these two ways."}
      </p>
      {state.error && (
        <p role="alert" className={styles.fieldError}>
          {state.error}
        </p>
      )}
      <p role="status" className={styles.status}>
        {!pending && state.imagePath === currentPath && state.message}
      </p>
    </div>
  );
}
