import { getMenu, type Menu } from "@/app/lib/db";
import { notFound } from "next/navigation";

// Loads the recipe named in the URL for the view and edit pages, showing the
// 404 page for ids that are malformed or do not exist. Call it inside a
// <Suspense> boundary. Database errors propagate to the error boundary with
// a generic message.
export async function getMenuOrNotFound(rawId: string): Promise<Menu> {
  if (!/^[1-9]\d*$/.test(rawId)) notFound();
  const id = Number(rawId);
  if (!Number.isSafeInteger(id)) notFound();

  const menu = await getMenu(id);
  if (!menu) notFound();
  return menu;
}
