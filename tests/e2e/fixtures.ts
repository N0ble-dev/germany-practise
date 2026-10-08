import { test as base, expect } from "@playwright/test";

// Learning tests deliberately choose guest access; onboarding tests use a fresh browser.
export const test = base.extend({
  page: async ({ page }, use) => {
    await page.route("**/api/auth/get-session*", (route) =>
      route.fulfill({ json: null }),
    );
    await page.goto("/signup");
    await page
      .getByRole("button", { name: "Continue without an account" })
      .click();
    await expect(page.locator("main h1")).toContainText("Guten");
    await use(page);
  },
});
export { expect };
