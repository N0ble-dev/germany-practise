import { afterEach, beforeEach, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  session: vi.fn(),
  fetch: vi.fn(),
  configured: vi.fn(),
}));
vi.mock("@/lib/auth", () => ({
  isAuthConfigured: mocks.configured,
  getAuth: () => ({ getSession: mocks.session }),
}));
import { GET } from "@/app/api/profile/photo/route";

const photo = "https://lh3.googleusercontent.com/a/user-photo=s96-c";
const request = (account = "learner-a") =>
  new Request("http://localhost:3008/api/profile/photo", {
    headers: { "X-Learning-Account": account },
  });
beforeEach(() => {
  vi.resetAllMocks();
  vi.stubGlobal("fetch", mocks.fetch);
  mocks.configured.mockReturnValue(true);
  mocks.session.mockResolvedValue({
    data: { user: { id: "learner-a", image: photo } },
    error: null,
  });
});
afterEach(() => vi.unstubAllGlobals());

it("requires a verified session and rejects requests from a stale account", async () => {
  mocks.session.mockResolvedValueOnce({ data: null, error: null });
  expect((await GET(request())).status).toBe(401);
  expect((await GET(request("learner-b"))).status).toBe(409);
  mocks.session.mockResolvedValueOnce({
    data: null,
    error: { message: "unavailable" },
  });
  expect((await GET(request())).status).toBe(503);
  expect(mocks.fetch).not.toHaveBeenCalled();
});

it("serves the authenticated Google photo with private headers and no forwarded credentials", async () => {
  const bytes = new Uint8Array([137, 80, 78, 71]);
  mocks.fetch.mockResolvedValue(
    new Response(bytes, { headers: { "Content-Type": "image/png" } }),
  );
  const result = await GET(request());
  expect(result.status).toBe(200);
  expect(new Uint8Array(await result.arrayBuffer())).toEqual(bytes);
  expect(result.headers.get("cache-control")).toBe("private, no-store");
  expect(result.headers.get("vary")).toBe("Cookie");
  expect(result.headers.get("content-type")).toBe("image/png");
  const [url, options] = mocks.fetch.mock.calls[0];
  expect(url.href).toBe(photo);
  expect(options.redirect).toBe("error");
  expect(options.headers).toBeUndefined();
});

it.each([
  "http://lh3.googleusercontent.com/photo",
  "https://localhost/photo",
  "https://googleusercontent.com.attacker.example/photo",
  "https://user:password@lh3.googleusercontent.com/photo",
  "https://lh3.googleusercontent.com:1234/photo",
])("does not fetch an unsafe stored photo URL: %s", async (image) => {
  mocks.session.mockResolvedValue({
    data: { user: { id: "learner-a", image } },
    error: null,
  });
  expect((await GET(request())).status).toBe(404);
  expect(mocks.fetch).not.toHaveBeenCalled();
});

it("rejects redirects and non-raster responses instead of exposing fetched content", async () => {
  mocks.fetch.mockRejectedValueOnce(new Error("redirect rejected"));
  expect((await GET(request())).status).toBe(502);
  mocks.fetch.mockResolvedValueOnce(
    new Response("<svg/>", { headers: { "Content-Type": "image/svg+xml" } }),
  );
  expect((await GET(request())).status).toBe(502);
});

it("limits streamed photo bytes even without a content length", async () => {
  mocks.fetch.mockResolvedValueOnce(
    new Response(new Uint8Array(2_000_001), {
      headers: { "Content-Type": "image/png" },
    }),
  );
  expect((await GET(request())).status).toBe(413);
});

it("preserves the initials fallback when the Google account has no photo", async () => {
  mocks.session.mockResolvedValue({
    data: { user: { id: "learner-a", image: null } },
    error: null,
  });
  expect((await GET(request())).status).toBe(404);
  expect(mocks.fetch).not.toHaveBeenCalled();
});
