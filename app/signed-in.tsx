import { requireUser } from "@/lib/supabase/auth";
import type { ReactNode } from "react";

// Renders its children only after requireUser() has checked the session with
// the Supabase Auth server; signed-out visitors are redirected to /login.
// Server components in children do not run, and so load no data, until then.
// It reads cookies, so place it inside a <Suspense> boundary, in each page
// rather than only in a layout: layouts do not re-render on client
// navigation between pages.
export async function SignedIn({ children }: { children: ReactNode }) {
  await requireUser();
  return children;
}
