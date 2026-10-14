import { createReadStream } from "node:fs";
import { createInterface } from "node:readline";
import type { IntakeRepository } from "../../src/lib/content-intake/repository.ts";
import {
  intakeItemSchema,
  type IntakeItem,
  type IntakeArchive,
} from "../../src/lib/content-intake/model.ts";
import { ContentError } from "../../src/lib/content-pipeline/repository.ts";
async function retry<T>(work: () => Promise<T>): Promise<T> {
  for (let attempt = 0; ; attempt++) {
    try {
      return await work();
    } catch (error) {
      const failure = error as {
        code?: string;
        sourceError?: unknown;
        cause?: { sourceError?: unknown };
      };
      if (
        attempt >= 4 ||
        !(
          failure.sourceError ||
          failure.cause?.sourceError ||
          ["40001", "40P01", "53300", "57P01", "08006"].includes(
            failure.code ?? "",
          )
        )
      )
        throw error;
      console.log(`Retrying a temporary database failure (${attempt + 1}/4).`);
      await new Promise((resolve) => setTimeout(resolve, 1000 * 2 ** attempt));
    }
  }
}
export async function stageResourceArchives(
  repository: IntakeRepository,
  prepared: { archive: IntakeArchive; path: string }[],
) {
  for (const { archive, path } of prepared) {
    await retry(() => repository.importArchive(archive));
    const existing = new Map<string, string>();
    let cursor = 0;
    for (;;) {
      const rows = await retry(() =>
        repository.importedHashes(archive.id, cursor),
      );
      for (const row of rows) existing.set(`${row.kind}:${row.key}`, row.hash);
      if (rows.length < 25000) break;
      cursor = rows.at(-1)!.id;
    }
    console.log(
      `${archive.provider}: ${existing.size} saved hashes checked for resume.`,
    );
    let batch: IntakeItem[] = [],
      pending: Promise<void>[] = [],
      count = 0;
    async function finish() {
      const outcomes = await Promise.allSettled(pending);
      pending = [];
      for (const outcome of outcomes)
        if (outcome.status === "rejected") throw outcome.reason;
    }
    async function flush() {
      if (!batch.length) return;
      const next = batch;
      batch = [];
      const operation = retry(() => repository.importBatch(archive.id, next));
      void operation.catch(() => {});
      pending.push(operation);
      if (pending.length === 3) await finish();
    }
    try {
      for await (const line of createInterface({
        input: createReadStream(path),
        crlfDelay: Infinity,
      })) {
        if (!line.trim()) continue;
        const item = intakeItemSchema.parse(JSON.parse(line)),
          saved = existing.get(`${item.kind}:${item.key}`);
        if (saved && saved !== item.hash)
          throw new ContentError(
            "Saved source hash differs from the input archive.",
            409,
          );
        if (!saved) batch.push(item);
        count++;
        if (batch.length === 1000) await flush();
        if (count % 25000 === 0)
          console.log(
            `${archive.provider}: ${count}/${archive.expectedCount} checked / queued…`,
          );
      }
      await flush();
    } finally {
      await finish();
    }
    if (count !== archive.expectedCount)
      throw new ContentError(
        "The prepared archive changed during import.",
        409,
      );
    await retry(() => repository.completeArchive(archive.id));
    console.log(`${archive.provider}: ${count} source records complete.`);
  }
}
