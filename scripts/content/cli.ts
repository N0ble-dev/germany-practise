import {
  readdir,
  readFile,
  writeFile,
  mkdir,
  realpath,
} from "node:fs/promises";
import { resolve, relative } from "node:path";
import {
  lessonPackSchema,
  curriculumSchema,
  type LessonPack,
} from "../../src/lib/content-pipeline/model.ts";
import { contentHash } from "../../src/lib/content-pipeline/hash.ts";
import {
  publicationBlockers,
  validateRelationships,
} from "../../src/lib/content-pipeline/gates.ts";
import { inspectWav } from "../../src/lib/content-pipeline/audio.ts";
import { readFactory, readRelease } from "./factory-files.ts";
import {
  resourceCatalogSchema,
  sourceAssetSchema,
  examGuideSchema,
} from "../../src/lib/content-pipeline/resources.ts";

async function files(directory: string): Promise<string[]> {
  const entries = await readdir(directory, { withFileTypes: true });
  const nested = await Promise.all(
    entries.map((entry) =>
      entry.isDirectory()
        ? files(`${directory}/${entry.name}`)
        : Promise.resolve(
            entry.name.endsWith(".json") ? [`${directory}/${entry.name}`] : [],
          ),
    ),
  );
  return nested.flat();
}
async function main() {
  const mode = process.argv[2] ?? "validate";
  if (!["validate", "qa-report", "audio-manifest"].includes(mode))
    throw new Error("Use validate, qa-report or audio-manifest.");
  const factory = await readFactory();
  const releaseIndex = process.argv.indexOf("--release");
  const release =
    releaseIndex >= 0
      ? await readRelease(process.argv[releaseIndex + 1] ?? "", factory.drafts)
      : undefined;
  const packs: LessonPack[] = [],
    errors: string[] = [];
  resourceCatalogSchema.parse(
    JSON.parse(await readFile("content/resources/catalog.json", "utf8")),
  );
  examGuideSchema.parse(
    JSON.parse(await readFile("content/resources/a1-exam-guide.json", "utf8")),
  );
  const registry = JSON.parse(
    await readFile("content/source-assets.json", "utf8"),
  ) as { assets: unknown[] };
  const assets = new Map();
  for (const path of await files("content/source-assets")) {
    const asset = sourceAssetSchema.parse(
      JSON.parse(await readFile(path, "utf8")),
    );
    assets.set(path, asset);
  }
  for (const raw of registry.assets) {
    const asset = sourceAssetSchema.parse(raw),
      file = assets.get(`content/source-assets/${asset.id}.json`);
    if (!file || contentHash(file) !== contentHash(asset))
      errors.push(
        `Source registry differs from its immutable asset: ${asset.id}`,
      );
  }
  if (registry.assets.length !== assets.size)
    errors.push(
      "Source registry must include every staged asset exactly once.",
    );
  for (const path of await files("content/lessons")) {
    try {
      const result = lessonPackSchema.safeParse(
        JSON.parse(await readFile(path, "utf8")),
      );
      if (result.success) packs.push(result.data);
      else
        errors.push(
          ...result.error.issues.map(
            (i) => `${path} ${i.path.join(".")}: ${i.message}`,
          ),
        );
    } catch {
      errors.push(`${path}: unreadable lesson JSON.`);
    }
  }
  const curricula = [];
  for (const path of (await files("content")).filter((path) =>
    path.endsWith("-curriculum.json"),
  ))
    curricula.push(
      curriculumSchema.parse(JSON.parse(await readFile(path, "utf8"))),
    );
  const planned = factory.map.courses.flatMap((c) => c.lessons);
  if (!curricula.length)
    errors.push(
      "A course curriculum is required before authoring lesson packs.",
    );
  for (const pack of packs) {
    const course = factory.map.courses.find((c) => c.id === pack.courseId);
    if (
      !course ||
      !course.lessons.some(
        (l) => l.id === pack.id && l.number === pack.lessonNumber,
      )
    )
      errors.push(`${pack.id}: lesson must match its course plan.`);
  }
  errors.push(
    ...validateRelationships(
      packs,
      planned.map((l) => l.id),
      Object.fromEntries(planned.map((l) => [l.id, l.prerequisites])),
    ),
  );
  const report = (release?.packs ?? packs).map((pack) => ({
    id: pack.id,
    version: pack.version,
    contentHash: contentHash(pack),
    status: "draft",
    blockers: publicationBlockers(pack, [], [], []),
  }));
  for (const pack of packs)
    for (const ref of pack.references)
      if (ref.use === "licensed_content") {
        const asset = assets.get(ref.permissionRef);
        if (!asset || contentHash(asset) !== ref.sourceAssetHash)
          errors.push(
            `${pack.id}@${pack.version}: missing or changed source evidence for ${ref.id}`,
          );
        else if (
          ref.url !== asset.revisionUrl ||
          ref.license !== asset.license ||
          ref.licenseUrl !== asset.licenseUrl ||
          JSON.stringify(ref.authors) !== JSON.stringify(asset.authors)
        )
          errors.push(
            `${pack.id}@${pack.version}: attribution/source metadata differs from ${ref.id}`,
          );
      }
  if (mode === "audio-manifest") {
    const audioRoot = packs.some((p) => p.media.length)
      ? await realpath(process.env.CONTENT_LOCAL_AUDIO_ROOT ?? "content/audio")
      : "";
    for (const pack of packs)
      for (const asset of pack.media) {
        try {
          const path = await realpath(resolve(audioRoot, asset.storageKey));
          const rel = relative(audioRoot, path);
          if (rel.startsWith("..") || resolve(audioRoot, rel) !== path)
            throw new Error("Recording escaped the audio root.");
          const result = inspectWav(await readFile(path));
          if (
            result.fileHash !== asset.fileHash ||
            result.bytes !== asset.bytes
          )
            throw new Error("Recording bytes/hash do not match the manifest.");
        } catch (error) {
          errors.push(`${asset.id}: ${(error as Error).message}`);
        }
      }
    if (
      packs.some(
        (p) =>
          p.media.length !==
          p.dialogues.reduce((n, d) => n + d.lines.length, 0),
      )
    )
      errors.push("Required dialogue recordings are missing.");
  }
  if (mode === "qa-report") {
    await mkdir("artifacts/content", { recursive: true });
    await writeFile(
      "artifacts/content/qa-report.json",
      JSON.stringify(
        {
          releaseId: release?.manifest.id ?? null,
          releaseHash: release?.releaseHash ?? null,
          reviewEvidence: "offline_not_loaded",
          errors,
          lessons: report,
        },
        null,
        2,
      ) + "\n",
    );
  }
  for (const error of errors) console.error(error);
  console.log(
    `${packs.length} draft pack(s); ${errors.length} structural error(s); ${report.length} revision(s) audited; ${report.reduce((n, r) => n + r.blockers.length, 0)} outstanding publication checks.`,
  );
  if (errors.length || !packs.length) process.exitCode = 1;
}
main().catch(() => {
  console.error(
    "Content validation could not read its inputs. Check content files and the audio root.",
  );
  process.exitCode = 1;
});
