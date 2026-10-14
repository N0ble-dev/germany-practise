import { test, expect, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { initialState } from "../../src/lib/content";
import { readFactory } from "../../scripts/content/factory-files";
import { buildCoverage } from "../../src/lib/content-factory/coverage";
const userId = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
async function seed(page: Page, signedIn = true) {
  const state = initialState();
  state.onboardingComplete = true;
  await page.addInitScript(
    (value) =>
      localStorage.setItem("deutsch-journey-v2", JSON.stringify(value)),
    state,
  );
  await page.route("**/api/auth/get-session*", (route) =>
    route.fulfill({
      json: signedIn
        ? {
            user: {
              id: userId,
              name: "Fixture editor",
              email: "editor@example.test",
              emailVerified: true,
              createdAt: "2026-10-14T00:00:00Z",
              updatedAt: "2026-10-14T00:00:00Z",
            },
            session: {
              id: "fixture",
              userId,
              token: "fixture",
              expiresAt: "2035-01-01T00:00:00Z",
              createdAt: "2026-10-14T00:00:00Z",
              updatedAt: "2026-10-14T00:00:00Z",
            },
          }
        : null,
    }),
  );
}
test("editor can explore all levels, filter draft gaps and open a bilingual preview without requesting missing audio", async ({
  page,
}) => {
  await seed(page);
  const {
    map: factoryCurriculum,
    sources: factorySources,
    drafts,
    intake,
  } = await readFactory();
  await page.route("**/api/admin/content/coverage", (route) =>
    route.fulfill({
      json: {
        coverage: buildCoverage(factoryCurriculum, drafts, [], true),
        sources: factorySources.sources,
        intake,
      },
    }),
  );
  const pack = drafts.find((p) => p.id === "a1-1-l02")!;
  await page.route("**/api/admin/content/draft?*", (route) =>
    route.fulfill({ json: { pack } }),
  );
  let audioCalls = 0;
  page.on("request", (request) => {
    if (request.url().includes("/api/admin/content/audio")) audioCalls++;
  });
  await page.goto("/admin/content/coverage");
  await expect(page.getByText("132", { exact: true })).toBeVisible();
  await expect(
    page.getByText("100 sentence candidates", { exact: true }),
  ).toBeVisible();
  await expect(page.getByText("24 lessons shown")).toBeVisible();
  await page.getByRole("button", { name: "C2", exact: true }).click();
  await expect(page.getByText("16 lessons shown")).toBeVisible();
  await expect(
    page.getByRole("heading", {
      name: "Analyze ambiguity in a complex original essay",
    }),
  ).toBeVisible();
  await page.getByRole("button", { name: "A1", exact: true }).click();
  await page.getByLabel("Editorial status").selectOption("draft");
  await expect(page.getByText("3 lessons shown")).toBeVisible();
  await page.getByLabel("Find a lesson").fill("Softwareentwickler");
  await expect(page.getByText("1 lessons shown")).toBeVisible();
  await page.locator(".factory-lesson summary").click();
  await expect(page.getByText(/add a writing activity/)).toBeVisible();
  await page.getByRole("link", { name: "Preview draft" }).click();
  await expect(
    page.getByRole("heading", { name: pack.title.en }),
  ).toBeVisible();
  await expect(page.getByText(/UNREVIEWED DRAFT/)).toBeVisible();
  await expect(page.locator('[lang="ar"][dir="rtl"]').first()).toBeVisible();
  await expect(
    page.getByText("Recording not available in this draft.").first(),
  ).toBeVisible();
  expect(await page.locator("audio").count()).toBe(0);
  expect(audioCalls).toBe(0);
  const before = await page.evaluate(() =>
    localStorage.getItem("deutsch-journey-v2"),
  );
  await page
    .getByRole("button", { name: "Berlin", exact: true })
    .first()
    .click();
  await expect(page.getByText(/That's right/)).toBeVisible();
  expect(
    await page.evaluate(() => localStorage.getItem("deutsch-journey-v2")),
  ).toBe(before);
});
test("guests and unauthorized accounts cannot see drafts, and a failed database is labeled unavailable", async ({
  page,
}) => {
  const { map: factoryCurriculum, sources: factorySources } =
    await readFactory();
  await seed(page, false);
  await page.goto("/admin/content/coverage");
  await expect(
    page.getByRole("link", { name: "Continue with Google" }),
  ).toBeVisible();
  await seed(page);
  let failure = true;
  await page.route("**/api/admin/content/coverage", (route) =>
    route.fulfill(
      failure
        ? {
            status: 403,
            json: { error: "This account does not have content access." },
          }
        : {
            json: {
              coverage: buildCoverage(factoryCurriculum, [], [], false),
              sources: factorySources.sources,
              warning:
                "Publication counts are unavailable. Retry to check Neon.",
            },
          },
    ),
  );
  await page.reload();
  await expect(page.locator(".factory-coverage [role=alert]")).toContainText(
    "does not have content access",
  );
  await expect(page.getByRole("table")).toHaveCount(0);
  failure = false;
  await page.getByRole("button", { name: "Try again" }).click();
  await expect(
    page.getByText("Publication counts are unavailable. Retry to check Neon."),
  ).toBeVisible();
  await expect(
    page.getByText("Database status unavailable", { exact: true }),
  ).toBeVisible();
  await page.getByLabel("Find a lesson").fill("No such scenario");
  await expect(
    page.getByRole("heading", { name: "No matching lessons" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Clear filters" }).click();
  await expect(page.getByText("24 lessons shown")).toBeVisible();
});
test("coverage fits mobile and desktop in both themes with accessible active controls", async ({
  page,
}) => {
  await seed(page);
  const {
    map: factoryCurriculum,
    sources: factorySources,
    drafts,
    intake,
  } = await readFactory();
  await page.route("**/api/admin/content/coverage", (route) =>
    route.fulfill({
      json: {
        coverage: buildCoverage(factoryCurriculum, drafts, [], true),
        sources: factorySources.sources,
        intake,
      },
    }),
  );
  await page.goto("/admin/content/coverage");
  await expect(page.getByRole("table")).toBeVisible();
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
      const axe = await new AxeBuilder({ page })
        .include(".factory-coverage")
        .analyze();
      expect(
        axe.violations.filter((v) =>
          ["serious", "critical"].includes(v.impact ?? ""),
        ),
      ).toEqual([]);
      if (width !== 320) {
        await page.screenshot({
          path: `artifacts/factory-${width}-${theme}.png`,
          fullPage: true,
        });
        await page.screenshot({
          path: `artifacts/factory-viewport-${width}-${theme}.png`,
        });
      }
    }
});
