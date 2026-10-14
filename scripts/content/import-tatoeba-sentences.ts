import { createReadStream } from "node:fs";
import { mkdir, readFile, stat, writeFile } from "node:fs/promises";
import { createInterface } from "node:readline";
import { createHash } from "node:crypto";
import { normalizeTatoebaPair } from "../../src/lib/content-factory/tatoeba.ts";
async function main() {
  const args = process.argv.slice(2);
  const option = (name: string) =>
    args.includes(name) ? args[args.indexOf(name) + 1] : undefined;
  const path = option("--input"),
    limit = Number(option("--limit") ?? 100),
    maximumWords = Number(option("--max-words") ?? 12);
  if (
    !path ||
    !Number.isInteger(limit) ||
    limit < 1 ||
    limit > 500 ||
    !Number.isInteger(maximumWords) ||
    maximumWords < 1 ||
    maximumWords > 40
  )
    throw new Error(
      "Use --input <downloaded deu.txt> --limit 1–500 --max-words 1–40. Candidates are never auto-published.",
    );
  const info = await stat(path);
  if (!info.isFile() || info.size > 200_000_000)
    throw new Error("Choose a text export file under 200 MB.");
  const candidates: NonNullable<ReturnType<typeof normalizeTatoebaPair>>[] = [],
    identities = new Set<string>();
  const hash = createHash("sha256"),
    stream = createReadStream(path);
  stream.on("data", (chunk) => hash.update(chunk));
  const lines = createInterface({ input: stream, crlfDelay: Infinity });
  let totalRows = 0;
  for await (const line of lines) {
    totalRows++;
    if (candidates.length >= limit) continue; // Continue hashing the complete export, not a partial stream.
    const candidate = normalizeTatoebaPair(line, maximumWords);
    if (!candidate || identities.has(candidate.id)) continue;
    identities.add(candidate.id);
    candidates.push(candidate);
  }
  if (!candidates.length)
    throw new Error(
      "No attributable CC-BY 2.0 France sentence pairs matched the selection. Inspect the input format.",
    );
  const datasetHash = hash.digest("hex"),
    directory = "content/factory/candidates";
  const output = `${directory}/tatoeba-${datasetHash.slice(0, 16)}-${limit}-${maximumWords}.jsonl`;
  const content =
    candidates
      .map((c) =>
        JSON.stringify({ ...c, source: { ...c.source, datasetHash } }),
      )
      .join("\n") + "\n";
  await mkdir(directory, { recursive: true });
  try {
    const existing = await readFile(output, "utf8");
    if (existing.replaceAll("\r\n", "\n") !== content)
      throw new Error(
        "Existing candidate batch differs; inspect instead of overwriting immutable evidence.",
      );
  } catch (error) {
    if (!(error instanceof Error && "code" in error && error.code === "ENOENT"))
      throw error;
    await writeFile(output, content, { flag: "wx" });
  }
  console.log(
    `Selected ${candidates.length} review-only pairs from ${totalRows} rows. Preserved attribution and complete export SHA-256. ${output}. No CEFR, Arabic, audio, rights or publication approval assigned.`,
  );
}
main().catch((error) => {
  console.error(
    error instanceof Error ? error.message : "Sentence staging failed.",
  );
  process.exitCode = 1;
});
