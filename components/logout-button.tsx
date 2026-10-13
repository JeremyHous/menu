import { signOut } from "@/app/login/actions";
import { Button } from "@/components/ui/button";

// Signs out on the server (ending the session and clearing its cookies),
// then redirects to /login.
export function LogoutButton() {
  return (
    <form action={signOut}>
      <Button type="submit">Sign out</Button>
    </form>
  );
}
