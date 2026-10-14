import { Suspense } from "react";
import { SiteNav } from "../site-nav";
import { body, display } from "./fonts";
import { MenuDragProvider } from "./menu-drag";
import styles from "./menus.module.css";
import { NewCollection } from "./new-collection";
import { Sidebar } from "./sidebar";
import { SidebarTags } from "./sidebar-tags";

// Shared by every /menus page: the sidebar of collections and tags beside
// the page. MenuDragProvider lets menus be dragged from the page onto the
// sidebar's collections.
// The sidebar reads from the database, so it streams in behind its own
// Suspense boundary while the page renders.
export default function MenusLayout({ children }: LayoutProps<"/menus">) {
  return (
    <MenuDragProvider>
      <div
        className={`${body.className} ${body.variable} ${styles.page} ${styles.shell}`}
      >
        {/* First in the page, so keyboard users reach it before the
            sidebar. */}
        <SiteNav current="menus" className={styles.siteNav} />
        <aside className={styles.sidebar} aria-label="Collections and tags">
          <h2
            id="collections-heading"
            className={`${display.className} ${styles.sidebarTitle}`}
          >
            Collections
          </h2>
          <Suspense
            fallback={<p className={styles.groupEmpty}>Loading collections…</p>}
          >
            <Sidebar />
          </Suspense>
          <NewCollection />
          <section
            className={styles.sidebarTags}
            aria-labelledby="tags-heading"
          >
            <h2
              id="tags-heading"
              className={`${display.className} ${styles.sidebarTitle}`}
            >
              Tags
            </h2>
            <Suspense
              fallback={<p className={styles.groupEmpty}>Loading tags…</p>}
            >
              <SidebarTags />
            </Suspense>
          </section>
        </aside>
        {children}
      </div>
    </MenuDragProvider>
  );
}
