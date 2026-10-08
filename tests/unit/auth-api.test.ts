import { beforeEach, expect, it, vi } from "vitest";
import { authDestination } from "@/lib/auth-navigation";

const mocks = vi.hoisted(() => ({ configured: vi.fn(), proxy: vi.fn() }));
vi.mock("@/lib/auth", () => ({
  isAuthConfigured: mocks.configured,
  getAuth: () => ({ handler: () => ({ GET: mocks.proxy, POST: mocks.proxy }) }),
}));
import { GET, POST, PUT } from "@/app/api/auth/[...path]/route";

function context(path: string) {
  return { params: Promise.resolve({ path: path.split("/") }) };
}
function post(path: string, body: unknown) {
  return new Request(`http://localhost:3008/api/auth/${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}
beforeEach(() => {
  vi.resetAllMocks();
  mocks.configured.mockReturnValue(true);
  mocks.proxy.mockResolvedValue(Response.json({ success: true }));
});
it("blocks alternate identity endpoints before calling the managed provider", async () => {
  for (const path of [
    "sign-up/email",
    "sign-in/email",
    "sign-in/email-otp",
    "sign-in/magic-link",
    "sign-in/anonymous",
    "phone-number/sign-in",
    "callback/github",
    "reset-password",
    "update-user",
  ]) {
    expect((await POST(post(path, {}), context(path))).status).toBe(403);
  }
  expect(mocks.proxy).not.toHaveBeenCalled();
});
it("accepts only an exact Google provider in social requests", async () => {
  for (const body of [
    { provider: "github" },
    { provider: "google " },
    { provider: ["google"] },
    {},
    null,
  ]) {
    expect(
      (await POST(post("sign-in/social", body), context("sign-in/social")))
        .status,
    ).toBe(403);
  }
  expect(mocks.proxy).not.toHaveBeenCalled();
});
it("forwards Google OAuth to the SDK with the original request body intact", async () => {
  const body = {
    provider: "google",
    callbackURL: "http://localhost:3008/auth/complete",
    disableRedirect: true,
  };
  mocks.proxy.mockImplementation(async (request: Request) => {
    expect(await request.json()).toEqual(body);
    return Response.json({
      url: "https://accounts.google.com/authorization",
      redirect: true,
    });
  });
  const response = await POST(
    post("sign-in/social", body),
    context("sign-in/social"),
  );
  expect(response.status).toBe(200);
  expect(mocks.proxy).toHaveBeenCalledOnce();
});
it("rejects malformed OAuth bodies without contacting Neon", async () => {
  const request = new Request("http://localhost:3008/api/auth/sign-in/social", {
    method: "POST",
    body: "not-json",
  });
  expect((await POST(request, context("sign-in/social"))).status).toBe(400);
  expect(mocks.proxy).not.toHaveBeenCalled();
});
it("preserves SDK session verification, Google callback and sign-out routes", async () => {
  for (const path of ["get-session", "token", "jwks", "callback/google"]) {
    const request = new Request(
      `http://localhost:3008/api/auth/${path}?neon_auth_session_verifier=test-verifier`,
    );
    expect((await GET(request, context(path))).status).toBe(200);
    expect(mocks.proxy).toHaveBeenLastCalledWith(request, expect.anything());
  }
  expect((await POST(post("sign-out", {}), context("sign-out"))).status).toBe(
    200,
  );
});
it("rejects an unsupported HTTP method for OAuth", async () => {
  const request = new Request("http://localhost:3008/api/auth/sign-in/social", {
    method: "PUT",
    body: '{"provider":"google"}',
  });
  expect((await PUT(request, context("sign-in/social"))).status).toBe(403);
  expect(mocks.proxy).not.toHaveBeenCalled();
});
it("returns useful failures without exposing provider errors or configuration", async () => {
  mocks.configured.mockReturnValue(false);
  expect(
    (
      await POST(
        post("sign-in/social", { provider: "google" }),
        context("sign-in/social"),
      )
    ).status,
  ).toBe(503);
  expect(mocks.proxy).not.toHaveBeenCalled();
  mocks.configured.mockReturnValue(true);
  mocks.proxy.mockRejectedValue(new Error("private provider configuration"));
  const response = await GET(
    new Request("http://localhost:3008/api/auth/get-session"),
    context("get-session"),
  );
  expect(response.status).toBe(503);
  expect(await response.text()).not.toContain("private provider configuration");
});
it("only permits app pages as OAuth return destinations", () => {
  expect(authDestination("/planner")).toBe("/planner");
  expect(authDestination("/profile")).toBe("/profile");
  for (const value of [
    undefined,
    "https://other.example",
    "//other.example",
    "/planner?next=https://other.example",
    ["/planner"],
  ]) {
    expect(authDestination(value)).toBe("/");
  }
});
