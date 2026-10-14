import { z } from "zod";
import {
  contentActor,
  contentResponse,
  contentFailure,
  requireRole,
} from "@/lib/content-pipeline/server";
import { ContentError } from "@/lib/content-pipeline/repository";
import { intakeRepository } from "@/lib/content-intake/server";
import { intakeActionSchema } from "@/lib/content-intake/model";
import { intakeKinds } from "@/lib/content-intake/constants";
import { factoryCurriculum } from "@/lib/content-factory/catalog";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const numeric = z.coerce.number().int().positive().max(Number.MAX_SAFE_INTEGER);
export async function GET(request: Request) {
  try {
    const actor = await contentActor(request),
      repository = intakeRepository(),
      params = new URL(request.url).searchParams;
    if (params.has("item")) {
      const id = numeric.safeParse(params.get("item"));
      if (!id.success) throw new ContentError("Choose a valid source item.");
      return contentResponse(await repository.detail(id.data));
    }
    if (params.has("archive")) {
      const filters = z
        .object({
          archiveId: z.string().regex(/^[a-z0-9][a-z0-9_.:-]{0,199}$/),
          kind: z.enum(intakeKinds),
          chapter: numeric.max(100).optional(),
          query: z.string().max(120).optional(),
          cursor: numeric.optional(),
          listType: z.enum(["core", "expanded"]).optional(),
          drafted: z.boolean().optional(),
        })
        .safeParse({
          archiveId: params.get("archive"),
          kind: params.get("kind") ?? "vocabulary",
          ...(params.has("chapter") ? { chapter: params.get("chapter") } : {}),
          ...(params.has("q") ? { query: params.get("q") } : {}),
          ...(params.has("cursor") ? { cursor: params.get("cursor") } : {}),
          ...(params.has("listType")
            ? { listType: params.get("listType") }
            : {}),
          ...(params.has("drafted")
            ? { drafted: params.get("drafted") === "true" }
            : {}),
        });
      if (!filters.success)
        throw new ContentError("Choose valid source filters.");
      return contentResponse(await repository.list(filters.data));
    }
    const archives = await repository.archives();
    return contentResponse({
      archives,
      roles: actor.roles,
      userId: actor.id,
      lessons: factoryCurriculum.courses.flatMap((c) =>
        c.lessons.map((l) => ({
          id: l.id,
          title: l.title,
          level: c.level,
          subdivision: c.subdivision,
        })),
      ),
    });
  } catch (error) {
    return contentFailure(error);
  }
}
export async function POST(request: Request) {
  try {
    const actor = await contentActor(request, true);
    if (request.headers.get("X-Learning-Account") !== actor.id)
      throw new ContentError("Reload this content account before saving.", 409);
    let raw: unknown;
    const reader = request.body?.getReader();
    if (!reader) throw new ContentError("Supply a draft action.");
    const chunks: Uint8Array[] = [];
    let bytes = 0;
    try {
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        bytes += value.length;
        if (bytes > 96000) {
          await reader.cancel();
          throw new ContentError(
            "Draft exceeds the import editor size limit.",
            413,
          );
        }
        chunks.push(value);
      }
    } finally {
      reader.releaseLock();
    }
    try {
      raw = JSON.parse(Buffer.concat(chunks).toString("utf8"));
    } catch {
      throw new ContentError("Supply valid draft JSON.");
    }
    const parsed = intakeActionSchema.safeParse(raw);
    if (!parsed.success)
      return contentResponse(
        {
          error: "Check the draft fields.",
          issues: parsed.error.issues.map((i) => ({
            path: i.path.join("."),
            message: i.message,
          })),
        },
        400,
      );
    const action = parsed.data,
      repository = intakeRepository();
    if (action.action === "save_draft") {
      requireRole(actor.roles, "author");
      const course = factoryCurriculum.courses.find((c) =>
        c.lessons.some((l) => l.id === action.entry.targetLesson),
      );
      if (!course || course.level !== action.entry.cefr)
        throw new ContentError(
          "Map this draft to an existing lesson at the selected level.",
        );
      return contentResponse(
        await repository.saveDraft(
          actor,
          action.itemId,
          action.sourceHash,
          action.expectedVersion,
          action.entry,
        ),
      );
    }
    requireRole(actor.roles, action.category);
    await repository.review(
      actor,
      action.draftId,
      action.contentHash,
      action.category,
      action.decision,
      action.comment,
    );
    return contentResponse({ recorded: true });
  } catch (error) {
    return contentFailure(error);
  }
}
