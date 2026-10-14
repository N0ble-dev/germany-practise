import "server-only";
import { z } from "zod";
import { getDb } from "@/db";
import { CommunityError, CommunityRepository } from "./community-repository";
import { SocialError } from "./social-repository";
import { socialActor } from "./social-api";
export { socialActor as communityActor };
export const communityRepository = () =>
  new CommunityRepository((query) => getDb().execute(query));
export const communityResponse = (body: unknown, status = 200) =>
  Response.json(body, {
    status,
    headers: {
      "Cache-Control": "no-store",
      Vary: "Cookie",
      "Referrer-Policy": "no-referrer",
    },
  });
export function communityFailure(error: unknown) {
  if (error instanceof CommunityError || error instanceof SocialError)
    return communityResponse({ error: error.message }, error.status);
  if (error instanceof z.ZodError)
    return communityResponse(
      {
        error:
          "Choose up to five sentences and check the signature and field limits.",
      },
      400,
    );
  // Neon can nest the PostgreSQL error in cause. Return only known application messages.
  let current = error;
  for (let i = 0; i < 4 && current && typeof current === "object"; i++) {
    const known = current as {
      code?: string;
      message?: string;
      cause?: unknown;
    };
    if (
      known.code === "P0001" &&
      known.message?.includes("50 public sentences")
    )
      return communityResponse(
        {
          error:
            "You can share up to 50 public sentences. Remove one before adding more.",
        },
        409,
      );
    if (known.code === "23505")
      return communityResponse(
        {
          error:
            "You already shared this sentence. Edit the existing post instead.",
        },
        409,
      );
    current = known.cause;
  }
  return communityResponse(
    { error: "Public sentences could not connect. Try again shortly." },
    503,
  );
}
export async function communityBody<T>(
  request: Request,
  schema: z.ZodType<T>,
): Promise<T> {
  const reader = request.body?.getReader();
  if (!reader)
    throw new CommunityError("Choose the sentences you want to publish.");
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      size += value.length;
      if (size > 96000) {
        await reader.cancel();
        throw new CommunityError("This sharing request is too large.", 413);
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }
  let body: unknown;
  try {
    body = JSON.parse(new TextDecoder().decode(Buffer.concat(chunks)));
  } catch {
    throw new CommunityError("Use a valid sentence sharing request.");
  }
  return schema.parse(body);
}
