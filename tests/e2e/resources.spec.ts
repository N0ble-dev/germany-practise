import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
test("explores exam levels and searches official resources without signing in", async ({
  page,
}) => {
  const authRequests: string[] = [];
  page.on("request", (request) => {
    if (request.url().includes("/api/auth/")) authRequests.push(request.url());
  });
  await page.goto("/exams/resources");
  await expect(
    page.getByRole("heading", { name: "Go in knowing what to expect." }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Official A1 practice" }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", {
      name: "Four skills. One everyday conversation.",
    }),
  ).toBeVisible();
  const model = page.locator(".exam-resource-card").filter({
    has: page.getByRole("heading", {
      name: "Goethe A1 · Start Deutsch 1",
      exact: true,
    }),
  });
  const link = model.getByRole("link", { name: "Open resource" });
  await expect(link).toHaveAttribute(
    "href",
    "https://www.goethe.de/en/m/spr/prf/ueb/pa1.html",
  );
  await expect(link).toHaveAttribute("target", "_blank");
  await expect(link).toHaveAttribute("rel", "noopener noreferrer");
  await page.getByRole("button", { name: "B2", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Official B2 practice" }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", {
      name: "Four skills. One everyday conversation.",
    }),
  ).toHaveCount(0);
  await page.getByRole("searchbox").fill("Goethe");
  await expect(
    page.getByRole("heading", {
      name: "Goethe B2 · practice materials",
      exact: true,
    }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "SCHUBERT online exercises" }),
  ).toHaveCount(0);
  await page.getByRole("searchbox").fill("no-such-resource");
  await expect(
    page.getByText("No exam resources match this search. Try another word."),
  ).toBeVisible();
  await page.getByRole("searchbox").fill("");
  await page.getByRole("button", { name: "C2", exact: true }).click();
  await expect(
    page.getByRole("heading", {
      name: "Goethe C2 · practice materials",
      exact: true,
    }),
  ).toBeVisible();
  expect(authRequests).toEqual([]);
});
test("shows A1 tips and the preparation schedule with accessible mobile layouts", async ({
  page,
}) => {
  await page.goto("/exams/resources");
  await expect(
    page.getByRole("heading", { name: "A gentle four-week preparation plan." }),
  ).toBeVisible();
  await page.getByText("How to practise", { exact: true }).first().click();
  await expect(
    page.getByText(/Read the question first and decide which detail/),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Plan your study sessions" }),
  ).toHaveAttribute("href", "/planner");
  for (const width of [320, 390, 1440]) {
    await page.setViewportSize({ width, height: 1000 });
    for (const theme of ["light", "dark"]) {
      await page.evaluate(
        (value) => (document.documentElement.dataset.theme = value),
        theme,
      );
      await page.waitForTimeout(250);
      await expect
        .poll(() =>
          page.evaluate(
            () => document.documentElement.scrollWidth <= window.innerWidth,
          ),
        )
        .toBe(true);
      const results = await new AxeBuilder({ page }).analyze();
      expect(
        results.violations
          .filter((v) => ["serious", "critical"].includes(v.impact ?? ""))
          .map((v) => v.id),
      ).toEqual([]);
      if (width === 390) {
        await page.evaluate(() => window.scrollTo(0, 0));
        await page.screenshot({
          path: `artifacts/exam-resources-${theme}.png`,
          fullPage: false,
        });
      }
    }
  }
});
