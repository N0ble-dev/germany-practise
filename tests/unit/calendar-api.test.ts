import { beforeEach, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { randomBytes } from "node:crypto";
import {
  sealCalendarSecret,
  openCalendarSecret,
} from "@/lib/calendar-security";
import { createSchedule } from "@/lib/planner-schedule";

const mocks = vi.hoisted(() => ({
  user: vi.fn(),
  configured: vi.fn(),
  connection: vi.fn(),
  finish: vi.fn(),
  sync: vi.fn(),
  disconnect: vi.fn(),
  client: vi.fn(),
}));
const key = randomBytes(32).toString("base64"),
  id = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
vi.mock("@/lib/google-calendar", () => ({
  calendarAppUrl: () => "http://localhost:3008",
  calendarConfigured: mocks.configured,
  calendarUser: mocks.user,
  calendarConnection: mocks.connection,
  finishCalendarConnection: mocks.finish,
  syncCalendar: mocks.sync,
  disconnectCalendar: mocks.disconnect,
  calendarClient: mocks.client,
  calendarScope: "https://www.googleapis.com/auth/calendar.app.created",
  oauthCookie: "dj-google-calendar-oauth",
  sealForCalendar: (value: string, context: string) =>
    sealCalendarSecret(value, key, context),
  openForCalendar: (value: string, context: string) =>
    openCalendarSecret(value, key, context),
  trustedCalendarRequest: (request: Request) =>
    request.headers.get("origin") === "http://localhost:3008",
}));
import { POST as connect } from "@/app/api/calendar/google/connect/route";
import { GET as callback } from "@/app/api/calendar/google/callback/route";
import { POST as sync } from "@/app/api/calendar/google/sync/route";
import { GET as status } from "@/app/api/calendar/google/route";

beforeEach(() => {
  vi.resetAllMocks();
  mocks.configured.mockReturnValue(true);
  mocks.user.mockResolvedValue({ id });
});
function post(
  path: string,
  body: unknown = {},
  origin = "http://localhost:3008",
) {
  return new Request(`http://localhost:3008/api/calendar/google/${path}`, {
    method: "POST",
    headers: { origin, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}
function pending(changes: Record<string, unknown> = {}) {
  return sealCalendarSecret(
    JSON.stringify({
      state: "s".repeat(43),
      codeVerifier: "v".repeat(64),
      userId: id,
      expiresAt: Date.now() + 300_000,
      ...changes,
    }),
    key,
    "calendar-oauth",
  );
}
function callbackRequest(cookie: string, state = "s".repeat(43)) {
  return new NextRequest(
    `http://localhost:3008/api/calendar/google/callback?state=${state}&code=private-code`,
    { headers: { cookie: `dj-google-calendar-oauth=${cookie}` } },
  );
}

it("requires same-origin requests and a session before connecting or syncing", async () => {
  expect(
    (await connect(post("connect", {}, "https://other.example"))).status,
  ).toBe(403);
  expect((await sync(post("sync", {}, "https://other.example"))).status).toBe(
    403,
  );
  mocks.user.mockResolvedValue(null);
  expect((await connect(post("connect"))).status).toBe(401);
  expect((await sync(post("sync"))).status).toBe(401);
  expect(mocks.sync).not.toHaveBeenCalled();
});
it("uses offline narrow-scope PKCE and an encrypted user-bound HttpOnly cookie", async () => {
  const generateAuthUrl = vi.fn<(options: Record<string, unknown>) => string>(
    () => "https://accounts.google.com/mock-consent",
  );
  mocks.client.mockReturnValue({
    generateCodeVerifierAsync: async () => ({
      codeVerifier: "v".repeat(64),
      codeChallenge: "challenge",
    }),
    generateAuthUrl,
  });
  const response = await connect(post("connect"));
  expect(response.status).toBe(200);
  const options = generateAuthUrl.mock.calls[0][0];
  expect(options).toMatchObject({
    access_type: "offline",
    prompt: "consent",
    scope: ["https://www.googleapis.com/auth/calendar.app.created"],
    code_challenge: "challenge",
    code_challenge_method: "S256",
  });
  const header = response.headers.get("set-cookie")!;
  expect(header).toContain("HttpOnly");
  expect(header).toContain("SameSite=lax");
  expect(header).toContain("Max-Age=600");
  const cookie = header.split(";")[0].split("=").slice(1).join("=");
  expect(
    JSON.parse(
      openCalendarSecret(decodeURIComponent(cookie), key, "calendar-oauth"),
    ),
  ).toMatchObject({
    userId: id,
    state: options.state,
    codeVerifier: "v".repeat(64),
  });
});
it("rejects changed state, wrong accounts, expired cookies and tampering without exposing codes", async () => {
  for (const [cookie, state] of [
    [pending(), "wrong-state"],
    [
      pending({ userId: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb" }),
      "s".repeat(43),
    ],
    [pending({ expiresAt: Date.now() - 1000 }), "s".repeat(43)],
    ["invalid-cookie", "s".repeat(43)],
  ]) {
    const response = await callback(callbackRequest(cookie, state));
    expect(response.headers.get("location")).toBe(
      "http://localhost:3008/planner?calendar=error",
    );
    expect(response.headers.get("set-cookie")).toContain("Max-Age=0");
    expect(response.headers.get("referrer-policy")).toBe("no-referrer");
  }
  expect(mocks.finish).not.toHaveBeenCalled();
});
it("exchanges a valid callback only for the signed-in owner", async () => {
  const response = await callback(callbackRequest(pending()));
  expect(mocks.finish).toHaveBeenCalledWith(id, "private-code", "v".repeat(64));
  expect(response.headers.get("location")).toBe(
    "http://localhost:3008/planner?calendar=connected",
  );
});
it("does not return provider credentials or calendar identifiers to the browser", async () => {
  mocks.connection.mockResolvedValue({
    calendarId: "provider-private-id",
    refreshToken: "encrypted-private-token",
    revision: 2,
    syncedAt: null,
    syncedIds: [],
  });
  const response = await status(),
    data = await response.json();
  expect(data).toEqual({
    configured: true,
    signedIn: true,
    connected: true,
    revision: 2,
    syncedAt: null,
    syncedSessionIds: [],
  });
  expect(JSON.stringify(data)).not.toContain("private");
});
it("validates schedules and takes ownership from the session rather than the payload", async () => {
  expect(
    (await sync(post("sync", { sessions: [{ duration: 0 }], revision: 0 })))
      .status,
  ).toBe(400);
  const sessions = createSchedule({
    title: "German",
    date: "2030-01-01",
    time: "19:00",
    timeZone: "Europe/Berlin",
    duration: 20,
    kind: "review",
    lesson: 1,
    note: "",
    reminder: 15,
    repeat: "once",
    until: "2030-01-01",
    weekdays: [],
  });
  mocks.sync.mockResolvedValue({
    conflict: false,
    failed: 0,
    succeeded: 1,
    revision: 1,
  });
  expect(
    (
      await sync(
        post("sync", {
          sessions,
          revision: 0,
          userId: "another-user",
          calendarId: "another-calendar",
        }),
      )
    ).status,
  ).toBe(200);
  expect(mocks.sync).toHaveBeenCalledWith(id, sessions, 0);
  mocks.sync.mockResolvedValue({ conflict: true });
  expect((await sync(post("sync", { sessions, revision: 0 }))).status).toBe(
    409,
  );
  mocks.sync.mockResolvedValue({
    conflict: false,
    failed: 1,
    succeeded: 0,
    revision: 2,
  });
  expect((await sync(post("sync", { sessions, revision: 1 }))).status).toBe(
    502,
  );
});
