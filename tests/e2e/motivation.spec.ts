import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { destinations } from "../../src/lib/destinations";

test("a learner saves a Germany dream and sees a real daily-study reminder", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/");
  await expect(
    page.getByRole("region", { name: "My daily Germany reminder" }),
  ).toBeVisible();
  await expect(
    page.getByText("Your next small step is waiting", { exact: true }),
  ).toBeVisible();
  await page.getByRole("link", { name: "Choose my Germany dream" }).click();
  await expect(
    page.getByRole("heading", {
      name: "A place to picture. A reason to practice.",
    }),
  ).toBeVisible();
  for (const destination of destinations) {
    const image = page
      .locator(".dream-destination")
      .getByAltText(destination.alt);
    await image.scrollIntoViewIfNeeded();
    await expect
      .poll(() => image.evaluate((node: HTMLImageElement) => node.naturalWidth))
      .toBeGreaterThan(0);
  }
  await page
    .getByRole("button", { name: "Choose Eibsee as my daily reminder" })
    .click();
  await expect(
    page.getByRole("button", { name: "Choose Eibsee as my daily reminder" }),
  ).toHaveAttribute("aria-pressed", "true");
  const reason =
    "I want to live in Germany and spend weekends exploring the lakes.";
  await page
    .getByRole("textbox", { name: "My reason for learning German" })
    .fill(reason);
  await page.getByRole("button", { name: "Save my reason" }).click();
  await page.reload();
  await expect(
    page.getByRole("textbox", { name: "My reason for learning German" }),
  ).toHaveValue(reason);
  await expect(
    page.getByRole("button", { name: "Choose Eibsee as my daily reminder" }),
  ).toHaveAttribute("aria-pressed", "true");
  const saved = await page.evaluate(() =>
    JSON.parse(localStorage.getItem("deutsch-journey-v2")!),
  );
  expect(saved.xp).toBe(0);
  expect(saved.activities).toHaveLength(0);
  await page.goto("/");
  const reminder = page.getByRole("region", {
    name: "My daily Germany reminder",
  });
  await expect(reminder.getByText(reason, { exact: true })).toBeVisible();
  await expect(reminder.getByAltText(destinations[3].alt)).toBeVisible();
  await expect(
    reminder.getByText("Your next small step is waiting", { exact: true }),
  ).toBeVisible();
  await reminder.getByRole("link", { name: "Take a small step today" }).click();
  await expect(page).toHaveURL(/\/lessons\/1$/);
  await page
    .getByRole("button", { name: "Continue to Essential words" })
    .click();
  await page.goto("/");
  await expect(
    page.getByText("You practiced today", { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByText(
      "You showed up for your German today. That small step counts.",
      { exact: true },
    ),
  ).toBeVisible();
  expect(errors).toEqual([]);
});
test("Germany inspiration is accessible in light, dark, and mobile layouts", async ({
  page,
}) => {
  await page.goto("/inspiration");
  await expect(page.locator("main h1")).toBeVisible();
  for (const destination of destinations) {
    await page
      .locator(".dream-destination")
      .getByAltText(destination.alt)
      .scrollIntoViewIfNeeded();
  }
  let scan = await new AxeBuilder({ page }).analyze();
  expect(
    scan.violations.filter(
      (v) => v.impact === "serious" || v.impact === "critical",
    ),
  ).toEqual([]);
  await page.screenshot({
    path: "test-results/germany-dream-desktop.png",
    fullPage: true,
  });
  await page.getByRole("button", { name: "Switch to dark theme" }).click();
  scan = await new AxeBuilder({ page }).analyze();
  expect(
    scan.violations.filter(
      (v) => v.impact === "serious" || v.impact === "critical",
    ),
  ).toEqual([]);
  await page.setViewportSize({ width: 390, height: 844 });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  scan = await new AxeBuilder({ page }).analyze();
  expect(
    scan.violations.filter(
      (v) => v.impact === "serious" || v.impact === "critical",
    ),
  ).toEqual([]);
  await page.screenshot({
    path: "test-results/germany-dream-mobile-dark.png",
    fullPage: true,
  });
  await page.getByRole("button", { name: "Switch to light theme" }).click();
  await page.goto("/");
  await expect(page.locator("main h1")).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: "test-results/germany-reminder-mobile.png",
    fullPage: true,
  });
  await page.goto("/inspiration#photo-credits");
  await page.getByText("Photo credits & licenses", { exact: true }).click();
  for (const destination of destinations) {
    await expect(
      page
        .locator(".dream-photo-credits")
        .getByRole("link", { name: destination.title, exact: true }),
    ).toHaveAttribute("href", destination.source);
  }
});
