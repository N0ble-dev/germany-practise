import { beforeEach, expect, it, vi } from "vitest";
import { randomBytes } from "node:crypto";
import { PgDialect } from "drizzle-orm/pg-core";
import { sealCalendarSecret } from "@/lib/calendar-security";
import { createSchedule } from "@/lib/planner-schedule";
import { googleEventId } from "@/lib/planner-calendar";

const mocks = vi.hoisted(() => ({
  getDb: vi.fn(),
  request: vi.fn(),
  credentials: vi.fn(),
}));
vi.mock("server-only", () => ({}));
vi.mock("@/db", () => ({ getDb: mocks.getDb }));
vi.mock("@/lib/auth", () => ({
  isCloudConfigured: () => true,
  getAuth: vi.fn(),
}));
vi.mock("google-auth-library", () => ({
  OAuth2Client: class {
    request = mocks.request;
    setCredentials = mocks.credentials;
  },
}));
import { syncCalendar } from "@/lib/google-calendar";

const userId = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
  key = randomBytes(32).toString("base64");
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
const oldId = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const row = {
  userId,
  calendarId: "owned-study-calendar",
  refreshToken: sealCalendarSecret(
    "refresh-test",
    key,
    `calendar-token:${userId}`,
  ),
  syncedIds: [oldId],
  revision: 3,
  syncedAt: null,
  syncLockUntil: null,
};
type Update = { values: Record<string, unknown>; where: unknown };
let updates: Update[];
let locked: typeof row | undefined;
beforeEach(() => {
  vi.clearAllMocks();
  vi.stubEnv("GOOGLE_CALENDAR_CLIENT_ID", "test-client");
  vi.stubEnv("GOOGLE_CALENDAR_CLIENT_SECRET", "test-secret");
  vi.stubEnv("APP_URL", "http://localhost:3008");
  vi.stubEnv("CALENDAR_TOKEN_ENCRYPTION_KEY", key);
  updates = [];
  locked = row;
  mocks.getDb.mockReturnValue({
    update: () => ({
      set: (values: Record<string, unknown>) => ({
        where: (where: unknown) => {
          updates.push({ values, where });
          const result = Promise.resolve(undefined);
          return Object.assign(result, {
            returning: async () => (locked ? [locked] : []),
          });
        },
      }),
    }),
  });
});
it("rejects stale or simultaneous syncs before contacting Google", async () => {
  locked = undefined;
  expect(await syncCalendar(userId, sessions, 3)).toEqual({ conflict: true });
  expect(mocks.request).not.toHaveBeenCalled();
  const query = new PgDialect().sqlToQuery(
    updates[0].where as Parameters<PgDialect["sqlToQuery"]>[0],
  );
  expect(query.params).toContain(userId);
  expect(query.params).toContain(3);
  expect(query.sql).toContain('"sync_lock_until"');
});
it("retries stable IDs without duplicating events and removes only tracked old events", async () => {
  mocks.request
    .mockRejectedValueOnce({ response: { status: 404 } })
    .mockRejectedValueOnce({ response: { status: 409 } })
    .mockResolvedValue({ data: {} });
  expect(await syncCalendar(userId, sessions, 3)).toEqual({
    conflict: false,
    failed: 0,
    succeeded: 1,
    revision: 4,
  });
  const calls = mocks.request.mock.calls.map(([request]) => request);
  expect(calls.map((r) => r.method)).toEqual(["PUT", "POST", "PUT", "DELETE"]);
  expect(calls[1].data.id).toBe(googleEventId(sessions[0].id));
  expect(calls[3].url).toContain(
    `/owned-study-calendar/events/${googleEventId(oldId)}`,
  );
  expect(mocks.credentials).toHaveBeenCalledWith({
    refresh_token: "refresh-test",
  });
  expect(updates[1].values.syncedIds).toEqual([oldId, sessions[0].id]);
  expect(updates.at(-1)?.values).toMatchObject({
    syncedIds: [sessions[0].id],
    revision: 4,
    syncLockUntil: null,
  });
});
it("retains manifests for failed provider writes so the next sync can reconcile them", async () => {
  mocks.request.mockRejectedValue({ response: { status: 503 } });
  expect(await syncCalendar(userId, sessions, 3)).toEqual({
    conflict: false,
    failed: 2,
    succeeded: 0,
    revision: 4,
  });
  expect(updates.at(-1)?.values).toMatchObject({
    syncedIds: [oldId, sessions[0].id],
    syncedAt: null,
    syncLockUntil: null,
    revision: 4,
  });
});
