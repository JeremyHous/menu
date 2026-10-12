import Link from "next/link";
import { Suspense } from "react";
import { updateMenu } from "../../actions";
import { display } from "../../fonts";
import { getMenuOrNotFound } from "../../load-menu";
import { MenuForm } from "../../menu-form";
import styles from "../../menus.module.css";

async function EditMenu({ id }: { id: string }) {
  const menu = await getMenuOrNotFound(id);

  return (
    <>
      <Link href={`/menus/${menu.id}`} className={styles.back}>
        Back to {menu.title}
      </Link>
      <h1 className={`${display.className} ${styles.pageTitle}`}>
        Edit recipe
      </h1>
      <MenuForm
        action={updateMenu}
        menu={menu}
        submitLabel="Save changes"
        pendingLabel="Saving…"
        cancelHref={`/menus/${menu.id}`}
      />
    </>
  );
}

export default function EditMenuPage({
  params,
}: PageProps<"/menus/[id]/edit">) {
  return (
    <main className={styles.main}>
      <div className={styles.sheet}>
        {/* params are only known at request time, so they are read inside
            Suspense, as Cache Components requires. */}
        <Suspense fallback={<p className={styles.notice}>Setting the table…</p>}>
          {params.then(({ id }) => (
            <EditMenu id={id} />
          ))}
        </Suspense>
      </div>
    </main>
  );
}
