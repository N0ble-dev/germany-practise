import { readdir, readFile } from "node:fs/promises";
import { contentHash } from "../content-pipeline/hash.ts";
import { normalizeTatoebaPair } from "./tatoeba.ts";
export async function readCandidateIntake() {
  const directory = `${process.cwd()}/content/factory/candidates`;
  const batches = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    if (entry.isSymbolicLink())
      throw new Error("Candidate batches cannot be symbolic links.");
    if (!entry.isFile() || !entry.name.endsWith(".jsonl")) continue;
    const rows = (await readFile(`${directory}/${entry.name}`, "utf8"))
      .trim()
      .split(/\r?\n/)
      .map((line) => JSON.parse(line));
    if (rows.length > 500)
      throw new Error(
        "Candidate batches are limited to 500 review-only items.",
      );
    const identities = new Set<string>();
    for (const row of rows) {
      const expected = normalizeTatoebaPair(row.source?.rawRow ?? "", 40);
      const { datasetHash, ...source } = row.source ?? {};
      if (
        !expected ||
        !/^[a-f0-9]{64}$/.test(datasetHash ?? "") ||
        contentHash({ ...row, source }) !== contentHash(expected) ||
        identities.has(row.id)
      )
        throw new Error(
          "Invalid or changed immutable sentence candidate evidence.",
        );
      identities.add(row.id);
    }
    batches.push({
      id: entry.name,
      total: rows.length,
      status: "needs_review" as const,
      source: "Tatoeba / ManyThings",
      sample: rows.slice(0, 5).map((row) => ({
        id: String(row.id),
        german: String(row.text.de),
        english: String(row.text.en),
        author: String(row.source.germanAuthor),
        sourceUrl: String(row.source.germanUrl),
        licenseClaim: String(row.source.licenseClaim),
      })),
    });
  }
  return { totalCandidates: batches.reduce((n, b) => n + b.total, 0), batches };
}
