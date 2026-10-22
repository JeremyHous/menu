import { ThemeToggle } from "../theme-toggle";
import { AuthForm } from "./auth-form";

export default function LoginPage() {
  return (
    <main className="relative flex min-h-svh w-full items-center justify-center p-6 md:p-10">
      <ThemeToggle className="absolute right-4 top-4" />
      <div className="w-full max-w-sm">
        <AuthForm mode="sign-in" />
      </div>
    </main>
  );
}
