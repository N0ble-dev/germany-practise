import { test, expect } from "./fixtures";
import AxeBuilder from "@axe-core/playwright";

test("the daily page opens an advanced journey, preserves a private response, and carries the level into exams", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/");
  await page
    .getByRole("navigation", { name: "Explore your German level" })
    .getByRole("link", { name: "B2" })
    .click();
  await expect(page).toHaveURL(/\/lessons\?level=B2$/);
  const levels = page.getByRole("group", { name: "German practice level" });
  await expect(levels.getByRole("button")).toHaveCount(6);
  await expect(levels.getByRole("button", { name: /B2/ })).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  await expect(
    page.getByText("Should your team offer more flexible working hours?", {
      exact: false,
    }),
  ).toBeVisible();
  const before = await page.evaluate(() =>
    JSON.parse(localStorage.getItem("deutsch-journey-v2")!),
  );
  const draft =
    "Flexible Arbeitszeiten helfen uns, Beruf und Familie besser zu verbinden.";
  await page.getByLabel("Your draft in German").fill(draft);
  await levels.getByRole("button", { name: /C2/ }).click();
  await expect(page.getByLabel("Your draft in German")).toHaveValue(draft);
  await page.getByRole("button", { name: "Keep in my notebook" }).click();
  await expect(
    page.getByRole("button", { name: "Saved to my notebook" }),
  ).toBeDisabled();
  const after = await page.evaluate(() =>
    JSON.parse(localStorage.getItem("deutsch-journey-v2")!),
  );
  expect(after.savedSentences).toContain(draft);
  expect(after.xp).toBe(before.xp);
  expect(after.journey).toEqual(before.journey);
  await page
    .locator(".journey-course-outlines summary")
    .filter({ hasText: "Precision and inference" })
    .click();
  await expect(
    page
      .getByText("Analyze ambiguity in a complex original essay", {
        exact: true,
      })
      .first(),
  ).toBeVisible();
  await page.getByRole("link", { name: "Explore C2 exam preparation" }).click();
  await expect(
    page
      .getByRole("group", { name: "Target exam level" })
      .getByRole("button", { name: "C2", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  await page.goto("/sentences");
  await expect(page.getByText(draft, { exact: true })).toBeVisible();
  expect(errors).toEqual([]);
});

test("all levels expose distinct directions and the available foundation stays accessible", async ({
  page,
}) => {
  await page.goto("/lessons");
  const headings = [
    "Your first conversations",
    "Make everyday life yours",
    "Find your independence",
    "Make your point",
    "Go deeper in German",
    "Say exactly what you mean",
  ];
  for (const [index, level] of ["A1", "A2", "B1", "B2", "C1", "C2"].entries()) {
    await page
      .getByRole("group", { name: "German practice level" })
      .getByRole("button", { name: new RegExp(`^${level}`) })
      .click();
    await expect(
      page.getByRole("heading", { name: headings[index], exact: true }),
    ).toBeVisible();
    await expect(
      page.getByRole("link", { name: `Explore ${level} exam preparation` }),
    ).toHaveAttribute("href", `/exams?level=${level}`);
    await expect(
      page.getByText("Practice themes", { exact: true }).first(),
    ).toBeVisible();
  }
  await page.locator(".journey-foundation").click();
  await expect(page).toHaveURL(/\/lessons\/foundation$/);
  await expect(page.locator(".book-chapter")).toHaveCount(12);
});

test("the journey fits small screens and both themes with accessible controls", async ({
  page,
}) => {
  await page.goto("/lessons?level=C1");
  for (const width of [320, 390, 1440])
    for (const theme of ["light", "dark"]) {
      await page.setViewportSize({ width, height: 1000 });
      await page.evaluate(
        (value) => (document.documentElement.dataset.theme = value),
        theme,
      );
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      ).toBe(true);
      const audit = await new AxeBuilder({ page })
        .include(".german-journey")
        .analyze();
      expect(
        audit.violations.filter((v) =>
          ["serious", "critical"].includes(v.impact ?? ""),
        ),
      ).toEqual([]);
      if (width !== 320)
        await page.screenshot({
          path: `artifacts/german-journey-${width}-${theme}.png`,
          fullPage: true,
        });
    }
});
