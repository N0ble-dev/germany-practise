import { readFile, realpath } from "node:fs/promises";
import { relative, isAbsolute } from "node:path";
import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { z } from "zod";
import {
  ContentRepository,
  ContentError,
} from "../../src/lib/content-pipeline/repository.ts";
import {
  lessonPackSchema,
  reviewCategories,
  sha256Schema,
} from "../../src/lib/content-pipeline/model.ts";
import { contentHash } from "../../src/lib/content-pipeline/hash.ts";
import { inspectWav } from "../../src/lib/content-pipeline/audio.ts";

async function main() {
  const [path, expectedHash] = process.argv.slice(2);
  if (process.env.CONTENT_PUBLICATION_APPROVED !== "true")
    throw new ContentError("Manual publication approval is required.");
  if (
    process.env.GITHUB_ACTIONS === "true" &&
    process.env.GITHUB_REF !== "refs/heads/main"
  )
    throw new ContentError("Only the main branch can publish.");
  if (!path || !sha256Schema.safeParse(expectedHash).success)
    throw new ContentError(
      "Supply a lesson JSON path and its reviewed SHA-256.",
    );
  const root = await realpath("content/lessons"),
    file = await realpath(path),
    inside = relative(root, file);
  if (
    inside.startsWith("..") ||
    isAbsolute(inside) ||
    !inside.endsWith(".json")
  )
    throw new ContentError(
      "Choose a versioned JSON file inside content/lessons.",
    );
  const sourceUrl = process.env.CONTENT_REVIEW_DATABASE_URL,
    targetUrl = process.env.CONTENT_PUBLICATION_DATABASE_URL;
  if (!sourceUrl || !targetUrl)
    throw new ContentError(
      "Configure separate review and publication database credentials.",
    );
  const sourceHost = new URL(sourceUrl),
    targetHost = new URL(targetUrl);
  const endpoint = (url: URL) =>
    `${url.hostname.replace("-pooler", "")}${url.pathname}`;
  if (endpoint(sourceHost) === endpoint(targetHost))
    throw new ContentError(
      "The review and production endpoints must be separate branches.",
    );
  const actorId = z.uuid().parse(process.env.CONTENT_PUBLISHER_ID);
  const pack = lessonPackSchema.parse(JSON.parse(await readFile(file, "utf8")));
  if (contentHash(pack) !== expectedHash)
    throw new ContentError(
      "Git pack does not match the explicitly approved content hash.",
    );
  const sourceDb = drizzle(neon(sourceUrl)),
    targetDb = drizzle(neon(targetUrl));
  const source = new ContentRepository((query) => sourceDb.execute(query)),
    target = new ContentRepository((query) => targetDb.execute(query));
  const reviewed = await source.detail(pack.id, pack.version);
  if (reviewed.contentHash !== expectedHash || reviewed.blockers.length)
    throw new ContentError(
      "The review branch has not approved this exact complete version.",
    );
  const audioBase = new URL(process.env.CONTENT_AUDIO_BASE_URL ?? "");
  if (
    audioBase.protocol !== "https:" ||
    audioBase.username ||
    audioBase.password ||
    audioBase.search ||
    audioBase.hash
  )
    throw new ContentError("Set an HTTPS immutable audio storage base URL.");
  // Verify storage before writing production. Redirects and oversized files fail closed.
  const checked = [];
  for (const asset of pack.media) {
    const response = await fetch(
      new URL(asset.storageKey, audioBase.href.replace(/\/?$/, "/")),
      { redirect: "error", signal: AbortSignal.timeout(15000) },
    );
    if (!response.ok || !response.body)
      throw new ContentError(`Recording unavailable: ${asset.id}`);
    const reader = response.body.getReader();
    let total = 0;
    const chunks: Uint8Array[] = [];
    try {
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        total += value.length;
        if (total > 12_000_000) {
          await reader.cancel();
          throw new ContentError("Recording is too large.");
        }
        chunks.push(value);
      }
    } finally {
      reader.releaseLock();
    }
    const inspection = inspectWav(Buffer.concat(chunks));
    if (
      inspection.fileHash !== asset.fileHash ||
      inspection.bytes !== asset.bytes
    )
      throw new ContentError(`Recording hash/size mismatch: ${asset.id}`);
    checked.push({ asset, inspection });
  }
  await target.importDraft(pack);
  for (const { asset, inspection } of checked)
    await target.verifyMedia(
      pack.id,
      pack.version,
      expectedHash,
      asset.id,
      inspection,
    );
  for (const category of reviewCategories) {
    const evidence = reviewed.reviews
      .filter((r) => r.category === category && r.contentHash === expectedHash)
      .at(-1)!;
    await target.importReviewEvidence(pack.id, pack.version, evidence);
  }
  await target.publish(actorId, pack.id, pack.version, expectedHash);
  console.log(
    `Published ${pack.id}@${pack.version} using the reviewed immutable content hash. Existing learning records were not replaced.`,
  );
}
main().catch((error) => {
  console.error(
    error instanceof ContentError
      ? error.message
      : "Publication failed. Check database migrations, credentials, audio files and the release inputs; no branch reset is performed.",
  );
  process.exitCode = 1;
});
