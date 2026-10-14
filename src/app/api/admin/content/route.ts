import { z } from "zod";
import { adminActionSchema } from "@/lib/content-pipeline/model";
import { ContentError } from "@/lib/content-pipeline/repository";
import { recordingBlockers } from "@/lib/content-pipeline/gates";
import {
  contentActor,
  contentFailure,
  contentRepository,
  contentResponse,
  requireRole,
  verifyRecording,
} from "@/lib/content-pipeline/server";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function GET(request: Request) {
  try {
    const actor = await contentActor(request);
    const params = new URL(request.url).searchParams,
      key = params.get("lesson"),
      version = params.get("version");
    const repository = contentRepository();
    if (!key)
      return contentResponse({
        roles: actor.roles,
        lessons: await repository.list(),
      });
    if (
      !/^[a-z0-9][a-z0-9-]{0,99}$/.test(key) ||
      !z.coerce.number().int().positive().safeParse(version).success
    )
      throw new ContentError("Choose a lesson version.");
    return contentResponse(await repository.detail(key, Number(version)));
  } catch (error) {
    return contentFailure(error);
  }
}
export async function POST(request: Request) {
  try {
    const actor = await contentActor(request, true);
    const raw = await request.text();
    if (Buffer.byteLength(raw, "utf8") > 500_000)
      throw new ContentError("Lesson pack exceeds the import size limit.", 413);
    let body: unknown;
    try {
      body = JSON.parse(raw);
    } catch {
      throw new ContentError("Choose a valid JSON lesson pack.");
    }
    const parsed = adminActionSchema.safeParse(body);
    if (!parsed.success)
      return contentResponse(
        {
          error: "Content validation failed.",
          issues: parsed.error.issues.map((i) => ({
            path: i.path.join("."),
            message: i.message,
          })),
        },
        400,
      );
    const action = parsed.data,
      repository = contentRepository();
    if (action.action === "import") {
      requireRole(actor.roles, "author");
      return contentResponse(await repository.importDraft(action.pack));
    }
    if (action.action === "review") {
      requireRole(actor.roles, action.category);
      if (action.category === "audio" && action.decision === "approved") {
        const detail = await repository.detail(
          action.lessonKey,
          action.version,
        );
        if (
          recordingBlockers(
            detail.pack,
            detail.mediaChecks.map((m) => m.id),
          ).length
        )
          throw new ContentError(
            "Verify every recording before approving audio.",
            409,
          );
      }
      await repository.review(
        actor,
        action.lessonKey,
        action.version,
        action.contentHash,
        action.category,
        action.decision,
        action.comment,
      );
    } else if (action.action === "check_audio") {
      requireRole(actor.roles, "audio");
      const detail = await repository.detail(action.lessonKey, action.version);
      if (detail.contentHash !== action.contentHash)
        throw new ContentError("Reload this lesson version.", 409);
      if (
        detail.reviews
          .filter(
            (r) =>
              r.category === "language" && r.contentHash === detail.contentHash,
          )
          .at(-1)?.decision !== "approved"
      )
        throw new ContentError(
          "Approve the German script before checking recordings.",
          409,
        );
      if (!detail.pack.media.length)
        throw new ContentError(
          "Add licensed recordings to a new lesson version first.",
          409,
        );
      for (const asset of detail.pack.media) {
        const line = detail.pack.dialogues
          .flatMap((d) => d.lines)
          .find((l) => l.id === asset.lineId)!;
        const inspection = await verifyRecording(asset, line.text.de);
        await repository.verifyMedia(
          action.lessonKey,
          action.version,
          action.contentHash,
          asset.id,
          inspection,
        );
      }
    } else {
      requireRole(actor.roles, "publisher");
      await repository.publish(
        actor.id,
        action.lessonKey,
        action.version,
        action.contentHash,
      );
    }
    return contentResponse(
      await repository.detail(action.lessonKey, action.version),
    );
  } catch (error) {
    return contentFailure(error);
  }
}
