import { test, expect, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { initialState } from "../../src/lib/content";
import { contentHash } from "../../src/lib/content-pipeline/hash";
import { intakeDraftBlockers } from "../../src/lib/content-intake/model";
import type {
  IntakeSummary,
  IntakeDetail,
  IntakeRow,
  IntakeReview,
} from "../../src/lib/content-intake/repository";
const userId = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const archive: IntakeSummary = {
  id: "fixture-dib",
  provider: "deutsch_im_blick",
  title: "Deutsch im Blick · Second edition (2017)",
  expectedCount: 3951,
  state: "complete",
  manifestHash: "a".repeat(64),
  manifest: {
    schemaVersion: 1,
    sourceUrl: "https://coerll.utexas.edu/dib/",
    licenseClaim: "CC-BY-4.0",
    licenseUrl: "https://creativecommons.org/licenses/by/4.0/",
    attribution:
      "Synthetic local browser fixture. Source archive preserved; no real reviewer approval.",
    counts: {
      vocabulary: 2296,
      source_page: 484,
      activity: 316,
      media_reference: 264,
    },
    files: [],
    notes: ["Review only"],
  },
};
const sourcePayload = {
  id: "fixture-word",
  german: "Hallo!",
  english: "Hello!",
  headword: "Hallo!",
  article: null,
  plural_notation: null,
  review_status: "pending_review",
};
const source: IntakeRow = {
  id: 1,
  kind: "vocabulary",
  key: "fixture-word",
  hash: contentHash(sourcePayload),
  chapter: 1,
  page: 18,
  german: "Hallo!",
  english: "Hello!",
  topic: "Greetings",
  listType: "core",
  hasDraft: false,
};
async function setup(
  page: Page,
  {
    signedIn = true,
    forbidden = false,
    listFailure = false,
    saveFailure = false,
  } = {},
) {
  const state = initialState();
  state.onboardingComplete = true;
  state.savedSentences = ["Private notebook fixture."];
  await page.addInitScript(
    (value) =>
      localStorage.setItem("deutsch-journey-v2", JSON.stringify(value)),
    state,
  );
  let sessionVisible = signedIn,
    failList = listFailure,
    failSave = saveFailure;
  await page.route("**/api/auth/get-session*", (route) =>
    route.fulfill({
      json: sessionVisible
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
  const detail: IntakeDetail = {
    item: {
      ...source,
      payload: structuredClone(sourcePayload),
      archiveId: archive.id,
    },
    archive,
    sourcePage: { page: 18, text: "Original page fixture: Hallo! Hello!" },
    draft: null,
  };
  const calls: unknown[] = [];
  await page.route("**/api/admin/content/imports*", async (route) => {
    if (forbidden)
      return route.fulfill({
        status: 403,
        json: { error: "This account does not have content access." },
      });
    const params = new URL(route.request().url()).searchParams;
    if (route.request().method() === "POST") {
      const action = route.request().postDataJSON();
      calls.push(action);
      expect(route.request().headers()["x-learning-account"]).toBe(userId);
      if (action.action === "save_draft") {
        if (failSave) {
          failSave = false;
          return route.fulfill({
            status: 409,
            json: {
              error:
                "The source or draft changed. Reload the item before saving another revision.",
            },
          });
        }
        expect(action.sourceHash).toBe(source.hash);
        expect(action.expectedVersion).toBe(detail.draft?.version ?? 0);
        const hash = contentHash(action.entry);
        detail.draft = {
          id: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
          version: (detail.draft?.version ?? 0) + 1,
          contentHash: hash,
          entry: action.entry,
          authorName: "Fixture editor",
          reviews: [],
          blockers: intakeDraftBlockers(action.entry, [], hash),
        };
        detail.item.hasDraft = true;
        return route.fulfill({ json: detail });
      }
      const review: IntakeReview = {
        category: action.category,
        decision: action.decision,
        comment: action.comment,
        contentHash: action.contentHash,
        reviewerName: "Fixture editor",
        reviewedAt: "2026-10-14T12:00:00Z",
      };
      detail.draft!.reviews.push(review);
      detail.draft!.blockers = intakeDraftBlockers(
        detail.draft!.entry,
        detail.draft!.reviews,
        detail.draft!.contentHash,
      );
      return route.fulfill({ json: { recorded: true } });
    }
    if (params.has("item")) return route.fulfill({ json: detail });
    if (params.has("archive")) {
      if (failList) {
        failList = false;
        return route.fulfill({
          status: 503,
          json: { error: "Source items could not load. Try again." },
        });
      }
      if (params.get("q") === "No match")
        return route.fulfill({ json: { items: [], nextCursor: null } });
      if (params.has("cursor"))
        return route.fulfill({
          json: {
            items: [
              {
                ...source,
                id: 2,
                key: "fixture-second",
                german: "Danke!",
                english: "Thank you!",
              },
            ],
            nextCursor: null,
          },
        });
      return route.fulfill({
        json: {
          items: [{ ...source, hasDraft: !!detail.draft }],
          nextCursor: 1,
        },
      });
    }
    return route.fulfill({
      json: {
        archives: [archive],
        roles: ["author", "language", "pedagogy", "arabic", "rights"],
        userId,
        lessons: [
          {
            id: "a1-1-l01",
            title: "Introduce yourself",
            level: "A1",
            subdivision: "A1.1",
          },
        ],
      },
    });
  });
  return {
    detail,
    calls,
    signOut: () => {
      sessionVisible = false;
    },
  };
}
async function fillCorrection(page: Page) {
  await page.getByLabel("Arabic meaning / instructions").fill("مرحبًا");
  await page.getByLabel("Target lesson").selectOption("a1-1-l01");
  await page
    .getByLabel("Intended situation and meaning")
    .fill("Greet a classmate.");
  await page
    .getByLabel("What changed from the original")
    .fill("Added an Arabic draft and context.");
  await page
    .getByLabel("Item rights and attribution notes")
    .fill("Check exact source attribution before using this item.");
}
test("full source library supports filters, pagination, preserved page text and correction revisions", async ({
  page,
}) => {
  const state = await setup(page);
  await page.goto("/admin/content/imports/deutsch-im-blick");
  await expect(page.getByRole("button", { name: /3951|3,951/ })).toBeVisible();
  await page
    .getByRole("combobox", { name: "Chapter", exact: true })
    .selectOption("1");
  await page.getByLabel("Vocabulary list").selectOption("core");
  await expect(
    page.getByRole("heading", { name: "Hallo!", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Load more source items" }).click();
  await expect(
    page.getByRole("heading", { name: "Danke!", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Inspect source" }).first().click();
  await page.getByText("Read original page 18", { exact: true }).click();
  await expect(
    page.getByText("Original page fixture: Hallo! Hello!", { exact: true }),
  ).toBeVisible();
  const before = await page.evaluate(() =>
    localStorage.getItem("deutsch-journey-v2"),
  );
  await fillCorrection(page);
  await page.getByRole("button", { name: "Back to source list" }).click();
  await expect(page.getByRole("dialog")).toContainText(
    "Discard unsaved corrections?",
  );
  await page.getByRole("button", { name: "Keep editing" }).click();
  await expect(page.getByLabel("Arabic meaning / instructions")).toHaveValue(
    "مرحبًا",
  );
  await page.getByRole("button", { name: "Save correction revision" }).click();
  await expect(
    page.getByText(
      "Correction revision saved. Reviews start fresh for this hash.",
    ),
  ).toBeVisible();
  expect(state.detail.item.payload).toEqual(sourcePayload);
  expect(state.detail.draft?.reviews).toEqual([]);
  expect(
    await page.evaluate(() => localStorage.getItem("deutsch-journey-v2")),
  ).toBe(before);
  await expect(
    page.getByRole("button", { name: "Export reviewed source bundle" }),
  ).toBeDisabled();
});
test("decisions bind to a specific revision, export requires all reviews, and edits reset evidence", async ({
  page,
}) => {
  const state = await setup(page);
  await page.goto("/admin/content/imports");
  await page.getByRole("button", { name: "Inspect source" }).click();
  await fillCorrection(page);
  await page.getByRole("button", { name: "Save correction revision" }).click();
  for (const category of ["language", "pedagogy", "arabic", "rights"]) {
    await page.getByLabel("Review area").selectOption(category);
    await page
      .getByRole("combobox", { name: "Decision", exact: true })
      .selectOption("approved");
    await page
      .getByLabel("Review evidence / reason")
      .fill("Synthetic browser review; no live database writes.");
    await page.getByRole("button", { name: "Record review" }).click();
    await expect(
      page.getByText("Review recorded for this exact draft."),
    ).toBeVisible();
  }
  await expect(
    page.getByRole("button", { name: "Export reviewed source bundle" }),
  ).toBeEnabled();
  const downloaded = page.waitForEvent("download");
  await page
    .getByRole("button", { name: "Export reviewed source bundle" })
    .click();
  expect((await downloaded).suggestedFilename()).toContain("draft-1.json");
  await page
    .getByRole("textbox", { name: "German", exact: true })
    .fill("Guten Tag!");
  await page.getByRole("button", { name: "Save correction revision" }).click();
  await expect.poll(() => state.detail.draft?.version).toBe(2);
  expect(state.detail.draft?.reviews).toEqual([]);
  await expect(
    page.getByRole("button", { name: "Export reviewed source bundle" }),
  ).toBeDisabled();
  state.signOut();
  await page.reload();
  await expect(
    page.getByRole("link", { name: "Continue with Google" }),
  ).toBeVisible();
  await expect(page.getByLabel("Arabic meaning / instructions")).toHaveCount(0);
});
test("failed loads and stale revisions recover without losing the form, and unauthorized accounts get no source list", async ({
  page,
}) => {
  await setup(page, { listFailure: true, saveFailure: true });
  await page.goto("/admin/content/imports");
  await expect(page.locator(".intake-message[role=alert]")).toContainText(
    "Source items could not load",
  );
  await page.getByRole("button", { name: "Reload sources" }).click();
  await page.getByRole("button", { name: "Inspect source" }).click();
  await fillCorrection(page);
  await page.getByRole("button", { name: "Save correction revision" }).click();
  await expect(page.locator(".intake-message[role=alert]")).toContainText(
    "source or draft changed",
  );
  await expect(page.getByLabel("Arabic meaning / instructions")).toHaveValue(
    "مرحبًا",
  );
  await page.getByRole("button", { name: "Reload this source item" }).click();
  await page.getByRole("button", { name: "Discard changes" }).click();
  await expect(page.getByLabel("Arabic meaning / instructions")).toHaveValue(
    "",
  );
  await page.getByRole("button", { name: "Back to source list" }).click();
  await page.getByLabel("Search German or English").fill("No match");
  await page.getByRole("button", { name: "Search sources" }).click();
  await expect(
    page.getByRole("heading", { name: "No matching source items" }),
  ).toBeVisible();
  await setup(page, { forbidden: true });
  await page.reload();
  await expect(page.locator(".intake-message[role=alert]")).toContainText(
    "does not have content access",
  );
  await expect(
    page.getByRole("button", { name: "Inspect source" }),
  ).toHaveCount(0);
});
test("source browser and RTL editor fit mobile and desktop in both themes", async ({
  page,
}) => {
  await setup(page);
  await page.goto("/admin/content/imports");
  await expect(
    page.getByRole("button", { name: "Inspect source" }),
  ).toBeVisible();
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
      let audit = await new AxeBuilder({ page })
        .include(".intake-studio")
        .analyze();
      expect(
        audit.violations.filter((v) =>
          ["serious", "critical"].includes(v.impact ?? ""),
        ),
      ).toEqual([]);
      await page.getByRole("button", { name: "Inspect source" }).click();
      await expect(
        page.locator('textarea[lang="ar"][dir="rtl"]'),
      ).toBeVisible();
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      ).toBe(true);
      audit = await new AxeBuilder({ page })
        .include(".intake-studio")
        .analyze();
      expect(
        audit.violations.filter((v) =>
          ["serious", "critical"].includes(v.impact ?? ""),
        ),
      ).toEqual([]);
      if (width !== 320)
        await page.screenshot({
          path: `artifacts/source-editor-${width}-${theme}.png`,
          fullPage: true,
        });
      await page.getByRole("button", { name: "Back to source list" }).click();
    }
});
