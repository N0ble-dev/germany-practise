import { test, expect, type Page } from "@playwright/test";
import { initialState } from "../../src/lib/content";

function mockSession() {
  const now = new Date().toISOString(),
    id = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
  return {
    user: {
      id,
      name: "Amina",
      email: "amina@example.com",
      emailVerified: true,
      createdAt: now,
      updatedAt: now,
    },
    session: {
      id,
      userId: id,
      token: "mock-session",
      expiresAt: "2035-01-01T00:00:00Z",
      createdAt: now,
      updatedAt: now,
    },
  };
}
async function localState(page: Page) {
  return page.evaluate(() =>
    JSON.parse(localStorage.getItem("deutsch-journey-v2")!),
  );
}
for (const entry of ["signup", "signin"]) {
  test(`Google ${entry} restores a verified session and the learner's name`, async ({
    page,
    baseURL,
  }) => {
    let signedIn = false;
    await page.route("**/api/auth/get-session*", (route) =>
      route.fulfill({ json: signedIn ? mockSession() : null }),
    );
    await page.route("**/api/auth/sign-in/social", async (route) => {
      const input = route.request().postDataJSON();
      expect(input.provider).toBe("google");
      expect(input.callbackURL).toBe(baseURL + "/auth/complete?next=%2F");
      // Both new and returning users use the same SDK-managed callback.
      expect(input.newUserCallbackURL).toBeUndefined();
      expect(input.errorCallbackURL).toBe(
        baseURL + "/signin?oauth=error&next=%2F",
      );
      expect(input.scopes).toBeUndefined();
      expect((await localState(page)).onboardingComplete).toBe(false);
      signedIn = true;
      await route.fulfill({ json: { url: input.callbackURL, redirect: true } });
    });
    await page.goto("/" + entry);
    await page
      .getByRole("button", { name: "Continue with Google", exact: true })
      .click();
    await expect(page).toHaveURL("/");
    await expect(page.locator("main h1")).toContainText("Amina");
    expect((await localState(page)).onboardingComplete).toBe(true);
    await page.reload();
    await expect(
      page.getByRole("link", { name: "My account", exact: true }),
    ).toBeVisible();
    await expect(page.locator("main h1")).toContainText("Amina");
  });
}

test("Google errors and cancellation leave onboarding incomplete", async ({
  page,
}) => {
  await page.route("**/api/auth/get-session*", (route) =>
    route.fulfill({ json: null }),
  );
  await page.route("**/api/auth/sign-in/social", (route) =>
    route.fulfill({
      status: 400,
      json: {
        code: "PROVIDER_NOT_FOUND",
        message: "Provider is not configured",
      },
    }),
  );
  await page.goto("/signup");
  await page
    .getByRole("button", { name: "Continue with Google", exact: true })
    .click();
  await expect(page.locator("main").getByRole("alert")).toContainText(
    "Google sign-in could not start",
  );
  expect((await localState(page)).onboardingComplete).toBe(false);
  await expect(
    page.getByRole("button", { name: "Continue with Google", exact: true }),
  ).toBeEnabled();
  await page.goto("/signin?oauth=error");
  await expect(page.locator("main").getByRole("alert")).toContainText(
    "Google sign-in did not finish",
  );
  expect((await localState(page)).onboardingComplete).toBe(false);
});

test("a callback without a session does not authenticate or allow an external return", async ({
  page,
}) => {
  await page.route("**/api/auth/get-session*", (route) =>
    route.fulfill({ json: null }),
  );
  await page.goto(
    "/auth/complete?next=https%3A%2F%2Fother.example&neon_auth_session_verifier=invalid",
  );
  await expect(page.locator("main").getByRole("alert")).toContainText(
    "Google sign-in did not finish",
  );
  await expect(
    page.getByRole("link", { name: "Return to Google sign-in" }),
  ).toHaveAttribute("href", "/signin?next=%2F");
  expect((await localState(page)).onboardingComplete).toBe(false);
  expect((await localState(page)).name).toBe(initialState().name);
});

test("calendar sign-in returns to the planner and preserves guest progress", async ({
  page,
}) => {
  const state = initialState();
  state.onboardingComplete = true;
  state.name = "My study name";
  state.xp = 42;
  await page.addInitScript(
    (value) =>
      localStorage.setItem("deutsch-journey-v2", JSON.stringify(value)),
    state,
  );
  let signedIn = false;
  await page.route("**/api/auth/get-session*", (route) =>
    route.fulfill({ json: signedIn ? mockSession() : null }),
  );
  await page.route("**/api/calendar/google", (route) =>
    route.fulfill({
      json: {
        configured: true,
        signedIn,
        connected: false,
        revision: 0,
        syncedAt: null,
        syncedSessionIds: [],
      },
    }),
  );
  await page.route("**/api/auth/sign-in/social", async (route) => {
    const input = route.request().postDataJSON();
    expect(new URL(input.callbackURL).searchParams.get("next")).toBe(
      "/planner",
    );
    signedIn = true;
    await route.fulfill({ json: { url: input.callbackURL, redirect: true } });
  });
  await page.goto("/planner");
  await page
    .getByRole("button", { name: "Google Calendar", exact: true })
    .click();
  await page
    .getByRole("link", {
      name: "Sign in to connect Google Calendar",
      exact: true,
    })
    .click();
  await page
    .getByRole("button", { name: "Continue with Google", exact: true })
    .click();
  await expect(page).toHaveURL(/\/planner$/);
  await expect(
    page.getByText("this separate step asks for calendar permission", {
      exact: false,
    }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Connect Google Calendar", exact: true }),
  ).toBeVisible();
  expect((await localState(page)).name).toBe("My study name");
  expect((await localState(page)).xp).toBe(42);
});

test("restored Google sessions keep cloud controls and sign-out clears account UI", async ({
  page,
}) => {
  let signedIn = true;
  await page.route("**/api/auth/get-session*", (route) =>
    route.fulfill({ json: signedIn ? mockSession() : null }),
  );
  await page.route("**/api/progress", (route) =>
    route.fulfill({
      json:
        route.request().method() === "PUT"
          ? { revision: 1 }
          : { data: null, revision: 0 },
    }),
  );
  await page.route("**/api/auth/sign-out", (route) => {
    signedIn = false;
    return route.fulfill({ json: { success: true } });
  });
  await page.goto("/profile");
  await expect(
    page.getByText("Signed in as amina@example.com.", { exact: false }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Save to cloud", exact: true })
    .click();
  await expect(
    page.getByText("Your cloud backup is saved.", { exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Sign out", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Continue with Google", exact: true }),
  ).toBeVisible();
  await page.reload();
  await expect(
    page.getByRole("button", { name: "Continue with Google", exact: true }),
  ).toBeVisible();
  expect((await localState(page)).words).toHaveLength(
    initialState().words.length,
  );
});

test("the app proxy rejects email, password, OTP and other identity methods", async ({
  request,
}) => {
  for (const path of [
    "sign-up/email",
    "sign-in/email",
    "sign-in/email-otp",
    "sign-in/magic-link",
    "sign-in/anonymous",
    "email-otp/send-verification-otp",
    "reset-password",
    "phone-number/sign-in",
    "callback/github",
  ]) {
    expect(
      (
        await request.post("/api/auth/" + path, {
          data: { email: "blocked@example.com", password: "unused-password" },
        })
      ).status(),
    ).toBe(403);
  }
  for (const provider of ["github", "vercel", "google ", ""])
    expect(
      (
        await request.post("/api/auth/sign-in/social", { data: { provider } })
      ).status(),
    ).toBe(403);
  expect(
    (
      await request.post("/api/auth/sign-in/social", {
        data: Buffer.from("not-json"),
        headers: { "Content-Type": "application/json" },
      })
    ).status(),
  ).toBe(400);
  // A configured but unreachable identity service must also deny the read.
  expect([401, 503]).toContain((await request.get("/api/progress")).status());
});

test("configured Neon Google OAuth can start without creating an account", async ({
  request,
  baseURL,
}) => {
  test.skip(
    process.env.RUN_NEON_AUTH_E2E !== "1",
    "Opt in to provider initiation against the configured Neon service.",
  );
  const response = await request.post("/api/auth/sign-in/social", {
    headers: { Origin: baseURL! },
    data: {
      provider: "google",
      callbackURL: baseURL + "/auth/complete",
      disableRedirect: true,
    },
  });
  expect(response.status()).toBe(200);
  const body = await response.json();
  const url = new URL(body.url);
  expect(url.protocol).toBe("https:");
  expect(
    url.hostname.endsWith(".neon.tech") ||
      url.hostname === "accounts.google.com",
  ).toBe(true);
  expect(
    (await (await request.get("/api/auth/get-session")).json())?.user,
  ).toBeFalsy();
  expect((await request.get("/api/progress")).status()).toBe(401);
});

test("the SDK popup handoff works when a preview host allows embedding", async ({
  page,
  context,
  baseURL,
}) => {
  let signedIn = false;
  // Production keeps X-Frame-Options: DENY. Only this test host permits framing
  // to exercise the SDK's alternative popup transport without changing that policy.
  await context.route(baseURL + "/**", async (route) => {
    if (!route.request().isNavigationRequest()) return route.fallback();
    const response = await route.fetch();
    const headers = response.headers();
    delete headers["x-frame-options"];
    await route.fulfill({ response, headers });
  });
  await context.route("**/api/auth/get-session*", (route) =>
    route.fulfill({ json: signedIn ? mockSession() : null }),
  );
  await context.route("**/api/auth/sign-in/social", async (route) => {
    const input = route.request().postDataJSON();
    const callback = new URL(input.callbackURL);
    expect(input.provider).toBe("google");
    expect(input.disableRedirect).toBe(true);
    expect(input.newUserCallbackURL).toBeUndefined();
    expect(callback.pathname).toBe("/auth/callback");
    expect(callback.searchParams.get("neon_popup")).toBe("1");
    callback.searchParams.set(
      "neon_auth_session_verifier",
      "mock-preview-verifier",
    );
    signedIn = true;
    await route.fulfill({ json: { url: callback.href, redirect: false } });
  });
  // A standalone preview host keeps the secure origin without a parent React app.
  await context.route(baseURL + "/__test-preview-host", (route) =>
    route.fulfill({
      contentType: "text/html",
      body:
        '<iframe title="Learning preview" src="' +
        baseURL +
        '/signup" style="width:1200px;height:900px"></iframe>',
    }),
  );
  await page.goto("/__test-preview-host");
  const preview = page.frameLocator('iframe[title="Learning preview"]');
  await preview
    .getByRole("button", { name: "Continue with Google", exact: true })
    .click();
  await expect(preview.locator("main h1")).toContainText("Amina");
  await expect(
    preview.getByRole("link", { name: "My account", exact: true }),
  ).toBeVisible();
  expect(
    await preview.locator("body").evaluate(() => {
      return JSON.parse(localStorage.getItem("deutsch-journey-v2")!)
        .onboardingComplete;
    }),
  ).toBe(true);
  await expect.poll(() => context.pages().length).toBe(1);
});

test("the SDK exchanges a callback verifier and keeps it out of saved learning data", async ({
  page,
}) => {
  let receivedVerifier = false;
  await page.route("**/api/auth/get-session*", (route) => {
    receivedVerifier ||=
      new URL(route.request().url()).searchParams.get(
        "neon_auth_session_verifier",
      ) === "mock-return-verifier";
    return route.fulfill({ json: mockSession() });
  });
  await page.goto(
    "/auth/complete?next=%2Fprofile&neon_auth_session_verifier=mock-return-verifier",
  );
  await expect(page).toHaveURL(/\/profile$/);
  await expect(
    page.getByText("Signed in as amina@example.com.", { exact: false }),
  ).toBeVisible();
  expect(receivedVerifier).toBe(true);
  expect(JSON.stringify(await localState(page))).not.toContain(
    "mock-return-verifier",
  );
});
