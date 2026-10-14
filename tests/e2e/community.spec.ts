import { test, expect, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { initialState } from "../../src/lib/content";
import type {
  OwnPublicSentence,
  PublicSentence,
} from "../../src/lib/community-model";
const user = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const saved = [
  "Ich lerne jeden Tag Deutsch.",
  "Ich trinke gern Kaffee.",
  "Meine private Adresse bleibt in meinem Notizbuch.",
];
const stamp = "2026-10-14T09:00:00.123456Z";
const card = (
  id: string,
  german: string,
  signature = "Amina",
): PublicSentence => ({
  id,
  german,
  signature,
  signatureStyle: "written",
  createdAt: stamp,
  updatedAt: stamp,
});
const cards = [
  card(
    "11111111-1111-4111-8111-111111111111",
    "Ich fahre mit dem Zug nach Berlin.",
    "نَبيل",
  ),
  card(
    "22222222-2222-4222-8222-222222222222",
    "Heute koche ich für meine Familie.",
    "Amina",
  ),
];
async function seed(page: Page, signedIn = true) {
  const state = initialState();
  state.onboardingComplete = true;
  state.savedSentences = saved;
  state.lessonNotes = { "1": "A private lesson note." };
  await page.addInitScript((value) => {
    localStorage.setItem("deutsch-journey-v2", JSON.stringify(value));
  }, state);
  await page.route("**/api/auth/get-session*", (route) =>
    route.fulfill({
      json: signedIn
        ? {
            user: {
              id: user,
              name: "Nabil",
              email: "private@example.test",
              emailVerified: true,
              createdAt: stamp,
              updatedAt: stamp,
            },
            session: {
              id: "community-session",
              userId: user,
              token: "fixture-token",
              expiresAt: "2035-01-01T00:00:00Z",
              createdAt: stamp,
              updatedAt: stamp,
            },
          }
        : null,
    }),
  );
}
async function drawSignature(page: Page, touch = false) {
  const pad = page.getByRole("img", {
    name: "Signature drawing pad",
    exact: true,
  });
  await pad.scrollIntoViewIfNeeded();
  const box = (await pad.boundingBox())!;
  const points = [
    [0.12, 0.72],
    [0.24, 0.23],
    [0.38, 0.68],
    [0.5, 0.28],
    [0.65, 0.69],
  ].map(([x, y]) => ({ x: box.x + x * box.width, y: box.y + y * box.height }));
  if (touch) {
    const cdp = await page.context().newCDPSession(page);
    await cdp.send("Emulation.setTouchEmulationEnabled", {
      enabled: true,
      maxTouchPoints: 1,
    });
    await cdp.send("Input.dispatchTouchEvent", {
      type: "touchStart",
      touchPoints: [{ ...points[0], id: 1 }],
    });
    for (const point of points.slice(1))
      await cdp.send("Input.dispatchTouchEvent", {
        type: "touchMove",
        touchPoints: [{ ...point, id: 1 }],
      });
    await cdp.send("Input.dispatchTouchEvent", {
      type: "touchEnd",
      touchPoints: [],
    });
    await cdp.send("Emulation.setTouchEmulationEnabled", { enabled: false });
    await cdp.detach();
  } else {
    await page.mouse.move(points[0].x, points[0].y);
    await page.mouse.down();
    for (const point of points.slice(1))
      await page.mouse.move(point.x, point.y, { steps: 3 });
    await page.mouse.up();
  }
}
test.use({ reducedMotion: "reduce" });
test("a learner draws with mouse or touch, undoes/clears ink and publishes the actual signature", async ({
  page,
}) => {
  await seed(page);
  await page.setViewportSize({ width: 390, height: 1000 });
  let post: OwnPublicSentence | null = null;
  await page.route("**/api/community/mine", async (route) => {
    if (route.request().method() === "POST") {
      const body = route.request().postDataJSON();
      expect(body.signatureStyle).toBe("drawn");
      expect(body.signatureDrawing.strokes[0].length).toBeGreaterThan(2);
      post = {
        ...card(
          "11111111-1111-4111-8111-111111111119",
          body.sentences[0],
          body.signature,
        ),
        signatureStyle: "drawn",
        signatureDrawing: body.signatureDrawing,
        revision: 0,
      };
    }
    await route.fulfill({ json: { posts: post ? [post] : [] } });
  });
  await page.route("**/api/community/sentences?*", (route) =>
    route.fulfill({ json: { posts: post ? [post] : [], nextCursor: null } }),
  );
  await page.goto("/sentences");
  await page
    .getByRole("button", { name: "Choose sentences to publish", exact: true })
    .click();
  const dialog = page.getByRole("dialog");
  await dialog.getByRole("checkbox", { name: saved[0], exact: true }).check();
  await expect(dialog.getByRole("radio", { name: /Draw it/ })).toBeChecked();
  await expect(
    dialog.getByRole("button", { name: "Publish 1 sentence", exact: true }),
  ).toBeDisabled();
  await drawSignature(page);
  await expect(dialog.locator(".signature-pad path")).toHaveCount(1);
  await drawSignature(page);
  await expect(dialog.locator(".signature-pad path")).toHaveCount(2);
  await dialog.getByRole("button", { name: "Undo", exact: true }).click();
  await expect(dialog.locator(".signature-pad path")).toHaveCount(1);
  await dialog.getByRole("button", { name: "Clear", exact: true }).click();
  await expect(dialog.locator(".signature-pad path")).toHaveCount(0);
  await expect(
    dialog.getByText("Draw your signature here", { exact: true }),
  ).toBeVisible();
  await drawSignature(page, true);
  await expect(dialog.locator(".signature-pad path")).toHaveCount(1);
  await expect(
    dialog.getByRole("img", { name: "Drawn signature", exact: true }),
  ).toBeVisible();
  await dialog.screenshot({
    path: "artifacts/community-drawn-signature-390.png",
  });
  await dialog
    .getByRole("button", { name: "Publish 1 sentence", exact: true })
    .click();
  await expect(dialog).not.toBeVisible();
  await page.goto("/community");
  await expect(
    page.getByRole("img", { name: "Drawn signature", exact: true }),
  ).toBeVisible();
  await expect(page.locator(".community-drawn-signature path")).toHaveCount(1);
});
test("anyone can read/search/page the gallery without auth and signatures render as text", async ({
  page,
}) => {
  const auth: string[] = [];
  page.on("request", (request) => {
    if (request.url().includes("/api/auth/")) auth.push(request.url());
  });
  const unsafeText = "<img src=x onerror=alert(1)>";
  const third = card(
    "33333333-3333-4333-8333-333333333333",
    "Ich wohne in Hamburg.",
    unsafeText,
  );
  await page.route("**/api/community/sentences?*", (route) => {
    const url = new URL(route.request().url());
    return route.fulfill({
      json: url.searchParams.get("q")
        ? { posts: [cards[1]], nextCursor: null }
        : url.searchParams.get("cursor")
          ? { posts: [third], nextCursor: null }
          : { posts: cards, nextCursor: "fixture-cursor" },
    });
  });
  await page.goto("/community");
  await expect(page.getByRole("heading", { level: 1 })).toContainText(
    "A little German.",
  );
  await expect(page.locator(".community-note-grid article")).toHaveCount(2);
  await expect(page.locator(".community-note-grid")).toContainText("نَبيل");
  await page
    .getByRole("button", { name: "Show more sentences", exact: true })
    .click();
  await expect(page.locator(".community-note-grid article")).toHaveCount(3);
  await expect(page.locator(".community-note-grid")).toContainText(unsafeText);
  expect(await page.locator(".community-note-grid img").count()).toBe(0);
  await page
    .getByRole("textbox", { name: "Search public sentences or signatures" })
    .fill("Familie");
  await page.getByRole("button", { name: "Search", exact: true }).click();
  await expect(page.locator(".community-note-grid article")).toHaveCount(1);
  await page.getByRole("button", { name: "Clear search", exact: true }).click();
  await expect(page.locator(".community-note-grid article")).toHaveCount(2);
  expect(auth).toEqual([]);
});
test("publishes selected sentences only, signs them, edits/removes public copies and preserves the notebook", async ({
  page,
}) => {
  await seed(page);
  let posts: OwnPublicSentence[] = [],
    published: unknown,
    publishCalls = 0;
  await page.route("**/api/community/mine", async (route) => {
    expect(route.request().headers()["x-learning-account"]).toBe(user);
    if (route.request().method() === "POST") {
      if (++publishCalls === 1) {
        await route.fulfill({
          status: 503,
          json: { error: "Publishing could not connect. Try again." },
        });
        return;
      }
      const body = route.request().postDataJSON();
      published = body;
      posts = body.sentences.map((german: string, i: number) => ({
        ...card(
          `11111111-1111-4111-8111-11111111111${i}`,
          german,
          body.signature,
        ),
        signatureStyle: body.signatureStyle,
        revision: 0,
      }));
    }
    await route.fulfill({ json: { posts } });
  });
  await page.route("**/api/community/mine/*", async (route) => {
    expect(route.request().headers()["x-learning-account"]).toBe(user);
    if (route.request().method() === "PATCH") {
      const body = route.request().postDataJSON();
      expect(body.revision).toBe(0);
      posts = [{ ...posts[0], ...body, revision: 1 }];
      await route.fulfill({ json: { posts } });
    } else {
      posts = [];
      await route.fulfill({ json: { removed: true } });
    }
  });
  await page.goto("/sentences");
  await page
    .getByRole("button", { name: "Choose sentences to publish", exact: true })
    .click();
  const dialog = page.getByRole("dialog");
  await dialog.getByRole("checkbox", { name: saved[0], exact: true }).check();
  await dialog.getByRole("radio", { name: /Personal/ }).check();
  await dialog
    .getByRole("textbox", { name: /Your name or handle/ })
    .fill("Nabil · mein Deutsch");
  await expect(dialog.locator(".community-publish-preview")).toContainText(
    "Nabil · mein Deutsch",
  );
  expect(published).toBeUndefined();
  await dialog
    .getByRole("button", { name: "Publish 1 sentence", exact: true })
    .click();
  await expect(dialog).toContainText("Publishing could not connect");
  await expect(
    dialog.getByRole("checkbox", { name: saved[0], exact: true }),
  ).toBeChecked();
  expect(published).toBeUndefined();
  await dialog
    .getByRole("button", { name: "Publish 1 sentence", exact: true })
    .click();
  await expect(dialog).not.toBeVisible();
  expect(published).toEqual({
    sentences: [saved[0]],
    signature: "Nabil · mein Deutsch",
    signatureStyle: "written",
    signatureDrawing: null,
    public: true,
  });
  await page.getByText("Manage my public sentences", { exact: false }).click();
  await expect(page.locator(".community-own-list article")).toHaveCount(1);
  await page
    .getByRole("button", {
      name: `Edit public sentence ${saved[0]}`,
      exact: true,
    })
    .click();
  await dialog
    .getByRole("textbox", { name: "Your public sentence", exact: true })
    .fill("Heute lerne ich Deutsch.");
  await dialog
    .getByRole("textbox", { name: /Your name or handle/ })
    .fill("نَبيل");
  await dialog.getByRole("radio", { name: /Simple/ }).check();
  await dialog
    .getByRole("button", { name: "Update public sentence", exact: true })
    .click();
  await expect(page.locator(".community-own-list")).toContainText("نَبيل");
  await page
    .getByRole("button", {
      name: "Remove public sentence Heute lerne ich Deutsch.",
      exact: true,
    })
    .click();
  await dialog
    .getByRole("button", { name: "Keep public", exact: true })
    .click();
  expect(posts).toHaveLength(1);
  await page
    .getByRole("button", {
      name: "Remove public sentence Heute lerne ich Deutsch.",
      exact: true,
    })
    .click();
  await dialog
    .getByRole("button", { name: "Remove from gallery", exact: true })
    .click();
  await expect(page.locator(".community-own-list article")).toHaveCount(0);
  const notebook = await page.evaluate(() =>
    JSON.parse(localStorage.getItem("deutsch-journey-v2")!),
  );
  expect(notebook.savedSentences).toEqual(saved);
  expect(notebook.lessonNotes["1"]).toBe("A private lesson note.");
  expect(notebook.xp).toBe(0);
});
test("guest sharing requires Google and the gallery has honest empty and retry states", async ({
  page,
}) => {
  await seed(page, false);
  await page.goto("/sentences");
  await expect(
    page.getByRole("link", { name: /Continue with Google to share/ }),
  ).toHaveAttribute("href", "/signin?next=%2Fsentences");
  expect(
    await page
      .getByRole("button", { name: "Choose sentences to publish" })
      .count(),
  ).toBe(0);
  let fail = true;
  await page.route("**/api/community/sentences?*", (route) =>
    route.fulfill(
      fail
        ? { status: 503, json: { error: "The gallery could not connect." } }
        : { json: { posts: [], nextCursor: null } },
    ),
  );
  await page.goto("/community");
  await expect(page.locator(".community-error[role=alert]")).toContainText(
    "could not connect",
  );
  fail = false;
  await page.getByRole("button", { name: "Try again", exact: true }).click();
  await expect(
    page.getByRole("heading", {
      name: "The first sentence could be yours.",
      exact: true,
    }),
  ).toBeVisible();
  await page
    .getByRole("textbox", { name: "Search public sentences or signatures" })
    .fill("No match");
  await page.getByRole("button", { name: "Search", exact: true }).click();
  await expect(
    page.getByRole("heading", {
      name: "No sentences match this search yet.",
      exact: true,
    }),
  ).toBeVisible();
});
test("signed-out learners cannot see the previous account's public-post management", async ({
  page,
}) => {
  await seed(page);
  await page.route("**/api/community/mine", (route) =>
    route.fulfill({
      json: {
        posts: [
          {
            ...cards[0],
            signature: "My private management signature",
            revision: 0,
          },
        ],
      },
    }),
  );
  await page.goto("/sentences");
  await page.getByText("Manage my public sentences", { exact: false }).click();
  await expect(page.locator(".community-own-list")).toContainText(
    "My private management signature",
  );
  await page.route("**/api/auth/get-session*", (route) =>
    route.fulfill({ json: null }),
  );
  await page.reload();
  await expect(
    page.getByRole("link", { name: /Continue with Google to share/ }),
  ).toBeVisible();
  await expect(page.locator(".community-own-list")).toHaveCount(0);
  await expect(
    page.getByRole("button", {
      name: "Choose sentences to publish",
      exact: true,
    }),
  ).toHaveCount(0);
});

test("gallery and the publishing dialog stay accessible on phones and in both themes", async ({
  page,
}) => {
  test.setTimeout(120000);
  await page.route("**/api/community/sentences?*", (route) =>
    route.fulfill({ json: { posts: cards, nextCursor: null } }),
  );
  await page.goto("/community");
  await expect(page.locator(".community-note-grid article")).toHaveCount(2);
  for (const width of [320, 390, 1440]) {
    await page.setViewportSize({ width, height: 1000 });
    for (const theme of ["light", "dark"]) {
      await page.evaluate((value) => {
        document.documentElement.dataset.theme = value;
      }, theme);
      await page.waitForTimeout(220);
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      ).toBe(true);
      const scan = await new AxeBuilder({ page }).analyze();
      expect(
        scan.violations.filter((item) =>
          ["serious", "critical"].includes(item.impact || ""),
        ),
      ).toEqual([]);
      if (width === 390 || width === 1440)
        await page.screenshot({
          path: `artifacts/community-${width}-${theme}.png`,
          fullPage: true,
        });
    }
  }
  await seed(page);
  await page.route("**/api/community/mine", (route) =>
    route.fulfill({ json: { posts: [] } }),
  );
  await page.goto("/sentences");
  await page
    .getByRole("button", { name: "Choose sentences to publish", exact: true })
    .click();
  const dialog = page.getByRole("dialog");
  await dialog.getByRole("checkbox", { name: saved[0], exact: true }).check();
  for (const width of [320, 390, 1440]) {
    await page.setViewportSize({ width, height: 1000 });
    for (const theme of ["light", "dark"]) {
      await page.evaluate((value) => {
        document.documentElement.dataset.theme = value;
      }, theme);
      await page.waitForTimeout(220);
      expect(
        await dialog.evaluate(
          (element) => element.scrollWidth <= element.clientWidth,
        ),
      ).toBe(true);
      const scan = await new AxeBuilder({ page })
        .include(".dialog-content")
        .analyze();
      expect(
        scan.violations.filter((item) =>
          ["serious", "critical"].includes(item.impact || ""),
        ),
      ).toEqual([]);
    }
  }
  await page.setViewportSize({ width: 390, height: 1000 });
  await dialog.screenshot({ path: "artifacts/community-publish-390.png" });
});
