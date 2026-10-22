import { expect, test } from "@playwright/test";

// The database is live and shared with manual testing, so the menu this test
// creates is private to the test account, has a title marking it as test
// data, and is deleted again at the end.
test("a new menu is still there after a page refresh", async ({ page }) => {
  const email = process.env.E2E_EMAIL;
  const password = process.env.E2E_PASSWORD;
  if (!email || !password) {
    throw new Error("Set E2E_EMAIL and E2E_PASSWORD in .env.local.");
  }
  const title = `E2E test menu ${Date.now()}`;
  // The dev server compiles each page on its first visit, so a navigation
  // that follows a server action can take well over the default 5 seconds.
  const navigation = { timeout: 30_000 };

  // The home page is signed-in only, so it sends a new visitor to /login.
  await page.goto("/");
  await expect(page).toHaveURL(/\/login$/);
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL(/\/workspace$/, navigation);

  await page.goto("/");
  await page.getByRole("link", { name: "Add a menu with its recipe" }).click();
  await expect(page.getByRole("heading", { name: "New recipe" })).toBeVisible();

  await page.getByLabel("Title").fill(title);
  // A recipe needs at least one ingredient with its quantity and unit.
  await page.getByLabel("Ingredient 1", { exact: true }).fill("basmati rice");
  await page
    .getByLabel("Quantity of ingredient 1, for one adult portion")
    .fill("80");
  await page.getByLabel("Unit of ingredient 1").selectOption("g");
  await page.getByRole("button", { name: "Save recipe" }).click();

  // Saving opens the new recipe's page.
  await expect(page).toHaveURL(/\/menus\/\d+$/, navigation);
  try {
    await page.reload();
    await expect(page.getByRole("heading", { name: title })).toBeVisible();
  } finally {
    await page.getByRole("button", { name: "Delete recipe" }).click();
    await page.getByRole("button", { name: "Yes, delete it" }).click();
    await expect(page).toHaveURL(/\/menus$/, navigation);
  }
});
