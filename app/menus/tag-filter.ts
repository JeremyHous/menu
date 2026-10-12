import type { MenuTagLink } from "@/app/lib/db";

// Tag filtering shared by the menus page (on the server) and the sidebar (in
// the browser), so both always agree on which menus match. The selected tags
// live in the URL as ?tags=1,4, a comma-separated list of tag ids.

export const TAG_PARAM = "tags";

// Reads the selected tag ids from the query value. Anything that is not a
// plain positive integer is ignored, as are duplicates. Pass knownIds to also
// drop ids of tags that no longer exist.
export function parseSelectedTags(
  raw: string | string[] | null | undefined,
  knownIds?: Iterable<number>,
): number[] {
  const value = Array.isArray(raw) ? raw.join(",") : (raw ?? "");
  const known = knownIds ? new Set(knownIds) : null;
  const ids = new Set<number>();
  for (const part of value.split(",")) {
    const trimmed = part.trim();
    if (!/^[1-9]\d*$/.test(trimmed)) continue;
    const id = Number(trimmed);
    if (Number.isSafeInteger(id) && (!known || known.has(id))) ids.add(id);
  }
  return [...ids].sort((a, b) => a - b);
}

// The query string for a selection, e.g. "?tags=1,4", or "" for none.
export function tagQuery(selected: number[]): string {
  return selected.length > 0
    ? `?${TAG_PARAM}=${[...selected].sort((a, b) => a - b).join(",")}`
    : "";
}

// The current page's URL with the tag selection replaced, keeping ?q= and any
// other parameters. The ids are written by hand so the commas stay readable
// instead of becoming %2C.
export function hrefWithTags(
  pathname: string,
  params: URLSearchParams,
  next: number[],
): string {
  const rest = new URLSearchParams(params.toString());
  rest.delete(TAG_PARAM);
  const parts = [rest.toString()];
  if (next.length > 0) {
    parts.push(`${TAG_PARAM}=${[...next].sort((a, b) => a - b).join(",")}`);
  }
  const query = parts.filter(Boolean).join("&");
  return query ? `${pathname}?${query}` : pathname;
}

// Groups the links into each menu's set of tag ids.
export function tagsByMenu(links: MenuTagLink[]): Map<number, Set<number>> {
  const byMenu = new Map<number, Set<number>>();
  for (const { menu_id, tag_id } of links) {
    const tags = byMenu.get(menu_id) ?? new Set<number>();
    tags.add(tag_id);
    byMenu.set(menu_id, tags);
  }
  return byMenu;
}

// AND logic: a menu matches only when it has every selected tag. With no
// tags selected, every menu matches.
export function hasAllTags(
  menuTags: ReadonlySet<number> | undefined,
  selected: number[],
): boolean {
  return selected.every((id) => menuTags?.has(id) ?? false);
}
