import { writeFile } from "node:fs/promises";
import { config } from "dotenv";
import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { prepareResources } from "./resource-files.ts";
import { stageResourceArchives } from "./stage-resource-archives.ts";
import { IntakeRepository } from "../../src/lib/content-intake/repository.ts";
import { intakeConnection } from "../../src/lib/content-intake/branch.ts";
import { LibraryRepository } from "../../src/lib/library/repository.ts";
async function main() {
  config({ path: ".env.local", quiet: true });
  const args = process.argv.slice(2),
    target = args[args.indexOf("--target") + 1];
  if (!args.includes("--write") || !["review", "production"].includes(target))
    throw new Error("Supply --target review|production and --write.");
  const url =
    target === "review"
      ? intakeConnection()
      : (process.env.DATABASE_URL_UNPOOLED ?? process.env.DATABASE_URL);
  if (!url) throw new Error("Database configuration is missing.");
  if (target === "production") {
    const expected = args[args.indexOf("--expected-host") + 1],
      actual = new URL(url);
    const app = new URL(process.env.DATABASE_URL ?? "");
    if (
      !args.includes("--expected-host") ||
      actual.hostname !== expected ||
      actual.hostname.replace("-pooler", "") !==
        app.hostname.replace("-pooler", "") ||
      actual.pathname !== app.pathname
    )
      throw new Error(
        "Confirm the existing production endpoint with --expected-host; no alternate database is provisioned.",
      );
  }
  const { prepared, audit } = await prepareResources();
  const db = drizzle(neon(url)),
    execute = (query: Parameters<typeof db.execute>[0]) => db.execute(query);
  await stageResourceArchives(new IntakeRepository(execute), prepared);
  const release = {
    schemaVersion: 1,
    mode: "source_reference",
    archives: prepared.map(({ archive: { id, provider, manifestHash } }) => ({
      id,
      provider,
      manifestHash,
    })),
  };
  const overview = await new LibraryRepository(execute, release).overview();
  if (
    !overview.available ||
    overview.words !== 2296 ||
    overview.sentences !== 331254 ||
    overview.chapters.length !== 10
  )
    throw new Error(
      "The full learner library did not match the supplied source counts.",
    );
  await writeFile(
    target === "production"
      ? "content/library-release.json"
      : ".cache/library-review-release.json",
    JSON.stringify(release, null, 2) + "\n",
  );
  if (target === "production")
    await writeFile(
      "content/imports/recources-manifest.json",
      JSON.stringify(audit, null, 2) + "\n",
    );
  console.log({
    target,
    complete: true,
    words: overview.words,
    sentences: overview.sentences,
    chapters: overview.chapters.length,
    publicSourceRecords: overview.collections.reduce(
      (sum, c) => sum + c.total,
      0,
    ),
    quarantinedRowsExcluded: audit.quarantined,
    humanApprovalsAssigned: false,
  });
}
main().catch(() => {
  console.error(
    "Library import failed; check the target endpoint, source audit, and migration. Partial archives remain hidden and can be resumed.",
  );
  process.exitCode = 1;
});
