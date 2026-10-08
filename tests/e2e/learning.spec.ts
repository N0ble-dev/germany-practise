import { expect, test } from "./fixtures";
import AxeBuilder from "@axe-core/playwright";
test("a learner adds a word, reviews it, and keeps progress after reloading", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/");
  await expect(page.getByRole("heading", { name: /Guten/ })).toBeVisible();
  await page.getByRole("link", { name: "Vocabulary", exact: true }).click();
  await page.getByRole("button", { name: "Add a word", exact: true }).click();
  await page.getByRole("textbox", { name: "German word" }).fill("Fenster");
  await page.getByRole("textbox", { name: "English meaning" }).fill("window");
  await page
    .getByRole("combobox", { name: "Article", exact: true })
    .selectOption("das");
  await page.getByRole("button", { name: "Add to my collection" }).click();
  await expect(
    page.getByRole("heading", { name: "das Fenster" }),
  ).toBeVisible();
  await page.reload();
  await expect(
    page.getByRole("heading", { name: "das Fenster" }),
  ).toBeVisible();
  await page.getByRole("link", { name: /Flashcards/ }).click();
  await page.getByRole("button", { name: "Start my review" }).click();
  await page.getByRole("button", { name: "Show the meaning" }).click();
  await page.getByRole("button", { name: /^Good/ }).click();
  const saved = await page.evaluate(() =>
    JSON.parse(localStorage.getItem("deutsch-journey-v2")!),
  );
  expect(
    saved.activities.some((a: { kind: string }) => a.kind === "review"),
  ).toBe(true);
  expect(
    saved.words.some(
      (w: { reviews: number; interval: number }) =>
        w.reviews === 1 && w.interval === 1,
    ),
  ).toBe(true);
  expect(errors).toEqual([]);
});
test("grammar and real-life practice provide feedback and credit once per answer", async ({
  page,
}) => {
  await page.goto("/grammar");
  await page.getByRole("button", { name: "heiße", exact: true }).click();
  await expect(
    page.getByRole("status").filter({ hasText: "Richtig" }),
  ).toBeVisible();
  await page
    .getByRole("link", { name: "Practice this chapter in the book journey" })
    .click();
  await expect(
    page.getByRole("button", { name: "Complete this chapter", exact: true }),
  ).toBeDisabled();
  await page.goto("/germany");
  await page
    .getByRole("button", { name: "Zwei Brötchen, bitte.", exact: true })
    .click();
  await expect(
    page.getByText("You found the words.", { exact: false }),
  ).toBeVisible();
  await page.goto("/progress");
  await expect(page.getByText("0/12", { exact: true })).toBeVisible();
});
test("mobile navigation, dark theme, and all practice routes work", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await expect(page.getByRole("heading", { name: /Guten/ })).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  await page.getByRole("button", { name: "Open navigation" }).click();
  await page.getByRole("link", { name: "Vocabulary", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "A growing collection of German." }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Switch to dark theme" }).click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  for (const route of [
    "/listening",
    "/speaking",
    "/sentences",
    "/games",
    "/grammar",
    "/profile",
  ]) {
    await page.goto(route);
    await expect(page.locator("main h1")).toBeVisible();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    ).toBe(true);
  }
});
test("imports legacy storage and handles empty or damaged collections safely", async ({
  page,
}) => {
  // Start with legacy storage only; guest onboarding created a v2 save in the fixture.
  await page.evaluate(() => {
    localStorage.removeItem("deutsch-journey-v2");
    localStorage.removeItem("deutsch-journey-v2:guest");
    localStorage.removeItem("deutsch-journey-v2:owner");
  });
  await page.addInitScript(() => {
    localStorage.setItem(
      "dj_words",
      JSON.stringify([
        {
          id: 1,
          german: "Apfel",
          meaning: "apple",
          type: "noun",
          article: "der",
          topic: "Food",
          hint: "Red fruit",
        },
      ]),
    );
    localStorage.setItem("dj_xp", "75");
  });
  await page.goto("/vocabulary");
  await expect(page.getByRole("heading", { name: "der Apfel" })).toBeVisible();
  const state = await page.evaluate(() =>
    JSON.parse(localStorage.getItem("deutsch-journey-v2")!),
  );
  expect(state.xp).toBe(75);
  await page.evaluate(() => {
    const s = JSON.parse(localStorage.getItem("deutsch-journey-v2")!);
    s.words = [];
    localStorage.setItem("deutsch-journey-v2", JSON.stringify(s));
    localStorage.setItem("deutsch-journey-v2:guest", JSON.stringify(s));
  });
  await page.goto("/review");
  await expect(
    page.getByRole("button", { name: "Practice any time" }),
  ).toBeDisabled();
  await page.goto("/sentences");
  await expect(
    page.getByRole("heading", { name: "Start with a word." }),
  ).toBeVisible();
  await page.evaluate(() => {
    localStorage.setItem("deutsch-journey-v2", "broken");
    localStorage.setItem("deutsch-journey-v2:guest", "broken");
  });
  await page.reload();
  await expect(
    page.getByRole("alert").filter({ hasText: "original is preserved" }),
  ).toBeVisible();
  expect(
    await page.evaluate(() => localStorage.getItem("deutsch-journey-v2")),
  ).toBe("broken");
});
test("dashboard has no serious accessibility violations and captures responsive previews", async ({
  page,
}) => {
  await page.goto("/");
  await expect(page.locator("main h1")).toBeVisible();
  const result = await new AxeBuilder({ page }).analyze();
  expect(
    result.violations.filter(
      (v) => v.impact === "serious" || v.impact === "critical",
    ),
  ).toEqual([]);
  await page.screenshot({
    path: "test-results/dashboard-desktop.png",
    fullPage: true,
  });
  await page.setViewportSize({ width: 390, height: 844 });
  const mobileResult = await new AxeBuilder({ page }).analyze();
  expect(
    mobileResult.violations.filter(
      (v) => v.impact === "serious" || v.impact === "critical",
    ),
  ).toEqual([]);
  await page.screenshot({
    path: "test-results/dashboard-mobile.png",
    fullPage: true,
  });
  await page.getByRole("button", { name: "Switch to dark theme" }).click();
  const darkResult = await new AxeBuilder({ page }).analyze();
  expect(
    darkResult.violations.filter(
      (v) => v.impact === "serious" || v.impact === "critical",
    ),
  ).toEqual([]);
});
test("cloud endpoints deny unauthenticated access or explain missing configuration", async ({
  request,
}) => {
  const progress = await request.get("/api/progress");
  expect([401, 503]).toContain(progress.status());
  const session = await request.get("/api/auth/get-session");
  // The managed proxy returns 502 when its configured upstream is unreachable.
  expect([200, 502, 503]).toContain(session.status());
  if (session.ok()) expect(await session.json()).toBeNull();
  const crossOrigin = await request.put("/api/progress", {
    headers: { Origin: "https://example.com" },
    data: {},
  });
  expect([403, 503]).toContain(crossOrigin.status());
});
