import "server-only";
import { getAuth, isCloudConfigured } from "@/lib/auth";
import { getDb } from "@/db";
import { rolesForEmail } from "../content-pipeline/access";
import { ExamError, ExamRepository } from "./repository";
import { z } from "zod";
export const examRepository = () =>
  new ExamRepository((query) => getDb().execute(query));
export async function examActor(request?: Request, mutation = false) {
  if (!isCloudConfigured())
    throw new ExamError(
      "Accounts and private exam saving are not configured.",
      503,
    );
  if (
    mutation &&
    request?.headers.get("origin") !==
      new URL(process.env.APP_URL ?? request!.url).origin
  )
    throw new ExamError("Open this exam action from Deutsch Journey.", 403);
  const { data, error } = await getAuth().getSession();
  if (error)
    throw new ExamError(
      "Your session could not be checked. Try signing in again.",
      503,
    );
  if (!data?.user)
    throw new ExamError(
      "Continue with Google to save private exam practice.",
      401,
    );
  const expected = request?.headers.get("X-Learning-Account");
  if (expected && expected !== data.user.id)
    throw new ExamError("Your account changed. Reload your exam page.", 409);
  return {
    id: data.user.id,
    name: data.user.name,
    roles: rolesForEmail(data.user.email, data.user.emailVerified === true),
  };
}
export const examResponse = (body: unknown, status = 200) =>
  Response.json(body, {
    status,
    headers: {
      "Cache-Control": "private, no-store",
      Vary: "Cookie",
      "Referrer-Policy": "no-referrer",
    },
  });
export function examFailure(error: unknown) {
  if (error instanceof ExamError)
    return examResponse({ error: error.message }, error.status);
  if (error instanceof z.ZodError)
    return examResponse(
      { error: "Check the exam details and field limits." },
      400,
    );
  return examResponse(
    {
      error:
        "Private exam practice could not connect. Your walkthrough is still available; try saving again shortly.",
    },
    503,
  );
}
export async function examBody<T>(
  request: Request,
  schema: z.ZodType<T>,
  limit = 600000,
): Promise<T> {
  const reader = request.body?.getReader();
  if (!reader) throw new ExamError("An exam request body is required.");
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.length;
      if (size > limit) {
        await reader.cancel();
        throw new ExamError("This exam request is too large.", 413);
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }
  const raw = new TextDecoder().decode(Buffer.concat(chunks));
  try {
    return schema.parse(JSON.parse(raw));
  } catch (error) {
    if (error instanceof z.ZodError) throw error;
    throw new ExamError("Use a valid JSON exam request.");
  }
}
