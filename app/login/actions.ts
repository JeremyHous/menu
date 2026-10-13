"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

// Email and password sign-in, sign-up and sign-out. Supabase Auth checks
// and stores the passwords; this app never stores or compares them. The
// actions run on the server, so the session cookies are set by the server
// client rather than by the browser.

export type AuthFormState = {
  error?: string;
  // Shown after a sign-up that needs email confirmation.
  message?: string;
  // Submitted email, so the form can be refilled. Passwords are never sent
  // back.
  email?: string;
};

const SIGN_IN_FAILED = "Signing in failed. Please try again.";
const SIGN_UP_FAILED = "Signing up failed. Please try again.";

// FormData entries can be files; anything that is not text counts as empty.
function readText(formData: FormData, field: string) {
  const value = formData.get(field);
  return typeof value === "string" ? value : "";
}

// Only checks that both fields were filled in. Password rules such as the
// minimum length are Supabase Auth's, and its error says what is wrong.
function readCredentials(formData: FormData) {
  const email = readText(formData, "email").trim();
  const password = readText(formData, "password");
  if (!email) return { error: "Enter your email address.", email };
  if (!password) return { error: "Enter your password.", email };
  return { email, password };
}

export async function signIn(
  _prevState: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const credentials = readCredentials(formData);
  if ("error" in credentials) return credentials;

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({
    email: credentials.email,
    password: credentials.password,
  });
  if (error) {
    // Supabase's messages, such as "Invalid login credentials" or "Email not
    // confirmed", are written for end users.
    return { error: error.message || SIGN_IN_FAILED, email: credentials.email };
  }

  // Pages rendered for the signed-out visitor must not be reused.
  revalidatePath("/", "layout");
  redirect("/workspace");
}

// The site's own origin, for the link in the confirmation email. Browsers
// send Origin with every Server Action request.
async function siteOrigin() {
  const headerList = await headers();
  const origin = headerList.get("origin");
  if (origin) return origin;
  const host = headerList.get("x-forwarded-host") ?? headerList.get("host");
  const protocol = headerList.get("x-forwarded-proto") ?? "http";
  return `${protocol}://${host}`;
}

export async function signUp(
  _prevState: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const credentials = readCredentials(formData);
  if ("error" in credentials) return credentials;

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email: credentials.email,
    password: credentials.password,
    options: {
      // The confirmation link comes back through /auth/confirm, which signs
      // the user in and sends them on to the workspace.
      emailRedirectTo: `${await siteOrigin()}/auth/confirm?next=/workspace`,
    },
  });
  if (error) {
    return { error: error.message || SIGN_UP_FAILED, email: credentials.email };
  }

  // With email confirmation turned off, Supabase signs the user in at once.
  if (data.session) {
    revalidatePath("/", "layout");
    redirect("/workspace");
  }

  // Otherwise the account is only usable after the email link is opened.
  // Supabase gives the same answer for an address that is already
  // registered, so this does not reveal which emails have accounts.
  return {
    message: `Check ${credentials.email} for a link to confirm your account, then sign in.`,
  };
}

export async function signOut() {
  const supabase = await createClient();
  // Ends the session on the Auth server and clears the session cookies.
  await supabase.auth.signOut();
  revalidatePath("/", "layout");
  redirect("/login");
}
