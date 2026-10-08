import { test, expect } from "./fixtures";
import AxeBuilder from "@axe-core/playwright";
import { readFile } from "node:fs/promises";
import { initialState } from "../../src/lib/content";
import { createSchedule } from "../../src/lib/planner-schedule";

test("a learner creates a repeating plan, edits reminders, exports, and removes a series", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/planner");
  await expect(page.locator("main h1")).toHaveText(
    "Make time for your German.",
  );
  await page
    .getByRole("button", { name: "Plan a session", exact: true })
    .click();
  const dialog = page.getByRole("dialog");
  await dialog
    .getByLabel("Session name", { exact: true })
    .fill("My German rhythm");
  await dialog.getByLabel("Day", { exact: true }).fill("2030-01-07");
  await dialog.getByLabel("Start time", { exact: true }).fill("19:00");
  await dialog
    .getByLabel("Session time zone", { exact: true })
    .selectOption("Europe/Berlin");
  await dialog.getByLabel("Repeat", { exact: true }).selectOption("weekly");
  await dialog.getByLabel("Repeat until", { exact: true }).fill("2030-01-20");
  await dialog
    .getByRole("button", { name: "Add repeating study plan" })
    .click();
  await expect(dialog).toHaveCount(0);
  await expect(page.locator(".study-agenda h3")).toHaveText("My German rhythm");
  let saved = await page.evaluate(() =>
    JSON.parse(localStorage.getItem("deutsch-journey-v2")!),
  );
  expect(saved.planner.sessions).toHaveLength(6);
  expect(saved.xp).toBe(0);
  expect(saved.activities).toHaveLength(0);
  await page
    .getByRole("button", { name: "Edit: My German rhythm", exact: true })
    .click();
  await dialog.getByLabel("Remind me", { exact: true }).selectOption("none");
  await dialog.getByRole("button", { name: "Save session changes" }).click();
  await page
    .getByRole("button", { name: "Edit: My German rhythm", exact: true })
    .click();
  await expect(dialog.getByLabel("Remind me", { exact: true })).toHaveValue(
    "none",
  );
  await dialog.getByRole("button", { name: "Cancel", exact: true }).click();
  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "Download calendar file" }).click();
  const download = await downloadPromise;
  const file = await readFile((await download.path())!, "utf8");
  expect(download.suggestedFilename()).toBe("deutsch-study-plan.ics");
  expect(file.match(/BEGIN:VEVENT/g)).toHaveLength(6);
  expect(file.match(/BEGIN:VALARM/g)).toHaveLength(5);
  expect(file).toContain("DTSTART:20300107T180000Z");
  await page
    .getByRole("button", { name: "Check off: My German rhythm", exact: true })
    .click();
  await expect(
    page.getByText("Checked off · reminders off", { exact: true }),
  ).toBeVisible();
  await page.reload();
  saved = await page.evaluate(() =>
    JSON.parse(localStorage.getItem("deutsch-journey-v2")!),
  );
  expect(saved.planner.sessions[0].status).toBe("done");
  expect(saved.xp).toBe(0);
  await page.goto("/");
  await expect(
    page
      .locator(".upcoming-study")
      .getByText("My German rhythm", { exact: true }),
  ).toHaveCount(2);
  await page.goto("/planner");
  // Reload opens today's month; jump to the existing session through editing a new date.
  await page
    .getByRole("button", { name: "Plan a session", exact: true })
    .click();
  await dialog
    .getByLabel("Session name", { exact: true })
    .fill("One more small step");
  await dialog.getByLabel("Day", { exact: true }).fill("2030-01-07");
  await dialog
    .getByRole("button", { name: "Add study session", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Remove: My German rhythm", exact: true })
    .click();
  await dialog
    .getByLabel("Also remove the remaining sessions in this repeating plan")
    .check();
  await dialog
    .getByRole("button", { name: "Remove 6 sessions", exact: true })
    .click();
  saved = await page.evaluate(() =>
    JSON.parse(localStorage.getItem("deutsch-journey-v2")!),
  );
  expect(saved.planner.sessions).toHaveLength(1);
  expect(saved.planner.sessions[0].title).toBe("One more small step");
  expect(errors).toEqual([]);
});

test("Google controls sync a plan and explain what remains after disconnecting", async ({
  page,
}) => {
  const id = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
    date = new Date().toISOString();
  await page.route("**/api/auth/get-session*", (route) =>
    route.fulfill({
      json: {
        user: {
          id,
          name: "Learner",
          email: "test@example.com",
          emailVerified: true,
          createdAt: date,
          updatedAt: date,
        },
        session: {
          id,
          token: "mock-session",
          userId: id,
          expiresAt: "2035-01-01T00:00:00Z",
          createdAt: date,
          updatedAt: date,
        },
      },
    }),
  );
  let connected = true,
    revision = 3,
    synced = false;
  await page.route("**/api/calendar/google", (route) => {
    if (route.request().method() === "DELETE") {
      connected = false;
      return route.fulfill({ json: { disconnected: true } });
    }
    return route.fulfill({
      json: {
        configured: true,
        signedIn: true,
        connected,
        revision,
        syncedAt: null,
        syncedSessionIds: [],
      },
    });
  });
  await page.route("**/api/calendar/google/sync", async (route) => {
    const input = route.request().postDataJSON();
    expect(input.revision).toBe(3);
    expect(input.sessions).toHaveLength(1);
    expect(input.sessions[0]).toMatchObject({
      timeZone: "Europe/Berlin",
      reminder: 15,
    });
    synced = true;
    revision++;
    await route.fulfill({
      json: { conflict: false, failed: 0, succeeded: 1, revision },
    });
  });
  const state = initialState();
  state.planner.sessions = createSchedule({
    title: "German",
    date: "2030-01-07",
    time: "19:00",
    timeZone: "Europe/Berlin",
    duration: 20,
    kind: "review",
    lesson: 1,
    note: "",
    reminder: 15,
    repeat: "once",
    until: "2030-01-07",
    weekdays: [],
  });
  await page.addInitScript((value) => {
    localStorage.setItem("deutsch-journey-v2", JSON.stringify(value));
    localStorage.setItem("deutsch-journey-v2:guest", JSON.stringify(value));
  }, state);
  await page.goto("/planner");
  await expect(page.locator("main h1")).toBeVisible();
  test.skip(
    (await page
      .getByText("Direct Google connection needs a signed-in account.", {
        exact: false,
      })
      .count()) > 0,
    "Build has no Neon account configuration.",
  );
  await expect(
    page.getByText("Google Calendar connected", { exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Sync my study plan", exact: true })
    .click();
  await expect(
    page.getByText(
      "Your study plan and reminders are synced to Google Calendar.",
      { exact: true },
    ),
  ).toBeVisible();
  expect(synced).toBe(true);
  await page.getByRole("button", { name: "Disconnect", exact: true }).click();
  await expect(page.getByRole("dialog")).toContainText(
    "Events and reminders already in Google Calendar stay there",
  );
  await page
    .getByRole("button", { name: "Disconnect calendar", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Connect Google Calendar", exact: true }),
  ).toBeEnabled();
});

test("the planner works with keyboard, dark mode, and a phone layout", async ({
  page,
}) => {
  await page.route("**/api/auth/get-session*", (route) =>
    route.fulfill({ json: null }),
  );
  await page.goto("/planner");
  await expect(page.locator("main h1")).toBeVisible();
  await page
    .getByRole("button", { name: "Plan a session", exact: true })
    .click();
  await expect(page.getByLabel("Session name", { exact: true })).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "Plan a session", exact: true }),
  ).toBeFocused();
  for (const viewport of [
    { width: 1440, height: 1000 },
    { width: 390, height: 844 },
  ]) {
    await page.setViewportSize(viewport);
    for (const theme of ["light", "dark"]) {
      const button = page.getByRole("button", {
        name: `Switch to ${theme} theme`,
      });
      if (await button.count()) await button.click();
      await expect(page.locator("html")).toHaveAttribute("data-theme", theme);
      await page.evaluate(async () => {
        await Promise.all(
          document
            .getAnimations()
            .filter((animation) => animation.playState === "running")
            .map((animation) => animation.finished.catch(() => {})),
        );
      });
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
      await page.evaluate(() => window.scrollTo(0, 0));
      await page.screenshot({
        path: `test-results/study-planner-${viewport.width}-${theme}.png`,
        fullPage: true,
      });
    }
  }
});
