import { z } from "zod";
import { examReviewCategories } from "@/lib/exams/model";
import { ExamError } from "@/lib/exams/repository";
import {
  examActor,
  examBody,
  examRepository,
  examResponse,
  examFailure,
} from "@/lib/exams/server";
import { readExamMedia } from "@/lib/exams/media";
const hash = z.string().regex(/^[a-f0-9]{64}$/);
const action = z.discriminatedUnion("action", [
  z.object({ action: z.literal("import"), pack: z.unknown() }).strict(),
  z
    .object({
      action: z.literal("review"),
      id: z.uuid(),
      hash,
      category: z.enum(examReviewCategories),
      decision: z.enum(["approved", "changes_requested"]),
      comment: z.string().trim().min(10).max(2000),
    })
    .strict(),
  z
    .object({ action: z.enum(["publish", "retire"]), id: z.uuid(), hash })
    .strict(),
  z
    .object({
      action: z.literal("verify_media"),
      id: z.uuid(),
      hash,
      assetId: z.string().min(1).max(100),
    })
    .strict(),
]);
function requirePermission(roles: string[], permission: string) {
  if (!roles.includes(permission))
    throw new ExamError(
      `The ${permission} permission is required for this action.`,
      403,
    );
}
export async function GET(request: Request) {
  try {
    const actor = await examActor(request);
    if (!actor.roles.length)
      throw new ExamError("This account does not have content access.", 403);
    const id = new URL(request.url).searchParams.get("id");
    return examResponse(
      id
        ? await examRepository().detail(z.uuid().parse(id))
        : { papers: await examRepository().adminList(), roles: actor.roles },
    );
  } catch (error) {
    return examFailure(error);
  }
}
export async function POST(request: Request) {
  try {
    const actor = await examActor(request, true),
      input = await examBody(request, action),
      repo = examRepository();
    if (input.action === "import") {
      requirePermission(actor.roles, "author");
      return examResponse(await repo.importDraft(input.pack), 201);
    }
    if (input.action === "review") {
      requirePermission(actor.roles, input.category);
      await repo.review(
        input.id,
        input.hash,
        input.category,
        input.decision,
        input.comment,
        actor,
      );
    } else if (input.action === "publish" || input.action === "retire") {
      requirePermission(actor.roles, "publisher");
      await repo.publish(input.id, input.hash, actor.id, input.action);
    } else if (input.action === "verify_media") {
      requirePermission(actor.roles, "audio");
      const detail = await repo.detail(input.id);
      if (detail.hash !== input.hash)
        throw new ExamError(
          "Reload the exact paper version before checking audio.",
          409,
        );
      const asset = detail.pack.media.find(
        (asset) => asset.id === input.assetId,
      );
      const scripts = detail.pack.tasks
        .filter(
          (task) => task.type === "choice" && task.audioId === input.assetId,
        )
        .map((task) => (task.type === "choice" ? task.passage : ""));
      if (!asset || !scripts.length || new Set(scripts).size !== 1)
        throw new ExamError(
          "The recording needs one matching original script.",
          409,
        );
      const media = await readExamMedia(asset, scripts[0]);
      await repo.verifyMedia(
        input.id,
        input.hash,
        input.assetId,
        media.inspection,
      );
    }
    return examResponse({ done: true });
  } catch (error) {
    return examFailure(error);
  }
}
