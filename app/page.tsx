import { AuthButton } from "@/components/auth-button";
import { EnvVarWarning } from "@/components/env-var-warning";
import { ThemeSwitcher } from "@/components/theme-switcher";
import { hasEnvVars } from "@/lib/utils";
import Link from "next/link";
import { Suspense } from "react";
import { DatabaseError, listMenus, type Menu } from "./lib/db";
import styles from "./home.module.css";
import { body, display } from "./menus/fonts";

// How many dishes the price list shows before linking to the full list.
const BOARD_LIMIT = 8;

// The same per-serving bands as the menus list: under 1 kg is light, over
// 3 kg heavy.
function band(kg: number) {
  if (kg < 1) return styles.light;
  if (kg <= 3) return styles.moderate;
  return styles.heavy;
}

// Every dish with a footprint, lightest first, each drawn as a bar whose
// length is its share of the heaviest dish. Call it inside <Suspense>.
async function PriceList() {
  let menus: Menu[];
  try {
    menus = await listMenus();
  } catch (error) {
    if (!(error instanceof DatabaseError)) throw error;
    return (
      <p className={styles.empty}>
        The dishes could not be loaded. Refresh the page to try again.
      </p>
    );
  }

  const priced = menus
    .filter(
      (menu): menu is Menu & { carbon_footprint_kg: number } =>
        menu.carbon_footprint_kg !== null,
    )
    .sort((a, b) => a.carbon_footprint_kg - b.carbon_footprint_kg);

  if (priced.length === 0) {
    return (
      <p className={styles.empty}>
        No dish has a footprint yet. <Link href="/menus/new">Add a recipe</Link>{" "}
        with its kilograms of CO₂e per serving and it will appear here.
      </p>
    );
  }

  const shown = priced.slice(0, BOARD_LIMIT);
  const heaviest = priced[priced.length - 1].carbon_footprint_kg || 1;

  return (
    <>
      <ol className={styles.dishes}>
        {shown.map((menu, index) => (
          <li
            key={menu.id}
            className={`${styles.dish} ${band(menu.carbon_footprint_kg)}`}
          >
            <span className={`${display.className} ${styles.dishName}`}>
              <Link href={`/menus/${menu.id}`} className={styles.dishLink}>
                {menu.title}
              </Link>
            </span>
            <span className={styles.track} aria-hidden="true">
              <span
                className={styles.bar}
                style={{
                  width: `${(menu.carbon_footprint_kg / heaviest) * 100}%`,
                  // The bars grow one after another, once, on page load.
                  animationDelay: `${index * 70}ms`,
                }}
              />
            </span>
            <span className={`${display.className} ${styles.figure}`}>
              {menu.carbon_footprint_kg.toFixed(1)}
              <span className={styles.unit}>kg</span>
            </span>
          </li>
        ))}
      </ol>
      {priced.length > shown.length && (
        <Link href="/menus" className={styles.more}>
          See all {priced.length} dishes
        </Link>
      )}
    </>
  );
}

export default function Home() {
  return (
    <div className={`${body.className} ${styles.page}`}>
      <header className={`${styles.frame} ${styles.header}`}>
        <Link href="/" className={`${display.className} ${styles.wordmark}`}>
          Menus
        </Link>
        {!hasEnvVars ? (
          <EnvVarWarning />
        ) : (
          <Suspense>
            <AuthButton />
          </Suspense>
        )}
      </header>

      <main>
        <section className={`${styles.frame} ${styles.hero}`}>
          <h1 className={`${display.className} ${styles.headline}`}>
            A menu priced in carbon.
          </h1>
          <p className={styles.intro}>
            Every recipe lists its footprint per serving in kilograms of CO₂e,
            so you can see what a dish costs the climate before you cook it.
            File recipes into collections, tag them, and find them again by
            name.
          </p>
          <div className={styles.actions}>
            <Link href="/menus" className={styles.primary}>
              Browse the menus
            </Link>
            <Link href="/menus/new" className={styles.secondary}>
              Add a recipe
            </Link>
          </div>
        </section>

        <section
          className={`${styles.frame} ${styles.board}`}
          aria-labelledby="board-title"
        >
          <h2
            id="board-title"
            className={`${display.className} ${styles.boardTitle}`}
          >
            What each dish costs
          </h2>
          <p className={styles.boardNote}>
            Kilograms of CO₂e per serving, lightest first. Bar length is
            relative to the heaviest dish.
          </p>
          <Suspense
            fallback={<p className={styles.empty}>Weighing the dishes…</p>}
          >
            <PriceList />
          </Suspense>
          <div className={styles.legend}>
            <span className={styles.light}>
              <span className={styles.swatch} />
              Under 1 kg: light
            </span>
            <span className={styles.moderate}>
              <span className={styles.swatch} />1 to 3 kg: moderate
            </span>
            <span className={styles.heavy}>
              <span className={styles.swatch} />
              Over 3 kg: heavy
            </span>
          </div>
        </section>
      </main>

      <footer className={styles.footer}>
        <div className={`${styles.frame} ${styles.footerInner}`}>
          <p>Built with Next.js and Supabase.</p>
          <ThemeSwitcher />
        </div>
      </footer>
    </div>
  );
}
