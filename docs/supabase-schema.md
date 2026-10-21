# Supabase database schema: `menu` project

This is the database schema of the **`menu`** project: a Next.js (App Router)
application that stores its data in Supabase (Postgres). Every table the app
uses is in the `public` schema. Users and sessions are handled by Supabase
Auth (`auth` schema). `menus`, `collections` and `tags` reference
`auth.users` through their `user_id` owner column (see
[Ownership](#ownership-shared-basis-and-private-rows)).

> **Updated 2026-10-14** by migrations
> `20261014120000_add_user_ownership_and_rls.sql` (owner columns, their
> indexes, and the RLS policies and grants under
> [Access](#access-row-level-security-and-grants)) and
> `20261014130000_shared_rows_cannot_be_deleted.sql` (shared rows can no
> longer be deleted; shared and own items no longer mix) and
> `20261014140000_add_menu_ingredient_items.sql` (ingredients with
> quantities) and `20261014150000_seed_chef_speciality_menu.sql` (data
> only: one shared menu, "Chef Speciality") and
> `20261014160000_add_menus_image_path.sql` (`menus.image_path`) and
> `20261014170000_menu_images_storage_access.sql` (the `menu-images`
> bucket's limits and policies, and `UPDATE` on `image_path`; see
> [Storage](#storage-menu-images)) and
> `20261014180000_menu_images_root_library.sql` (top-level images are
> listable by every signed-in user). Verified afterwards with read-only
> queries.
>
> **Updated 2026-10-21** by migration
> `20261021092201_menu_images_delete_own_unused_uploads.sql` (Storage
> `DELETE` narrowed to the uploader's own unused files; see
> [Storage](#storage-menu-images)). The migration history has 15 entries,
> local and remote in sync.

## How this was verified

- **Source of truth:** the live linked Supabase project (`uwyqfairbnynjknvfdny`,
  the same ref as `NEXT_PUBLIC_SUPABASE_URL` in `.env.local`).
- **Date checked:** 2026-10-12.
- **Method:** read-only catalog queries with `npx supabase db query --linked`
  against `information_schema` and `pg_catalog` (columns, constraints,
  indexes, triggers, functions, policies, grants). Nothing was changed.
- **Migrations:** the 7 files in `supabase/migrations/` match the remote
  migration history one to one (`npx supabase migration list --linked`). The
  live tables, columns, constraints and indexes match those migrations.
- **Generated types:** the project has none (no `database.types.ts`).
  `app/lib/db.ts` declares hand-written TypeScript types that match the
  columns below.
- **Not schema:** the row counts on 2026-10-12 were menus 5, collections 4,
  tags 3, menu_tags 5. These change as the app is used.

Everything in the tables below is **verified against the live database**
unless it is marked otherwise.

## Tables

### `public.menus`

One row per menu (a recipe or dish).

| Column | Type | Nullable | Default | Notes |
|---|---|---|---|---|
| `id` | `bigint` | no | identity (`GENERATED ALWAYS`) | Primary key |
| `title` | `text` | no | — | Check: `length(trim(title)) > 0` |
| `body` | `text` | yes | — | Free-text description |
| `created_at` | `timestamptz` | no | `now()` | |
| `ingredients` | `text[]` | no | `'{}'::text[]` | Ingredient names only. Kept; the app writes the names from `ingredient_items` here too |
| `ingredient_items` | `jsonb` | no | `'[]'::jsonb` | Ingredients with their quantity for **one adult portion**, in order: `[{"name", "amount", "unit"}]`. Check `menus_ingredient_items_valid` (see below) |
| `carbon_footprint_kg` | `numeric(6,2)` | yes | — | kg CO₂e per serving. Check: `>= 0` |
| `fans_appreciation` | `numeric(2,1)` | yes | — | Rating. Check: between 0 and 5 inclusive |
| `supplier_name` | `text` | yes | — | |
| `updated_at` | `timestamptz` | no | `now()` | Set by trigger on every update (see below) |
| `collection_id` | `bigint` | yes | — | FK → `collections.id`, `ON DELETE SET NULL` |
| `user_id` | `uuid` | yes | `auth.uid()` | Owner. FK → `auth.users.id`, `ON DELETE CASCADE`. Null = shared |
| `image_path` | `text` | yes | — | Storage path of the menu image, never the image data (no Base64). Null = no image. See [Storage](#storage-menu-images) |

- **Primary key:** `menus_pkey (id)`
- **Foreign keys:**
  - `menus_collection_id_fkey`: `collection_id` → `public.collections(id)` `ON DELETE SET NULL`
  - `user_id` → `auth.users(id)` `ON DELETE CASCADE`
- **Indexes:** `menus_collection_id_idx` on `(collection_id)`; `menus_user_id_idx` on `(user_id)`
- **Check `menus_ingredient_items_valid`:** calls
  `public.valid_ingredient_items(jsonb)` (SQL, immutable, empty
  `search_path`). The value must be an array of objects, each with a
  non-blank string `name`, and either a number `amount` > 0 with a `unit` in
  `g, kg, ml, l, piece, tsp, tbsp`, or both `amount` and `unit` null. The
  null case is only for the names copied from `ingredients` by migration
  `20261014140000` (2026-10-14), which had no quantity; the app requires a
  quantity on every save.
- **Trigger:** `menus_set_updated_at`, `BEFORE UPDATE … FOR EACH ROW`, runs `public.set_updated_at()`. That function sets `new.updated_at := now()` and runs with an empty `search_path`.

### `public.collections`

Named groups of menus.

| Column | Type | Nullable | Default | Notes |
|---|---|---|---|---|
| `id` | `bigint` | no | identity (`GENERATED ALWAYS`) | Primary key |
| `name` | `text` | no | — | Check: `length(trim(name)) > 0` |
| `created_at` | `timestamptz` | no | `now()` | |
| `user_id` | `uuid` | yes | `auth.uid()` | Owner. FK → `auth.users.id`, `ON DELETE CASCADE`. Null = shared |

- **Primary key:** `collections_pkey (id)`
- **Index:** `collections_user_id_idx` on `(user_id)`
- **No unique constraint on `name`.** Two collections can have the same name.

### `public.tags`

Labels that can be attached to menus.

| Column | Type | Nullable | Default | Notes |
|---|---|---|---|---|
| `id` | `bigint` | no | identity (`GENERATED ALWAYS`) | Primary key |
| `name` | `text` | no | — | Check: `length(trim(name)) > 0` |
| `created_at` | `timestamptz` | no | `now()` | |
| `user_id` | `uuid` | yes | `auth.uid()` | Owner. FK → `auth.users.id`, `ON DELETE CASCADE`. Null = shared |

- **Primary key:** `tags_pkey (id)`
- **Index:** `tags_user_id_idx` on `(user_id)`
- **No unique constraint on `name`, case-sensitive or not.** The app reuses an
  existing tag with the same name, ignoring case and surrounding whitespace,
  but only in application code (`findTagByName` in `app/lib/db.ts`). The
  database does not enforce it.

### `public.menu_tags`

Join table: which tags are on which menus.

| Column | Type | Nullable | Default | Notes |
|---|---|---|---|---|
| `menu_id` | `bigint` | no | — | FK → `menus.id`, `ON DELETE CASCADE` |
| `tag_id` | `bigint` | no | — | FK → `tags.id`, `ON DELETE CASCADE` |
| `created_at` | `timestamptz` | no | `now()` | |

- **Primary key:** `menu_tags_pkey (menu_id, tag_id)`. A tag can be on a given menu only once.
- **Foreign keys:**
  - `menu_tags_menu_id_fkey`: `menu_id` → `public.menus(id)` `ON DELETE CASCADE`
  - `menu_tags_tag_id_fkey`: `tag_id` → `public.tags(id)` `ON DELETE CASCADE`
- **Index:** `menu_tags_tag_id_idx` on `(tag_id)`. The primary key already serves lookups by `menu_id`.

## Relationships

```
collections 1 ──── 0..* menus          (menus.collection_id, nullable)
menus       * ──── *   tags            (through menu_tags)
```

- **Collections to menus: one-to-many, optional.** A collection holds any number of menus. A menu belongs to at most one collection, or none when `collection_id` is null. Deleting a collection keeps its menus and sets their `collection_id` to null.
- **Menus and tags: many-to-many, through `menu_tags`.** A menu can have many tags and a tag can be on many menus. Each `menu_tags` row is one link.
  - Deleting a menu deletes its links.
  - Deleting a tag deletes its links, which removes it from every menu.
  - The menus themselves are never deleted by these cascades.

## Ownership: shared basis and private rows

- **Shared basis.** Every row that existed when ownership was added
  (2026-10-14: 6 menus, 4 collections, 6 tags, 10 links) has
  `user_id = null`. Every signed-in user can read and edit these rows, and a
  change by one user is seen by all. **No one can delete them** (since
  migration `20261014130000`). The app shows them under "Shared
  collections" and "Shared tags".
- **Private rows.** Rows created since then get the creator's id from the
  `auth.uid()` default. Only that user can reach them. New rows can never be
  shared: the insert policies require `user_id = auth.uid()`.
- **Owners never change.** `authenticated` has no `UPDATE` privilege on
  `user_id`, so no one can take over a shared row or hand a row to someone
  else.
- **Links (`menu_tags`) have no owner.** A link is reachable when the user
  can reach both its menu and its tag. A private tag on a shared menu is
  therefore seen only by the tag's owner.
- **Shared and own items do not mix.** A shared menu only goes into a shared
  collection, and a user's own menu only into one of their own collections
  (or none, either way). The app shows them as two categories, "Shared
  collections" and "My own collections". The menus policies enforce it,
  since foreign keys ignore RLS; the app also offers only matching
  collections.
- **Deleting a user's own collection or tag** affects only their own menus:
  its menus leave the collection, and the tag comes off their menus and off
  any shared menu they had put it on (cascades ignore RLS).
- **Deleting a user** deletes their private rows (`ON DELETE CASCADE`); the
  shared basis is kept.

## Access: Row Level Security and grants

- **RLS is enabled on all four tables.** All policies are for the
  `authenticated` role only. `(select auth.uid())` is wrapped in a subquery
  so it is evaluated once per statement.
- **`collections`, `tags` and `menus`:**
  - `SELECT`, `UPDATE`: rows where `user_id is null or user_id =
    auth.uid()`. The `UPDATE` check repeats this.
  - `DELETE`: own rows only, `user_id = auth.uid()`.
  - `INSERT`: `user_id = auth.uid()`.
  - `menus` only: the `INSERT` and `UPDATE` checks also require
    `collection_id` to be null or a collection with the same owner as the
    menu (`c.user_id is not distinct from menus.user_id`).
- **`menu_tags`:** `SELECT`, `INSERT` and `DELETE` when the user can reach
  both the menu and the tag (`exists` subqueries that run under those
  tables' policies). There is no `UPDATE` policy or privilege.
- **Grants (verified 2026-10-14):**
  - `anon`: nothing on these four tables. Signed-out requests are refused
    with `permission denied`.
  - `authenticated`: `SELECT, INSERT, DELETE` on all four tables; `UPDATE`
    only on `collections.name`, `tags.name` and these `menus` columns:
    `title, body, ingredients, ingredient_items, carbon_footprint_kg,
    fans_appreciation, supplier_name, collection_id, image_path`.
  - `service_role`: unchanged (`REFERENCES, TRIGGER, TRUNCATE`); it bypasses
    RLS.
- **Tested before applying** with a dry run that applied the migration and
  checked two users' access in one transaction, then rolled it back. Checks
  included reading, editing and deleting the other user's rows, linking
  them, filing into the other user's collection, forging `user_id`, and
  `anon` access.

## Storage: menu images

- **Bucket `menu-images`:** created in the dashboard, **public** (anyone
  with an object's URL can load it). Migration `20261014170000` set its
  limits: 5 MB per file, and only `image/jpeg`, `image/png` and
  `image/webp`.
- **Paths:**
  - **Uploads from the app:**
    `<menu id>/<file name>-<random uuid>.<jpg|png|webp>`, written by
    `updateMenuImage` in `app/menus/actions.ts`. A new uuid for every
    upload, so nothing is overwritten. The file `1/c513e223-….png` predates
    the file-name part.
  - **Library:** images at the top level (no folder), such as the five
    `Picmenu*.png` files added in the dashboard on 2026-10-14. Any signed-in
    user can pick them for a menu ("Choose from Storage" on the recipe
    page), which saves their path without copying the file.
  - `menus.image_path` holds the path; the image data is never in the
    database. Several menus can share one file, so the app never deletes a
    file when an image is replaced or removed, or when a menu is deleted;
    it only deletes a file it has just uploaded for a save that failed.
- **Policies on `storage.objects`** (all for `authenticated`, all limited to
  this bucket):
  - `INSERT`: the path's first folder is a menu the user can reach under
    `menus`' RLS (shared menus and their own).
  - `SELECT`: a top-level (library) image, a file the user uploaded
    (`owner_id`), or a file in the folder of a menu they can reach. This is
    what listing and "Choose from Storage" use.
  - `DELETE` (policy "menu images: delete own unused uploads"): only a file
    the user uploaded (`owner_id`) that no menu visible to them uses as its
    `image_path`. That is exactly the app's one delete, a file just uploaded
    for a save that failed. Other users' uploads, files menus still show,
    and library images (no owner) cannot be deleted through the API by app
    users. Storage needs `SELECT` to delete. Until 2026-10-21 the policy also
    allowed any file in the folder of a reachable menu, so any signed-in
    user could delete images in shared menus' folders.
  - `anon` has no policy, so signed-out clients cannot upload or delete.
    Public URLs work for everyone, since the bucket is public.
- **Tested before applying** in a rolled-back transaction as a real user:
  upload under an existing menu allowed, under a missing menu refused,
  `image_path` update allowed. The `20261014180000` change was checked the
  same way: a signed-in user saw 1 object before it and 6 after it. The
  `20261021092201` change was checked by evaluating the stored `DELETE`
  condition as two real users, before and after (a SQL `DELETE` on
  `storage.objects` is refused by a statement trigger, so it cannot serve
  as the test): a user who did not upload a file in shared menu 1's folder
  could delete it before and cannot after; its uploader still can, since no
  menu uses it; a user's own image that their menu displays is no longer
  deletable.

## Database objects not created by this project's migrations

These exist in the live database but are not in `supabase/migrations/`:

- **`public.rls_auto_enable()`** (`SECURITY DEFINER`, owner `postgres`), fired by the event trigger **`ensure_rls`** on `ddl_command_end`. Its name suggests it enables RLS on newly created tables, but its definition was not inspected and its origin was not confirmed.
- **Supabase-managed event triggers:** `issue_graphql_placeholder`, `issue_pg_cron_access`, `issue_pg_graphql_access`, `issue_pg_net_access`, `pgrst_ddl_watch` and `pgrst_drop_watch`. These are not part of the app's schema.

## Not verified / out of scope

- **Where the extra grants came from.** Before 2026-10-14, `anon` and `authenticated` also had `TRUNCATE`, `REFERENCES` and `TRIGGER`, not from the project's migrations; the ownership migration revoked them. The limited `service_role` privileges were observed but not traced to a cause. Likely candidates are Supabase's default privileges or a dashboard change.
- **What `rls_auto_enable()` does exactly, and who added it.**
- **Supabase Auth, Storage and other non-`public` schemas** were not documented. No app table references them.
- **Data contents** were not audited beyond the row counts above.

## Where the app touches the schema

- `app/lib/db.ts`: the only module that queries these tables (through `@supabase/ssr`'s server client in `lib/supabase/server.ts`).
- `components/tutorial/fetch-data-steps.tsx` mentions a `notes` table, but only inside example code strings left over from the starter template. No `notes` table exists in this database.
- `supabase/migrations/`: how the schema was created. Schema changes go through new migrations, pushed with `npx supabase db push`.
