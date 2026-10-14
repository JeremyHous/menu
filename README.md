# Menu

A recipe app where every dish is priced in carbon: each menu shows its
footprint per serving, in kilograms of CO₂e. Built with Next.js (App Router)
and Supabase.

## Features

- **Recipes ("menus")** with a description, ingredients and their quantity
  for one adult portion, carbon footprint, fan rating and supplier.
- **Collections:** file recipes into collections, by picking one on the
  recipe page or by dragging a recipe onto a collection in the sidebar.
- **Tags** on recipes, a tag filter (a recipe must have every selected tag)
  and text search. Filters live in the URL, so a filtered list can be
  bookmarked or shared.
- **Images:** upload a JPEG, PNG or WebP (up to 5 MB) from your device, or
  pick an image already in Supabase Storage. A thumbnail appears beside the
  recipe's name and in the list.
- **Accounts:** sign-up and sign-in with Supabase Auth. Every page except
  sign-in and sign-up requires a signed-in user.
- **Shared and private items:** the original recipes, collections and tags
  are shared, so every user can read and edit them but no one can delete
  them. Items a user creates are private to them, and they can delete them.
  Row Level Security in the database enforces this.

## Tech stack

- [Next.js](https://nextjs.org) (App Router, Cache Components, Server
  Actions) with React 19 and TypeScript
- [Supabase](https://supabase.com): Postgres with Row Level Security, Auth
  (via `@supabase/ssr` cookies) and Storage
- CSS modules for the app's own pages; Tailwind CSS and shadcn/ui only in
  the pages that came with the starter (auth, `/protected`)

## Getting started

### Prerequisites

- Node.js 20 or later
- A Supabase project, with the CLI linked to it

### Setup

1. Install dependencies:

   ```bash
   npm install
   ```

2. Copy `.env.example` to `.env.local` and fill in your project's values
   (Supabase dashboard → Project settings → API):

   ```bash
   NEXT_PUBLIC_SUPABASE_URL=https://<project-ref>.supabase.co
   NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=<publishable-or-anon-key>
   ```

   The app only uses the publishable key. Never put the service-role key in
   the app.

3. In the Supabase dashboard, create a **public** Storage bucket named
   `menu-images`. Do this before applying the migrations: one of them sets
   the bucket's size and type limits, and migrations are never re-run.

4. Link the Supabase CLI to your project and apply the migrations:

   ```bash
   npx supabase login
   npx supabase link --project-ref <project-ref>
   npx supabase migration list --linked
   npx supabase db push
   ```

5. Start the dev server and open <http://localhost:3000>:

   ```bash
   npm run dev
   ```

## Scripts

| Command                         | What it does                                         |
| ------------------------------- | ---------------------------------------------------- |
| `npm run dev`                   | Development server on port 3000                      |
| `npm run build`                 | Production build                                     |
| `npm run start`                 | Serve the production build                           |
| `npx tsc --noEmit`              | Type check                                           |
| `npx eslint app lib components` | Lint the source (`npm run lint` also scans `.next/`) |
| `npx prettier --write <files>`  | Format files (Prettier defaults)                     |

## Project structure

```
app/
  lib/db.ts              The only module that queries Supabase (tables and Storage)
  menus/                 Recipe list, recipe pages, sidebar and all server actions
    actions.ts           Server actions (validate, call db, revalidate)
    [id]/page.tsx        Recipe page: details, image, collection, tags
    [id]/edit/page.tsx   Recipe form
  login/, sign-up/       Sign-in and sign-up (Supabase Auth)
  workspace/, author/    Other signed-in pages
lib/supabase/            Supabase clients, requireUser() and the session proxy
supabase/migrations/     Database migrations, applied with the Supabase CLI
docs/                    Project documentation
```

## Documentation

- [`docs/supabase-schema.md`](docs/supabase-schema.md): tables, ownership,
  Row Level Security, grants and the `menu-images` Storage bucket.
- [`AGENTS.md`](AGENTS.md): conventions and workflows for coding agents
  (and a good summary for human contributors too). `CLAUDE.md` adds notes
  for Claude Code.

## Notes

- **Where uploaded images are stored:** images uploaded from the app go in
  a folder named after the recipe's id, for example
  `menu-images/1/picmenu6-<id>.png`. In the Supabase dashboard, open that
  folder to see them. Images at the top level of the bucket are a shared
  library any signed-in user can pick.
- **Older recipes and the recipe form:** some original recipes have
  ingredients without quantities. The recipe form asks for a quantity on
  every ingredient before it saves. Images, collections and tags are saved
  separately, so they work on any recipe.
- **Schema changes:** add a new migration file in `supabase/migrations/` and
  apply it with `npx supabase db push`; don't change the schema in the
  dashboard, so the migration history stays in sync.
