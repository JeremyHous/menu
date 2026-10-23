import {
  isShared,
  listCollections,
  listMenuTags,
  listTags,
  menuImageUrl,
} from "@/app/lib/db";
import { requireUser } from "@/lib/supabase/auth";
import Image from "next/image";
import Link from "next/link";
import { Suspense } from "react";
import { BackToMenus } from "../back-to-menus";
import { CollectionPicker } from "../collection-picker";
import { DeleteMenuButton } from "../delete-menu-button";
import { formatQuantity } from "../ingredients";
import { display } from "../fonts";
import { getMenuOrNotFound } from "../load-menu";
import { carbonClass, Stars } from "../menu-display";
import { MenuImageForm } from "../menu-image-form";
import { RemoveMenuImage } from "../remove-menu-image";
import { StorageImages } from "../storage-images";
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
  const shared = isShared(menu);

  return (
    <article>
      <div className={styles.titleRow}>
        <h1 className={`${display.className} ${styles.pageTitle}`}>
          {menu.title}
        </h1>
        {menu.image_path && (
          <span className={styles.menuImage}>
            {/* The title is right beside it, so the image needs no
                description. */}
            <Image
              src={menuImageUrl(menu.image_path)}
              alt=""
              fill
              sizes="7rem"
              priority
            />
          </span>
        )}
      </div>
      <p className={styles.ownerNote}>
        <span className={styles.ownerBadge}>{shared ? "Shared" : "Yours"}</span>{" "}
        {shared
          ? "Every user sees this recipe and your edits to it. Shared recipes cannot be deleted."
          : "Only you can see this recipe."}
      </p>

      {menu.carbon_footprint_kg !== null && (
        <p
          className={`${display.className} ${styles.carbon} ${carbonClass(menu.carbon_footprint_kg)}`}
        >
          {menu.carbon_footprint_kg.toFixed(1)}
          <span className={styles.unit}>kg CO₂e per serving</span>
        </p>
      )}

      {menu.body && <p className={styles.body}>{menu.body}</p>}

      {menu.ingredient_items.length > 0 && (
        <section className={styles.section}>
          <h2 className={styles.label}>
            Ingredients{" "}
            <span className={styles.optional}>for one adult portion</span>
          </h2>
          <ul className={styles.ingredientList}>
            {menu.ingredient_items.map((ingredient, index) => {
              const quantity = formatQuantity(ingredient);
              return (
                <li key={index}>
                  {ingredient.name}
                  {quantity ? (
                    <span className={styles.quantity}>{quantity}</span>
                  ) : (
                    <span className={styles.quantityMissing}>
                      quantity not given yet
                    </span>
                  )}
                </li>
              );
            })}
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

      {/* Two ways to set the image, shown as two numbered options so the
          choice is obvious. */}
      <section className={styles.section}>
        <RemoveMenuImage menuId={menu.id} currentPath={menu.image_path} />
        <div className={styles.imageOption}>
          <h3 className={styles.imageOptionTitle}>
            <span className={styles.optionNumber} aria-hidden="true">
              1
            </span>
            Upload from your device
          </h3>
          <MenuImageForm menuId={menu.id} currentPath={menu.image_path} />
        </div>
        <p className={styles.optionDivider} aria-hidden="true">
          or
        </p>
        <div className={styles.imageOption}>
          <h3 className={styles.imageOptionTitle}>
            <span className={styles.optionNumber} aria-hidden="true">
              2
            </span>
            Choose from Storage
          </h3>
          <p className={styles.hint}>
            Reuse an image that is already saved. No copy is uploaded.
          </p>
          {/* Listing Storage takes a few requests, so the rest of the page
              does not wait for it. */}
          <Suspense
            fallback={
              <p className={styles.notice}>Loading images in Storage…</p>
            }
          >
            <StorageImages menuId={menu.id} currentPath={menu.image_path} />
          </Suspense>
        </div>
      </section>

      <section className={styles.section}>
        <CollectionPicker
          menuId={menu.id}
          currentId={menu.collection_id}
          menuShared={shared}
          collections={collections.map((collection) => ({
            id: collection.id,
            name: collection.name,
            shared: isShared(collection),
          }))}
        />
      </section>

      <section className={styles.section}>
        <MenuTags
          menuId={menu.id}
          tags={tags.map(({ id, name }) => ({ id, name }))}
          availableTags={availableTags.map((tag) => ({
            id: tag.id,
            name: tag.name,
            shared: isShared(tag),
          }))}
        />
      </section>

      <div className={`${styles.actions} ${styles.section}`}>
        <Link href={`/menus/${menu.id}/edit`} className={styles.button}>
          Edit recipe
        </Link>
      </div>
      {/* Only the user's own recipes can be deleted. */}
      {!shared && <DeleteMenuButton id={menu.id} title={menu.title} />}
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
