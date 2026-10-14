import { listCollections, listMenuTags, listTags } from "@/app/lib/db";
import { requireUser } from "@/lib/supabase/auth";
import Link from "next/link";
import { Suspense } from "react";
import { BackToMenus } from "../back-to-menus";
import { CollectionPicker } from "../collection-picker";
import { DeleteMenuButton } from "../delete-menu-button";
import { display } from "../fonts";
import { getMenuOrNotFound } from "../load-menu";
import { carbonClass, Stars } from "../menu-display";
import { MenuTags } from "../menu-tags";
import styles from "../menus.module.css";

// Signed-in only: the session is checked before the recipe is loaded.
async function MenuDetail({ id }: { id: string }) {
  await requireUser();
  const menu = await getMenuOrNotFound(id);
  const [collections, tags, allTags] = await Promise.all([
    listCollections(),
    listMenuTags(menu.id),
    listTags(),
  ]);
  // The existing tags this menu does not have yet, offered in a list.
  const tagIds = new Set(tags.map((tag) => tag.id));
  const availableTags = allTags.filter((tag) => !tagIds.has(tag.id));

  return (
    <article>
      <h1 className={`${display.className} ${styles.pageTitle}`}>
        {menu.title}
      </h1>

      {menu.carbon_footprint_kg !== null && (
        <p
          className={`${display.className} ${styles.carbon} ${carbonClass(menu.carbon_footprint_kg)}`}
        >
          {menu.carbon_footprint_kg.toFixed(1)}
          <span className={styles.unit}>kg CO₂e per serving</span>
        </p>
      )}

      {menu.body && <p className={styles.body}>{menu.body}</p>}

      {menu.ingredients.length > 0 && (
        <section className={styles.section}>
          <h2 className={styles.label}>Ingredients</h2>
          <ul className={styles.ingredientList}>
            {menu.ingredients.map((ingredient, index) => (
              <li key={index}>{ingredient}</li>
            ))}
          </ul>
        </section>
      )}

      <div className={styles.meta}>
        {menu.fans_appreciation !== null && (
          <span>
            <Stars rating={menu.fans_appreciation} />
            {menu.fans_appreciation} out of 5 from fans
          </span>
        )}
        {menu.supplier_name && <span>Supplied by {menu.supplier_name}</span>}
      </div>

      <section className={styles.section}>
        <CollectionPicker
          menuId={menu.id}
          currentId={menu.collection_id}
          collections={collections.map(({ id, name }) => ({ id, name }))}
        />
      </section>

      <section className={styles.section}>
        <MenuTags
          menuId={menu.id}
          tags={tags.map(({ id, name }) => ({ id, name }))}
          availableTags={availableTags.map(({ id, name }) => ({ id, name }))}
        />
      </section>

      <div className={`${styles.actions} ${styles.section}`}>
        <Link href={`/menus/${menu.id}/edit`} className={styles.button}>
          Edit recipe
        </Link>
      </div>
      <DeleteMenuButton id={menu.id} title={menu.title} />
    </article>
  );
}

export default function MenuPage({ params }: PageProps<"/menus/[id]">) {
  return (
    <main className={styles.main}>
      <div className={styles.sheet}>
        {/* Reads the URL's filters, which are only known at request time. */}
        <Suspense
          fallback={
            <Link href="/menus" className={styles.back}>
              Back to menus
            </Link>
          }
        >
          <BackToMenus />
        </Suspense>
        {/* params are only known at request time, so they are read inside
            Suspense, as Cache Components requires. */}
        <Suspense
          fallback={<p className={styles.notice}>Setting the table…</p>}
        >
          {params.then(({ id }) => (
            <MenuDetail id={id} />
          ))}
        </Suspense>
      </div>
    </main>
  );
}
