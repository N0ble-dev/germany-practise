import { test, expect } from "./fixtures";
import type { Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import type { LibraryItem } from "../../src/lib/library/model";
const credit = {
  label: "Local source fixture",
  url: "https://example.test/source",
  license: "CC-BY-4.0",
  licenseUrl: "https://creativecommons.org/licenses/by/4.0/",
  attribution: "Synthetic source author; browser test only.",
};
const word: LibraryItem = {
  id: 101,
  kind: "vocabulary",
  key: "word",
  collection: "deutsch_im_blick",
  german: "das Fernweh",
  english: "longing to travel",
  topic: "Travel",
  chapter: 1,
  page: 18,
  listType: "core",
  article: "das",
  headword: "Fernweh",
  plural: null,
  text: null,
  url: null,
  source: credit,
};
const sentence: LibraryItem = {
  ...word,
  id: 201,
  kind: "sentence_pair",
  collection: "tatoeba",
  german: "Ich arbeite in Berlin.",
  english: "I work in Berlin.",
  chapter: null,
  article: null,
  headword: null,
  source: {
    ...credit,
    attribution: "Synthetic German author & English author / Tatoeba",
  },
};
const chapter: LibraryItem = {
  ...word,
  id: 301,
  kind: "chapter",
  key: "1",
  german: "Ankunft in Würzburg",
  english: "",
  article: null,
  headword: null,
  text: "Original supplied chapter outline.",
};
const pageItem: LibraryItem = {
  ...word,
  id: 401,
  kind: "source_page",
  german: "Original supplied page text.",
  english: "",
  article: null,
  headword: null,
  text: "Original supplied page text.\nRead the words, then use them in your own life.",
};
async function setup(page: Page, fail = false) {
  let failure = fail;
  await page.route("**/api/library*", (route) => {
    if (failure) {
      failure = false;
      return route.fulfill({
        status: 503,
        json: { error: "The library could not load. Try again shortly." },
      });
    }
    const params = new URL(route.request().url()).searchParams;
    if (!params.size)
      return route.fulfill({
        json: {
          available: true,
          words: 2296,
          sentences: 331254,
          chapters: [chapter],
          collections: [
            {
              id: "fixture-book",
              provider: "deutsch_im_blick",
              title: "Deutsch im Blick · Supplied book",
              total: 3951,
              source: credit,
              counts: {
                chapter: 10,
                vocabulary: 2296,
                source_page: 484,
                activity: 316,
                grammar_reference: 76,
              },
            },
            {
              id: "fixture-sentences",
              provider: "tatoeba",
              title: "Full sentence collection",
              total: 331254,
              source: credit,
              counts: { sentence_pair: 331254 },
            },
          ],
        },
      });
    if (params.has("item"))
      return route.fulfill({
        json:
          [word, sentence, chapter, pageItem].find(
            (item) => item.id === Number(params.get("item")),
          ) ?? word,
      });
    if (params.get("q") === "no match")
      return route.fulfill({ json: { items: [], nextCursor: null } });
    if (params.has("cursor"))
      return route.fulfill({
        json: {
          items: [
            {
              ...word,
              id: 102,
              key: "second",
              german: "die Aussicht",
              headword: "Aussicht",
              article: "die",
              english: "view",
            },
          ],
          nextCursor: null,
        },
      });
    const chosen =
      params.get("kind") === "chapter"
        ? chapter
        : params.get("kind") === "source_page"
          ? pageItem
          : params.get("collection") === "tatoeba"
            ? sentence
            : word;
    return route.fulfill({
      json: {
        items: [chosen],
        nextCursor: chosen.kind === "vocabulary" ? 101 : null,
      },
    });
  });
}
test("learners open book chapters, add source vocabulary with credits, and paginate the full library", async ({
  page,
}) => {
  await setup(page);
  await page.goto("/library");
  await expect(page.getByText("331,254", { exact: true })).toBeVisible();
  await page
    .getByRole("navigation", { name: "Explore library collections" })
    .getByRole("button", { name: "Book chapters" })
    .click();
  await page.getByRole("button", { name: "Study chapter words" }).click();
  await expect(
    page.getByRole("combobox", { name: "Chapter", exact: true }),
  ).toHaveValue("1");
  await page.getByRole("button", { name: "Add word", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Kept", exact: true }),
  ).toBeDisabled();
  const state = await page.evaluate(() =>
    JSON.parse(localStorage.getItem("deutsch-journey-v2")!),
  );
  expect(
    state.words.find((item: { id: string }) => item.id === "library-101").source
      .attribution,
  ).toBe(credit.attribution);
  expect(state.completedLessons).toEqual([]);
  await page.getByRole("button", { name: "Load more content" }).click();
  await expect(
    page.getByRole("heading", { name: "die Aussicht" }),
  ).toBeVisible();
  await page.getByRole("link", { name: "My vocabulary", exact: true }).click();
  await page
    .getByRole("combobox", { name: "Filter vocabulary" })
    .selectOption("library");
  await expect(
    page.getByRole("heading", { name: "das Fernweh" }),
  ).toBeVisible();
  await expect(
    page.getByText("Content library", { exact: true }).last(),
  ).toBeVisible();
});
test("source sentences support recall, private bookmarking with attribution, and profile PDF export", async ({
  page,
}) => {
  await setup(page);
  await page.goto("/library?collection=tatoeba&kind=sentence_pair");
  await page.getByRole("button", { name: /Practise these 1/ }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByRole("button", { name: "Reveal meaning" }).click();
  await expect(
    dialog.getByText(sentence.english, { exact: true }),
  ).toBeVisible();
  await dialog.getByLabel("Type the German from memory").fill(sentence.german);
  await dialog.getByRole("button", { name: "Check recall" }).click();
  await expect(dialog.getByRole("status")).toHaveText(
    "Your text matches the supplied German.",
  );
  await dialog.getByRole("button", { name: "Keep this source" }).click();
  await dialog.getByRole("button", { name: "Next source" }).click();
  await dialog.getByRole("button", { name: "Back to the library" }).click();
  const state = await page.evaluate(() =>
    JSON.parse(localStorage.getItem("deutsch-journey-v2")!),
  );
  expect(state.libraryBookmarks[0].source.attribution).toBe(
    sentence.source.attribution,
  );
  expect(state.xp).toBe(0);
  expect(state.savedSentences).toEqual([]);
  await page.goto("/profile");
  await expect(
    page.getByRole("heading", { name: "My saved library sentences" }),
  ).toBeVisible();
  await expect(page.getByText(sentence.german, { exact: true })).toBeVisible();
  await page
    .getByRole("button", { name: "Export as PDF", exact: true })
    .click();
  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: "Download PDF", exact: true }).click();
  expect((await download).suggestedFilename()).toMatch(/\.pdf$/);
});
test("book pages are readable and missing results recover with useful filters", async ({
  page,
}) => {
  await setup(page, true);
  await page.goto("/library?kind=source_page");
  await expect(
    page.getByRole("alert").filter({ hasText: "library could not load" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Try again", exact: true }).click();
  await page
    .getByRole("button", { name: "Read & explore", exact: true })
    .click();
  await expect(page.getByRole("dialog").locator("pre")).toContainText(
    "Original supplied page text.",
  );
  await page.getByRole("button", { name: "Close dialog", exact: true }).click();
  await page.getByLabel("Search German or English").fill("no match");
  await page.getByRole("button", { name: "Search library" }).click();
  await expect(
    page.getByRole("heading", { name: "No matching content" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Clear filters" }).click();
  await expect(
    page.getByRole("button", { name: "Read & explore" }),
  ).toBeVisible();
});
test("the supplied-content library is usable on small screens and accessible in both themes", async ({
  page,
}) => {
  await setup(page);
  await page.goto("/library");
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
        .include(".content-library")
        .analyze();
      expect(
        audit.violations.filter((v) =>
          ["serious", "critical"].includes(v.impact ?? ""),
        ),
      ).toEqual([]);
      await page.getByRole("button", { name: "Read & explore" }).click();
      const detailAudit = await new AxeBuilder({ page })
        .include('[role="dialog"]')
        .analyze();
      expect(
        detailAudit.violations.filter((v) =>
          ["serious", "critical"].includes(v.impact ?? ""),
        ),
      ).toEqual([]);
      if (width !== 320)
        await page.screenshot({
          path: `artifacts/content-library-${width}-${theme}.png`,
          fullPage: true,
        });
      await page
        .getByRole("button", { name: "Close dialog", exact: true })
        .click();
    }
});
