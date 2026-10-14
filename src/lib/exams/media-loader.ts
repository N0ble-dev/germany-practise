import { inspectWav } from "../content-pipeline/audio.ts";
import { contentHash } from "../content-pipeline/hash.ts";
import { ExamError } from "./repository.ts";
import type { ExamPack } from "./model.ts";
export async function readExamRecording(
  asset: ExamPack["media"][number],
  script: string,
  baseUrl: string,
) {
  if (asset.scriptHash !== contentHash(script))
    throw new ExamError("The recording and script no longer match.", 409);
  let base: URL;
  try {
    base = new URL(baseUrl);
  } catch {
    throw new ExamError("Configure immutable HTTPS recording storage.", 503);
  }
  if (
    base.protocol !== "https:" ||
    base.username ||
    base.password ||
    base.search ||
    base.hash ||
    asset.storageKey.includes("..") ||
    !/^[a-zA-Z0-9][a-zA-Z0-9/_.-]+\.wav$/.test(asset.storageKey)
  )
    throw new ExamError(
      "Use a safe recording key and an immutable HTTPS storage base.",
      409,
    );
  const response = await fetch(
    new URL(asset.storageKey, base.href.replace(/\/?$/, "/")),
    {
      redirect: "error",
      cache: "no-store",
      signal: AbortSignal.timeout(15000),
    },
  );
  if (!response.ok || !response.body)
    throw new ExamError(
      "The exam recording could not load. Try again shortly.",
      503,
    );
  const reader = response.body.getReader(),
    chunks: Uint8Array[] = [];
  let size = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.length;
      if (size > 12000000) {
        await reader.cancel();
        throw new ExamError("The recording exceeds the supported size.", 413);
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }
  const bytes = Buffer.concat(chunks),
    inspection = inspectWav(bytes);
  if (
    inspection.fileHash !== asset.fileHash ||
    inspection.bytes !== asset.bytes ||
    Math.abs(inspection.duration - asset.duration) > 0.1
  )
    throw new ExamError(
      "The stored exam recording differs from its approved manifest.",
      409,
    );
  return { bytes, inspection };
}
