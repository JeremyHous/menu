import { AuthForm } from "../login/auth-form";

export default function SignUpPage() {
  return (
    <main className="flex min-h-svh w-full items-center justify-center p-6 md:p-10">
      <div className="w-full max-w-sm">
        <AuthForm mode="sign-up" />
      </div>
    </main>
  );
}
