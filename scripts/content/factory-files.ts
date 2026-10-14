import { readdir, readFile, realpath } from "node:fs/promises";
import { relative, isAbsolute } from "node:path";
import {
  factoryCurriculumSchema,
  sourceCatalogSchema,
  releaseManifestSchema,
} from "../../src/lib/content-factory/model.ts";
import {
  lessonPackSchema,
  type LessonPack,
} from "../../src/lib/content-pipeline/model.ts";
import { contentHash } from "../../src/lib/content-pipeline/hash.ts";
import { readCandidateIntake } from "../../src/lib/content-factory/intake.ts";

export async function readFactory() {
  const intake = await readCandidateIntake();
  const map = factoryCurriculumSchema.parse(
    JSON.parse(await readFile("content/factory/curriculum-map.json", "utf8")),
  );
  const sources = sourceCatalogSchema.parse(
    JSON.parse(await readFile("content/factory/source-catalog.json", "utf8")),
  );
  const drafts: LessonPack[] = [];
  async function visit(path: string) {
    for (const entry of await readdir(path, { withFileTypes: true })) {
      if (entry.isSymbolicLink())
        throw new Error("Content packs cannot be symbolic links.");
      if (entry.isDirectory()) await visit(`${path}/${entry.name}`);
      else if (entry.name.endsWith(".json"))
        drafts.push(
          lessonPackSchema.parse(
            JSON.parse(await readFile(`${path}/${entry.name}`, "utf8")),
          ),
        );
    }
  }
  await visit("content/lessons");
  for (const pack of drafts) {
    const course = map.courses.find((c) => c.id === pack.courseId);
    if (
      !course ||
      course.level !== pack.cefr ||
      course.subdivision !== pack.courseSubdivision ||
      !course.lessons.some(
        (l) => l.id === pack.id && l.number === pack.lessonNumber,
      )
    )
      throw new Error(
        `${pack.id}: pack must match its course, level, subdivision and lesson number.`,
      );
  }
  return { map, sources, drafts, intake };
}
export async function readRelease(id: string, drafts: LessonPack[]) {
  if (!/^[a-z0-9][a-z0-9-]{0,99}$/.test(id))
    throw new Error("Use a release ID from content/releases.");
  const manifest = releaseManifestSchema.parse(
    JSON.parse(await readFile(`content/releases/${id}.json`, "utf8")),
  );
  if (manifest.id !== id)
    throw new Error("Release identity differs from its filename.");
  const root = await realpath("content/lessons");
  const packs: LessonPack[] = [];
  for (const item of manifest.lessons) {
    const file = await realpath(item.path),
      inside = relative(root, file);
    if (inside.startsWith("..") || isAbsolute(inside))
      throw new Error("Release file escaped content/lessons.");
    const pack = lessonPackSchema.parse(
      JSON.parse(await readFile(file, "utf8")),
    );
    if (
      pack.id !== item.lessonId ||
      pack.version !== item.version ||
      contentHash(pack) !== item.contentHash ||
      !drafts.some(
        (p) =>
          p.id === pack.id &&
          p.version === pack.version &&
          contentHash(p) === item.contentHash,
      )
    )
      throw new Error(
        `${item.lessonId}: release must pin the exact committed pack hash and revision.`,
      );
    packs.push(pack);
  }
  return { manifest, packs, releaseHash: contentHash(manifest) };
}
