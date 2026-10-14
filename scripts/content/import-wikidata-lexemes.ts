import { mkdir, readFile, writeFile } from "node:fs/promises";
import { normalizeWikidataLexeme } from "../../src/lib/content-factory/lexemes.ts";
import { contentHash } from "../../src/lib/content-pipeline/hash.ts";

async function main() {
  const ids = process.argv.slice(2);
  if (
    !ids.length ||
    ids.length > 20 ||
    ids.some((id) => !/^L[1-9]\d*$/.test(id)) ||
    new Set(ids).size !== ids.length
  )
    throw new Error(
      "Supply 1–20 distinct Wikidata lexeme IDs, for example L7341. This stages structured entities only.",
    );
  const directory = "content/factory/lexemes/wikidata";
  await mkdir(directory, { recursive: true });
  for (const id of ids) {
    const response = await fetch(
      `https://www.wikidata.org/wiki/Special:EntityData/${id}.json`,
      {
        headers: {
          Accept: "application/json",
          "User-Agent":
            "DeutschJourney-ContentFactory/1.0 (curated German lexeme staging)",
        },
        signal: AbortSignal.timeout(20000),
        redirect: "error",
      },
    );
    if (!response.ok || !response.body)
      throw new Error(`${id}: official entity JSON is unavailable.`);
    const reader = response.body.getReader(),
      chunks: Uint8Array[] = [];
    let size = 0;
    try {
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        size += value.length;
        if (size > 1_000_000) {
          await reader.cancel();
          throw new Error(`${id}: entity exceeds the 1 MB staging limit.`);
        }
        chunks.push(value);
      }
    } finally {
      reader.releaseLock();
    }
    const body = JSON.parse(Buffer.concat(chunks).toString("utf8")),
      raw = body.entities?.[id];
    const staged = normalizeWikidataLexeme(raw, new Date().toISOString());
    const path = `${directory}/${id}.r${staged.source.revision}.json`;
    try {
      const existing = JSON.parse(await readFile(path, "utf8"));
      if (existing.source.sourceHash !== contentHash(raw))
        throw new Error(
          `${id}: existing revision has a different source hash; inspect instead of overwriting.`,
        );
      console.log(`${id}: same revision already staged.`);
    } catch (error) {
      if (!(
        error instanceof Error &&
        "code" in error &&
        error.code === "ENOENT"
      ))
        throw error;
      await writeFile(path, JSON.stringify(staged, null, 2) + "\n", {
        flag: "wx",
      });
      console.log(
        `${id}: staged revision ${staged.source.revision}, ${staged.forms.length} forms and ${staged.senses.length} senses. Human review required.`,
      );
    }
  }
}
main().catch((error) => {
  console.error(
    error instanceof Error ? error.message : "Lexeme staging failed.",
  );
  process.exitCode = 1;
});
