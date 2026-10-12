"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import styles from "./menus.module.css";
import { filtersQueryFromParams } from "./search";

// "Back to menus", returning to the list with the tags and search query that
// were carried into this page's URL.
export function BackToMenus() {
  const searchParams = useSearchParams();
  return (
    <Link
      href={`/menus${filtersQueryFromParams(searchParams)}`}
      className={styles.back}
    >
      Back to menus
    </Link>
  );
}
