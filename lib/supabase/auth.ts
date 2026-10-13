import type { User } from "@supabase/supabase-js";
import { redirect } from "next/navigation";
import { createClient } from "./server";

/**
 * Returns the signed-in user, or redirects to the sign-in page when there is
 * none. Every signed-in-only page must call this before rendering anything
 * private, inside a <Suspense> boundary (it reads cookies).
 *
 * getUser() sends the session's access token to the Supabase Auth server,
 * which confirms that it is valid and that the session has not been signed
 * out or revoked. getClaims() and getSession() can answer from the cookie
 * alone, so they are not enough to protect a page.
 */
export async function requireUser(): Promise<User> {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getUser();

  // redirect() throws, so nothing after it runs for a signed-out visitor.
  if (error || !data.user) redirect("/login");
  return data.user;
}
