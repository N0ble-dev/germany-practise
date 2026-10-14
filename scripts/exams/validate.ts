import { readFileSync, readdirSync, mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { examDefinitions } from "../../src/lib/exams/definitions.ts";
import { examPackSchema } from "../../src/lib/exams/model.ts";
import { examPublicationBlockers } from "../../src/lib/exams/evaluation.ts";
import { contentHash } from "../../src/lib/content-pipeline/hash.ts";
const rows = [];
for (const directory of readdirSync("content/exams", {
  withFileTypes: true,
}).filter((entry) => entry.isDirectory())) {
  for (const file of readdirSync(join("content/exams", directory.name)).filter(
    (file) => file.endsWith(".json"),
  )) {
    const path = join("content/exams", directory.name, file),
      pack = examPackSchema.parse(JSON.parse(readFileSync(path, "utf8"))),
      hash = contentHash(pack);
    if (directory.name !== pack.examCode)
      throw new Error("Exam pack directory and exam code differ.");
    if (
      file !== `${pack.id.replace(/^a1-/, "")}.v${pack.version}.json` &&
      file !== `${pack.id}.v${pack.version}.json`
    )
      throw new Error("Exam pack filename and version differ.");
    const blockers = examPublicationBlockers(pack, hash, [], []);
    rows.push({
      path,
      id: pack.id,
      version: pack.version,
      hash,
      tasks: pack.tasks.length,
      blockers,
    });
  }
}
mkdirSync("artifacts/exams", { recursive: true });
writeFileSync(
  "artifacts/exams/draft-validation.json",
  JSON.stringify(
    {
      definitions: examDefinitions.map((definition) => ({
        code: definition.code,
        revision: definition.revision,
        checkedAt: definition.checkedAt,
      })),
      packs: rows,
    },
    null,
    2,
  ) + "\n",
);
console.log(
  JSON.stringify(
    {
      definitions: examDefinitions.length,
      packs: rows.map(({ path, tasks, blockers }) => ({
        path,
        tasks,
        publicationBlockers: blockers.length,
      })),
      result:
        "Draft structure checked. Human review and recording checks are separate publication gates.",
    },
    null,
    2,
  ),
);
