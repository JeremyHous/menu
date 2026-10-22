import { expect, type Page } from "@playwright/test";

// Signs in with the test account from E2E_EMAIL and E2E_PASSWORD in
// .env.local and waits for the workspace.
export async function signIn(page: Page) {
  const email = process.env.E2E_EMAIL;
  const password = process.env.E2E_PASSWORD;
  if (!email || !password) {
    throw new Error("Set E2E_EMAIL and E2E_PASSWORD in .env.local.");
  }

  await page.goto("/login");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Sign in" }).click();
  // The dev server compiles each page on its first visit, so this can take
  // well over the default 5 seconds.
  await expect(page).toHaveURL(/\/workspace$/, { timeout: 30_000 });
}
