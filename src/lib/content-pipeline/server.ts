import "server-only";
import { getAuth, isCloudConfigured } from "@/lib/auth";
import { getDb } from "@/db";
import { rolesForEmail } from "./access";
import { ContentError, ContentRepository } from "./repository";
import type { ContentRole, LessonPack } from "./model";
import { inspectWav } from "./audio";
import { contentHash } from "./hash";

export const contentRepository = () =>
  new ContentRepository((query) => getDb().execute(query));
export async function contentActor(request?: Request, mutation = false) {
  if (!isCloudConfigured())
    throw new ContentError(
      "Configure Neon accounts and the content database first.",
      503,
    );
  if (
    mutation &&
    request?.headers.get("origin") !==
      new URL(process.env.APP_URL ?? request!.url).origin
  )
    throw new ContentError("Open this action from the content studio.", 403);
  const { data, error } = await getAuth().getSession();
  if (error) throw new ContentError("Your session could not be checked.", 503);
  if (!data?.user)
    throw new ContentError(
      "Sign in with your content team's Google account.",
      401,
    );
  const roles = rolesForEmail(
    data.user.email,
    data.user.emailVerified === true,
  );
  if (!roles.length)
    throw new ContentError("This account does not have content access.", 403);
  if (
    request?.headers.get("X-Learning-Account") &&
    request.headers.get("X-Learning-Account") !== data.user.id
  )
    throw new ContentError(
      "Your account changed. Reload before continuing.",
      409,
    );
  return { id: data.user.id, name: data.user.name, roles };
}
export function requireRole(roles: ContentRole[], role: ContentRole) {
  if (!roles.includes(role))
    throw new ContentError(`The ${role} permission is required.`, 403);
}
export const contentResponse = (body: unknown, status = 200) =>
  Response.json(body, {
    status,
    headers: {
      "Cache-Control": "private, no-store",
      Vary: "Cookie",
      "Referrer-Policy": "no-referrer",
    },
  });
export function contentFailure(error: unknown) {
  if (error instanceof ContentError)
    return contentResponse({ error: error.message }, error.status);
  return contentResponse(
    {
      error:
        "The content studio could not connect. Check that its migration is applied, then try again.",
    },
    503,
  );
}
export function audioUrl(key: string): string {
  const value = process.env.CONTENT_AUDIO_BASE_URL;
  if (!value)
    throw new ContentError(
      "Set CONTENT_AUDIO_BASE_URL to your immutable audio storage.",
      503,
    );
  const base = new URL(value);
  if (
    base.protocol !== "https:" ||
    base.username ||
    base.password ||
    base.search ||
    base.hash
  )
    throw new ContentError(
      "Use an HTTPS audio storage base URL without credentials.",
      503,
    );
  if (
    !/^[a-zA-Z0-9/_.-]+\.wav$/.test(key) ||
    key.includes("..") ||
    key.startsWith("/")
  )
    throw new ContentError("Invalid recording key.");
  return new URL(key, base.href.replace(/\/?$/, "/")).href;
}
export async function verifyRecording(
  asset: LessonPack["media"][number],
  script: string,
) {
  return (await readRecording(asset, script)).inspection;
}
export async function readRecording(
  asset: LessonPack["media"][number],
  script: string,
) {
  if (asset.scriptHash !== contentHash(script))
    throw new ContentError("The recording's script hash is stale.", 409);
  const response = await fetch(audioUrl(asset.storageKey), {
    redirect: "error",
    cache: "no-store",
    signal: AbortSignal.timeout(15_000),
  });
  if (!response.ok || !response.body)
    throw new ContentError("Recording is not available in audio storage.", 409);
  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      size += value.length;
      if (size > 12_000_000) {
        await reader.cancel();
        throw new ContentError("Recording exceeds the audio size limit.", 413);
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }
  let result;
  const bytes = Buffer.concat(chunks);
  try {
    result = inspectWav(bytes);
  } catch (error) {
    throw new ContentError((error as Error).message, 409);
  }
  if (result.fileHash !== asset.fileHash || result.bytes !== asset.bytes)
    throw new ContentError(
      "Stored recording does not match its manifest hash and size.",
      409,
    );
  return { inspection: result, bytes };
}
