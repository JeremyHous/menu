# Supabase database schema: `menu` project

This is the database schema of the **`menu`** project: a Next.js (App Router)
application that stores its data in Supabase (Postgres). Every table the app
uses is in the `public` schema. Users and sessions are handled by Supabase
Auth (`auth` schema), which no app table references.

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
| `ingredients` | `text[]` | no | `'{}'::text[]` | List of ingredients |
| `carbon_footprint_kg` | `numeric(6,2)` | yes | — | kg CO₂e per serving. Check: `>= 0` |
| `fans_appreciation` | `numeric(2,1)` | yes | — | Rating. Check: between 0 and 5 inclusive |
| `supplier_name` | `text` | yes | — | |
| `updated_at` | `timestamptz` | no | `now()` | Set by trigger on every update (see below) |
| `collection_id` | `bigint` | yes | — | FK → `collections.id`, `ON DELETE SET NULL` |

- **Primary key:** `menus_pkey (id)`
- **Foreign key:** `menus_collection_id_fkey`: `collection_id` → `public.collections(id)` `ON DELETE SET NULL`
- **Index:** `menus_collection_id_idx` on `(collection_id)`
- **Trigger:** `menus_set_updated_at`, `BEFORE UPDATE … FOR EACH ROW`, runs `public.set_updated_at()`. That function sets `new.updated_at := now()` and runs with an empty `search_path`.

### `public.collections`

Named groups of menus.

| Column | Type | Nullable | Default | Notes |
|---|---|---|---|---|
| `id` | `bigint` | no | identity (`GENERATED ALWAYS`) | Primary key |
| `name` | `text` | no | — | Check: `length(trim(name)) > 0` |
| `created_at` | `timestamptz` | no | `now()` | |

- **Primary key:** `collections_pkey (id)`
- **No unique constraint on `name`.** Two collections can have the same name.

### `public.tags`

Labels that can be attached to menus.

| Column | Type | Nullable | Default | Notes |
|---|---|---|---|---|
| `id` | `bigint` | no | identity (`GENERATED ALWAYS`) | Primary key |
| `name` | `text` | no | — | Check: `length(trim(name)) > 0` |
| `created_at` | `timestamptz` | no | `now()` | |

- **Primary key:** `tags_pkey (id)`
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

## Access: Row Level Security and grants

- **RLS is enabled on all four tables.**
- **Each table has four permissive policies,** one per command (`SELECT`, `INSERT`, `UPDATE`, `DELETE`), for roles `anon` and `authenticated`. Every one uses `using (true)` and/or `with check (true)`. In practice, anyone with the publishable key can read and write every row; there is no per-user ownership column.
- **Grants observed on 2026-10-12:**
  - `anon` and `authenticated`: `SELECT, INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER` on all four tables. The migrations only grant `SELECT, INSERT, UPDATE, DELETE`; the extra privileges are present in the database but not from the project's migrations.
  - `service_role`: only `REFERENCES, TRIGGER, TRUNCATE` on these tables.

## Database objects not created by this project's migrations

These exist in the live database but are not in `supabase/migrations/`:

- **`public.rls_auto_enable()`** (`SECURITY DEFINER`, owner `postgres`), fired by the event trigger **`ensure_rls`** on `ddl_command_end`. Its name suggests it enables RLS on newly created tables, but its definition was not inspected and its origin was not confirmed.
- **Supabase-managed event triggers:** `issue_graphql_placeholder`, `issue_pg_cron_access`, `issue_pg_graphql_access`, `issue_pg_net_access`, `pgrst_ddl_watch` and `pgrst_drop_watch`. These are not part of the app's schema.

## Not verified / out of scope

- **Where the extra grants come from.** The `TRUNCATE`, `REFERENCES` and `TRIGGER` privileges for `anon`/`authenticated`, and the limited `service_role` privileges, were observed but not traced to a cause. Likely candidates are Supabase's default privileges or a dashboard change.
- **What `rls_auto_enable()` does exactly, and who added it.**
- **Supabase Auth, Storage and other non-`public` schemas** were not documented. No app table references them.
- **Data contents** were not audited beyond the row counts above.

## Where the app touches the schema

- `app/lib/db.ts`: the only module that queries these tables (through `@supabase/ssr`'s server client in `lib/supabase/server.ts`).
- `components/tutorial/fetch-data-steps.tsx` mentions a `notes` table, but only inside example code strings left over from the starter template. No `notes` table exists in this database.
- `supabase/migrations/`: how the schema was created. Schema changes go through new migrations, pushed with `npx supabase db push`.
