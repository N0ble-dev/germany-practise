import { test, expect } from "./fixtures";
import AxeBuilder from "@axe-core/playwright";

test.use({ reducedMotion: "reduce" });

test("life choices persist, personalize practice, and save sentences without duplicates", async ({
  page,
}) => {
  await page.goto("/lessons");
  const life = page.locator(".personal-life");
  await life.getByRole("button", { name: "Make it mine", exact: true }).click();
  await life.getByRole("button", { name: /Grow my career/ }).click();
  await life.getByLabel("My job or studies").selectOption("Ärztin");
  await life.getByLabel("City", { exact: true }).fill("Berlin");
  await life.getByLabel("Country", { exact: true }).fill("Ägypten");
  await life
    .getByLabel("Languages I speak", { exact: true })
    .fill("Arabisch und Englisch");
  await life.getByRole("button", { name: "Cooking", exact: true }).click();
  await life.getByRole("button", { name: "Music", exact: true }).click();
  await life.getByRole("button", { name: "At a café", exact: true }).click();
  await life
    .getByRole("button", { name: "Getting around", exact: true })
    .click();
  await expect(life.locator(".life-introduction")).toContainText(
    "Ich bin Ärztin.",
  );
  await expect(life.locator(".life-introduction")).toContainText(
    "Ich höre gern Musik.",
  );
  await life
    .getByRole("button", { name: "Save my learning details", exact: true })
    .click();
  await expect(life.getByRole("link", { name: /At a café/ })).toHaveAttribute(
    "href",
    "/lessons/9?step=patterns",
  );
  await page.reload();
  await expect(life.locator(".life-introduction")).toContainText(
    "Ich bin Ärztin.",
  );
  await life.screenshot({ path: "artifacts/personal-life-summary.png" });
  await life
    .getByRole("button", { name: "Keep my sentences", exact: true })
    .click();
  await expect(
    life.getByRole("button", { name: "Sentences saved", exact: true }),
  ).toBeDisabled();
  const saved = await page.evaluate(() =>
    JSON.parse(localStorage.getItem("deutsch-journey-v2")!),
  );
  expect(saved.personalProfile.situations).toEqual(["cafe", "transport"]);
  expect(saved.savedSentences).toContain("Ich koche gern.");
  expect(new Set(saved.savedSentences).size).toBe(saved.savedSentences.length);
  await page.goto("/lessons/2?step=patterns");
  await expect(page.locator(".pattern-list")).toContainText("Ich bin Ärztin.");
  await page.goto("/lessons/7?step=patterns");
  await expect(page.locator(".pattern-list")).toContainText(
    "Ich höre gern Musik.",
  );
  await page.goto("/profile");
  await page
    .locator(".personal-life")
    .getByRole("button", { name: "Edit my preferences", exact: true })
    .click();
  await expect(page.getByLabel("My job or studies")).toHaveValue("Ärztin");
  await expect(
    page.getByRole("button", { name: "Music", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  await page.getByLabel("My job or studies").selectOption("custom");
  await page.getByLabel("Profession in German").fill("Fotografin");
  await page
    .getByRole("button", { name: "Save my learning details", exact: true })
    .click();
  await page.reload();
  await expect(page.locator(".life-introduction")).toContainText(
    "Ich bin Fotografin.",
  );
  const changed = await page.evaluate(() =>
    JSON.parse(localStorage.getItem("deutsch-journey-v2")!),
  );
  expect(changed.personalProfile.interests).toEqual(["cooking", "music"]);
  expect(changed.personalProfile.motivation).toBe("career");
});

test("Today and practice hints use saved life choices and keep personal sentences", async ({
  page,
}) => {
  test.setTimeout(120_000);
  await page.goto("/");
  const card = page.locator(".life-today");
  await expect(
    card.getByRole("heading", { name: "German for your own life." }),
  ).toBeVisible();
  await expect(
    card.getByRole("link", { name: "Make it mine", exact: true }),
  ).toHaveAttribute("href", "/lessons#personal-life");
  await page.evaluate(() => {
    const state = JSON.parse(localStorage.getItem("deutsch-journey-v2")!);
    state.name = "Sara";
    state.personalProfile = {
      country: "Ägypten",
      city: "Berlin",
      profession: "Ärztin",
      languages: "Arabisch und Englisch",
      motivation: "career",
      interests: ["music"],
      situations: ["cafe", "transport"],
    };
    for (const key of ["deutsch-journey-v2", "deutsch-journey-v2:guest"])
      localStorage.setItem(key, JSON.stringify(state));
  });
  await page.reload();
  await expect(card).toContainText("Ich bin Ärztin.");
  await expect(card).toContainText("Grow my career");
  await expect(
    card.getByRole("link", { name: "Use it in a lesson", exact: true }),
  ).toHaveAttribute("href", "/lessons/2?step=patterns");
  for (const width of [1440, 390, 320]) {
    await page.setViewportSize({ width, height: 1000 });
    for (const theme of ["light", "dark"]) {
      await page.evaluate((value) => {
        document.documentElement.dataset.theme = value;
      }, theme);
      await page.waitForTimeout(250);
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= window.innerWidth,
        ),
      ).toBe(true);
      const scan = await new AxeBuilder({ page })
        .include(".life-today")
        .analyze();
      expect(
        scan.violations.filter((item) =>
          ["serious", "critical"].includes(item.impact ?? ""),
        ),
      ).toEqual([]);
      if (width !== 320)
        await card.screenshot({
          path: `artifacts/personal-life-today-${width}-${theme}.png`,
        });
    }
  }
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto("/vocabulary");
  await expect(page.locator(".life-hint")).toContainText("At a café");
  await expect(page.locator(".life-hint").getByRole("link")).toHaveAttribute(
    "href",
    "/lessons/9?step=words",
  );
  await page.goto("/sentences");
  const hint = page.locator(".life-hint");
  await expect(hint).toContainText("Ich bin Ärztin.");
  await hint
    .getByRole("button", { name: "Keep this sentence", exact: true })
    .click();
  await expect(
    hint.getByRole("button", { name: "Sentence saved", exact: true }),
  ).toBeDisabled();
  await expect(page.locator(".saved-sentences")).toContainText(
    "Ich bin Ärztin.",
  );
  for (const route of [
    "/sentences",
    "/vocabulary",
    "/speaking",
    "/listening",
  ]) {
    await page.goto(route);
    await expect(page.locator(".life-hint")).toBeVisible();
    if (["/speaking", "/listening"].includes(route)) {
      await expect(page.locator(".practice-side .life-hint")).toContainText(
        "After this exercise",
      );
    }
    for (const width of [1440, 320]) {
      await page.setViewportSize({ width, height: 1000 });
      for (const theme of ["light", "dark"]) {
        await page.evaluate((value) => {
          document.documentElement.dataset.theme = value;
        }, theme);
        await page.waitForTimeout(250);
        const scan = await new AxeBuilder({ page })
          .include(".life-hint")
          .analyze();
        expect(
          scan.violations.filter((item) =>
            ["serious", "critical"].includes(item.impact ?? ""),
          ),
        ).toEqual([]);
        expect(
          await page.evaluate(
            () => document.documentElement.scrollWidth <= window.innerWidth,
          ),
        ).toBe(true);
      }
    }
  }
});

test("the editor supports keyboard cancellation, mobile layouts, and both themes", async ({
  page,
}) => {
  await page.goto("/lessons");
  const life = page.locator(".personal-life");
  await life.getByRole("button", { name: "Make it mine", exact: true }).click();
  await page.getByLabel("City", { exact: true }).fill("Berlin");
  await life.getByRole("button", { name: "Cancel", exact: true }).click();
  await expect(
    life.getByRole("button", { name: "Make it mine", exact: true }),
  ).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(page.getByLabel("City", { exact: true })).toHaveValue("");
  await life.getByRole("button", { name: /Make Germany home/ }).click();
  await life.getByRole("button", { name: "Coffee", exact: true }).click();
  for (const width of [1440, 390, 320]) {
    await page.setViewportSize({ width, height: 1000 });
    for (const theme of ["light", "dark"]) {
      await page.evaluate((value) => {
        document.documentElement.dataset.theme = value;
      }, theme);
      await page.waitForTimeout(250);
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= window.innerWidth,
        ),
      ).toBe(true);
      const results = await new AxeBuilder({ page })
        .include(".personal-life")
        .analyze();
      expect(
        results.violations.filter((item) =>
          ["serious", "critical"].includes(item.impact ?? ""),
        ),
      ).toEqual([]);
      if (width !== 320) {
        await life.locator(".life-heading").scrollIntoViewIfNeeded();
        await page.screenshot({
          path: `artifacts/personal-life-editor-${width}-${theme}.png`,
        });
      }
    }
  }
});
