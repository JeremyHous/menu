"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import styles from "./menus.module.css";
import { normalizeSearch, SEARCH_PARAM } from "./search";

// How long typing has to pause before the URL, and so the results, update.
const DEBOUNCE_MS = 250;

// The search box above the menu list. Results update as the user types: the
// query is written to ?q= in the URL, keeping ?tags= and any other
// parameters, and the page filters on the server.
export function MenuSearch() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const urlQuery = normalizeSearch(searchParams.get(SEARCH_PARAM));
  const [value, setValue] = useState(urlQuery);
  const [pending, startTransition] = useTransition();
  const inputRef = useRef<HTMLInputElement>(null);
  // Queries this box has written to the URL that have not shown up there yet.
  const pendingWrites = useRef(new Set<string>());

  // Follows the URL when it changes from elsewhere, e.g. a "Clear search"
  // link or the back button. The box's own updates are skipped, even late
  // ones, so a slow response never overwrites what the user is typing.
  useEffect(() => {
    if (pendingWrites.current.delete(urlQuery)) return;
    setValue((current) =>
      normalizeSearch(current) === urlQuery ? current : urlQuery,
    );
  }, [urlQuery]);

  const wanted = normalizeSearch(value);
  useEffect(() => {
    if (wanted === urlQuery) return;
    const timer = setTimeout(() => {
      const params = new URLSearchParams(searchParams.toString());
      if (wanted) params.set(SEARCH_PARAM, wanted);
      else params.delete(SEARCH_PARAM);
      // Commas in ?tags= stay readable instead of becoming %2C.
      const query = params.toString().replace(/%2C/gi, ",");
      pendingWrites.current.add(wanted);
      // replace, not push, so each keystroke does not add a history entry.
      startTransition(() => {
        router.replace(query ? `${pathname}?${query}` : pathname, {
          scroll: false,
        });
      });
    }, DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [wanted, urlQuery, searchParams, pathname, router]);

  return (
    <div role="search" className={styles.search}>
      <label htmlFor="menu-search" className={styles.label}>
        Search menus
      </label>
      <div className={styles.pickerRow}>
        <input
          ref={inputRef}
          id="menu-search"
          type="search"
          value={value}
          onChange={(event) => setValue(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Escape") setValue("");
          }}
          placeholder="Search by title or description"
          autoComplete="off"
          aria-describedby="menu-search-hint"
          className={styles.input}
        />
        {value !== "" && (
          <button
            type="button"
            className={styles.linkButton}
            onClick={() => {
              setValue("");
              // The button disappears, so focus goes back to the input.
              inputRef.current?.focus();
            }}
          >
            Clear search
          </button>
        )}
      </div>
      <p id="menu-search-hint" className={styles.hint}>
        Results update as you type{pending ? "…" : "."}
      </p>
    </div>
  );
}

// Shown while the search box waits for the URL at request time.
export function MenuSearchFallback() {
  return (
    <div className={styles.search}>
      <label htmlFor="menu-search" className={styles.label}>
        Search menus
      </label>
      <input
        id="menu-search"
        type="search"
        disabled
        placeholder="Search by title or description"
        className={styles.input}
      />
    </div>
  );
}
