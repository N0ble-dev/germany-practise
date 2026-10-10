import AxeBuilder from "@axe-core/playwright";
import { test, expect } from "./fixtures";
import type { LearningState } from "../../src/lib/learning";

test.beforeEach(async ({ page }) => {
  await page.evaluate(() => {
    const state = JSON.parse(
      localStorage.getItem("deutsch-journey-v2")!,
    ) as LearningState;
    state.words = state.words
      .filter((word) => word.type === "noun")
      .slice(0, 2)
      .map((word) => ({
        ...word,
        due: "2000-01-01T00:00:00.000Z",
        reviews: 0,
        interval: 0,
        mistakes: 0,
      }));
    state.activities = [];
    state.xp = 0;
    const saved = JSON.stringify(state);
    localStorage.setItem("deutsch-journey-v2", saved);
    localStorage.setItem("deutsch-journey-v2:guest", saved);
  });
  await page.goto("/review");
});

test("rating advances the stack and Again preserves the repeat queue and XP", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.getByRole("button", { name: "Start my review" }).click();
  await expect(page.getByText("Word 1 of 2", { exact: true })).toBeVisible();
  await page
    .getByRole("region", { name: "Flashcard stack", exact: true })
    .focus();
  await page.keyboard.press("ArrowRight");
  await expect(page.getByText("Word 1 of 2", { exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: /^Good/ })).toHaveCount(0);
  for (const [position, rating] of [
    ["Word 1 of 2", "Again"],
    ["Word 2 of 3", "Hard"],
    ["Word 3 of 3", "Easy"],
  ]) {
    await expect(page.getByText(position, { exact: true })).toBeVisible();
    await expect(
      page.getByRole("region", { name: "Current flashcard", exact: true }),
    ).toHaveCount(1);
    await page.getByRole("button", { name: "Show the meaning" }).click();
    await page.getByRole("button", { name: new RegExp(`^${rating}`) }).click();
  }
  await expect(
    page.getByRole("heading", { name: "You showed up for your German." }),
  ).toBeVisible();
  const saved = await page.evaluate(
    () =>
      JSON.parse(localStorage.getItem("deutsch-journey-v2")!) as LearningState,
  );
  expect(
    saved.activities.filter((activity) => activity.kind === "review"),
  ).toHaveLength(3);
  expect(saved.words.map((word) => word.reviews)).toEqual([2, 1]);
  expect(saved.xp).toBe(5);
  expect(errors).toEqual([]);
});

test("noun article cards still require correct recall before Good or Easy", async ({
  page,
}) => {
  await page
    .getByRole("combobox", { name: "Card direction" })
    .selectOption("article");
  await page.getByRole("button", { name: "Start my review" }).click();
  await expect(
    page.getByRole("button", { name: "Listen to this word" }),
  ).toBeDisabled();
  await page.getByRole("textbox", { name: "Noun article" }).fill("wrong");
  await page.getByRole("button", { name: "Check my recall" }).click();
  await expect(page.getByRole("button", { name: /^Good/ })).toBeDisabled();
  await expect(page.getByRole("button", { name: /^Easy/ })).toBeDisabled();
  await page.getByRole("button", { name: /^Again/ }).click();
  await expect(page.getByText("Word 2 of 3", { exact: true })).toBeVisible();
  await expect(page.getByRole("textbox", { name: "Noun article" })).toHaveValue(
    "",
  );
});

test.describe("small-screen flashcards with reduced motion", () => {
  test.use({ reducedMotion: "reduce" });
  test("long examples fit the stack with usable touch targets in both themes", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 320, height: 950 });
    await page.evaluate(() => {
      const state = JSON.parse(
        localStorage.getItem("deutsch-journey-v2")!,
      ) as LearningState;
      state.words[0].german = "Donaudampfschifffahrtsgesellschaft";
      state.words[0].arabic =
        "أتعلم الألمانية كل يوم لأعيش في ألمانيا. ".repeat(4);
      state.words[0].example =
        "Ich lerne jeden Tag ein bisschen Deutsch und freue mich auf mein Leben in Deutschland. ".repeat(
          4,
        );
      state.words[0].hint =
        "Remember this word with a real example from your own life. ".repeat(5);
      const saved = JSON.stringify(state);
      localStorage.setItem("deutsch-journey-v2", saved);
      localStorage.setItem("deutsch-journey-v2:guest", saved);
    });
    await page.reload();
    await page.getByRole("button", { name: "Start my review" }).click();
    const reveal = page.getByRole("button", { name: "Show the meaning" });
    await expect(async () =>
      expect((await reveal.boundingBox())!.height).toBeGreaterThanOrEqual(44),
    ).toPass();
    await reveal.click();
    const card = page.locator(".review-current-card");
    await expect
      .poll(() =>
        card.evaluate(
          (element) => element.scrollHeight <= element.clientHeight + 1,
        ),
      )
      .toBe(true);
    for (const theme of ["light", "dark"]) {
      const toggle = page.getByRole("button", {
        name: `Switch to ${theme} theme`,
      });
      if (await toggle.count()) await toggle.click();
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      ).toBe(true);
      const scan = await new AxeBuilder({ page })
        .include(".review-workspace")
        .analyze();
      expect(
        scan.violations.filter(
          (violation) =>
            violation.impact === "serious" || violation.impact === "critical",
        ),
      ).toEqual([]);
    }
    await page.getByRole("button", { name: /^Good/ }).click();
    await expect(page.getByText("Word 2 of 2", { exact: true })).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Show the meaning" }),
    ).toBeVisible();
  });
});
