import { z } from "zod";
import { readFactoryDrafts } from "@/lib/content-factory/catalog";
import {
  contentActor,
  contentFailure,
  contentResponse,
} from "@/lib/content-pipeline/server";
import { ContentError } from "@/lib/content-pipeline/repository";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function GET(request: Request) {
  try {
    await contentActor(request);
    const params = new URL(request.url).searchParams;
    const key = z
      .string()
      .regex(/^[a-z0-9][a-z0-9-]{0,99}$/)
      .safeParse(params.get("lesson"));
    const version = z.coerce
      .number()
      .int()
      .positive()
      .safeParse(params.get("version"));
    if (!key.success || !version.success)
      throw new ContentError("Choose a valid draft lesson and revision.");
    const pack = (await readFactoryDrafts()).find(
      (p) => p.id === key.data && p.version === version.data,
    );
    if (!pack)
      throw new ContentError(
        "This Git draft is not available in this deployment.",
        404,
      );
    return contentResponse({ pack });
  } catch (error) {
    return contentFailure(error);
  }
}
