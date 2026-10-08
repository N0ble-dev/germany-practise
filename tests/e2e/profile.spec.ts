import { test, expect, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { readFile } from "node:fs/promises";
import { initialState } from "../../src/lib/content";
import { lessonProgressSchema } from "../../src/lib/journey-model";
import { createSchedule } from "../../src/lib/planner-schedule";

const accountA = {
  id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
  name: "Nabil Mohamed",
  email: "nabil@example.com",
};
const accountB = {
  id: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
  name: "Amina",
  email: "amina@example.com",
};
const sentence = "Mein privates Lernziel ist eine Reise nach Heidelberg.";
function session(user: typeof accountA | null) {
  const now = new Date().toISOString();
  return user
    ? {
        user: { ...user, emailVerified: true, createdAt: now, updatedAt: now },
        session: {
          id: user.id,
          userId: user.id,
          token: "mock-session",
          expiresAt: "2035-01-01T00:00:00Z",
          createdAt: now,
          updatedAt: now,
        },
      }
    : null;
}
function notebook() {
  const state = initialState();
  state.name = accountA.name;
  state.onboardingComplete = true;
  state.xp = 87;
  state.savedSentences = [sentence];
  state.lessonNotes = { "1": "My private note: ü, ä, ö and ß." };
  state.words.unshift({
    ...state.words[0],
    id: "private-word",
    german: "Wanderlust",
    article: "die",
    english: "desire to travel",
    arabic: "الرغبة في السفر",
    topic: "Travel",
    favorite: true,
    example: "Ich habe Wanderlust.",
  });
  state.journey.lessons["1"] = lessonProgressSchema.parse({
    steps: ["story", "words"],
    grammar: 80,
    missionResponse: "Meine private Lebensaufgabe.",
    missionPassed: false,
  });
  state.personalProfile.city = "Alexandria";
  state.planner.sessions = createSchedule({
    title: "My private German practice",
    date: "2030-01-07",
    time: "19:00",
    timeZone: "Europe/Berlin",
    duration: 20,
    kind: "review",
    lesson: 1,
    note: "Review my saved sentences",
    reminder: 15,
    repeat: "once",
    until: "2030-01-07",
    weekdays: [],
  });
  return state;
}
async function seed(page: Page) {
  await page.route("**/api/profile/photo", (route) =>
    route.fulfill({ status: 404, json: { error: "No account photo." } }),
  );
  await page.addInitScript((state) => {
    if (localStorage.getItem("deutsch-journey-v2:owner") === null)
      localStorage.setItem("deutsch-journey-v2", JSON.stringify(state));
  }, notebook());
}

test("logout hides account identity and collections, and signing back in restores them", async ({
  page,
}) => {
  let user: typeof accountA | null = accountA;
  await seed(page);
  await page.route("**/api/auth/get-session*", (route) =>
    route.fulfill({ json: session(user) }),
  );
  await page.route("**/api/auth/sign-out", (route) => {
    user = null;
    return route.fulfill({ json: { success: true } });
  });
  await page.route("**/api/auth/sign-in/social", (route) => {
    user = accountA;
    return route.fulfill({
      json: { url: route.request().postDataJSON().callbackURL, redirect: true },
    });
  });
  await page.goto("/profile");
  await expect(
    page.getByRole("heading", { name: accountA.name, exact: true }),
  ).toBeVisible();
  await expect(page.getByText(sentence, { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Sign out", exact: true }).click();
  await expect(page).toHaveURL(/\/signin$/);
  await page.goto("/profile");
  await expect(
    page.getByRole("heading", { name: "Guest profile", exact: true }),
  ).toBeVisible();
  await expect(page.getByText(accountA.name, { exact: true })).toHaveCount(0);
  await expect(page.getByText(sentence, { exact: true })).toHaveCount(0);
  await expect(page.locator(".profile-link strong")).toHaveText("Guest");
  await page.reload();
  await expect(
    page.getByRole("heading", { name: "Guest profile", exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Continue with Google", exact: true })
    .click();
  await expect(page).toHaveURL(/\/profile$/);
  await expect(page.getByText(sentence, { exact: true })).toBeVisible();
  await expect(
    page.getByRole("heading", { name: accountA.name, exact: true }),
  ).toBeVisible();
});

test("account switching and session expiry do not reuse the previous learner's profile", async ({
  page,
}) => {
  let user: typeof accountA | null = accountA;
  await seed(page);
  await page.route("**/api/auth/get-session*", (route) =>
    route.fulfill({ json: session(user) }),
  );
  await page.goto("/profile");
  await expect(page.getByText(sentence, { exact: true })).toBeVisible();
  user = accountB;
  await page.reload();
  await expect(
    page.getByRole("heading", { name: accountB.name, exact: true }),
  ).toBeVisible();
  await expect(page.getByText(sentence, { exact: true })).toHaveCount(0);
  await expect(page.locator(".profile-link strong")).toHaveText(accountB.name);
  user = null;
  await page.reload();
  await expect(
    page.getByRole("heading", { name: "Guest profile", exact: true }),
  ).toBeVisible();
  await expect(page.locator(".profile-link strong")).toHaveText("Guest");
  user = accountA;
  await page.reload();
  await expect(page.getByText(sentence, { exact: true })).toBeVisible();
});

test("failed logout does not report success or erase account learning", async ({
  page,
}) => {
  await seed(page);
  await page.route("**/api/auth/get-session*", (route) =>
    route.fulfill({ json: session(accountA) }),
  );
  await page.route("**/api/auth/sign-out", (route) =>
    route.fulfill({
      status: 503,
      json: {
        code: "SERVICE_UNAVAILABLE",
        message: "Sign-out could not finish. Please try again.",
      },
    }),
  );
  await page.goto("/profile");
  await page.getByRole("button", { name: "Sign out", exact: true }).click();
  await expect(page.locator("main").getByRole("alert")).toBeVisible();
  await expect(page).toHaveURL(/\/profile$/);
  await page.reload();
  await expect(page.getByText(sentence, { exact: true })).toBeVisible();
});

test("the profile shows collections, saves personal details and downloads a real PDF", async ({
  page,
}) => {
  await seed(page);
  await page.route("**/api/auth/get-session*", (route) =>
    route.fulfill({ json: session(accountA) }),
  );
  await page.goto("/profile");
  await expect(page.getByText(sentence, { exact: true })).toBeVisible();
  await page.getByLabel("Filter profile vocabulary").selectOption("added");
  await page.getByLabel("Search profile vocabulary").fill("Wanderlust");
  await expect(page.getByText("die Wanderlust", { exact: true })).toBeVisible();
  await page.getByText("My lesson notes", { exact: true }).click();
  await expect(
    page.getByText("My private note: ü, ä, ö and ß.", { exact: true }),
  ).toBeVisible();
  await page.getByText("My A1.1 book journey", { exact: true }).click();
  await expect(
    page.getByText("Meine private Lebensaufgabe.", { exact: true }),
  ).toBeVisible();
  await page.getByText("My study plan", { exact: true }).click();
  await expect(
    page.getByText("My private German practice", { exact: true }),
  ).toBeVisible();
  await page.getByLabel("City", { exact: true }).fill("Berlin");
  await page
    .getByRole("button", { name: "Save my learning details", exact: true })
    .click();
  await page.reload();
  await expect(page.getByLabel("City", { exact: true })).toHaveValue("Berlin");
  await page
    .getByRole("button", { name: "Export as PDF", exact: true })
    .click();
  const downloaded = page.waitForEvent("download");
  await page.getByRole("button", { name: "Download PDF", exact: true }).click();
  const file = await downloaded;
  expect(file.suggestedFilename()).toMatch(
    /^deutsch-journey-notebook-.*\.pdf$/,
  );
  const bytes = await readFile((await file.path())!);
  expect(bytes.subarray(0, 5).toString()).toBe("%PDF-");
  expect(bytes.length).toBeGreaterThan(10_000);
  await expect(page.getByRole("dialog")).toHaveCount(0);
});

test("the profile stays accessible in mobile, light and dark layouts", async ({
  page,
}) => {
  await seed(page);
  await page.route("**/api/auth/get-session*", (route) =>
    route.fulfill({ json: session(accountA) }),
  );
  await page.goto("/profile");
  await expect(page.getByText(sentence, { exact: true })).toBeVisible();
  for (const width of [1440, 390]) {
    await page.setViewportSize({ width, height: 900 });
    for (const theme of ["light", "dark"]) {
      const toggle = page.getByRole("button", {
        name: `Switch to ${theme} theme`,
      });
      if (await toggle.count()) await toggle.click();
      const scan = await new AxeBuilder({ page }).analyze();
      expect(
        scan.violations.filter(
          (v) => v.impact === "serious" || v.impact === "critical",
        ),
      ).toEqual([]);
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      ).toBe(true);
      await page.screenshot({
        path: `test-results/profile-${width}-${theme}.png`,
        fullPage: true,
      });
    }
  }
});

test("the learner card uses the Google photo, renders 3D, and offers still keyboard views", async ({
  page,
}) => {
  await seed(page);
  const learner = {
    ...accountA,
    image: "https://lh3.googleusercontent.com/test-avatar.png",
  };
  await page.route("**/api/auth/get-session*", (route) =>
    route.fulfill({ json: session(learner) }),
  );
  await page.route("**/api/profile/photo", (route) => {
    expect(route.request().headers()["x-learning-account"]).toBe(accountA.id);
    return route.fulfill({
      contentType: "image/svg+xml",
      body: '<svg xmlns="http://www.w3.org/2000/svg" width="128" height="128"><rect width="128" height="128" fill="#1295a5"/></svg>',
    });
  });
  await page.route(learner.image, (route) =>
    route.fulfill({
      contentType: "image/svg+xml",
      body: '<svg xmlns="http://www.w3.org/2000/svg" width="128" height="128"><rect width="128" height="128" fill="#1295a5"/></svg>',
    }),
  );
  await page.goto("/profile");
  const card = page.getByRole("figure", {
    name: `${accountA.name}'s learner card`,
  });
  await expect(card.locator("canvas")).toBeVisible();
  await expect(card.locator(".learner-card-stage")).toHaveCSS(
    "height",
    "600px",
  );
  await expect(card.locator(".learner-card-still img")).toHaveAttribute(
    "src",
    /^data:image\/png/,
  );
  const front = card.getByRole("button", { name: "Front", exact: true });
  await front.focus();
  await page.keyboard.press("Enter");
  await expect(front).toHaveAttribute("aria-pressed", "true");
  await expect(card.locator("canvas")).toHaveCount(0);
  await expect
    .poll(() =>
      card.getByRole("img").evaluate(async (element) => {
        const image = element as HTMLImageElement;
        await image.decode();
        const canvas = document.createElement("canvas");
        canvas.width = 800;
        canvas.height = 1125;
        const context = canvas.getContext("2d")!;
        context.drawImage(image, 0, 0);
        return [...context.getImageData(400, 425, 1, 1).data];
      }),
    )
    .toEqual([18, 149, 165, 255]);
  await card.getByRole("button", { name: "Back", exact: true }).click();
  await expect(card.getByRole("img")).toHaveAttribute("src", "/card-back.png");
  await card.getByRole("button", { name: "3D card", exact: true }).click();
  await expect(card.locator("canvas")).toBeVisible();
  await page.emulateMedia({ reducedMotion: "reduce" });
  await expect(card.locator("canvas")).toHaveCount(0);
  await expect(
    card.getByRole("button", { name: "3D card", exact: true }),
  ).toBeDisabled();
  await expect(
    card.getByText("Motion reduced. Your learner card stays still."),
  ).toBeVisible();
});

test("the learner card stays usable without WebGL or a Google photo", async ({
  page,
}) => {
  await seed(page);
  await page.route("**/api/auth/get-session*", (route) =>
    route.fulfill({ json: session(accountA) }),
  );
  await page.addInitScript(() => {
    const original = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function (
      this: HTMLCanvasElement,
      context,
      ...args
    ) {
      if (context === "webgl" || context === "webgl2") return null;
      return Reflect.apply(original, this, [context, ...args]);
    } as typeof original;
  });
  await page.goto("/profile");
  const card = page.getByRole("figure", {
    name: `${accountA.name}'s learner card`,
  });
  await expect(card.getByRole("img")).toBeVisible();
  await expect(card.getByRole("img")).toHaveAttribute(
    "src",
    /^data:image\/png/,
  );
  await expect(card.locator("canvas")).toHaveCount(0);
  await card.getByRole("button", { name: "Back", exact: true }).click();
  await expect(card.getByRole("img")).toHaveAttribute("src", "/card-back.png");
  await expect(
    page.getByRole("heading", { name: accountA.name, exact: true }),
  ).toBeVisible();
});
