import { expect, test, type Page } from "@playwright/test";
import { signIn } from "./sign-in";

// The database is live and shared with manual testing, so each test creates
// its own private menu, titled as test data, and deletes it again at the end.

// The dev server compiles each page on its first visit, so a navigation that
// follows a server action can take well over the default 5 seconds, and a
// whole test (sign-in, create, check, delete) well over the default 30.
const navigation = { timeout: 30_000 };
test.describe.configure({ timeout: 120_000 });

// Creates a menu through the recipe form and returns its page URL.
async function createMenu(page: Page, title: string, description: string) {
  await page.goto("/menus/new");
  await expect(page.getByRole("heading", { name: "New recipe" })).toBeVisible();
  await page.getByLabel("Title").fill(title);
  await page.getByLabel("Description").fill(description);
  // A recipe needs at least one ingredient with its quantity and unit.
  await page.getByLabel("Ingredient 1", { exact: true }).fill("basmati rice");
  await page
    .getByLabel("Quantity of ingredient 1, for one adult portion")
    .fill("80");
  await page.getByLabel("Unit of ingredient 1").selectOption("g");
  await page.getByRole("button", { name: "Save recipe" }).click();

  // Saving opens the new recipe's page.
  await expect(page).toHaveURL(/\/menus\/\d+$/, navigation);
  return page.url();
}

async function deleteMenu(page: Page) {
  await page.getByRole("button", { name: "Delete recipe" }).click();
  await page.getByRole("button", { name: "Yes, delete it" }).click();
  await expect(page).toHaveURL(/\/menus$/, navigation);
}

// Deletes the test's menu if the test stopped before deleting it itself. It
// looks the menu up by title, since a test can stop after the menu was saved
// but before its URL was known.
async function cleanUp(page: Page, title: string) {
  await page.goto(`/menus?q=${encodeURIComponent(title)}`);
  const link = page.getByRole("main").getByRole("link", { name: title });
  if ((await link.count()) === 0) return;
  await link.first().click();
  await deleteMenu(page);
}

function menuInList(page: Page, title: string) {
  return page.getByRole("main").getByRole("heading", { name: title });
}

test("a new menu appears in the menus list", async ({ page }) => {
  const title = `E2E test menu ${Date.now()}`;
  await signIn(page);
  try {
    await createMenu(page, title, "Created by the list test.");

    await page.goto("/menus");
    await expect(menuInList(page, title)).toBeVisible();
  } finally {
    await cleanUp(page, title);
  }
});

test("an edited description is still there after a page refresh", async ({
  page,
}) => {
  const title = `E2E test menu ${Date.now()}`;
  const edited = `Edited description ${Date.now()}`;
  await signIn(page);
  try {
    const url = await createMenu(page, title, "Original description.");

    await page.getByRole("link", { name: "Edit recipe" }).click();
    await expect(
      page.getByRole("heading", { name: "Edit recipe" }),
    ).toBeVisible(navigation);
    await page.getByLabel("Description").fill(edited);
    await page.getByRole("button", { name: "Save changes" }).click();
    await expect(page).toHaveURL(url, navigation);

    await page.reload();
    await expect(page.getByText(edited, { exact: true })).toBeVisible();
    await expect(page.getByText("Original description.")).toHaveCount(0);
  } finally {
    await cleanUp(page, title);
  }
});

test("a deleted menu is gone from the list after a page refresh", async ({
  page,
}) => {
  const title = `E2E test menu ${Date.now()}`;
  await signIn(page);
  try {
    await createMenu(page, title, "Created by the delete test.");

    await deleteMenu(page);
    await page.reload();
    await expect(
      page.getByRole("main").getByRole("list").first(),
    ).toBeVisible();
    await expect(menuInList(page, title)).toHaveCount(0);
  } finally {
    await cleanUp(page, title);
  }
});
