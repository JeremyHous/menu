import Link from "next/link";
import { createMenu } from "../actions";
import { display } from "../fonts";
import { MenuForm } from "../menu-form";
import styles from "../menus.module.css";

export default function NewMenuPage() {
  return (
    <main className={styles.main}>
      <div className={styles.sheet}>
        <Link href="/menus" className={styles.back}>
          Back to menus
        </Link>
        <h1 className={`${display.className} ${styles.pageTitle}`}>
          New recipe
        </h1>
        <MenuForm
          action={createMenu}
          submitLabel="Save recipe"
          pendingLabel="Saving…"
          cancelHref="/menus"
        />
      </div>
    </main>
  );
}
