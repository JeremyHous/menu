import { requireUser } from "@/lib/supabase/auth";
import Link from "next/link";
import { Suspense } from "react";
import styles from "../home.module.css";
import { signOut } from "../login/actions";
import { body, display } from "../menus/fonts";

// The signed-in landing page. Nothing on it renders until requireUser() has
// checked the session with the Supabase Auth server; signed-out visitors are
// redirected to /login.
async function Workspace() {
  const user = await requireUser();

  return (
    <>
      <header className={`${styles.frame} ${styles.header}`}>
        <div className={styles.account}>
          <span>Signed in as {user.email}</span>
          {/* Signs out on the server, then redirects to /login. */}
          <form action={signOut}>
            <button type="submit" className={styles.textButton}>
              Sign out
            </button>
          </form>
        </div>
      </header>
      <main className={`${styles.frame} ${styles.hero}`}>
        <h1 className={`${display.className} ${styles.headline}`}>
          Your workspace
        </h1>
        <p className={styles.intro}>
          Browse the menus, file them into collections, or add a new recipe with
          its carbon footprint.
        </p>
        <div className={styles.actions}>
          <Link href="/menus" className={styles.primary}>
            Display all menus
          </Link>
          <Link href="/menus/new" className={styles.secondary}>
            Add a menu with its recipe
          </Link>
        </div>
      </main>
    </>
  );
}

export default function WorkspacePage() {
  return (
    <div className={`${body.className} ${styles.page}`}>
      {/* The session is only known at request time, so it is checked inside
          Suspense, as Cache Components requires. */}
      <Suspense
        fallback={
          <p className={`${styles.frame} ${styles.empty}`}>
            Checking your session…
          </p>
        }
      >
        <Workspace />
      </Suspense>
    </div>
  );
}
