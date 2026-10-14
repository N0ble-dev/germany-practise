import { contentHash } from "../content-pipeline/hash.ts";
import { examReviewCategories, type ExamPack } from "./model.ts";
import { ExamError, type ExamRepository } from "./repository.ts";

export async function promoteExam(
  source: ExamRepository,
  target: ExamRepository,
  pack: ExamPack,
  expectedHash: string,
  publisherId: string,
  inspectMedia: (
    asset: ExamPack["media"][number],
    script: string,
  ) => Promise<unknown>,
) {
  if (contentHash(pack) !== expectedHash)
    throw new ExamError(
      "The committed pack does not match the approved release hash.",
      409,
    );
  const sourceId = await source.versionId(pack.id, pack.version),
    reviewed = await source.detail(sourceId);
  if (reviewed.hash !== expectedHash || reviewed.blockers.length)
    throw new ExamError(
      "The complete version still has review-branch publication blockers.",
      409,
    );
  const checked = [];
  for (const asset of pack.media) {
    const task = pack.tasks.find(
      (task) => task.type === "choice" && task.audioId === asset.id,
    );
    if (!task || task.type !== "choice")
      throw new ExamError("A recording has no matching listening task.", 409);
    checked.push({
      asset,
      inspection: await inspectMedia(asset, task.passage),
    });
  }
  const imported = await target.importDraft(pack);
  for (const { asset, inspection } of checked)
    await target.verifyMedia(imported.id, expectedHash, asset.id, inspection);
  for (const category of examReviewCategories) {
    const evidence = reviewed.reviews
      .filter(
        (review) =>
          review.category === category && review.hash === expectedHash,
      )
      .at(-1);
    if (evidence) await target.importReviewEvidence(imported.id, evidence);
  }
  // Both sides recheck gates; copied evidence cannot erase a newer target rejection.
  const latest = await source.detail(sourceId);
  if (latest.hash !== expectedHash || latest.blockers.length)
    throw new ExamError(
      "Development review decisions changed during promotion.",
      409,
    );
  await target.publish(imported.id, expectedHash, publisherId, "publish");
  return imported;
}
