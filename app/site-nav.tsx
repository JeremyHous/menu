import Link from "next/link";
import styles from "./site-nav.module.css";

const LINKS = [
  { key: "home", href: "/", label: "Home" },
  { key: "menus", href: "/menus", label: "Menus" },
  { key: "author", href: "/author", label: "Author" },
] as const;

type SiteNavProps = {
  // The section the page belongs to, marked as current. Passed in rather than
  // read from the URL, so the nav needs no client code or Suspense boundary.
  current: (typeof LINKS)[number]["key"];
  className?: string;
};

// The links between the app's main pages: home, the menus browser and the
// author page. Its colors come from the page's CSS variables, so it fits both
// the home and the menus palettes, light and dark.
export function SiteNav({ current, className = "" }: SiteNavProps) {
  return (
    <nav aria-label="Main" className={`${styles.nav} ${className}`}>
      <ul className={styles.list}>
        {LINKS.map((link) => (
          <li key={link.key}>
            <Link
              href={link.href}
              className={styles.link}
              aria-current={link.key === current ? "page" : undefined}
            >
              {link.label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
