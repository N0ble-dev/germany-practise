import map from "../../../content/factory/curriculum-map.json";
import sources from "../../../content/factory/source-catalog.json";
import { readFile, readdir } from "node:fs/promises";
import { factoryCurriculumSchema, sourceCatalogSchema } from "./model.ts";
import {
  lessonPackSchema,
  type LessonPack,
} from "../content-pipeline/model.ts";

export const factoryCurriculum = factoryCurriculumSchema.parse(map);
export const factorySources = sourceCatalogSchema.parse(sources);
export async function readFactoryDrafts() {
  const packs: LessonPack[] = [];
  async function visit(path: string) {
    for (const entry of await readdir(path, { withFileTypes: true })) {
      if (entry.isSymbolicLink())
        throw new Error("Content packs cannot be symbolic links.");
      if (entry.isDirectory()) await visit(`${path}/${entry.name}`);
      else if (entry.name.endsWith(".json"))
        packs.push(
          lessonPackSchema.parse(
            JSON.parse(await readFile(`${path}/${entry.name}`, "utf8")),
          ),
        );
    }
  }
  await visit(`${process.cwd()}/content/lessons`);
  return packs;
}
