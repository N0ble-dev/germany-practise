import { beforeEach, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ session: vi.fn(), db: vi.fn() }));
vi.mock("@/lib/auth", () => ({
  isCloudConfigured: () => true,
  getAuth: () => ({ getSession: mocks.session }),
}));
vi.mock("@/db", () => ({ getDb: mocks.db }));
import { GET, PUT } from "@/app/api/progress/route";
beforeEach(() => {
  vi.resetAllMocks();
  vi.stubEnv("APP_URL", "http://localhost:3008");
  mocks.session.mockResolvedValue({
    data: { user: { id: "account-b" } },
    error: null,
  });
});
it("rejects stale cloud reads and writes from the previous account before touching the database", async () => {
  const headers = {
    "X-Learning-Account": "account-a",
    Origin: "http://localhost:3008",
  };
  expect(
    (await GET(new Request("http://localhost:3008/api/progress", { headers })))
      .status,
  ).toBe(409);
  expect(
    (
      await PUT(
        new Request("http://localhost:3008/api/progress", {
          method: "PUT",
          headers,
          body: "{}",
        }),
      )
    ).status,
  ).toBe(409);
  expect(mocks.db).not.toHaveBeenCalled();
});
it("never uses a supplied account hint as authentication", async () => {
  mocks.session.mockResolvedValue({ data: null, error: null });
  const headers = {
    "X-Learning-Account": "account-a",
    Origin: "http://localhost:3008",
  };
  expect(
    (await GET(new Request("http://localhost:3008/api/progress", { headers })))
      .status,
  ).toBe(401);
  expect(
    (
      await PUT(
        new Request("http://localhost:3008/api/progress", {
          method: "PUT",
          headers,
          body: "{}",
        }),
      )
    ).status,
  ).toBe(401);
  expect(mocks.db).not.toHaveBeenCalled();
});
