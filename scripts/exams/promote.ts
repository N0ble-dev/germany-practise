import { readFile, realpath } from "node:fs/promises";
import { isAbsolute, relative } from "node:path";
import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { z } from "zod";
import { ExamError, ExamRepository } from "../../src/lib/exams/repository.ts";
import { examPackSchema } from "../../src/lib/exams/model.ts";
import { promoteExam } from "../../src/lib/exams/release.ts";
import { readExamRecording } from "../../src/lib/exams/media-loader.ts";

async function main() {
  const [path, expectedHash] = process.argv.slice(2);
  if (process.env.EXAM_PUBLICATION_APPROVED !== "true")
    throw new ExamError("Manual exam publication approval is required.");
  if (
    process.env.GITHUB_ACTIONS === "true" &&
    process.env.GITHUB_REF !== "refs/heads/main"
  )
    throw new ExamError("Only the main branch can publish.");
  if (
    !path ||
    !z
      .string()
      .regex(/^[a-f0-9]{64}$/)
      .safeParse(expectedHash).success
  )
    throw new ExamError(
      "Supply an exam JSON path and its exact approved SHA-256.",
    );
  const root = await realpath("content/exams"),
    file = await realpath(path),
    inside = relative(root, file);
  if (
    inside.startsWith("..") ||
    isAbsolute(inside) ||
    !inside.endsWith(".json")
  )
    throw new ExamError("Choose a committed JSON pack inside content/exams.");
  const sourceUrl = process.env.CONTENT_REVIEW_DATABASE_URL,
    targetUrl = process.env.CONTENT_PUBLICATION_DATABASE_URL;
  if (!sourceUrl || !targetUrl)
    throw new ExamError(
      "Configure separate review and production database credentials.",
    );
  const endpoint = (value: string) => {
    const url = new URL(value);
    return `${url.hostname.replace("-pooler", "")}${url.pathname}`;
  };
  if (endpoint(sourceUrl) === endpoint(targetUrl))
    throw new ExamError(
      "Review and production must use separate Neon branches.",
    );
  const publisherId = z.uuid().parse(process.env.CONTENT_PUBLISHER_ID),
    pack = examPackSchema.parse(JSON.parse(await readFile(file, "utf8"))),
    sourceDb = drizzle(neon(sourceUrl)),
    targetDb = drizzle(neon(targetUrl));
  const result = await promoteExam(
    new ExamRepository((query) => sourceDb.execute(query)),
    new ExamRepository((query) => targetDb.execute(query)),
    pack,
    expectedHash,
    publisherId,
    async (asset, script) =>
      (
        await readExamRecording(
          asset,
          script,
          process.env.CONTENT_AUDIO_BASE_URL ?? "",
        )
      ).inspection,
  );
  console.log(
    JSON.stringify({
      ...result,
      status: "published",
      source: "Exact reviewed version",
      learnerRecordsReplaced: false,
    }),
  );
}
main().catch((error) => {
  console.error(
    error instanceof ExamError
      ? error.message
      : "Exam publication failed. Check migrations, credentials, reviewed inputs and recordings. No branch reset is performed.",
  );
  process.exitCode = 1;
});
