import "server-only";
import { getAuth, isCloudConfigured } from "./auth";
import { SocialError } from "./social-repository";

export const socialResponse = (data: unknown, status = 200) =>
  Response.json(data, {
    status,
    headers: {
      "Cache-Control": "private, no-store",
      Vary: "Cookie",
      "Referrer-Policy": "no-referrer",
    },
  });
export async function socialActor(request: Request, mutation = false) {
  if (!isCloudConfigured())
    throw new SocialError("Shared learning is not configured yet.", 503);
  if (
    mutation &&
    request.headers.get("origin") !==
      new URL(process.env.APP_URL ?? request.url).origin
  )
    throw new SocialError("Open this action from your learning app.", 403);
  const { data, error } = await getAuth().getSession();
  if (error)
    throw new SocialError("Your session could not be checked. Try again.", 503);
  if (!data?.user)
    throw new SocialError("Continue with Google to share your learning.", 401);
  const expected = request.headers.get("X-Learning-Account");
  if (expected && expected !== data.user.id)
    throw new SocialError("Your account changed. Reload this page.", 409);
  return data.user;
}
export function socialFailure(error: unknown) {
  return error instanceof SocialError
    ? socialResponse({ error: error.message }, error.status)
    : socialResponse(
        {
          error: "Shared learning could not connect. Please try again shortly.",
        },
        503,
      );
}
export async function socialJson(request: Request, limit = 12_000) {
  const body = await request.text();
  if (body.length > limit)
    throw new SocialError("This shared content is too large.", 413);
  try {
    return JSON.parse(body) as unknown;
  } catch {
    throw new SocialError("The shared content format is invalid.");
  }
}
