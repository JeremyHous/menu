<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# Menu app: instructions for coding agents

`next dev` only rewrites the block above, between its markers; everything
below is maintained by hand. These are the project's rules for any coding
agent. `CLAUDE.md` imports this file and adds Claude-specific notes.

## Project

A Next.js (App Router, Cache Components on) + TypeScript + Supabase app for
recipes ("menus"), each priced in carbon (kg CO₂e per serving). Signed-in
users file menus into collections, tag them, filter by tags, search by text,
drag menus between collections, list ingredients with quantities, and attach
an image (uploaded from their device or picked from Storage). See
`README.md` for setup.

## Commands

- `npm run dev`: dev server on :3000. Check for one already running first
  (`Get-NetTCPConnection -LocalPort 3000`); Next refuses to start a second
  one. A worker can outlive its parent `next dev` process and keep the port.
- `npx tsc --noEmit`: type check.
- `npx eslint app lib components`: lint. Do **not** use `npm run lint`: the
  ESLint config doesn't ignore `.next/`, so it reports thousands of errors in
  generated files.
- `npm run build`: production build. It can run while the dev server is up.
- `npx prettier --write <files>`: format the files you touched (Prettier
  defaults, no config file).

**Before reporting work as done, run all three checks:** tsc, eslint on the
source dirs, and build. Changes to `next.config.ts` are picked up by the
running dev server automatically. The `partialPrefetching` warning at
startup is known and harmless.

## Architecture

- **`app/lib/db.ts` is the only module that talks to Supabase**, for both
  tables and Storage. Pages and server actions call its functions. It throws
  `DatabaseError` (generic message plus a Postgres code or Storage status);
  callers catch it and show a user-facing message.
- **`app/menus/actions.ts` holds all server actions.** Each one:
  1. calls `requireUser()`, then validates its `FormData` (ids must be plain
     positive integers);
  2. calls `db.*`;
  3. returns `{ error | message }` state for `useActionState`;
  4. calls `revalidatePath("/menus", "layout")` so the sidebar refreshes too.
- **`app/menus/layout.tsx`:** the sidebar (collections and tags) beside every
  `/menus` page, wrapped in `MenuDragProvider` for drag and drop.
- **Filter state lives in the URL:** `?tags=1,4` (tag ids, AND logic) and
  `?q=` (text search). The pure helpers in `tag-filter.ts` and `search.ts`
  run on the server (list page) and in the browser (sidebar), so results
  always agree. Links between `/menus` pages carry these params
  (`filtersQuery`).
- **Cache Components:** `params` and `searchParams` are Promises read inside
  `<Suspense>`. Components that call `useSearchParams` also need a
  `<Suspense>` boundary. Slow, independent data (such as the Storage image
  list) gets its own `<Suspense>` so the page does not wait for it.
- **Styling:** CSS modules `app/menus/menus.module.css` and
  `app/home.module.css`, with the variables `--paper`, `--ink`, `--saffron`,
  `--leaf`, `--rust` and a `.dark` variant. Fonts: Gloock (display) and
  Karla (body), from `app/menus/fonts.ts`. The Tailwind/shadcn files in
  `components/` are starter leftovers used only by the auth pages,
  `/protected` and the home page's auth button.
- **Theme:** `next-themes` (provider in `app/layout.tsx`, `.dark` class on
  `<html>`). The light/dark/system toggle is `app/theme-toggle.tsx`: part of
  `SiteNav` (home, author, menus pages), and placed by hand on `/workspace`,
  `/login` and `/sign-up`, which have no `SiteNav`. The auth pages keep the
  shadcn grey palette.

## Database

- **Schema:** `docs/supabase-schema.md` (tables `menus`, `collections`,
  `tags`, `menu_tags`; there is no `notes` table, it only appears in starter
  example code). Keep those names; never rename, drop or recreate tables,
  and preserve existing data.
- **Ownership and RLS:** `menus`, `collections` and `tags` have a `user_id`
  owner (default `auth.uid()`). Rows with `user_id = null` are the shared
  basis: every signed-in user can read and edit them, but **no one can delete
  them**. New rows are private to their creator, who can delete them. The UI
  shows "Shared …"/"My own …" categories and labels recipes "Shared" or
  "Yours". Shared and own items never mix: a menu's collection has the same
  owner as the menu. RLS enforces all of this for `authenticated` only
  (`anon` has no access), so queries run with the user's session (the server
  client in `db.ts`). The app never writes `user_id`, and checks ownership
  itself only for clearer messages.
- **Column grants:** `authenticated` may only `UPDATE` the columns listed in
  the schema doc. A new column the app writes needs
  `grant update (<column>) on public.menus to authenticated;` in its
  migration, or updates fail.
- **Legacy data:** the five original shared recipes have ingredients without
  quantities, and two recipes have no ingredients. The recipe form requires a
  quantity for every ingredient, so those recipes cannot be saved until their
  ingredients are fixed. Features that should work on any recipe (like the
  image) must not go through the recipe form.
- **No user data in `localStorage` or `sessionStorage`;** everything is in
  Supabase. (The `next-themes` theme choice is a display preference, kept in
  `localStorage` on purpose.)
- **Names are not unique.** Tag reuse (case- and whitespace-insensitive) is
  enforced only in `findTagByName`.

### Schema changes

1. Write a new file in `supabase/migrations/` named
   `YYYYMMDDHHMMSS_short_description.sql`, commented like the existing ones.
2. Confirm `supabase/.temp/project-ref` matches the ref in
   `NEXT_PUBLIC_SUPABASE_URL` in `.env.local`, and run
   `npx supabase migration list --linked`; never re-run applied migrations.
3. For policies, grants or anything that changes access, **dry-run first**
   in a block that rolls back (see below).
4. Apply with `npx supabase db push` (never the dashboard), after
   `npx supabase db push --dry-run` lists only the new file.
5. Verify with read-only `npx supabase db query --linked` queries, and
   update `docs/supabase-schema.md`.

### The database is live and shared with manual testing

- Never insert, update or delete sample data to test a feature. Use
  read-only queries, or a `do $$ … raise exception 'ROLLBACK …' $$` block,
  which rolls everything back and reports results in the exception message.
- To test RLS as a real user inside such a block:
  `perform set_config('request.jwt.claims', json_build_object('sub', <user id>, 'role', 'authenticated')::text, true);`
  then `perform set_config('role', 'authenticated', true);`.
- Multi-line SQL must go through a file:
  `npx supabase db query --linked -f <file>`. Inline multi-line queries are
  cut at the first line break. Keep such files in a scratch directory, not
  the repo.
- Rows in `storage.objects` cannot be deleted with SQL (a trigger refuses);
  use the Storage API.

## Images (Supabase Storage)

- **Bucket `menu-images`:** public, 5 MB per file, JPEG/PNG/WebP only (also
  enforced by the bucket). Only the object path is stored, in
  `menus.image_path`; never image data, Base64 or browser preview URLs.
- **Paths:**
  - **Uploads:** `<menu id>/<slugged file name>-<uuid>.<ext>`. The first
    folder must be the menu id: the Storage policies check it.
  - **Library:** files at the top level of the bucket (added in the
    dashboard). Every signed-in user can list and pick them.
- **Flow:** the image has its own forms on the recipe page
  (`menu-image-form.tsx`, `storage-image-picker.tsx`,
  `remove-menu-image.tsx`), separate from the recipe form. Actions:
  `updateMenuImage` (upload or remove) and `chooseMenuImage` (pick an
  existing file, no copy).
  - **Upload:** validate (size, and type from the file's first bytes, see
    `menu-image.ts`), upload with `upsert: false`, then save the path. If
    saving fails, delete the file just uploaded.
  - **Never delete a file when an image is replaced or removed, or a menu is
    deleted:** several menus can share one file, and old files stay
    available in the picker.
- **Display:** `menuImageUrl(path)` in `db.ts` builds the public URL (each
  path segment encoded); `next/image` is allowed for this bucket only
  (`images.remotePatterns` in `next.config.ts`). Server Actions accept bodies
  up to the image limit plus 512 KB (`experimental.serverActions.bodySizeLimit`).
- **Policies on `storage.objects`:** `INSERT` into the folder of a menu the
  user can reach; `SELECT` library files, own uploads, or reachable menus'
  folders; `DELETE` own uploads or reachable menus' folders. Details in
  `docs/supabase-schema.md`.
- **Verifying an upload:** query `storage.objects` read-only and fetch the
  public URL. In the dashboard, uploads are inside the menu-id folders, not
  at the bucket's top level, which is easy to miss.

## Authentication

Rules:

- Use Supabase Auth for all sign-in and session handling. Never build custom
  auth or store passwords.
- Every signed-in-only page verifies the user on the server and redirects to
  `/login` if they are not signed in. After sign-out, redirect to `/login`.

How it works:

- `/login` and `/sign-up` share `app/login/auth-form.tsx`, which posts to
  the server actions in `app/login/actions.ts` (`signIn`, `signUp`,
  `signOut`). After sign-in the user lands on `/workspace`. `/auth/login`
  and `/auth/sign-up` forward to the new pages.
- Email confirmation links come back through `app/auth/confirm/route.ts`,
  which accepts both `?code=` and `?token_hash=`.

How to verify the session:

- **Call `requireUser()` from `lib/supabase/auth.ts`** (it uses
  `supabase.auth.getUser()`, which asks the Auth server) in the page itself,
  inside a `<Suspense>` boundary, with all private content behind it.
  - Never rely on the browser session, `getSession()`, `getClaims()` or the
    proxy's redirect (`lib/supabase/proxy.ts`): they can answer from the
    cookie alone.
  - A layout-only check does not re-run on client navigation between pages.
- Signed-in-only pages: `/`, `/author`, every `/menus` page, `/workspace`
  (and the starter's `/protected`). Only `/login`, `/sign-up` and `/auth/*`
  are public. Pages wrap content in `<SignedIn>` (`app/signed-in.tsx`) or
  call `requireUser()` in their async component; async data components
  (the sidebar's, `StorageImages`) call it too. A new page needs its own
  check.
- Every server action calls `requireUser()` first, since actions can be
  called without loading a page.
- Never use or expose the service-role key; never bypass RLS.

## Conventions

- **Match the surrounding code.** Comments explain _why_ (complete sentences,
  same density as nearby code), names are plain, forms use `useActionState`
  with progressive enhancement.
- **User-facing copy:** sentence case and plain verbs. Errors say what failed
  and what to do ("The tag could not be added. Please try again."). Empty
  states distinguish "nothing exists yet" from "nothing matches the
  filters", and offer only actions the UI really has.
- **Accessibility:** label every input; `role="status"` for confirmations,
  `role="alert"` for errors; visible `:focus-visible` outlines; return focus
  when a control disappears; respect `prefers-reduced-motion`.
- **No new dependencies** unless clearly necessary (drag and drop, for
  example, uses the native HTML API).
- **Stay in scope.** Implement only the requested requirement and preserve
  the existing behaviour of collections, tags, filtering, search, images and
  navigation. When a request names something that does not exist (a table,
  a column), say so and ask rather than guess.
- **Report facts only.** Do not claim something works, or that a remote
  upload or migration succeeded, without having checked it; say what was
  verified and what still needs a manual test.
- **Docs** go in `docs/`.
