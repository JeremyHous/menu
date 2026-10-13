import { redirect } from "next/navigation";

// The sign-up page moved to /sign-up. Keeps old links and bookmarks working.
export default function OldSignUpPage() {
  redirect("/sign-up");
}
