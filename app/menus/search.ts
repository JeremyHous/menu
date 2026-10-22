import { parseSelectedTags, TAG_PARAM, tagQuery } from "./tag-filter";

// Text search over menu titles and bodies, shared by the menus page (on the
// server) and the search box (in the browser). The query lives in the URL as
// ?q=, next to the tag filter's ?tags=.

export const SEARCH_PARAM = "q";

// The query as typed, without surrounding whitespace and with inner runs of
// whitespace collapsed to one space. "" means no search.
export function normalizeSearch(raw: string | string[] | null | undefined) {
  const value = Array.isArray(raw) ? (raw[0] ?? "") : (raw ?? "");
  return value.trim().replace(/\s+/g, " ");
}

// Every word of the query must appear, ignoring case, somewhere in the
// title or body, so "tomato soup" finds "Soup with roasted tomatoes". An
// empty query matches every menu.
export function matchesSearch(
  menu: { title: string; body: string | null },
  query: string,
): boolean {
  const words = normalizeSearch(query).toLowerCase().split(" ").filter(Boolean);
  if (words.length === 0) return true;
  const text = `${menu.title}\n${menu.body ?? ""}`.toLowerCase();
  return words.every((word) => text.includes(word));
}

// ?mine=1 limits the list to the user's own dishes, which are exactly the
// ones in "My own collections": shared and own items never mix.
export const MINE_PARAM = "mine";

export function parseMine(raw: string | string[] | null | undefined) {
  const value = Array.isArray(raw) ? raw[0] : raw;
  return value === "1";
}

// The query string that keeps every filter, e.g. "?tags=1,4&q=soup&mine=1",
// or "" when none is set. Links between /menus pages use it so the filters
// survive navigation.
export function filtersQuery(
  selectedTags: number[],
  query: string,
  mine = false,
): string {
  const search = normalizeSearch(query);
  const parts = [
    tagQuery(selectedTags).slice(1),
    search && `${SEARCH_PARAM}=${encodeURIComponent(search)}`,
    mine && `${MINE_PARAM}=1`,
  ].filter(Boolean);
  return parts.length > 0 ? `?${parts.join("&")}` : "";
}

// Reads every filter from a URLSearchParams in the browser, without checking
// that the tags exist.
export function filtersQueryFromParams(params: URLSearchParams): string {
  return filtersQuery(
    parseSelectedTags(params.get(TAG_PARAM)),
    params.get(SEARCH_PARAM) ?? "",
    parseMine(params.get(MINE_PARAM)),
  );
}
