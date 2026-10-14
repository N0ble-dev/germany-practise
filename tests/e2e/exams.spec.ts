import { test, expect } from "@playwright/test";
import { test as guestTest } from "./fixtures";
import AxeBuilder from "@axe-core/playwright";
import starter from "../../content/exams/goethe-a1-sd1-adult/starter-01.v1.json" with { type: "json" };
import { examPackSchema, publicExamTask } from "../../src/lib/exams/model";
import { examReport } from "../../src/lib/exams/evaluation";
test.use({ reducedMotion: "reduce" });
test.beforeEach(async ({ page }) => {
  await page.route("**/api/auth/get-session*", (route) =>
    route.fulfill({ json: null }),
  );
});

test("the arena keeps resources available and explains level-specific exam rules", async ({
  page,
}) => {
  const auth: string[] = [];
  page.on("request", (request) => {
    if (request.url().includes("/api/auth/")) auth.push(request.url());
  });
  await page.goto("/exams");
  await expect(page.getByRole("heading", { level: 1 })).toContainText(
    "Walk in with a plan",
  );
  await expect(
    page.getByRole("link", { name: /Resources library/ }).first(),
  ).toHaveAttribute("href", "/exams/resources");
  await expect(page.locator(".arena-skill-cards .arena-skill")).toHaveCount(4);
  await page.getByRole("button", { name: "A2", exact: true }).click();
  await expect(page.locator(".arena-rules-summary")).toContainText("45 points");
  await page.getByRole("button", { name: "C2", exact: true }).click();
  await expect(page.locator(".arena-ticket")).toContainText(
    "Individual speaking",
  );
  await expect(page.locator(".arena-rules-summary")).toContainText(
    "Each module",
  );
  await page
    .getByRole("link", { name: "Explore my exam", exact: true })
    .click();
  await expect(page.getByRole("heading", { level: 1 })).toContainText(
    "Großes Deutsches Sprachdiplom",
  );
  await expect(page.locator("#reading")).toContainText("80 minutes");
  expect(auth.length).toBeGreaterThan(0);
});

test("reading walkthrough checks original examples and links mistakes to a real lesson", async ({
  page,
}) => {
  await page.goto("/exams/goethe-a1-sd1-adult/practice/reading");
  await expect(
    page.getByText("Format walkthrough", { exact: true }),
  ).toBeVisible();
  await page.getByRole("radio", { name: "Richtig", exact: true }).check();
  await page
    .getByRole("button", { name: "Check this example", exact: true })
    .click();
  await expect(page.locator(".arena-feedback")).toContainText(
    "closed at 15:00",
  );
  await expect(
    page.getByRole("link", { name: "Practise lesson 8", exact: true }),
  ).toHaveAttribute("href", "/lessons/8?step=patterns");
  await page.getByRole("button", { name: "Try again", exact: true }).click();
  await page.getByRole("radio", { name: "Falsch", exact: true }).check();
  await page
    .getByRole("button", { name: "Check this example", exact: true })
    .click();
  await expect(page.locator(".arena-feedback")).toContainText(
    "Your choice matches",
  );
  await page
    .getByRole("combobox", { name: "Helpful explanations", exact: true })
    .selectOption("ar");
  await expect(page.locator(".arena-feedback p").first()).toHaveAttribute(
    "dir",
    "rtl",
  );
  const local = await page.evaluate(() =>
    JSON.parse(localStorage.getItem("deutsch-journey-v2")!),
  );
  expect(local.xp).toBe(0);
  expect(local.activities).toEqual([]);
});

test("listening demo, writing self-review, and oral microphone fallback work without exam grades", async ({
  page,
}) => {
  await page.addInitScript(() => {
    speechSynthesis.cancel = () => {};
    speechSynthesis.getVoices = () => [];
    speechSynthesis.speak = (utterance) => {
      queueMicrotask(() => utterance.dispatchEvent(new Event("end")));
    };
    Object.defineProperty(navigator, "mediaDevices", {
      configurable: true,
      value: {
        getUserMedia: async () => {
          throw new DOMException("Permission denied", "NotAllowedError");
        },
      },
    });
  });
  await page.goto("/exams/goethe-a1-sd1-adult/practice/listening");
  await page.getByRole("button", { name: "Play example", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Play example", exact: true }),
  ).toBeEnabled();
  await page.getByRole("button", { name: "Show script", exact: true }).click();
  await expect(
    page.locator(".arena-audio-controls .arena-source-passage"),
  ).toContainText("siebzehn Uhr fünfundvierzig");
  await page.getByRole("radio", { name: "17:45 Uhr", exact: true }).check();
  await page
    .getByRole("button", { name: "Check this example", exact: true })
    .click();
  await expect(page.locator(".arena-feedback")).toContainText(
    "Your choice matches",
  );
  await page.goto("/exams/goethe-a1-sd1-adult/practice/writing");
  for (const label of [
    "Name",
    "Wohnort",
    "Muttersprache",
    "Gewünschter Kurs",
    "Gewünschter Kurstag",
  ])
    await page.getByLabel(label, { exact: true }).fill("Demo");
  await page
    .getByRole("checkbox", { name: "Complete all five fields.", exact: true })
    .check();
  await page
    .getByRole("button", { name: "Review my response", exact: true })
    .click();
  await expect(page.locator(".arena-feedback")).toContainText(
    "5 form fields filled in",
  );
  await expect(page.locator(".arena-feedback")).toContainText(
    "No writing, speaking or pronunciation mark",
  );
  await page.getByRole("button", { name: "Next example", exact: true }).click();
  await page
    .getByLabel("Your message in German")
    .fill(
      "Liebe Frau Weber, ich bin krank. Welche Hausaufgaben gibt es? Ich komme am Donnerstag wieder. Viele Grüße, Sara",
    );
  await page
    .getByRole("button", { name: "Review my response", exact: true })
    .click();
  await expect(page.locator(".arena-feedback")).toContainText(
    "words in your draft",
  );
  await page.goto("/exams/goethe-a1-sd1-adult/practice/speaking");
  await page
    .getByRole("button", { name: "Record up to 60 seconds", exact: true })
    .click();
  await expect(page.locator(".voice-recorder [role='alert']")).toContainText(
    "Microphone permission was denied",
  );
  await page
    .getByLabel("Optional notes or a typed rehearsal")
    .fill("Ich heiße Sara. Ich komme aus Ägypten.");
  await page
    .getByRole("button", { name: "Review my response", exact: true })
    .click();
  await expect(page.locator(".arena-feedback")).toContainText(
    "No writing, speaking or pronunciation mark",
  );
});

guestTest(
  "an exam week is previewed before being added to the existing planner",
  async ({ page }) => {
    await page.goto("/exams/plan");
    await page
      .getByLabel("First practice day", { exact: true })
      .fill("2030-01-02");
    await page.getByLabel("Daily start time", { exact: true }).fill("19:00");
    await page
      .getByLabel("Planning time zone", { exact: true })
      .fill("Europe/Berlin");
    await page
      .getByRole("button", { name: "Preview my week", exact: true })
      .click();
    await expect(page.locator(".arena-plan-preview li")).toHaveCount(7);
    await page
      .getByRole("button", {
        name: "Add these sessions to my planner",
        exact: true,
      })
      .click();
    await expect(
      page.getByRole("button", { name: "Sessions added", exact: true }),
    ).toBeDisabled();
    const data = await page.evaluate(() =>
      JSON.parse(localStorage.getItem("deutsch-journey-v2")!),
    );
    expect(
      data.planner.sessions.filter(
        (session: { kind: string }) => session.kind === "exam",
      ),
    ).toHaveLength(7);
    expect(data.planner.sessions[0].examSkill).toBe("listening");
    expect(data.xp).toBe(0);
    await page.goto("/planner");
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  },
);

test("an authenticated writing attempt autosaves and submits to a private report", async ({
  page,
}) => {
  const user = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
    id = "cccccccc-cccc-4ccc-8ccc-cccccccccccc";
  const pack = examPackSchema.parse(starter),
    task = pack.tasks.find((task) => task.id === "message-course")!;
  let revision = 0;
  let answers: Record<
    string,
    { text: string; fields: Record<string, string>; checks: number[] }
  > = {};
  await page.route("**/api/auth/get-session*", (route) =>
    route.fulfill({
      json: {
        session: {
          id: "session-exam",
          userId: user,
          token: "test-token",
          expiresAt: "2099-01-01T00:00:00.000Z",
          createdAt: "2026-10-01T00:00:00.000Z",
          updatedAt: "2026-10-01T00:00:00.000Z",
        },
        user: {
          id: user,
          name: "Sara",
          email: "sara@example.test",
          emailVerified: true,
          createdAt: "2026-10-01T00:00:00.000Z",
          updatedAt: "2026-10-01T00:00:00.000Z",
        },
      },
    }),
  );
  await page.route(`**/api/exams/attempts/${id}`, (route) =>
    route.fulfill({
      json: {
        id,
        title: "Fixture original writing practice",
        examCode: pack.examCode,
        version: 1,
        mode: "coach",
        status: "in_progress",
        revision,
        deadline: null,
        serverNow: new Date().toISOString(),
        interrupted: false,
        tasks: [publicExamTask(task)],
        credits: pack.rights,
        answers,
      },
    }),
  );
  await page.route(`**/api/exams/attempts/${id}/answer`, async (route) => {
    expect(route.request().headers()["x-learning-account"]).toBe(user);
    const body = route.request().postDataJSON();
    expect(body.revision).toBe(revision);
    answers = { ...answers, [body.taskId]: body.answer };
    revision++;
    await route.fulfill({ json: { revision } });
  });
  await page.route(`**/api/exams/attempts/${id}/submit`, (route) =>
    route.fulfill({ json: { id } }),
  );
  await page.route(`**/api/exams/attempts/${id}/report`, (route) =>
    route.fulfill({
      json: {
        id,
        title: "Fixture original writing practice",
        examCode: pack.examCode,
        version: 1,
        mode: "coach",
        interrupted: false,
        submittedAt: new Date().toISOString(),
        report: examReport(pack, answers, ["writing"]),
        credits: pack.rights,
      },
    }),
  );
  await page.goto(`/exams/attempts/${id}/take`);
  await page.getByText("Practice content & credits", { exact: true }).click();
  await expect(page.locator(".arena-credits")).toContainText(
    pack.rights.authors[0],
  );
  await page
    .getByLabel("Your message in German")
    .fill(
      "Liebe Frau Weber, ich bin krank. Welche Hausaufgaben gibt es? Ich komme am Donnerstag wieder.",
    );
  await expect.poll(() => revision).toBeGreaterThan(0);
  await expect(
    page.locator(".arena-studio-heading [role='status']"),
  ).toContainText("All answers saved");
  await page
    .getByRole("button", { name: "Submit my practice", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Submit & open report", exact: true })
    .click();
  await expect(
    page.getByRole("heading", {
      name: "Make the next attempt more useful.",
      exact: true,
    }),
  ).toBeVisible();
  await expect(page.locator(".arena-skill-cards")).toContainText(
    "open responses need a human check",
  );
  await page.getByText("Practice content & credits", { exact: true }).click();
  await expect(page.locator(".arena-credits")).toContainText(
    pack.rights.license,
  );
  const download = page.waitForEvent("download");
  await page
    .getByRole("button", { name: "Export my report", exact: true })
    .click();
  expect((await download).suggestedFilename()).toBe(`exam-report-${id}.json`);
});

test("arena and studios support narrow phones, keyboard controls and both themes", async ({
  page,
}) => {
  test.setTimeout(120000);
  for (const route of [
    "/exams",
    "/exams/goethe-a1-sd1-adult/guide",
    "/exams/goethe-a1-sd1-adult/practice/reading",
    "/exams/goethe-a1-sd1-adult/practice/writing",
    "/exams/goethe-a1-sd1-adult/practice/speaking",
  ]) {
    await page.goto(route);
    for (const width of [320, 390, 1440]) {
      await page.setViewportSize({ width, height: 1000 });
      for (const theme of ["light", "dark"]) {
        await page.evaluate((value) => {
          document.documentElement.dataset.theme = value;
        }, theme);
        await page.waitForTimeout(180);
        expect(
          await page.evaluate(
            () => document.documentElement.scrollWidth <= innerWidth,
          ),
        ).toBe(true);
        const scan = await new AxeBuilder({ page }).analyze();
        expect(
          scan.violations.filter((violation) =>
            ["serious", "critical"].includes(violation.impact ?? ""),
          ),
        ).toEqual([]);
        if (route === "/exams" && width !== 320)
          await page.screenshot({
            path: `artifacts/exam-arena-${width}-${theme}.png`,
          });
      }
    }
  }
});
