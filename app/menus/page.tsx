import {
  DatabaseError,
  isShared,
  listMenus,
  listMenuTagLinks,
  listTags,
  type Menu,
  menuImageUrl,
  type Tag,
} from "@/app/lib/db";
import Image from "next/image";
import Link from "next/link";
import { Suspense } from "react";
import { SignedIn } from "../signed-in";
import { display } from "./fonts";
import { formatIngredient } from "./ingredients";
import { carbonClass, Stars } from "./menu-display";
import { DraggableDish } from "./menu-drag";
import styles from "./menus.module.css";
import { MenuSearch, MenuSearchFallback } from "./menu-search";
import { filtersQuery, matchesSearch, normalizeSearch } from "./search";
import { hasAllTags, parseSelectedTags, tagsByMenu } from "./tag-filter";

type MenuListProps = {
  // The raw ?tags= and ?q= values.
  rawTags?: string | string[];
  rawQuery?: string | string[];
};

// Lists the menus that match the search query and have every selected tag.
async function MenuList({ rawTags, rawQuery }: MenuListProps) {
  const query = normalizeSearch(rawQuery);
  let menus: Menu[];
  let selectedTags: Tag[] = [];
  // How many menus exist before filtering, to tell an empty table apart from
  // filters that match nothing.
  let total: number;
  try {
    if (parseSelectedTags(rawTags).length === 0) {
      menus = await listMenus();
      total = menus.length;
    } else {
      const [allMenus, tags, links] = await Promise.all([
        listMenus(),
        listTags(),
        listMenuTagLinks(),
      ]);
      const selected = parseSelectedTags(
        rawTags,
        tags.map((tag) => tag.id),
      );
      total = allMenus.length;
      const menuTags = tagsByMenu(links);
      menus = allMenus.filter((menu) =>
        hasAllTags(menuTags.get(menu.id), selected),
      );
      selectedTags = tags.filter((tag) => selected.includes(tag.id));
    }
  } catch (error) {
    if (!(error instanceof DatabaseError)) throw error;
    return (
      <p className={styles.notice}>
        The menus could not be loaded. Refresh the page to try again.
      </p>
    );
  }
  // AND with the tag filter: only menus that passed it are searched.
  menus = menus.filter((menu) => matchesSearch(menu, query));

  const selectedIds = selectedTags.map((tag) => tag.id);
  // Menu links keep both filters, so "Back to menus" can restore them.
  const linkQuery = filtersQuery(selectedIds, query);
  const tagNames = selectedTags.map((tag) => tag.name).join(" and ");
  const searchText = query && `matching “${query}”`;
  const tagText = tagNames && `tagged ${tagNames}`;

  const filtering = query !== "" || tagNames !== "";
  const clearSearchHref = `/menus${filtersQuery(selectedIds, "")}`;
  const clearTagsHref = `/menus${filtersQuery([], query)}`;

  // Links that each drop one filter and keep the other, plus one that drops
  // both when both are set.
  const clearActions = filtering && (
    <div className={styles.emptyActions}>
      {query && (
        <Link href={clearSearchHref} className={styles.linkButton}>
          Clear search
        </Link>
      )}
      {tagNames && (
        <Link href={clearTagsHref} className={styles.linkButton}>
          Clear all tags
        </Link>
      )}
      {query && tagNames && (
        <Link href="/menus" className={styles.linkButton}>
          Clear search and tags
        </Link>
      )}
    </div>
  );

  // No menus at all: filters cannot help, so the next step is adding one.
  if (total === 0) {
    return (
      <div role="status" className={styles.emptyState}>
        <p className={styles.emptyTitle}>No dishes yet</p>
        <p>The menu is empty. Add your first recipe and it will appear here.</p>
        <div className={styles.emptyActions}>
          <Link href="/menus/new" className={styles.button}>
            Add a menu with its recipe
          </Link>
        </div>
      </div>
    );
  }

  // Menus exist, but none match the filters.
  if (menus.length === 0) {
    let detail: string;
    if (query && tagNames) {
      detail = `No dish matches “${query}” and is also tagged ${tagNames}.`;
    } else if (query) {
      detail = `No dish has “${query}” in its title or description.`;
    } else {
      detail = `No dish is tagged ${tagNames}.`;
    }
    const hint =
      selectedTags.length > 1
        ? "Dishes must have every selected tag. Try fewer tags or other words."
        : "Try other words or a different tag.";
    return (
      <div role="status" className={styles.emptyState}>
        <p className={styles.emptyTitle}>No matching dishes</p>
        <p>{detail}</p>
        <p className={styles.hint}>
          {hint} There {total === 1 ? "is" : "are"} {total}{" "}
          {total === 1 ? "dish" : "dishes"} in total.
        </p>
        {clearActions}
      </div>
    );
  }

  let summary = "";
  if (filtering) {
    const dishes = `${menus.length} of ${total} ${total === 1 ? "dish" : "dishes"}`;
    summary = `Showing ${[dishes, searchText, tagText].filter(Boolean).join(" ")}.`;
  }

  return (
    <>
      {filtering && (
        <div className={styles.filterNote}>
          <p role="status">{summary}</p>
          {clearActions}
        </div>
      )}
      <ul className={styles.list}>
        {menus.map((menu) => (
          <DraggableDish
            key={menu.id}
            menu={{
              id: menu.id,
              title: menu.title,
              collectionId: menu.collection_id,
              shared: isShared(menu),
            }}
          >
            {/* Decorative: the dish's name links to the recipe beside it. */}
            {menu.image_path && (
              <span className={`${styles.thumb} ${styles.dishThumb}`}>
                <Image
                  src={menuImageUrl(menu.image_path)}
                  alt=""
                  fill
                  sizes="6.5rem"
                  // The whole dish is dragged onto collections, not the
                  // image on its own.
                  draggable={false}
                />
              </span>
            )}
            <div className={styles.line}>
              <h2 className={`${display.className} ${styles.name}`}>
                <Link
                  href={`/menus/${menu.id}${linkQuery}`}
                  className={styles.nameLink}
                >
                  {menu.title}
                </Link>
              </h2>
              {menu.carbon_footprint_kg !== null && (
                <>
                  <span className={styles.leader} aria-hidden="true" />
                  <span
                    className={`${display.className} ${styles.carbon} ${carbonClass(menu.carbon_footprint_kg)}`}
                  >
                    {menu.carbon_footprint_kg.toFixed(1)}
                    <span className={styles.unit}>kg CO₂e</span>
                  </span>
                </>
              )}
            </div>
            {menu.body && <p className={styles.body}>{menu.body}</p>}
            {menu.ingredient_items.length > 0 && (
              <p className={styles.ingredients}>
                {menu.ingredient_items.map(formatIngredient).join(" · ")}
              </p>
            )}
            <div className={styles.meta}>
              <span className={styles.ownerBadge}>
                {isShared(menu) ? "Shared" : "Yours"}
              </span>
              {menu.fans_appreciation !== null && (
                <span>
                  <Stars rating={menu.fans_appreciation} />
                  {menu.fans_appreciation} out of 5 from fans
                </span>
              )}
              {menu.supplier_name && (
                <span>Supplied by {menu.supplier_name}</span>
              )}
            </div>
          </DraggableDish>
        ))}
      </ul>
    </>
  );
}

export default function MenusPage({ searchParams }: PageProps<"/menus">) {
  return (
    <main className={styles.main}>
      <div className={styles.sheet}>
        {/* Signed-in only. The session is only known at request time, so it
            is checked inside Suspense, as Cache Components requires. */}
        <Suspense
          fallback={<p className={styles.notice}>Checking your session…</p>}
        >
          <SignedIn>
            <header className={styles.header}>
              <h1 className={`${display.className} ${styles.title}`}>Menus</h1>
              <p className={styles.intro}>
                Every dish is priced in carbon: the figure beside each name is
                its footprint per serving, in <strong>kilograms of CO₂e</strong>
                .
              </p>
              <Link
                href="/menus/new"
                className={`${styles.button} ${styles.addLink}`}
              >
                Add a menu with its recipe
              </Link>
            </header>
            {/* The search box reads the URL, which is only known at request
            time, so it renders inside Suspense too. */}
            <Suspense fallback={<MenuSearchFallback />}>
              <MenuSearch />
            </Suspense>
            <Suspense
              fallback={<p className={styles.notice}>Setting the table…</p>}
            >
              {/* searchParams are only known at request time, so they are read
              inside Suspense, as Cache Components requires. */}
              {searchParams.then(({ tags, q }) => (
                <MenuList rawTags={tags} rawQuery={q} />
              ))}
            </Suspense>
            <footer className={styles.legend}>
              <span className={styles.low}>
                <span className={styles.swatch} />
                Under 1 kg: light
              </span>
              <span className={styles.mid}>
                <span className={styles.swatch} />1 to 3 kg: moderate
              </span>
              <span className={styles.high}>
                <span className={styles.swatch} />
                Over 3 kg: heavy
              </span>
            </footer>
          </SignedIn>
        </Suspense>
      </div>
    </main>
  );
}
