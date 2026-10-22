import { expect, test } from "@playwright/test";
import { signIn } from "./sign-in";

// Only reads data: the test account must already have at least one dish of
// its own ("Yours") and see at least one shared dish.
test("“Show only my collections” hides other people's dishes and keeps mine", async ({
  page,
}) => {
  await signIn(page);
  await page.goto("/menus");

  const dishes = page.getByRole("main").getByRole("listitem");
  const mine = dishes.filter({
    has: page.getByText("Yours", { exact: true }),
  });
  const notMine = dishes.filter({
    has: page.getByText("Shared", { exact: true }),
  });

  // Both kinds are listed before filtering, so the filter has something to
  // hide and something to keep.
  await expect(mine.first()).toBeVisible();
  await expect(notMine.first()).toBeVisible();
  const myTitles = await mine.getByRole("heading").allTextContents();

  await page.getByRole("button", { name: "Show only my collections" }).click();

  // The list holds exactly my dishes, in the same order: none of the others,
  // and none of mine missing.
  await expect(dishes.getByRole("heading")).toHaveText(myTitles);
  await expect(notMine).toHaveCount(0);
});
