import { redirect } from "next/navigation";

// The sign-in page moved to /login. Keeps old links and bookmarks working.
export default function OldLoginPage() {
  redirect("/login");
}
