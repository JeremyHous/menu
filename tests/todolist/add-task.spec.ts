import { expect, test } from "@playwright/test";

// The to-do app at todolist.james.am, an external TodoMVC site. It keeps
// tasks in the browser's localStorage, and each test gets a fresh browser
// context, so the list starts empty. The app has no "new task" button: the
// task box is the entry point, and Enter submits it.
test.describe("Adding tasks", () => {
  test("should add a task", async ({ page }) => {
    // 1. Open the home page
    await page.goto("https://todolist.james.am/#/");

    // 2. Click the new-task box
    const newTask = page.getByRole("textbox", {
      name: "What need's to be done?",
    });
    await newTask.click();

    // 3. Type "buy milk"
    await newTask.fill("buy milk");

    // 4. Submit with Enter
    await newTask.press("Enter");

    // 5. The task appears in the list
    await expect(
      page.getByRole("listitem").filter({ hasText: "buy milk" }),
    ).toBeVisible();
  });
});
