import { createClient } from "@/lib/supabase/server";
import type { PostgrestError } from "@supabase/supabase-js";

// The single place where the app reads and writes its tables: public.menus,
// public.collections, public.tags and public.menu_tags. Pages and server
// actions call these functions instead of querying Supabase themselves.
// Validation, redirects and revalidation stay with the callers; this module
// only talks to the database.
//
// It uses the server client, so it must only be imported from Server
// Components, Server Actions and Route Handlers.

export type Menu = {
  id: number;
  title: string;
  body: string | null;
  ingredients: string[];
  carbon_footprint_kg: number | null;
  fans_appreciation: number | null;
  supplier_name: string | null;
  // The collection this menu belongs to, or null if it has none.
  collection_id: number | null;
};

// The columns the recipe form writes. Callers validate values before passing
// them in. collection_id is left out so that saving a recipe never moves it;
// use setMenuCollection for that.
export type MenuInput = Omit<Menu, "id" | "collection_id">;

const MENU_COLUMNS =
  "id, title, body, ingredients, carbon_footprint_kg, fans_appreciation, supplier_name, collection_id";

export type Collection = {
  id: number;
  name: string;
  created_at: string;
};

const COLLECTION_COLUMNS = "id, name, created_at";

export type Tag = {
  id: number;
  name: string;
  created_at: string;
};

const TAG_COLUMNS = "id, name, created_at";

// Postgres error code for a foreign key violation, e.g. assigning a menu to a
// collection that has just been deleted. Callers compare DatabaseError.code
// with it to show a specific message.
export const FOREIGN_KEY_VIOLATION = "23503";

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
