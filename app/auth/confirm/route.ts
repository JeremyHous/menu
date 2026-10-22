import { createClient } from "@/lib/supabase/server";
import { type EmailOtpType } from "@supabase/supabase-js";
import { redirect } from "next/navigation";
import { type NextRequest } from "next/server";

// Only same-site paths, so the link cannot send users to another site.
// Checking the raw text is not enough: browsers read "/\evil.com" (and
// "/<tab>/evil.com") as "//evil.com". So the value is resolved the way a
// browser would, and kept only if it stays on this origin. The result is
// rebuilt from the path, which must not start with "//" itself
// ("/.//evil.com" resolves to the path "//evil.com").
function sameSitePath(rawNext: string, origin: string) {
  let url: URL;
  try {
    url = new URL(rawNext, origin);
  } catch {
    return "/";
  }
  if (url.origin !== origin || url.pathname.startsWith("//")) return "/";
  return `${url.pathname}${url.search}${url.hash}`;
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const token_hash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  const code = searchParams.get("code");
  const next = sameSitePath(
    searchParams.get("next") ?? "/",
    request.nextUrl.origin,
  );

  // Supabase's default confirmation email sends the user back with a PKCE
  // ?code=. New Free plan projects cannot customise email templates, so the
  // token_hash link below may not be available.
  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) redirect(next);
    redirect(`/auth/error?error=${encodeURIComponent(error.message)}`);
  }

  if (token_hash && type) {
    const supabase = await createClient();

    const { error } = await supabase.auth.verifyOtp({
      type,
      token_hash,
    });
    if (!error) {
      // redirect user to specified redirect URL or root of app
      redirect(next);
    } else {
      // redirect the user to an error page with some instructions
      redirect(`/auth/error?error=${error?.message}`);
    }
  }

  // redirect the user to an error page with some instructions
  redirect(`/auth/error?error=No token hash or type`);
}
