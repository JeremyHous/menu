import { ThemeSwitcher } from "@/components/theme-switcher";
import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import styles from "../home.module.css";
import { body, display } from "../menus/fonts";
import { Suspense } from "react";
import { SignedIn } from "../signed-in";
import { SiteNav } from "../site-nav";

export const metadata: Metadata = {
  title: "About the author",
};

// A page about the app's author, styled like the home page. Signed-in only.
export default function AuthorPage() {
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
        <SignedIn>
          <header className={`${styles.frame} ${styles.header}`}>
            {/* The portrait sits in the top left corner. */}
            <Image
              src="/JHoussin-small.jpg"
              alt="Portrait of Jeremy Houssin"
              width={192}
              height={192}
              priority
              className={styles.portrait}
            />
            <SiteNav current="author" />
          </header>

          <main>
            <section className={`${styles.frame} ${styles.hero}`}>
              <p className={styles.kicker}>About the author</p>
              <h1 className={`${display.className} ${styles.headline}`}>
                Jeremy Houssin
              </h1>
              <p className={styles.intro}>
                Chef for twenty years, climate engineer by training, and the
                person behind this carbon-priced menu.
              </p>
            </section>

            <section
              className={`${styles.frame} ${styles.board}`}
              aria-labelledby="bio-title"
            >
              <h2
                id="bio-title"
                className={`${display.className} ${styles.boardTitle}`}
              >
                Biography
              </h2>
              <div className={styles.bio}>
                <p>
                  Jeremy spent twenty years in professional kitchens across
                  Europe and Asia: first on the line in French bistros, then
                  running the pass in busy brasseries in Brussels and Berlin,
                  and later cooking in Bangkok, Singapore and Tokyo. Those Asian
                  kitchens taught Jeremy to build deep flavour from vegetables,
                  ferments and very little meat.
                </p>
                <p>
                  Along the way, one thing stood out: no menu ever told guests
                  what a dish cost the planet. To learn how to measure it,
                  Jeremy went back to university and earned a Master’s degree in
                  Climate Engineering, specialising in the life-cycle emissions
                  of food.
                </p>
                <p>
                  This app brings the two careers together: every recipe is
                  priced in kilograms of CO₂e per serving, so cooks can weigh
                  taste and footprint side by side before they choose what to
                  make.
                </p>
              </div>
              <div className={styles.actions}>
                <Link href="/menus" className={styles.primary}>
                  Browse the menus
                </Link>
              </div>
            </section>
          </main>
        </SignedIn>
      </Suspense>

      <footer className={styles.footer}>
        <div className={`${styles.frame} ${styles.footerInner}`}>
          <p>Built with Next.js and Supabase.</p>
          <ThemeSwitcher />
        </div>
      </footer>
    </div>
  );
}
