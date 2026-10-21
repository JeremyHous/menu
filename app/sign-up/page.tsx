import { AuthForm } from "../login/auth-form";
import { ThemeToggle } from "../theme-toggle";

export default function SignUpPage() {
  return (
    <main className="relative flex min-h-svh w-full items-center justify-center p-6 md:p-10">
      <ThemeToggle className="absolute right-4 top-4" />
      <div className="w-full max-w-sm">
        <AuthForm mode="sign-up" />
      </div>
    </main>
  );
}
