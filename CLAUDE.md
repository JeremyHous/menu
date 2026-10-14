@AGENTS.md

# Claude Code notes

The project's rules are in `AGENTS.md` (imported above), shared with other
coding agents. Put project facts there; this file only holds how Claude
works with this user.

## Working with the user

- **Implement directly, then report:** the files changed, how it works, the
  validation results (tsc, eslint, build), and the remaining limitations.
  Say plainly what was verified and what was not.
- **The user tests in the browser manually.** When asked for manual tests,
  give one at a time and wait for feedback before the next. End a feature
  with the first test to run.
- **Apply migrations yourself** with the Supabase CLI (workflow in
  `AGENTS.md`); don't hand SQL to the user to paste in the dashboard.
- **Ask only for real decisions,** such as a privacy or security trade-off
  (for example, where uploads are stored) or a request that names something
  missing from the schema. Otherwise pick the sensible default and say so.
- **When the user reports a bug, check the evidence first:** the dev server
  log (it shows each server action's previous state), read-only queries,
  and the public Storage URL. Find the real cause before changing code; if
  the code is correct, explain what the user is seeing instead.
- **Commit only when asked.** The working tree often has unrelated
  uncommitted changes; stage only the files that belong to the request.
- The user sometimes writes in French; answer in the user's language, but
  keep code, comments and docs in English.
