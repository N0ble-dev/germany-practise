import { expect, test } from "./fixtures";
import AxeBuilder from "@axe-core/playwright";
import { bookLessons } from "../../src/lib/journey-content";
import { personalize } from "../../src/lib/journey-content";

test("sentence building, number recall, guided conversation, and microphone fallback work", async ({
  page,
}) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, "mediaDevices", {
      configurable: true,
      value: {
        getUserMedia: async () => {
          throw new DOMException("Permission denied", "NotAllowedError");
        },
      },
    });
  });
  await page.goto("/lessons/1?step=build");
  await expect(page.locator("main h1")).toBeVisible();
  const state = await page.evaluate(() =>
    JSON.parse(localStorage.getItem("deutsch-journey-v2")!),
  );
  for (const [index, pattern] of bookLessons[0].patterns
    .slice(0, 3)
    .entries()) {
    const sentence = personalize(pattern, state.name, state.personalProfile);
    for (const token of sentence.replace(/[.!?]$/u, "").split(/\s+/))
      await page
        .locator(".token-bank")
        .getByRole("button", { name: token, exact: true })
        .click();
    await page.getByRole("button", { name: "Check the word order" }).click();
    if (index < 2)
      await page
        .getByRole("button", { name: "Build the next sentence" })
        .click();
  }
  await page
    .getByRole("button", { name: "Continue to Speak", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Record up to 20 seconds", exact: true })
    .click();
  await expect(
    page
      .getByRole("alert")
      .filter({ hasText: "Microphone permission was denied" }),
  ).toBeVisible();
  await page.goto("/lessons/1?step=chat");
  await page
    .getByRole("button", {
      name: bookLessons[0].dialogue[1].german,
      exact: true,
    })
    .click();
  await expect(
    page.getByRole("button", { name: "Continue to Germany situation" }),
  ).toBeEnabled();
  await page
    .getByRole("button", { name: "Free response", exact: true })
    .click();
  await page
    .getByRole("textbox", { name: "Your reply in German" })
    .fill("Ich heiße Sara. Freut mich.");
  await page.getByRole("button", { name: "Try my reply" }).click();
  await expect(
    page.getByRole("status").filter({ hasText: "model reply" }),
  ).toBeVisible();
  await page.goto("/lessons/2?step=words");
  await page
    .getByText("Numbers 0–100: age, phone numbers, and prices", { exact: true })
    .click();
  await page
    .getByRole("textbox", { name: "Your number in German" })
    .fill("null");
  await page.getByRole("button", { name: "Check this number" }).click();
  await expect(
    page.getByRole("status").filter({ hasText: "You recalled it." }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Next number" }).click();
  await expect(
    page.getByRole("heading", { name: "Say 7 in German" }),
  ).toBeVisible();
});

test("a learner recalls, listens, speaks, and passes the first chapter's life mission", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/lessons");
  await expect(
    page.getByRole("heading", { name: "Your book. Your everyday German." }),
  ).toBeVisible();
  expect(await page.locator(".book-module").count()).toBe(4);
  expect(await page.locator(".book-chapter").count()).toBe(12);
  await page.goto("/lessons/1?step=words");
  await page
    .getByRole("button", { name: "Add lesson words to my collection" })
    .click();
  const collection = await page.evaluate(
    () => JSON.parse(localStorage.getItem("deutsch-journey-v2")!).words.length,
  );
  await page
    .getByRole("button", { name: "All core words are in my collection" })
    .click();
  expect(
    await page.evaluate(
      () =>
        JSON.parse(localStorage.getItem("deutsch-journey-v2")!).words.length,
    ),
  ).toBe(collection);
  await page
    .getByRole("button", { name: "Continue to Sound & rhythm" })
    .click();
  await expect(
    page.getByRole("heading", { name: "Sound & rhythm", exact: true }),
  ).toBeVisible();
  await page.reload();
  await expect(
    page.getByRole("heading", { name: "Sound & rhythm", exact: true }),
  ).toBeVisible();
  await page.goto("/lessons/1?step=mission");
  await page.getByRole("textbox", { name: "Your own German" }).fill("Hallo!");
  await page.getByRole("button", { name: "Check my life task" }).click();
  await expect(page.getByText(/You covered 1 of/)).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Complete this chapter", exact: true }),
  ).toBeDisabled();
  await page
    .getByRole("textbox", { name: "Your own German" })
    .fill(
      "Hallo! Ich heiße Nabil. Ich komme aus Ägypten. Ich wohne in Alexandria. Mir geht's gut. Wie heißt du? Tschüss!",
    );
  await page.getByRole("button", { name: "Check my life task" }).click();
  await expect(
    page.getByRole("button", { name: "Life mission passed", exact: true }),
  ).toBeDisabled();
  await expect(
    page.getByRole("button", { name: "Complete this chapter", exact: true }),
  ).toBeDisabled();
  await page.goto("/lessons/1?step=grammar");
  for (const question of bookLessons[0].grammar) {
    await page
      .getByRole("button", {
        name: question.options[question.answer],
        exact: true,
      })
      .click();
    await page
      .getByRole("button", { name: /Next question|See my result/ })
      .click();
  }
  await page.goto("/lessons/1?step=listen");
  await page
    .getByRole("checkbox", {
      name: "I listened using my textbook audio or a study partner.",
    })
    .check();
  for (const question of bookLessons[0].listening) {
    await page
      .getByRole("button", {
        name: question.options[question.answer],
        exact: true,
      })
      .click();
    await page
      .getByRole("button", { name: /Next question|See my result/ })
      .click();
  }
  await page.goto("/lessons/1?step=speak");
  await expect(
    page.locator(".speaking-self-check input").first(),
  ).toBeVisible();
  for (const checkbox of await page.locator(".speaking-self-check input").all())
    await checkbox.check();
  await page
    .getByRole("button", { name: "Save my speaking self-check" })
    .click();
  await page.goto("/lessons/1?step=review");
  for (const word of bookLessons[0].words.slice(0, 10)) {
    await page
      .getByRole("textbox", { name: /Recall the German/ })
      .fill([word.article, word.german].filter(Boolean).join(" "));
    await page
      .getByRole("button", { name: "Check my recall", exact: true })
      .click();
    await page
      .getByRole("button", { name: /Next word|See my recall result/ })
      .click();
  }
  await expect(
    page.getByText("100% vocabulary recalled", { exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Complete this chapter", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Lesson completed", exact: true }),
  ).toBeDisabled();
  const saved = await page.evaluate(() =>
    JSON.parse(localStorage.getItem("deutsch-journey-v2")!),
  );
  expect(saved.journey.lessons[1].missionPassed).toBe(true);
  expect(saved.journey.lessons[1].speakingMethod).toBe("self-check");
  expect(saved.currentLesson).toBe(2);
  expect(saved.journey.lessons[1].completedAt).toBeTruthy();
  await page.reload();
  await expect(
    page.getByRole("button", { name: "Lesson completed", exact: true }),
  ).toBeDisabled();
  expect(
    await page.evaluate(
      () => JSON.parse(localStorage.getItem("deutsch-journey-v2")!).xp,
    ),
  ).toBe(saved.xp);
  await page.goto("/progress");
  await expect(page.getByText("1/12", { exact: true })).toBeVisible();
  expect(errors).toEqual([]);
});
test("module responses persist, cover mixed tasks, and the final challenge combines all lessons", async ({
  page,
}) => {
  await page.goto("/lessons/checkpoint/1");
  await page
    .getByRole("textbox", { name: "Your German, in your own words" })
    .fill(
      "Hallo! Ich heiße Sara. Ich komme aus Marokko. Ich wohne in Rabat. Ich bin Lehrerin von Beruf. Meine Mutter heißt Lina. Ich spreche Arabisch und Deutsch. Wie heißt du? Woher kommst du? Tschüss!",
    );
  await page.getByRole("button", { name: "Check my module challenge" }).click();
  await expect(
    page.getByText("8 of 8 communication tasks covered.", { exact: false }),
  ).toBeVisible();
  await page.reload();
  await expect(page.getByText("Tasks covered", { exact: true })).toBeVisible();
  await expect(
    page.getByRole("textbox", { name: "Your German, in your own words" }),
  ).toHaveValue(/Sara/);
  await page.goto("/lessons/checkpoint/4");
  await expect(
    page.getByRole("heading", { name: "One day in Germany", exact: true }),
  ).toBeVisible();
  expect(
    await page.locator(".checkpoint-mission .outcome-list li").count(),
  ).toBe(12);
});
test("every lesson has its sound focus and the journey is accessible on mobile and dark themes", async ({
  page,
}) => {
  await page.goto("/lessons");
  await expect(page.locator("main h1")).toBeVisible();
  const desktop = await new AxeBuilder({ page }).analyze();
  expect(
    desktop.violations.filter(
      (v) => v.impact === "serious" || v.impact === "critical",
    ),
  ).toEqual([]);
  await page.screenshot({
    path: "test-results/book-journey-desktop.png",
    fullPage: true,
  });
  for (const lesson of bookLessons) {
    await page.goto(`/lessons/${lesson.number}?step=sound`);
    await expect(
      page.getByRole("heading", { name: lesson.sound.title, exact: true }),
    ).toBeVisible();
    expect(await page.locator(".chapter-stepper button").count()).toBe(12);
  }
  await page.setViewportSize({ width: 390, height: 844 });
  for (const route of [
    "/lessons",
    "/lessons/1?step=words",
    "/lessons/6?step=speak",
    "/lessons/12?step=mission",
    "/lessons/checkpoint/4",
  ]) {
    await page.goto(route);
    await expect(page.locator("main h1")).toBeVisible();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    const scan = await new AxeBuilder({ page }).analyze();
    expect(
      scan.violations.filter(
        (v) => v.impact === "serious" || v.impact === "critical",
      ),
    ).toEqual([]);
  }
  await page.goto("/lessons");
  await page.screenshot({
    path: "test-results/book-journey-mobile.png",
    fullPage: true,
  });
  await page.getByRole("button", { name: "Switch to dark theme" }).click();
  await page.goto("/lessons/1?step=mission");
  const dark = await new AxeBuilder({ page }).analyze();
  expect(
    dark.violations.filter(
      (v) => v.impact === "serious" || v.impact === "critical",
    ),
  ).toEqual([]);
});
test("productive flashcards check German and record delayed recall evidence", async ({
  page,
}) => {
  await page.goto("/review");
  await page
    .getByRole("combobox", { name: "Card direction" })
    .selectOption("recall");
  await page.getByRole("button", { name: "Start my review" }).click();
  await expect(
    page.getByRole("button", { name: "Listen to this word" }),
  ).toBeDisabled();
  const saved = await page.evaluate(() =>
    JSON.parse(localStorage.getItem("deutsch-journey-v2")!),
  );
  const word = saved.words
    .slice()
    .sort((a: { due: string }, b: { due: string }) =>
      a.due.localeCompare(b.due),
    )[0];
  await page
    .getByRole("textbox", { name: "Your German answer" })
    .fill([word.article, word.german].filter(Boolean).join(" "));
  await page
    .getByRole("button", { name: "Check my recall", exact: true })
    .click();
  await page.getByRole("button", { name: /^Good/ }).click();
  const reviewed = await page.evaluate(
    (id: string) =>
      JSON.parse(localStorage.getItem("deutsch-journey-v2")!).words.find(
        (w: { id: string }) => w.id === id,
      ),
    word.id,
  );
  expect(reviewed.evidence.recalled).toBe(true);
  expect(reviewed.evidence.firstRecallAt).toBeTruthy();
  expect(reviewed.evidence.spacedRecall).toBe(false);
});
