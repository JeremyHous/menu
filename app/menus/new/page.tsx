import Link from "next/link";
import { Suspense } from "react";
import { SignedIn } from "../../signed-in";
import { createMenu } from "../actions";
import { display } from "../fonts";
import { MenuForm } from "../menu-form";
import styles from "../menus.module.css";

export default function NewMenuPage() {
  return (
    <main className={styles.main}>
      <div className={styles.sheet}>
        {/* Signed-in only. The session is only known at request time, so it
            is checked inside Suspense, as Cache Components requires. */}
        <Suspense
          fallback={<p className={styles.notice}>Checking your session…</p>}
        >
          <SignedIn>
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
          </SignedIn>
        </Suspense>
      </div>
    </main>
  );
}
