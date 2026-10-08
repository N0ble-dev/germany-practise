import { randomUUID } from "node:crypto";
import { config } from "dotenv";
import { neon } from "@neondatabase/serverless";
import { test, expect, type BrowserContext, type Page } from "@playwright/test";

test("verification codes give useful feedback before a learner signs in", async ({
  page,
}) => {
  const email = "verification-test@example.com";
  await page.route("**/api/auth/get-session*", (route) =>
    route.fulfill({ status: 200, json: null }),
  );
  await page.route("**/api/auth/sign-in/email", (route) =>
    route.fulfill({
      status: 403,
      json: { code: "EMAIL_NOT_VERIFIED", message: "Email not verified" },
    }),
  );
  await page.route(
    "**/api/auth/email-otp/send-verification-otp",
    async (route) => {
      expect(route.request().postDataJSON()).toMatchObject({
        email,
        type: "email-verification",
      });
      await route.fulfill({ status: 200, json: { success: true } });
    },
  );
  await page.route("**/api/auth/email-otp/verify-email", async (route) => {
    const input = route.request().postDataJSON();
    expect(input.email).toBe(email);
    await route.fulfill(
      input.otp === "654321"
        ? { status: 200, json: { status: true } }
        : {
            status: 400,
            json: {
              code: "INVALID_OTP",
              message: "That verification code is incorrect.",
            },
          },
    );
  });
  await page.goto("/profile");
  await expect(page.locator("main h1")).toBeVisible();
  test.skip(
    (await page
      .getByRole("button", { name: "Sign in", exact: true })
      .count()) === 0,
    "The build has no cloud account configuration.",
  );
  await page.getByRole("textbox", { name: "Email", exact: true }).fill(email);
  await page
    .getByLabel("Password", { exact: true })
    .fill("Example-password-123!");
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(
    page.getByLabel("Verification code", { exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Send verification code", exact: true })
    .click();
  await expect(
    page.getByText("Check your email for a six-digit verification code.", {
      exact: true,
    }),
  ).toBeVisible();
  await page.getByLabel("Verification code", { exact: true }).fill("123456");
  await page.getByRole("button", { name: "Verify email", exact: true }).click();
  await expect(page.locator("main").getByRole("alert")).toContainText(
    "That code could not be verified",
  );
  await page.getByLabel("Verification code", { exact: true }).fill("654321");
  await page.getByRole("button", { name: "Verify email", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Sign in", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByText("Email verified. Sign in to continue your journey.", {
      exact: true,
    }),
  ).toBeVisible();
});

test("managed Neon accounts restore sessions, isolate backups, and reject stale saves", async ({
  page,
  browser,
  baseURL,
}) => {
  test.skip(
    process.env.RUN_NEON_AUTH_E2E !== "1",
    "Opt in to temporary-account tests against your configured Neon branch.",
  );
  test.setTimeout(120_000);
  config({ path: ".env.local", quiet: true });
  if (!process.env.DATABASE_URL)
    throw new Error("Neon account tests need DATABASE_URL.");
  const sql = neon(process.env.DATABASE_URL);
  const password = `Journey-${randomUUID()}-aA1!`;
  const emails = [0, 1].map(() => `journey-test-${randomUUID()}@example.com`);
  const created: string[] = [];
  let other: BrowserContext | undefined;
  async function register(target: Page, email: string) {
    await target.goto("/profile");
    await target
      .getByRole("button", { name: "Save my name", exact: true })
      .click();
    await target
      .getByRole("button", { name: "Create an account", exact: true })
      .click();
    await target
      .getByRole("textbox", { name: "Email", exact: true })
      .fill(email);
    await target.getByLabel("Password", { exact: true }).fill(password);
    created.push(email);
    await target
      .getByRole("button", { name: "Create account", exact: true })
      .click();
    await expect(
      target.getByText(`Signed in as ${email}.`, { exact: false }),
    ).toBeVisible();
  }
  try {
    await register(page, emails[0]);
    await page.reload();
    await expect(
      page.getByText(`Signed in as ${emails[0]}.`, { exact: false }),
    ).toBeVisible();
    await page
      .getByRole("button", { name: "Save to cloud", exact: true })
      .click();
    await expect(
      page.getByText("Your cloud backup is saved.", { exact: true }),
    ).toBeVisible();
    const initial = await (await page.request.get("/api/progress")).json();
    expect(initial.revision).toBe(1);
    const userA = (
      await (await page.request.get("/api/auth/get-session")).json()
    ).user.id;
    other = await browser.newContext({ baseURL });
    const second = await other.newPage();
    await register(second, emails[1]);
    const empty = await (await other.request.get("/api/progress")).json();
    expect(empty).toEqual({ data: null, revision: 0 });
    // A supplied user ID cannot transfer a snapshot to a different account.
    const forged = await other.request.put("/api/progress", {
      headers: { Origin: baseURL! },
      data: {
        data: { ...initial.data, name: "Second learner" },
        revision: 0,
        userId: userA,
      },
    });
    expect(forged.ok()).toBe(true);
    expect(
      (await (await other.request.get("/api/progress")).json()).data.name,
    ).toBe("Second learner");
    expect(
      (await (await page.request.get("/api/progress")).json()).data.name,
    ).toBe(initial.data.name);
    await second.getByRole("button", { name: "Sign out", exact: true }).click();
    await expect(
      second.getByRole("button", { name: "Sign in", exact: true }),
    ).toBeVisible();
    expect((await other.request.get("/api/progress")).status()).toBe(401);
    await second
      .getByRole("textbox", { name: "Email", exact: true })
      .fill(emails[0]);
    await second.getByLabel("Password", { exact: true }).fill(password);
    await second.getByRole("button", { name: "Sign in", exact: true }).click();
    await expect(
      second.getByText(`Signed in as ${emails[0]}.`, { exact: false }),
    ).toBeVisible();
    await second
      .getByRole("button", { name: "Load cloud backup", exact: true })
      .click();
    await second
      .getByRole("dialog")
      .getByRole("button", { name: "Load this journey", exact: true })
      .click();
    await second
      .getByRole("textbox", { name: "What should we call you?" })
      .fill("Cloud learner");
    await second
      .getByRole("button", { name: "Save my name", exact: true })
      .click();
    await second
      .getByRole("button", { name: "Save to cloud", exact: true })
      .click();
    await expect(
      second.getByText("Your cloud backup is saved.", { exact: true }),
    ).toBeVisible();
    const updated = await (await other.request.get("/api/progress")).json();
    expect(updated.revision).toBe(2);
    expect(updated.data.name).toBe("Cloud learner");
    await page
      .getByRole("button", { name: "Save to cloud", exact: true })
      .click();
    await expect(page.locator("main").getByRole("alert")).toContainText(
      "Another device has newer progress",
    );
    await page.getByRole("button", { name: "Sign out", exact: true }).click();
    await expect(
      page.getByRole("button", { name: "Sign in", exact: true }),
    ).toBeVisible();
    expect((await page.request.get("/api/progress")).status()).toBe(401);
    expect(
      await page.evaluate(
        () => JSON.parse(localStorage.getItem("deutsch-journey-v2")!).name,
      ),
    ).toBe(initial.data.name);
  } finally {
    await other?.close();
    for (const email of created) {
      try {
        // Remove only test-owned identities; backup and auth rows cascade on deletion.
        // This does not depend on enabling public account deletion on the branch.
        await sql`delete from neon_auth."user" where email=${email}`;
      } catch {
        throw new Error(
          "The temporary Neon test account could not be removed.",
        );
      }
    }
  }
});
