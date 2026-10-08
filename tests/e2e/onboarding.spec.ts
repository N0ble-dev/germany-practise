import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { initialState } from "../../src/lib/content";

test("first-time visitors see Google signup and can keep learning as guests", async ({
  page,
}) => {
  await page.route("**/api/auth/get-session*", (route) =>
    route.fulfill({ json: null }),
  );
  await page.goto("/");
  if (await page.locator("main h1").filter({ hasText: "Guten" }).count())
    test.skip(true, "This build has no managed accounts enabled.");
  await expect(page).toHaveURL(/\/signup$/);
  await expect(
    page.getByRole("button", { name: "Continue with Google", exact: true }),
  ).toBeVisible();
  await expect(
    page.locator('input[type="email"], input[type="password"]'),
  ).toHaveCount(0);
  await expect(
    page.getByText("We create your learning account automatically", {
      exact: false,
    }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Continue without an account" })
    .click();
  await expect(page).toHaveURL("/");
  await expect(page.locator("main h1")).toContainText("Guten");
  await page.reload();
  await expect(page.locator("main h1")).toContainText("Guten");
  const state = await page.evaluate(() =>
    JSON.parse(localStorage.getItem("deutsch-journey-v2")!),
  );
  expect(state.onboardingComplete).toBe(true);
  expect(state.xp).toBe(0);
  expect(state.activities).toHaveLength(0);
  await page.getByRole("link", { name: "Sign in", exact: true }).click();
  await expect(page).toHaveURL(/\/signin$/);
  await expect(
    page.getByRole("button", { name: "Continue with Google", exact: true }),
  ).toBeVisible();
  await expect(
    page.locator('input[type="email"], input[type="password"]'),
  ).toHaveCount(0);
});

test("an authenticated learner with an empty local journey opens the dashboard", async ({
  page,
}) => {
  const now = new Date().toISOString(),
    id = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
  await page.route("**/api/auth/get-session*", (route) =>
    route.fulfill({
      json: {
        user: {
          id,
          name: "Amina",
          email: "amina@example.com",
          emailVerified: true,
          createdAt: now,
          updatedAt: now,
        },
        session: {
          id,
          userId: id,
          token: "mock-session",
          expiresAt: "2035-01-01T00:00:00Z",
          createdAt: now,
          updatedAt: now,
        },
      },
    }),
  );
  await page.goto("/");
  await expect(page.locator("main h1")).toContainText("Guten");
  await expect(page).toHaveURL("/");
  await expect(
    page.getByRole("link", { name: "My account", exact: true }),
  ).toBeVisible();
});

test("existing guest progress opens directly and signup stays accessible on a phone", async ({
  page,
}) => {
  await page.route("**/api/auth/get-session*", (route) =>
    route.fulfill({ json: null }),
  );
  const state = initialState();
  state.xp = 4;
  await page.addInitScript(
    (value) =>
      localStorage.setItem("deutsch-journey-v2", JSON.stringify(value)),
    state,
  );
  await page.goto("/");
  await expect(page.locator("main h1")).toContainText("Guten");
  await page.goto("/signup");
  await expect(page.locator("main h1")).toBeVisible();
  await expect(page.locator(".welcome-account .google-auth")).toBeVisible();
  for (const viewport of [
    { width: 1440, height: 1000 },
    { width: 390, height: 844 },
  ]) {
    await page.setViewportSize(viewport);
    for (const theme of ["light", "dark"]) {
      const button = page.getByRole("button", {
        name: `Switch to ${theme} theme`,
      });
      if (await button.count()) await button.click();
      await expect(page.locator("html")).toHaveAttribute("data-theme", theme);
      await page.evaluate(async () => {
        await Promise.all(
          document
            .getAnimations()
            .map((animation) => animation.finished.catch(() => {})),
        );
      });
      const scan = await new AxeBuilder({ page }).analyze();
      expect(
        scan.violations.filter(
          (v) => v.impact === "serious" || v.impact === "critical",
        ),
      ).toEqual([]);
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      ).toBe(true);
      await page.evaluate(() => window.scrollTo(0, 0));
      await page.screenshot({
        path: `test-results/signup-${viewport.width}-${theme}.png`,
        fullPage: true,
      });
    }
  }
});
