import { createClient } from "@/lib/supabase/server";
import type { PostgrestError } from "@supabase/supabase-js";
import type { Ingredient } from "@/app/menus/ingredients";

// The single place where the app reads and writes its tables: public.menus,
// public.collections, public.tags and public.menu_tags, and the menu images
// in the menu-images Storage bucket. Pages and server actions call these
// functions instead of querying Supabase themselves.
// Validation, redirects and revalidation stay with the callers; this module
// only talks to the database.
//
// It uses the server client, so it must only be imported from Server
// Components, Server Actions and Route Handlers.

export type Menu = {
  id: number;
  title: string;
  body: string | null;
  // The ingredient names only, kept in step with ingredient_items for older
  // readers.
  ingredients: string[];
  // The ingredients with their quantity for one adult portion, in order.
  ingredient_items: Ingredient[];
  carbon_footprint_kg: number | null;
  fans_appreciation: number | null;
  supplier_name: string | null;
  // The collection this menu belongs to, or null if it has none.
  collection_id: number | null;
  // See Owned below.
  user_id: string | null;
  // Where the menu's image is in the menu-images bucket, or null if it has
  // none. Only the path is stored; see menuImageUrl.
  image_path: string | null;
};

// Menus, collections and tags have an owner. Rows that existed before
// ownership was added have none (user_id is null) and are shared: every
// signed-in user can read, edit and delete them. New rows get the signed-in
// user as owner from the column's default, and only that user can reach
// them. RLS enforces all of this; see docs/supabase-schema.md.
export type Owned = { user_id: string | null };

export function isShared(row: Owned) {
  return row.user_id === null;
}

// The columns the recipe form writes. Callers validate values before passing
// them in. collection_id is left out so that saving a recipe never moves it;
// use setMenuCollection for that. user_id is never written by the app.
// image_path is left out too; use setMenuImage for that.
export type MenuInput = Omit<
  Menu,
  "id" | "collection_id" | "user_id" | "image_path"
>;

const MENU_COLUMNS =
  "id, title, body, ingredients, ingredient_items, carbon_footprint_kg, fans_appreciation, supplier_name, collection_id, user_id, image_path";

export type Collection = {
  id: number;
  name: string;
  created_at: string;
  user_id: string | null;
};

const COLLECTION_COLUMNS = "id, name, created_at, user_id";

export type Tag = {
  id: number;
  name: string;
  created_at: string;
  user_id: string | null;
};

const TAG_COLUMNS = "id, name, created_at, user_id";

// Postgres error code for a foreign key violation, e.g. assigning a menu to a
// collection that has just been deleted. Callers compare DatabaseError.code
// with it to show a specific message.
export const FOREIGN_KEY_VIOLATION = "23503";

// Postgres error code when a row breaks an RLS policy, e.g. filing a shared
// menu into a private collection.
export const INSUFFICIENT_PRIVILEGE = "42501";

// Thrown when Supabase reports an error. Its message is generic and safe to
// show; the Postgres error text, which can name constraints and columns, is
// never attached.
export class DatabaseError extends Error {
  constructor(
    readonly operation: string,
    readonly code: string,
  ) {
    super("The database request failed.");
    this.name = "DatabaseError";
  }
}

// Logs only the operation and error code on the server, then throws.
function fail(operation: string, error: PostgrestError): never {
  console.error(`[db] ${operation} failed`, { code: error.code });
  throw new DatabaseError(operation, error.code);
}

// The same for Storage errors, which carry an HTTP status instead of a
// Postgres code. supabase-js does not export their base class, hence the
// structural type.
type StorageFailure = { status?: number; statusCode?: string };

function failStorage(operation: string, error: StorageFailure): never {
  const code = error.statusCode ?? String(error.status ?? "unknown");
  console.error(`[db] ${operation} failed`, { code });
  throw new DatabaseError(operation, code);
}

export async function listMenus(): Promise<Menu[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("menus")
    .select(MENU_COLUMNS)
    .order("id")
    .overrideTypes<Menu[], { merge: false }>();

  if (error) fail("listMenus", error);
  return data;
}

// Returns null when no menu has this id.
export async function getMenu(id: number): Promise<Menu | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("menus")
    .select(MENU_COLUMNS)
    .eq("id", id)
    .maybeSingle<Menu>();

  if (error) fail("getMenu", error);
  return data;
}

export async function createMenu(input: MenuInput): Promise<Menu> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("menus")
    .insert(input)
    .select(MENU_COLUMNS)
    .single<Menu>();

  if (error) fail("createMenu", error);
  return data;
}

// Returns null when no menu has this id. Filtering on the primary key limits
// the update to at most one row.
export async function updateMenu(
  id: number,
  input: MenuInput,
): Promise<Menu | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("menus")
    .update(input)
    .eq("id", id)
    .select(MENU_COLUMNS)
    .maybeSingle<Menu>();

  if (error) fail("updateMenu", error);
  return data;
}

// Returns false when no menu has this id. Selecting the deleted row is how we
// find out, since Supabase does not report a missing row as an error.
export async function deleteMenu(id: number): Promise<boolean> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("menus")
    .delete()
    .eq("id", id)
    .select("id");

  if (error) fail("deleteMenu", error);
  return data.length > 0;
}

// Moves a menu into a collection, or out of every collection when
// collectionId is null. Returns null when no menu has this id. Throws a
// DatabaseError with code FOREIGN_KEY_VIOLATION when the collection does not
// exist.
export async function setMenuCollection(
  menuId: number,
  collectionId: number | null,
): Promise<Menu | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("menus")
    .update({ collection_id: collectionId })
    .eq("id", menuId)
    .select(MENU_COLUMNS)
    .maybeSingle<Menu>();

  if (error) fail("setMenuCollection", error);
  return data;
}

// Menu images

const MENU_IMAGES_BUCKET = "menu-images";

// Uploads an image file to the menu-images bucket under path. It never
// overwrites: callers pass a new, unique path, and an existing file there
// makes the upload fail.
export async function uploadMenuImage(
  path: string,
  file: Blob,
  contentType: string,
): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase.storage
    .from(MENU_IMAGES_BUCKET)
    .upload(path, file, { contentType, upsert: false });

  if (error) failStorage("uploadMenuImage", error);
}

// Deletes image files. Storage reports files it may not delete, or that are
// already gone, as success, so the result is not checked further.
export async function removeMenuImages(paths: string[]): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase.storage
    .from(MENU_IMAGES_BUCKET)
    .remove(paths);

  if (error) failStorage("removeMenuImages", error);
}

// The address the browser loads a menu image from. The bucket is public, so
// this is the plain public URL, built the same way as the client's
// getPublicUrl but without a request-scoped client. Library images keep the
// names they were uploaded with, so each part of the path is encoded.
export function menuImageUrl(path: string): string {
  const encoded = path.split("/").map(encodeURIComponent).join("/");
  return `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/${MENU_IMAGES_BUCKET}/${encoded}`;
}

export type StoredImage = {
  path: string;
  name: string;
  // When the file was uploaded, or null if Storage does not say.
  createdAt: string | null;
};

// Storage keeps this file in folders created from the dashboard.
const FOLDER_PLACEHOLDER = ".emptyFolderPlaceholder";

// Every image in the bucket the user may see, for picking one for a menu:
// the library at the top level and the images in the folders of menus they
// can reach (the bucket's SELECT policy decides). Storage lists one folder
// at a time, so the top level is listed first, then each folder in it.
// Newest first, so a fresh upload is at the top.
export async function listMenuImages(): Promise<StoredImage[]> {
  const supabase = await createClient();
  const bucket = supabase.storage.from(MENU_IMAGES_BUCKET);
  const options = { limit: 1000, sortBy: { column: "name", order: "asc" } };

  const { data: top, error } = await bucket.list("", options);
  if (error) failStorage("listMenuImages", error);

  // Folders come back as entries without an id.
  const files = top.filter((entry) => entry.id);
  const folders = top.filter((entry) => !entry.id).map((entry) => entry.name);
  const images: StoredImage[] = files.map((file) => ({
    path: file.name,
    name: file.name,
    createdAt: file.created_at ?? null,
  }));

  const listed = await Promise.all(
    folders.map((folder) => bucket.list(folder, options)),
  );
  listed.forEach(({ data, error }, index) => {
    if (error) failStorage("listMenuImages", error);
    for (const file of data) {
      if (!file.id) continue;
      images.push({
        path: `${folders[index]}/${file.name}`,
        name: file.name,
        createdAt: file.created_at ?? null,
      });
    }
  });
  return images
    .filter((image) => image.name !== FOLDER_PLACEHOLDER)
    .sort((a, b) => (b.createdAt ?? "").localeCompare(a.createdAt ?? ""));
}

// Whether the user may see a file at this path in the bucket. It asks
// Storage, so the bucket's SELECT policy applies.
export async function menuImageExists(path: string): Promise<boolean> {
  const supabase = await createClient();
  const { data, error } = await supabase.storage
    .from(MENU_IMAGES_BUCKET)
    .exists(path);

  // A missing file is reported as an error with status 400 or 404.
  if (error) {
    if (error.status === 400 || error.status === 404) return false;
    failStorage("menuImageExists", error);
  }
  return data;
}

// Points a menu at a new image file, or at none when imagePath is null.
// Returns null when no menu has this id. The file itself is handled by
// uploadMenuImage and removeMenuImages.
export async function setMenuImage(
  menuId: number,
  imagePath: string | null,
): Promise<Menu | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("menus")
    .update({ image_path: imagePath })
    .eq("id", menuId)
    .select(MENU_COLUMNS)
    .maybeSingle<Menu>();

  if (error) fail("setMenuImage", error);
  return data;
}

// Collections

export async function listCollections(): Promise<Collection[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("collections")
    .select(COLLECTION_COLUMNS)
    .order("name")
    .order("id")
    .overrideTypes<Collection[], { merge: false }>();

  if (error) fail("listCollections", error);
  return data;
}

// Returns null when no collection has this id.
export async function getCollection(id: number): Promise<Collection | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("collections")
    .select(COLLECTION_COLUMNS)
    .eq("id", id)
    .maybeSingle<Collection>();

  if (error) fail("getCollection", error);
  return data;
}

export async function createCollection(name: string): Promise<Collection> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("collections")
    .insert({ name })
    .select(COLLECTION_COLUMNS)
    .single<Collection>();

  if (error) fail("createCollection", error);
  return data;
}

// Returns null when no collection has this id.
export async function renameCollection(
  id: number,
  name: string,
): Promise<Collection | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("collections")
    .update({ name })
    .eq("id", id)
    .select(COLLECTION_COLUMNS)
    .maybeSingle<Collection>();

  if (error) fail("renameCollection", error);
  return data;
}

// Returns false when no collection has this id. Its menus are kept: the
// foreign key sets their collection_id back to null.
export async function deleteCollection(id: number): Promise<boolean> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("collections")
    .delete()
    .eq("id", id)
    .select("id");

  if (error) fail("deleteCollection", error);
  return data.length > 0;
}

// Tags

export async function listTags(): Promise<Tag[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("tags")
    .select(TAG_COLUMNS)
    .order("name")
    .order("id")
    .overrideTypes<Tag[], { merge: false }>();

  if (error) fail("listTags", error);
  return data;
}

// Returns null when no tag has this id.
export async function getTag(id: number): Promise<Tag | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("tags")
    .select(TAG_COLUMNS)
    .eq("id", id)
    .maybeSingle<Tag>();

  if (error) fail("getTag", error);
  return data;
}

// Returns the tag whose name equals this one, ignoring case and surrounding
// whitespace, or null when there is none. Callers pass a trimmed name. The
// table has no unique constraint on names, so if several tags match, the
// oldest one is returned.
export async function findTagByName(name: string): Promise<Tag | null> {
  const supabase = await createClient();
  // ILIKE only narrows the rows down; the exact comparison happens below.
  // Its wildcards in the name (%, _ and PostgREST's *) can only widen the
  // match, so they need no escaping. The surrounding % also finds names
  // stored with extra whitespace.
  const { data, error } = await supabase
    .from("tags")
    .select(TAG_COLUMNS)
    .ilike("name", `%${name}%`)
    .order("id")
    .overrideTypes<Tag[], { merge: false }>();

  if (error) fail("findTagByName", error);
  const wanted = name.toLowerCase();
  return data.find((tag) => tag.name.trim().toLowerCase() === wanted) ?? null;
}

export async function createTag(name: string): Promise<Tag> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("tags")
    .insert({ name })
    .select(TAG_COLUMNS)
    .single<Tag>();

  if (error) fail("createTag", error);
  return data;
}

// Returns null when no tag has this id. Menus refer to tags by id, so every
// menu that has the tag shows the new name.
export async function renameTag(id: number, name: string): Promise<Tag | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("tags")
    .update({ name })
    .eq("id", id)
    .select(TAG_COLUMNS)
    .maybeSingle<Tag>();

  if (error) fail("renameTag", error);
  return data;
}

// Returns false when no tag has this id. Its links to menus are deleted with
// it by the foreign key's cascade.
export async function deleteTag(id: number): Promise<boolean> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("tags")
    .delete()
    .eq("id", id)
    .select("id");

  if (error) fail("deleteTag", error);
  return data.length > 0;
}

// Menu tags

// The tags attached to one menu, sorted by name.
export async function listMenuTags(menuId: number): Promise<Tag[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("menu_tags")
    .select(`tag:tags (${TAG_COLUMNS})`)
    .eq("menu_id", menuId)
    .overrideTypes<{ tag: Tag }[], { merge: false }>();

  if (error) fail("listMenuTags", error);
  return data
    .map((row) => row.tag)
    .sort((a, b) => a.name.localeCompare(b.name) || a.id - b.id);
}

export type MenuTagLink = { menu_id: number; tag_id: number };

// Every menu–tag link, for filtering menus by tag.
export async function listMenuTagLinks(): Promise<MenuTagLink[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("menu_tags")
    .select("menu_id, tag_id")
    .overrideTypes<MenuTagLink[], { merge: false }>();

  if (error) fail("listMenuTagLinks", error);
  return data;
}

// Attaching a tag the menu already has does nothing. Throws a DatabaseError
// with code FOREIGN_KEY_VIOLATION when the menu or tag does not exist.
export async function addTagToMenu(
  menuId: number,
  tagId: number,
): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("menu_tags")
    .upsert(
      { menu_id: menuId, tag_id: tagId },
      { onConflict: "menu_id,tag_id", ignoreDuplicates: true },
    );

  if (error) fail("addTagToMenu", error);
}

// Returns false when the menu did not have this tag.
export async function removeTagFromMenu(
  menuId: number,
  tagId: number,
): Promise<boolean> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("menu_tags")
    .delete()
    .eq("menu_id", menuId)
    .eq("tag_id", tagId)
    .select("menu_id");

  if (error) fail("removeTagFromMenu", error);
  return data.length > 0;
}
