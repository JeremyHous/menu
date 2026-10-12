@AGENTS.md

# Menu app

A Next.js (App Router, Cache Components on) + TypeScript + Supabase app for
recipes ("menus"), each priced in carbon (kg CO₂e per serving). Users file
menus into collections, tag them, filter by tags, search by text, and drag
menus between collections. The README is the unmodified starter template;
ignore it.

## Commands

- `npm run dev`: dev server on :3000. Check for one already running before
  starting another; Next refuses to start a second one.
- `npx tsc --noEmit`: type check.
- `npx eslint app lib components`: lint. Do **not** use `npm run lint`: the
  ESLint config doesn't ignore `.next/`, so it reports thousands of errors in
  generated files.
- `npm run build`: production build. It can run while the dev server is up.
- `npx prettier --write <files>`: format the files you touched. The code
  follows Prettier defaults; there is no config file.

Before reporting work as done, run all three checks: tsc, eslint on the
source dirs, and build.

## Architecture

- `app/lib/db.ts` is the **only** place that queries Supabase. Pages and
  server actions call its functions; don't query Supabase anywhere else. It
  throws `DatabaseError`, which has a generic message and a Postgres `code`;
  callers catch it and show a user-facing message.
- `app/menus/actions.ts`: all server actions. Each one:
  1. validates its `FormData` input (ids must be plain positive integers);
  2. calls `db.*`;
  3. returns `{ error | message }` state for `useActionState`;
  4. calls `revalidatePath("/menus", "layout")` so the sidebar refreshes too.
- `app/menus/layout.tsx`: the sidebar (collections and tags) beside every
  `/menus` page, wrapped in `MenuDragProvider` for drag and drop.
- **Filter state lives in the URL:** `?tags=1,4` (tag ids, AND logic) and
  `?q=` (text search). Shared pure helpers in `tag-filter.ts` and `search.ts`
  run both on the server (the list page) and in the browser (the sidebar), so
  results always agree. Links between `/menus` pages carry these params
  (`filtersQuery`).
- **Cache Components:** `params` and `searchParams` are Promises read inside
  `<Suspense>`. Components that call `useSearchParams` also need a
  `<Suspense>` boundary.
- **Styling:** `app/menus/menus.module.css` and `app/home.module.css` (CSS
  modules with the CSS variables `--paper`, `--ink`, `--saffron`, `--leaf`,
  `--rust`, plus a `.dark` variant). Fonts are Gloock (display) and Karla
  (body), from `app/menus/fonts.ts`. The Tailwind/shadcn files in
  `components/` are starter leftovers used by the auth pages, `/protected`,
  and the home page's auth and theme buttons.

## Database

- **Schema:** see `docs/supabase-schema.md` (tables `menus`, `collections`,
  `tags`, `menu_tags`). Keep those names; never rename, drop or recreate
  tables, and preserve existing data.
- **RLS policies are fully open** (no auth checks yet).
- **Names are not unique** in the database. Tag reuse (case- and
  whitespace-insensitive) is enforced only in `findTagByName`.
- **Schema changes:**
  1. Write a new file in `supabase/migrations/`.
  2. Run `npx supabase migration list --linked` and don't re-run anything
     already applied.
  3. Apply with `npx supabase db push`, not the dashboard. First confirm
     `supabase/.temp/project-ref` matches the ref in
     `NEXT_PUBLIC_SUPABASE_URL` in `.env.local`.
  4. Afterwards, verify with read-only `npx supabase db query --linked`
     queries. Update `docs/supabase-schema.md` too.
- **The database is live and shared with manual testing.** Never insert,
  update or delete sample data to test a feature; use read-only queries, or a
  `do $$ … raise exception $$` block that rolls back.

## Conventions

- **Match the surrounding code.** Comments explain *why* (complete sentences,
  same density as nearby code), names are plain, and the code is
  `useActionState` forms with progressive enhancement.
- **User-facing copy:** sentence case and plain verbs. Errors say what failed
  and what to do ("The tag could not be added. Please try again."). Empty
  states distinguish "nothing exists yet" from "nothing matches the filters",
  and offer only actions the UI really has.
- **Accessibility:** label every input; use `role="status"` for confirmations
  and `role="alert"` for errors; keep visible `:focus-visible` outlines;
  return focus when a control disappears; respect
  `prefers-reduced-motion`.
- **No new dependencies** unless clearly necessary (drag and drop, for
  example, uses the native HTML API).
- **Stay in scope.** Implement only the requested requirement. Preserve the
  existing behaviour of collections, tags, filtering, search and navigation.

## Working with the user

- **Implement directly, then report:** the files changed, how it works, the
  validation results, and the remaining limitations.
- **The user tests in the browser manually.** When asked for manual tests,
  give one at a time and wait for feedback before the next.
- **Docs** go in `docs/`.
