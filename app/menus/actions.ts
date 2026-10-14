"use server";

import * as db from "@/app/lib/db";
import { requireUser } from "@/lib/supabase/auth";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { type Ingredient, type IngredientRow, isUnit } from "./ingredients";
import {
  IMAGE_MAX_BYTES,
  IMAGE_MAX_LABEL,
  type ImageType,
  imageExtension,
  sniffImageType,
} from "./menu-image";

// Every action starts with requireUser(): Server Actions can be called
// directly, without loading a page, so the pages' checks do not cover them.
// Signed-out callers are redirected to /login. The database's RLS policies
// then limit each user to the shared rows and their own.

type TextField =
  | "title"
  | "body"
  | "carbon_footprint_kg"
  | "fans_appreciation"
  | "supplier_name";

type MenuValues = Record<TextField, string> & {
  // The ingredient rows as typed, without the fully empty ones.
  ingredients: IngredientRow[];
};
type MenuErrors = Partial<Record<TextField | "ingredients", string>>;

export type MenuFormState = {
  message?: string;
  errors?: MenuErrors;
  // One message, or null, per row of values.ingredients.
  ingredientErrors?: (string | null)[];
  // Raw submitted values, so the form can be refilled after a failed save.
  values?: Partial<MenuValues>;
};

type ParsedMenu =
  | { ok: true; menu: db.MenuInput; values: MenuValues }
  | {
      ok: false;
      errors: MenuErrors;
      ingredientErrors: (string | null)[];
      values: MenuValues;
    };

const SAVE_FAILED = "The recipe could not be saved. Please try again.";
const DELETE_FAILED = "The recipe could not be deleted. Please try again.";
const NOT_FOUND = "This recipe could not be found.";
const NO_LONGER_EXISTS = "This recipe no longer exists.";
const SHARED_MENU_NOT_DELETABLE =
  "Shared recipes can be edited but not deleted. Only your own recipes can be deleted.";

// FormData entries can be files; anything that is not text counts as empty.
function readText(formData: FormData, field: string) {
  const value = formData.get(field);
  return typeof value === "string" ? value : "";
}

function optionalText(value: string) {
  const trimmed = value.trim();
  return trimmed === "" ? null : trimmed;
}

// Rounds a plain decimal such as "12" or "1.005" half away from zero, the way
// Postgres coerces a value into numeric(p, s). Using integer digits avoids
// floating-point errors (Math.round(1.005 * 100) gives 100, not 101).
// Returns null for anything else, including "-1", "1e3" and "0x10".
function roundDecimal(raw: string, places: number): number | null {
  const match = /^(\d+)(?:\.(\d+))?$/.exec(raw.trim());
  if (!match) return null;

  const [, whole, fraction = ""] = match;
  const digits = BigInt(
    whole + fraction.padEnd(places + 1, "0").slice(0, places + 1),
  );
  const rounded = (digits + BigInt(5)) / BigInt(10);
  return Number(rounded) / 10 ** places;
}

const INGREDIENTS_MAX = 50;
const INGREDIENT_NAME_MAX = 100;
const AMOUNT_MAX = 99999.99;

// The form sends one ingredient_name, ingredient_amount and ingredient_unit
// per row, in order. Rows left completely empty are dropped.
function readIngredientRows(formData: FormData): IngredientRow[] {
  const text = (value: FormDataEntryValue | undefined) =>
    typeof value === "string" ? value : "";
  const names = formData.getAll("ingredient_name");
  const amounts = formData.getAll("ingredient_amount");
  const units = formData.getAll("ingredient_unit");
  return names
    .map((name, index) => ({
      name: text(name),
      amount: text(amounts[index]),
      unit: text(units[index]),
    }))
    .filter((row) => `${row.name}${row.amount}${row.unit}`.trim() !== "")
    .slice(0, INGREDIENTS_MAX);
}

// Checks one row; returns the ingredient, or what is wrong with the row.
// Mirrors public.valid_ingredient_items. Every ingredient needs a quantity,
// including those copied from the old name-only list.
function parseIngredient(
  row: IngredientRow,
): { ok: true; ingredient: Ingredient } | { ok: false; error: string } {
  const problems: string[] = [];
  const name = row.name.trim();
  if (!name) problems.push("Enter the ingredient.");
  else if (name.length > INGREDIENT_NAME_MAX) {
    problems.push(
      `Keep the ingredient under ${INGREDIENT_NAME_MAX + 1} characters.`,
    );
  }
  // A decimal comma, as in "1,5", is accepted too.
  const amount = roundDecimal(row.amount.replace(",", "."), 2);
  if (amount === null || amount <= 0 || amount > AMOUNT_MAX) {
    problems.push("Enter a quantity above 0 for one adult portion.");
  }
  if (!isUnit(row.unit)) problems.push("Choose a unit.");

  if (problems.length > 0 || amount === null || !isUnit(row.unit)) {
    return { ok: false, error: problems.join(" ") };
  }
  return { ok: true, ingredient: { name, amount, unit: row.unit } };
}

// Mirrors the table's constraints so users get a field-level message instead
// of a database error. Numbers are rounded before range checks, matching the
// order in which Postgres applies the column type and CHECK constraints.
function parseMenu(formData: FormData): ParsedMenu {
  const values: MenuValues = {
    title: readText(formData, "title"),
    body: readText(formData, "body"),
    ingredients: readIngredientRows(formData),
    carbon_footprint_kg: readText(formData, "carbon_footprint_kg"),
    fans_appreciation: readText(formData, "fans_appreciation"),
    supplier_name: readText(formData, "supplier_name"),
  };
  const errors: MenuErrors = {};

  const title = values.title.trim();
  if (!title) errors.title = "Enter a title.";

  // At least one ingredient, each with its quantity for one adult portion.
  const parsedRows = values.ingredients.map(parseIngredient);
  const ingredientErrors = parsedRows.map((row) => (row.ok ? null : row.error));
  const items = parsedRows.flatMap((row) => (row.ok ? [row.ingredient] : []));
  if (values.ingredients.length === 0) {
    errors.ingredients =
      "Add at least one ingredient with its quantity for one adult portion.";
  } else if (items.length < values.ingredients.length) {
    errors.ingredients = "Some ingredients need fixing. See the rows below.";
  }

  // numeric(6, 2) with carbon_footprint_kg >= 0.
  let carbon: number | null = null;
  if (values.carbon_footprint_kg.trim() !== "") {
    carbon = roundDecimal(values.carbon_footprint_kg, 2);
    if (carbon === null || carbon > 9999.99) {
      errors.carbon_footprint_kg = "Enter a number between 0 and 9999.99.";
    }
  }

  // numeric(2, 1) with fans_appreciation between 0 and 5.
  let fans: number | null = null;
  if (values.fans_appreciation.trim() !== "") {
    fans = roundDecimal(values.fans_appreciation, 1);
    if (fans === null || fans > 5) {
      errors.fans_appreciation = "Enter a rating between 0 and 5.";
    }
  }

  if (Object.keys(errors).length > 0) {
    return { ok: false, errors, ingredientErrors, values };
  }

  return {
    ok: true,
    menu: {
      title,
      body: optionalText(values.body),
      // The names alone go to the older ingredients column too.
      ingredients: items.map((item) => item.name),
      ingredient_items: items,
      carbon_footprint_kg: carbon,
      fans_appreciation: fans,
      supplier_name: optionalText(values.supplier_name),
    },
    values,
  };
}

// Only plain positive integers are valid ids.
function parseId(formData: FormData): number | null {
  const raw = readText(formData, "id").trim();
  if (!/^[1-9]\d*$/.test(raw)) return null;

  const id = Number(raw);
  return Number.isSafeInteger(id) ? id : null;
}

export async function createMenu(
  _prevState: MenuFormState,
  formData: FormData,
): Promise<MenuFormState> {
  await requireUser();
  const parsed = parseMenu(formData);
  if (!parsed.ok) {
    const { errors, ingredientErrors, values } = parsed;
    return { errors, ingredientErrors, values };
  }

  let created: db.Menu;
  try {
    created = await db.createMenu(parsed.menu);
  } catch (error) {
    if (error instanceof db.DatabaseError) {
      return { message: SAVE_FAILED, values: parsed.values };
    }
    throw error;
  }

  // redirect() throws, so it stays outside the try block.
  revalidatePath("/menus", "layout");
  redirect(`/menus/${created.id}`);
}

export async function updateMenu(
  _prevState: MenuFormState,
  formData: FormData,
): Promise<MenuFormState> {
  await requireUser();
  const parsed = parseMenu(formData);
  const id = parseId(formData);
  if (!id) return { message: NOT_FOUND, values: parsed.values };
  if (!parsed.ok) {
    const { errors, ingredientErrors, values } = parsed;
    return { errors, ingredientErrors, values };
  }

  let updated: db.Menu | null;
  try {
    updated = await db.updateMenu(id, parsed.menu);
  } catch (error) {
    if (error instanceof db.DatabaseError) {
      return { message: SAVE_FAILED, values: parsed.values };
    }
    throw error;
  }
  if (!updated) {
    return { message: NO_LONGER_EXISTS, values: parsed.values };
  }

  revalidatePath("/menus", "layout");
  redirect(`/menus/${id}`);
}

export async function deleteMenu(
  _prevState: MenuFormState,
  formData: FormData,
): Promise<MenuFormState> {
  await requireUser();
  const id = parseId(formData);
  if (!id) return { message: NOT_FOUND };

  let deleted: boolean;
  try {
    // RLS lets users delete only their own menus, and a refused delete looks
    // like a missing row, so shared menus are checked first for a clear
    // message.
    const menu = await db.getMenu(id);
    if (!menu) return { message: NO_LONGER_EXISTS };
    if (db.isShared(menu)) return { message: SHARED_MENU_NOT_DELETABLE };
    deleted = await db.deleteMenu(id);
  } catch (error) {
    if (error instanceof db.DatabaseError) {
      return { message: DELETE_FAILED };
    }
    throw error;
  }
  if (!deleted) {
    return { message: NO_LONGER_EXISTS };
  }

  revalidatePath("/menus", "layout");
  redirect("/menus");
}

// Menu images

const IMAGE_UPLOAD_FAILED =
  "The image could not be uploaded. Please try again.";
const IMAGE_REMOVE_FAILED = "The image could not be removed. Please try again.";
const IMAGE_WRONG_TYPE = "Choose a JPEG, PNG or WebP image.";
const IMAGE_TOO_LARGE = `Choose an image under ${IMAGE_MAX_LABEL}.`;

export type MenuImageState = {
  error?: string;
  // Confirmation shown after a successful change.
  message?: string;
};

// Reads the chosen file. Its type is taken from the file's first bytes,
// since the type the browser sends only reflects the file name.
async function parseImage(
  formData: FormData,
): Promise<
  { ok: true; file: File; type: ImageType } | { ok: false; error: string }
> {
  const file = formData.get("image");
  // An empty file input still sends a nameless, empty file.
  if (!(file instanceof File) || file.size === 0) {
    return { ok: false, error: "Choose an image." };
  }
  if (file.size > IMAGE_MAX_BYTES) return { ok: false, error: IMAGE_TOO_LARGE };

  const head = new Uint8Array(await file.slice(0, 12).arrayBuffer());
  const type = sniffImageType(head);
  if (!type) return { ok: false, error: IMAGE_WRONG_TYPE };
  return { ok: true, file, type };
}

// Deletes a file that was uploaded for a save that then failed. A failure
// only leaves an unused file behind, so it is logged (by db) rather than
// reported.
async function discardImages(paths: string[]) {
  try {
    await db.removeMenuImages(paths);
  } catch (error) {
    if (!(error instanceof db.DatabaseError)) throw error;
  }
}

// Turns a file name into a safe part of a Storage path: lowercase letters,
// digits and dashes only, so the file is easy to recognise in the dashboard.
function slugFileName(name: string) {
  const slug = name
    .replace(/\.[^.]*$/, "")
    .normalize("NFKD")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
  return slug || "image";
}

// Attaches an image to a menu, replacing the current one, or removes it when
// the form's intent is "remove". It is separate from the recipe form, so an
// image can be added to any recipe without saving its other fields.
//
// Replaced and removed images stay in Storage: another menu may use the same
// file, and they remain available under "Choose from Storage".
export async function updateMenuImage(
  _prevState: MenuImageState,
  formData: FormData,
): Promise<MenuImageState> {
  await requireUser();
  const id = parseId(formData);
  if (!id) return { error: NOT_FOUND };
  const remove = readText(formData, "intent") === "remove";
  const failed = remove ? IMAGE_REMOVE_FAILED : IMAGE_UPLOAD_FAILED;

  let image: { file: File; type: ImageType } | null = null;
  if (!remove) {
    const parsed = await parseImage(formData);
    if (!parsed.ok) return { error: parsed.error };
    image = parsed;
  }

  // The current image path, for the confirmation message.
  let previousPath: string | null;
  try {
    const menu = await db.getMenu(id);
    if (!menu) return { error: NO_LONGER_EXISTS };
    previousPath = menu.image_path;
  } catch (error) {
    if (error instanceof db.DatabaseError) return { error: failed };
    throw error;
  }

  // The file goes up first, so the menu never points at a missing file. The
  // random part of the name means no file is ever overwritten; the original
  // name makes it recognisable. The first folder is the menu id, which the
  // bucket's policies check.
  let newPath: string | null = null;
  if (image) {
    const name = `${slugFileName(image.file.name)}-${crypto.randomUUID()}`;
    newPath = `${id}/${name}.${imageExtension(image.type)}`;
    try {
      await db.uploadMenuImage(newPath, image.file, image.type);
    } catch (error) {
      if (error instanceof db.DatabaseError) return { error: failed };
      throw error;
    }
  }

  let updated: db.Menu | null;
  try {
    updated = await db.setMenuImage(id, newPath);
  } catch (error) {
    // The menu still points at its old image, so the new file is unused.
    if (newPath) await discardImages([newPath]);
    if (error instanceof db.DatabaseError) return { error: failed };
    throw error;
  }
  if (!updated) {
    if (newPath) await discardImages([newPath]);
    return { error: NO_LONGER_EXISTS };
  }

  // The menu list shows the image too.
  revalidatePath("/menus", "layout");
  if (!newPath) return { message: "Image removed." };
  // Naming the file tells the user where to find it: uploads go in the
  // menu's folder, not at the top of the bucket.
  const done = previousPath ? "Image replaced." : "Image added.";
  return {
    message: `${done} It is saved in Storage as menu-images/${newPath}.`,
  };
}

const IMAGE_CHOOSE_FAILED = "The image could not be chosen. Please try again.";
const IMAGE_GONE =
  "That image is no longer in Storage. Refresh the page and pick another.";

// A path in the bucket: a file at the top level or in one folder, with an
// image extension. Anything else cannot be an image the picker offered.
function isImagePath(path: string) {
  return (
    path.length <= 300 &&
    /^(?:[^/\\]+\/)?[^/\\]+\.(?:jpe?g|png|webp)$/i.test(path) &&
    !path.split("/").some((part) => part === "." || part === "..")
  );
}

// Points a menu at an image already in Storage, without uploading a copy.
export async function chooseMenuImage(
  _prevState: MenuImageState,
  formData: FormData,
): Promise<MenuImageState> {
  await requireUser();
  const id = parseId(formData);
  if (!id) return { error: NOT_FOUND };
  const path = readText(formData, "image_path");
  if (path === "") return { error: "Choose an image." };
  if (!isImagePath(path)) return { error: IMAGE_GONE };

  let updated: db.Menu | null;
  try {
    // Storage answers with the bucket's SELECT policy, so this also checks
    // that the user may use this image.
    if (!(await db.menuImageExists(path))) return { error: IMAGE_GONE };
    updated = await db.setMenuImage(id, path);
  } catch (error) {
    if (error instanceof db.DatabaseError) {
      return { error: IMAGE_CHOOSE_FAILED };
    }
    throw error;
  }
  if (!updated) return { error: NO_LONGER_EXISTS };

  // The menu list shows the image too.
  revalidatePath("/menus", "layout");
  return { message: "Image changed." };
}

// Collections

const COLLECTION_NAME_MAX = 100;
const COLLECTION_SAVE_FAILED =
  "The collection could not be created. Please try again.";
const ASSIGN_FAILED = "The collection could not be changed. Please try again.";
// Shared and own items do not mix (RLS enforces this too).
const SHARED_NEEDS_SHARED_COLLECTION =
  "This recipe is shared with every user, so it can only go in a shared collection. Pick a shared collection or “No collection”.";
const OWN_NEEDS_OWN_COLLECTION =
  "This recipe is yours, so it can only go in one of your own collections. Pick one of yours or “No collection”.";
const COLLECTION_GONE =
  "That collection no longer exists. Refresh the page and pick another.";

export type CollectionFormState = {
  error?: string;
  // Raw submitted name, so the input can be refilled after a failed save.
  name?: string;
  // Set after a successful save; changes on every save so the form can tell
  // two creations apart.
  created?: { id: number; name: string };
};

// Returns the trimmed name, or the error to show for it.
function parseCollectionName(
  raw: string,
): { ok: true; name: string } | { ok: false; error: string } {
  const name = raw.trim();
  if (!name) return { ok: false, error: "Enter a name." };
  if (name.length > COLLECTION_NAME_MAX) {
    return {
      ok: false,
      error: `Keep the name under ${COLLECTION_NAME_MAX + 1} characters.`,
    };
  }
  return { ok: true, name };
}

export async function createCollection(
  _prevState: CollectionFormState,
  formData: FormData,
): Promise<CollectionFormState> {
  await requireUser();
  const raw = readText(formData, "name");
  const parsed = parseCollectionName(raw);
  if (!parsed.ok) return { error: parsed.error, name: raw };
  const { name } = parsed;

  let created: db.Collection;
  try {
    created = await db.createCollection(name);
  } catch (error) {
    if (error instanceof db.DatabaseError) {
      return { error: COLLECTION_SAVE_FAILED, name: raw };
    }
    throw error;
  }

  revalidatePath("/menus", "layout");
  return { created: { id: created.id, name: created.name } };
}

const COLLECTION_RENAME_FAILED =
  "The collection could not be renamed. Please try again.";
const RENAMED_COLLECTION_GONE =
  "This collection no longer exists. Refresh the page to see the current list.";

export type RenameCollectionState = {
  error?: string;
  // Raw submitted name, so the input can be refilled after a failed save.
  name?: string;
  // Set after a successful rename; a new object each time, so the form can
  // tell two renames apart.
  renamed?: { id: number; name: string };
};

export async function renameCollection(
  _prevState: RenameCollectionState,
  formData: FormData,
): Promise<RenameCollectionState> {
  await requireUser();
  const raw = readText(formData, "name");
  const id = parseId(formData);
  if (!id) return { error: RENAMED_COLLECTION_GONE, name: raw };

  const parsed = parseCollectionName(raw);
  if (!parsed.ok) return { error: parsed.error, name: raw };

  let renamed: db.Collection | null;
  try {
    renamed = await db.renameCollection(id, parsed.name);
  } catch (error) {
    if (error instanceof db.DatabaseError) {
      return { error: COLLECTION_RENAME_FAILED, name: raw };
    }
    throw error;
  }
  if (!renamed) return { error: RENAMED_COLLECTION_GONE, name: raw };

  revalidatePath("/menus", "layout");
  return { renamed: { id: renamed.id, name: renamed.name } };
}

export type AssignCollectionState = {
  error?: string;
  // Confirmation shown after a successful change.
  message?: string;
};

export async function assignMenuCollection(
  _prevState: AssignCollectionState,
  formData: FormData,
): Promise<AssignCollectionState> {
  await requireUser();
  const menuId = parseId(formData);
  if (!menuId) return { error: NOT_FOUND };

  // An empty value means "No collection".
  const rawCollection = readText(formData, "collection_id").trim();
  let collectionId: number | null = null;
  if (rawCollection !== "") {
    collectionId = /^[1-9]\d*$/.test(rawCollection)
      ? Number(rawCollection)
      : NaN;
    if (!Number.isSafeInteger(collectionId)) return { error: COLLECTION_GONE };
  }

  let collection: db.Collection | null = null;
  let updated: db.Menu | null;
  let mismatch = ASSIGN_FAILED;
  try {
    if (collectionId !== null) {
      const [menu, found] = await Promise.all([
        db.getMenu(menuId),
        db.getCollection(collectionId),
      ]);
      if (!menu) return { error: NO_LONGER_EXISTS };
      if (!found) return { error: COLLECTION_GONE };
      mismatch = db.isShared(menu)
        ? SHARED_NEEDS_SHARED_COLLECTION
        : OWN_NEEDS_OWN_COLLECTION;
      // Checked here for a clear message; RLS enforces it too.
      if (db.isShared(menu) !== db.isShared(found)) return { error: mismatch };
      collection = found;
    }
    updated = await db.setMenuCollection(menuId, collectionId);
  } catch (error) {
    if (error instanceof db.DatabaseError) {
      // The collection was deleted between the check and the update.
      if (error.code === db.FOREIGN_KEY_VIOLATION) {
        return { error: COLLECTION_GONE };
      }
      if (error.code === db.INSUFFICIENT_PRIVILEGE) return { error: mismatch };
      return { error: ASSIGN_FAILED };
    }
    throw error;
  }
  if (!updated) return { error: NO_LONGER_EXISTS };

  revalidatePath("/menus", "layout");
  return {
    message: collection
      ? `Moved to “${collection.name}”.`
      : "Removed from its collection.",
  };
}

// Tags

const TAG_NAME_MAX = 50;
const TAG_ADD_FAILED = "The tag could not be added. Please try again.";
const TAG_REMOVE_FAILED = "The tag could not be removed. Please try again.";

export type MenuTagState = {
  error?: string;
  // Confirmation shown after a successful change.
  message?: string;
  // Raw submitted name, so the input can be refilled after a failed add.
  name?: string;
};

// Attaches a tag to a menu by name, reusing an existing tag whose name
// matches ignoring case and surrounding whitespace, and creating one
// otherwise.
export async function addMenuTag(
  _prevState: MenuTagState,
  formData: FormData,
): Promise<MenuTagState> {
  await requireUser();
  const raw = readText(formData, "name");
  const menuId = parseId(formData);
  if (!menuId) return { error: NOT_FOUND, name: raw };

  const name = raw.trim();
  if (!name) return { error: "Enter a tag name.", name: raw };
  if (name.length > TAG_NAME_MAX) {
    return {
      error: `Keep the tag under ${TAG_NAME_MAX + 1} characters.`,
      name: raw,
    };
  }

  let tag: db.Tag;
  try {
    // Checking the menu first avoids creating a tag for a menu that has been
    // deleted.
    const [menu, existing] = await Promise.all([
      db.getMenu(menuId),
      db.findTagByName(name),
    ]);
    if (!menu) return { error: NO_LONGER_EXISTS, name: raw };

    if (existing) {
      const current = await db.listMenuTags(menuId);
      if (current.some((t) => t.id === existing.id)) {
        return { error: `This recipe already has “${existing.name}”.` };
      }
    }

    tag = existing ?? (await db.createTag(name));
    await db.addTagToMenu(menuId, tag.id);
  } catch (error) {
    if (error instanceof db.DatabaseError) {
      return { error: TAG_ADD_FAILED, name: raw };
    }
    throw error;
  }

  // The sidebar filters by tag, so it is refreshed too.
  revalidatePath("/menus", "layout");
  return { message: `Added “${tag.name}”.` };
}

const TAG_GONE =
  "That tag no longer exists. Refresh the page and pick another.";

// Attaches a tag the user picked from the list of existing tags. It works by
// id rather than by name, since several tags can share a name.
export async function addExistingMenuTag(
  _prevState: MenuTagState,
  formData: FormData,
): Promise<MenuTagState> {
  await requireUser();
  const menuId = parseId(formData);
  if (!menuId) return { error: NOT_FOUND };

  const rawTag = readText(formData, "tag_id").trim();
  if (rawTag === "") return { error: "Choose a tag." };
  const tagId = /^[1-9]\d*$/.test(rawTag) ? Number(rawTag) : NaN;
  if (!Number.isSafeInteger(tagId)) return { error: TAG_GONE };

  let tag: db.Tag | null;
  try {
    const [menu, found] = await Promise.all([
      db.getMenu(menuId),
      db.getTag(tagId),
    ]);
    if (!menu) return { error: NO_LONGER_EXISTS };
    if (!found) return { error: TAG_GONE };
    tag = found;
    await db.addTagToMenu(menuId, tag.id);
  } catch (error) {
    if (error instanceof db.DatabaseError) {
      // The tag or menu was deleted between the check and the insert.
      if (error.code === db.FOREIGN_KEY_VIOLATION) return { error: TAG_GONE };
      return { error: TAG_ADD_FAILED };
    }
    throw error;
  }

  // The sidebar filters by tag, so it is refreshed too.
  revalidatePath("/menus", "layout");
  return { message: `Added “${tag.name}”.` };
}

// Detaches a tag from one menu. The tag itself and its use on other menus
// are kept.
export async function removeMenuTag(
  _prevState: MenuTagState,
  formData: FormData,
): Promise<MenuTagState> {
  await requireUser();
  const menuId = parseId(formData);
  if (!menuId) return { error: NOT_FOUND };

  const rawTag = readText(formData, "tag_id").trim();
  const tagId = /^[1-9]\d*$/.test(rawTag) ? Number(rawTag) : NaN;
  if (!Number.isSafeInteger(tagId)) return { error: TAG_REMOVE_FAILED };
  const tagName = readText(formData, "tag_name");

  try {
    // Returns false when the tag was already gone, which is the outcome the
    // user asked for, so it is not reported as an error.
    await db.removeTagFromMenu(menuId, tagId);
  } catch (error) {
    if (error instanceof db.DatabaseError) {
      return { error: TAG_REMOVE_FAILED };
    }
    throw error;
  }

  // The sidebar filters by tag, so it is refreshed too.
  revalidatePath("/menus", "layout");
  return { message: tagName ? `Removed “${tagName}”.` : "Tag removed." };
}

const TAG_RENAME_FAILED = "The tag could not be renamed. Please try again.";
const RENAMED_TAG_GONE =
  "This tag no longer exists. Refresh the page to see the current list.";

export type RenameTagState = {
  error?: string;
  // Raw submitted name, so the input can be refilled after a failed save.
  name?: string;
  // Set after a successful rename; a new object each time, so the sidebar can
  // tell two renames apart.
  renamed?: { id: number; from: string; name: string };
};

// Renames a tag everywhere it is used. A name that matches another tag,
// ignoring case and surrounding whitespace, is refused: adding a tag by name
// reuses the existing one, so two tags with the same name would be ambiguous.
export async function renameTag(
  _prevState: RenameTagState,
  formData: FormData,
): Promise<RenameTagState> {
  await requireUser();
  const raw = readText(formData, "name");
  const rawTag = readText(formData, "tag_id").trim();
  const tagId = /^[1-9]\d*$/.test(rawTag) ? Number(rawTag) : NaN;
  if (!Number.isSafeInteger(tagId)) {
    return { error: RENAMED_TAG_GONE, name: raw };
  }

  const name = raw.trim();
  if (!name) return { error: "Enter a tag name.", name: raw };
  if (name.length > TAG_NAME_MAX) {
    return {
      error: `Keep the tag under ${TAG_NAME_MAX + 1} characters.`,
      name: raw,
    };
  }

  let previous: db.Tag | undefined;
  let renamed: db.Tag | null;
  try {
    const tags = await db.listTags();
    previous = tags.find((tag) => tag.id === tagId);
    if (!previous) return { error: RENAMED_TAG_GONE, name: raw };

    const wanted = name.toLowerCase();
    const clash = tags.find(
      (tag) => tag.id !== tagId && tag.name.trim().toLowerCase() === wanted,
    );
    if (clash) {
      return {
        error: `A tag named “${clash.name}” already exists. Choose another name.`,
        name: raw,
      };
    }

    renamed = await db.renameTag(tagId, name);
  } catch (error) {
    if (error instanceof db.DatabaseError) {
      return { error: TAG_RENAME_FAILED, name: raw };
    }
    throw error;
  }
  if (!renamed) return { error: RENAMED_TAG_GONE, name: raw };

  // Menu pages, the menu list and the sidebar all show tag names.
  revalidatePath("/menus", "layout");
  return {
    renamed: { id: renamed.id, from: previous.name, name: renamed.name },
  };
}

const TAG_DELETE_FAILED = "The tag could not be deleted. Please try again.";

export type DeleteTagState = {
  error?: string;
  // Set after a successful delete; a new object each time, so the sidebar can
  // tell two deletions apart.
  deleted?: { id: number; name: string };
};

// Deletes one of the user's own tags: the foreign key's cascade also takes it
// off every menu that had it. The menus themselves are kept. Shared tags
// cannot be deleted.
export async function deleteTag(
  _prevState: DeleteTagState,
  formData: FormData,
): Promise<DeleteTagState> {
  await requireUser();
  const rawTag = readText(formData, "tag_id").trim();
  const tagId = /^[1-9]\d*$/.test(rawTag) ? Number(rawTag) : NaN;
  if (!Number.isSafeInteger(tagId)) return { error: TAG_DELETE_FAILED };
  const tagName = readText(formData, "tag_name");

  try {
    // RLS refuses to delete shared tags without an error, so they are
    // checked first for a clear message.
    const tag = await db.getTag(tagId);
    if (tag && db.isShared(tag)) {
      return {
        error:
          "Shared tags can be renamed but not deleted. Only your own tags can be deleted.",
      };
    }
    // Returns false when the tag was already gone, which is the outcome the
    // user asked for, so it is not reported as an error.
    await db.deleteTag(tagId);
  } catch (error) {
    if (error instanceof db.DatabaseError) {
      return { error: TAG_DELETE_FAILED };
    }
    throw error;
  }

  revalidatePath("/menus", "layout");
  return { deleted: { id: tagId, name: tagName } };
}
