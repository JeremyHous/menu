"use client";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import Link from "next/link";
import { useActionState } from "react";
import { type AuthFormState, signIn, signUp } from "./actions";

const initialState: AuthFormState = {};

const COPY = {
  "sign-in": {
    title: "Sign in",
    description: "Enter your email and password to open your workspace.",
    submit: "Sign in",
    pending: "Signing in…",
    switchText: "New here?",
    switchLink: "Create an account",
    switchHref: "/sign-up",
    passwordAutoComplete: "current-password",
  },
  "sign-up": {
    title: "Create an account",
    description: "Enter your email and choose a password.",
    submit: "Create account",
    pending: "Creating account…",
    switchText: "Already have an account?",
    switchLink: "Sign in",
    switchHref: "/login",
    passwordAutoComplete: "new-password",
  },
} as const;

// The sign-in and sign-up forms. Both post to Server Actions, which call
// Supabase Auth on the server.
export function AuthForm({ mode }: { mode: "sign-in" | "sign-up" }) {
  const [state, formAction, pending] = useActionState(
    mode === "sign-in" ? signIn : signUp,
    initialState,
  );
  const copy = COPY[mode];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-2xl">
          <h1>{copy.title}</h1>
        </CardTitle>
        <CardDescription>{copy.description}</CardDescription>
      </CardHeader>
      <CardContent>
        {state.message ? (
          <p role="status" className="text-sm">
            {state.message}
          </p>
        ) : (
          <form action={formAction} className="flex flex-col gap-6">
            <div className="grid gap-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                defaultValue={state.email ?? ""}
              />
            </div>
            <div className="grid gap-2">
              <div className="flex items-center">
                <Label htmlFor="password">Password</Label>
                {mode === "sign-in" && (
                  <Link
                    href="/auth/forgot-password"
                    className="ml-auto text-sm underline-offset-4 hover:underline"
                  >
                    Forgot your password?
                  </Link>
                )}
              </div>
              <Input
                id="password"
                name="password"
                type="password"
                autoComplete={copy.passwordAutoComplete}
                required
                aria-invalid={state.error ? true : undefined}
                aria-describedby={state.error ? "auth-error" : undefined}
              />
            </div>
            {state.error && (
              <p id="auth-error" role="alert" className="text-sm text-red-600">
                {state.error}
              </p>
            )}
            <Button type="submit" className="w-full" disabled={pending}>
              {pending ? copy.pending : copy.submit}
            </Button>
          </form>
        )}
        <p className="mt-4 text-center text-sm">
          {copy.switchText}{" "}
          <Link href={copy.switchHref} className="underline underline-offset-4">
            {copy.switchLink}
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}
