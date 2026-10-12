import { test, expect, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { mkdir } from "node:fs/promises";
import { initialState } from "../../src/lib/content";
import {
  learningStorageKey,
  OWNER_KEY,
  STORAGE_KEY,
} from "../../src/lib/learning-storage";
import type {
  ProfileShare,
  SpaceDetail,
  StudySpace,
} from "../../src/lib/social-model";

const owner = {
  id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
  name: "Amina",
  email: "amina@example.com",
};
const partner = {
  id: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
  name: "Omar",
  email: "omar@example.com",
};
const spaceId = "11111111-1111-4111-8111-111111111111";
const token = "a".repeat(64),
  slug = "c".repeat(48);
function session(user: typeof owner | null) {
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
async function account(page: Page, user = owner) {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.route("**/api/auth/get-session*", (route) =>
    route.fulfill({ json: session(user) }),
  );
  await page.route("**/api/profile/photo", (route) =>
    route.fulfill({ status: 404, json: { error: "No photo" } }),
  );
  const state = initialState();
  state.name = user.name;
  state.onboardingComplete = true;
  state.savedSentences = ["Ich lerne jeden Tag Deutsch."];
  await page.addInitScript(
    ({ state, id, key, ownerKey, mirror }) => {
      if (!localStorage.getItem(key)) {
        localStorage.setItem(key, JSON.stringify(state));
        localStorage.setItem(ownerKey, id);
        localStorage.setItem(mirror, JSON.stringify(state));
      }
    },
    {
      state,
      id: user.id,
      key: learningStorageKey(user.id),
      ownerKey: OWNER_KEY,
      mirror: STORAGE_KEY,
    },
  );
}
async function checkLayout(page: Page) {
  await expect
    .poll(() =>
      page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    )
    .toBe(true);
  const scan = await new AxeBuilder({ page }).analyze();
  expect(
    scan.violations.filter(
      (v) => v.impact === "critical" || v.impact === "serious",
    ),
  ).toEqual([]);
}
function space(): StudySpace {
  return {
    id: spaceId,
    ownerId: owner.id,
    name: "Our German corner",
    members: [{ userId: owner.id, name: owner.name, seat: 0 }],
  };
}

test("owner creates a space, invites, shares selected entries and removes an entry", async ({
  page,
}) => {
  await account(page);
  let spaces: StudySpace[] = [];
  const detail: SpaceDetail = {
    space: space(),
    items: [],
    invites: [],
    nextCursor: null,
  };
  await page.route("**/api/spaces*", async (route) => {
    const request = route.request();
    expect(request.headers()["x-learning-account"]).toBe(owner.id);
    if (request.method() === "GET") {
      await route.fulfill({
        json: new URL(request.url()).searchParams.has("spaceId")
          ? detail
          : { spaces },
      });
      return;
    }
    const body = request.postDataJSON();
    if (body.action === "create") {
      detail.space.name = body.name;
      spaces = [detail.space];
    }
    if (body.action === "invite") {
      detail.invites = [{ seat: body.seat, expiresAt: "2030-01-01T00:00:00Z" }];
      await route.fulfill({ json: { token } });
      return;
    }
    if (body.action === "share")
      detail.items.unshift({
        id: crypto.randomUUID(),
        authorId: owner.id,
        authorName: owner.name,
        content: body.content,
        createdAt: new Date().toISOString(),
      });
    if (body.action === "delete-item")
      detail.items = detail.items.filter((i) => i.id !== body.itemId);
    await route.fulfill({ json: { spaceId } });
  });
  await page.goto("/space");
  await page.getByLabel("Space name", { exact: true }).fill("Unser Lernzimmer");
  await page.getByRole("button", { name: "Create my space" }).click();
  await expect(
    page.getByRole("heading", { name: "Unser Lernzimmer" }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Invite partner", exact: true })
    .first()
    .click();
  await expect(page.getByLabel("One-person invitation link")).toHaveValue(
    new RegExp(`/space\\?invite=${token}$`),
  );
  await page
    .getByLabel("From your vocabulary")
    .selectOption(initialState().words[0].id);
  await page.getByRole("button", { name: "Add to shared notebook" }).click();
  await expect(page.locator(".shared-item")).toHaveCount(1);
  await page.getByRole("button", { name: "Sentence", exact: true }).click();
  await page
    .getByLabel("German sentence", { exact: true })
    .fill("Zusammen lernen wir Deutsch.");
  await page.getByRole("button", { name: "Add to shared notebook" }).click();
  await expect(page.locator(".shared-item")).toHaveCount(2);
  await expect(page.locator(".shared-items")).toContainText(
    "Zusammen lernen wir Deutsch.",
  );
  await page
    .getByRole("button", { name: "Remove entry", exact: true })
    .first()
    .click();
  await page.getByRole("button", { name: "Cancel", exact: true }).click();
  await expect(page.locator(".shared-item")).toHaveCount(2);
  await page
    .getByRole("button", { name: "Remove entry", exact: true })
    .first()
    .click();
  await page.getByRole("button", { name: "Confirm", exact: true }).click();
  await expect(page.locator(".shared-item")).toHaveCount(1);
  await mkdir("artifacts/social", { recursive: true });
  for (const width of [320, 390, 1440]) {
    await page.setViewportSize({ width, height: 1000 });
    await checkLayout(page);
    await page.screenshot({
      path: `artifacts/social/owner-${width}.png`,
      fullPage: true,
    });
  }
  await page.getByRole("button", { name: "Switch to dark theme" }).click();
  await page.setViewportSize({ width: 390, height: 1000 });
  await checkLayout(page);
  await page.screenshot({
    path: "artifacts/social/owner-390-dark.png",
    fullPage: true,
  });
});

test("partner accepts an invitation, keeps shared entries and loses the space on refresh", async ({
  page,
}) => {
  await account(page, partner);
  const detail: SpaceDetail = {
    space: space(),
    items: [
      {
        id: "22222222-2222-4222-8222-222222222222",
        authorId: owner.id,
        authorName: owner.name,
        createdAt: new Date().toISOString(),
        content: { kind: "sentence", sentence: "Wir lernen zusammen." },
      },
      {
        id: "33333333-3333-4333-8333-333333333333",
        authorId: owner.id,
        authorName: owner.name,
        createdAt: new Date().toISOString(),
        content: {
          kind: "word",
          word: {
            german: "Lernpartner",
            english: "study partner",
            arabic: "",
            article: "der",
            type: "noun",
            plural: "Lernpartner",
            topic: "Learning",
            lesson: 1,
            example: "Mein Lernpartner heißt Omar.",
            hint: "Learn together",
          },
        },
      },
    ],
    invites: [],
    nextCursor: null,
  };
  let joined = false,
    removed = false;
  await page.route("**/api/spaces*", async (route) => {
    if (route.request().method() === "POST") {
      const action = route.request().postDataJSON();
      expect(action).toEqual({ action: "join", token });
      joined = true;
      detail.space.members.push({
        userId: partner.id,
        name: partner.name,
        seat: 1,
      });
      await route.fulfill({ json: { spaceId } });
      return;
    }
    await route.fulfill({
      json: new URL(route.request().url()).searchParams.has("spaceId")
        ? detail
        : { spaces: joined && !removed ? [detail.space] : [] },
    });
  });
  await page.goto(`/space?invite=${token}`);
  await page.getByRole("button", { name: "Accept invitation" }).click();
  await expect(page).toHaveURL("/space");
  await expect(
    page.getByRole("button", { name: "Invite partner", exact: true }),
  ).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "Remove entry", exact: true }),
  ).toHaveCount(0);
  await page.getByRole("button", { name: "Keep this word" }).click();
  await page.getByRole("button", { name: "Keep this sentence" }).click();
  const stored = await page.evaluate(
    (key) => JSON.parse(localStorage.getItem(key)!),
    learningStorageKey(partner.id),
  );
  const copied = stored.words.find(
    (w: { german: string }) => w.german === "Lernpartner",
  );
  expect(copied.reviews).toBe(0);
  expect(copied.status).toBe("new");
  expect(stored.savedSentences).toContain("Wir lernen zusammen.");
  removed = true;
  await page.getByRole("button", { name: "Refresh notebook" }).click();
  await expect(page.locator(".shared-items")).toHaveCount(0);
  await expect(
    page.getByRole("heading", { name: "Our German corner" }),
  ).toHaveCount(0);
});

test("invitation survives Google sign-in and requires explicit acceptance", async ({
  page,
  baseURL,
}) => {
  let user: typeof owner | null = null;
  await page.route("**/api/auth/get-session*", (route) =>
    route.fulfill({ json: session(user) }),
  );
  await page.route("**/api/spaces*", (route) =>
    route.fulfill({ json: { spaces: [] } }),
  );
  await page.route("**/api/auth/sign-in/social", async (route) => {
    const action = route.request().postDataJSON();
    expect(action.provider).toBe("google");
    const callback = new URL(action.callbackURL);
    expect(callback.searchParams.get("next")).toBe(`/space?invite=${token}`);
    expect(callback.origin).toBe(baseURL);
    user = owner;
    await route.fulfill({ json: { url: callback.href, redirect: true } });
  });
  await page.goto(`/space?invite=${token}`);
  await page
    .locator("main")
    .getByRole("link", { name: "Continue with Google" })
    .click();
  await page
    .getByRole("button", { name: "Continue with Google", exact: true })
    .click();
  await expect(page).toHaveURL(`/space?invite=${token}`);
  await expect(
    page.getByRole("button", { name: "Accept invitation" }),
  ).toBeVisible();
});

test("profile card supports private options, a downloaded image, publishing and revocation", async ({
  page,
}) => {
  await account(page);
  let share: ProfileShare | null = null;
  await page.route("**/api/profile/share", async (route) => {
    expect(route.request().headers()["x-learning-account"]).toBe(owner.id);
    if (route.request().method() === "POST") {
      const body = route.request().postDataJSON();
      expect(body.card.showPhoto).toBe(false);
      expect(body.card.showStats).toBe(false);
      expect(body.image).toMatch(/^data:image\/png;base64,/);
      expect(Object.keys(body).sort()).toEqual(["card", "image"]);
      share = { ...body, slug, updatedAt: new Date().toISOString() };
    } else if (route.request().method() === "DELETE") share = null;
    await route.fulfill({ json: { share } });
  });
  await page.goto("/profile");
  const panel = page.getByRole("region", {
    name: "A little progress, worth sharing.",
  });
  await panel.getByLabel("Card name").fill("Amina’s German journey");
  await panel.getByLabel("Google account photo").uncheck();
  await panel.getByLabel("Word count and XP").uncheck();
  const download = page.waitForEvent("download");
  await panel.getByRole("button", { name: "Download card image" }).click();
  const cardDownload = await download;
  expect(cardDownload.suggestedFilename()).toBe(
    "deutsch-journey-learner-card.png",
  );
  await mkdir("artifacts/social", { recursive: true });
  await cardDownload.saveAs("artifacts/social/card-private.png");
  await panel.getByRole("button", { name: "Create card link" }).click();
  await expect(panel.getByLabel("Public card link")).toHaveValue(
    new RegExp(`/share/${slug}$`),
  );
  await page.setViewportSize({ width: 390, height: 1000 });
  await checkLayout(page);
  await mkdir("artifacts/social", { recursive: true });
  await panel.scrollIntoViewIfNeeded();
  await panel.screenshot({
    path: "artifacts/social/profile-sharing-mobile.png",
  });
  await panel.getByRole("button", { name: "Turn sharing off" }).click();
  await expect(panel.getByLabel("Public card link")).toHaveCount(0);
  await expect(
    panel.getByRole("button", { name: "Create card link" }),
  ).toBeVisible();
});

test("public card links do not require a session and invalid cards show a useful state", async ({
  page,
}) => {
  let authRequests = 0;
  await page.route("**/api/auth/get-session*", (route) => {
    authRequests++;
    return route.fulfill({ json: null });
  });
  await page.goto("/share/invalid");
  await expect(
    page.getByRole("heading", { name: "This card is no longer shared." }),
  ).toBeVisible();
  expect(authRequests).toBe(0);
  await expect(
    page.getByRole("link", {
      name: "Visit Nabil Mohamed's personal website (opens in a new tab)",
    }),
  ).toHaveAttribute("href", "https://nabil7.site/");
  await page.setViewportSize({ width: 320, height: 900 });
  await checkLayout(page);
});
