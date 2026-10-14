import { createReadStream } from "node:fs";
import { createInterface } from "node:readline";
import { mkdir, writeFile } from "node:fs/promises";
import { config } from "dotenv";
import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { prepareResources } from "./resource-files.ts";
import { intakeConnection } from "../../src/lib/content-intake/branch.ts";
import { IntakeRepository } from "../../src/lib/content-intake/repository.ts";
import {
  intakeItemSchema,
  type IntakeItem,
} from "../../src/lib/content-intake/model.ts";
import { ContentError } from "../../src/lib/content-pipeline/repository.ts";
async function retry<T>(operation: () => Promise<T>): Promise<T> {
  for (let attempt = 0; ; attempt++) {
    try {
      return await operation();
    } catch (error) {
      const failure = error as { code?: string; sourceError?: unknown };
      const transient =
        !!failure.sourceError ||
        ["40001", "40P01", "53300", "57P01", "08006"].includes(
          failure.code ?? "",
        );
      if (!transient || attempt >= 4) throw error;
      console.log(
        `Temporary database connection failure; retrying batch (${attempt + 1}/4).`,
      );
      await new Promise((resolve) => setTimeout(resolve, 1000 * 2 ** attempt));
    }
  }
}
async function main() {
  config({ path: ".env.local", quiet: true });
  const mode = process.argv[2] ?? "audit";
  if (mode !== "audit" && mode !== "stage")
    throw new ContentError("Use audit or stage.");
  const { prepared, audit } = await prepareResources();
  console.log(
    `Verified ${audit.files.length} resource files; SQLite/JSONL/CSV parity passed. ${audit.inputRows} sentence rows, ${audit.quarantined} quarantined. No approvals assigned.`,
  );
  if (mode === "audit") return;
  if (!process.argv.includes("--write"))
    throw new ContentError(
      "Run resources:stage -- --write after the archive audit.",
    );
  const db = drizzle(neon(intakeConnection())),
    repository = new IntakeRepository((query) => db.execute(query));
  for (const { archive, path } of prepared) {
    await retry(() => repository.importArchive(archive));
    const existing = new Map<string, string>();
    let cursor = 0;
    for (;;) {
      const saved = await retry(() =>
        repository.importedHashes(archive.id, cursor),
      );
      for (const item of saved)
        existing.set(`${item.kind}:${item.key}`, item.hash);
      if (saved.length < 25000) break;
      cursor = saved.at(-1)!.id;
    }
    console.log(
      `${archive.provider}: ${existing.size} saved source hashes loaded for resume validation.`,
    );
    let count = 0;
    let batch: IntakeItem[] = [];
    let pending: Promise<void>[] = [];
    async function flush() {
      if (!batch.length) return;
      const next = batch;
      batch = [];
      const operation = retry(() => repository.importBatch(archive.id, next));
      // Observe failures immediately, then report every outcome at the batch boundary.
      void operation.catch(() => {});
      pending.push(operation);
      if (pending.length === 3) {
        const outcomes = await Promise.allSettled(pending);
        pending = [];
        for (const outcome of outcomes)
          if (outcome.status === "rejected") throw outcome.reason;
      }
    }
    for await (const line of createInterface({
      input: createReadStream(path),
      crlfDelay: Infinity,
    })) {
      if (!line.trim()) continue;
      const item = intakeItemSchema.parse(JSON.parse(line));
      const saved = existing.get(`${item.kind}:${item.key}`);
      if (saved && saved !== item.hash)
        throw new ContentError(
          "Saved source hash differs from the prepared archive.",
          409,
        );
      if (!saved) batch.push(item);
      count++;
      if (batch.length === 1000) {
        await flush();
      }
      if (count % 25000 === 0)
        console.log(
          `${archive.provider}: ${count}/${archive.expectedCount} source rows checked / queued…`,
        );
    }
    await flush();
    const outcomes = await Promise.allSettled(pending);
    for (const outcome of outcomes)
      if (outcome.status === "rejected") throw outcome.reason;
    if (count !== archive.expectedCount)
      throw new ContentError(
        "Prepared source file changed during import.",
        409,
      );
    await retry(() => repository.completeArchive(archive.id));
    console.log(
      `${archive.provider}: ${count} immutable source records available for review.`,
    );
  }
  await mkdir("content/imports", { recursive: true });
  await writeFile(
    "content/imports/recources-manifest.json",
    JSON.stringify(audit, null, 2) + "\n",
  );
  console.log(
    "Full supplied archives staged on the review branch. Learner tables and production content were not touched.",
  );
}
main().catch((error) => {
  console.error(
    error instanceof ContentError
      ? error.message
      : "Resource integration failed. Check input parity, migrations and review-branch configuration; incomplete archives stay hidden and imports can be resumed.",
  );
  process.exitCode = 1;
});
