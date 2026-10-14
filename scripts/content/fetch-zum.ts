import { mkdir, writeFile, readFile, readdir } from "node:fs/promises";
import { sourceAssetSchema } from "../../src/lib/content-pipeline/resources.ts";
import { fileHash } from "../../src/lib/content-pipeline/hash.ts";

// Deliberate, small first batch. No embedded exercises, linked PDFs or media.
const selections = [
  {
    title: "Sich vorstellen",
    key: "sich-vorstellen",
    lessons: ["a1-1-l01", "a1-1-l02"],
    select: (raw: string) => raw.split("==Arbeitsblätter")[0],
    normalized: [
      "Wie heißen Sie?",
      "Wie heißt du?",
      "Woher kommen Sie?",
      "Woher kommst du?",
      "Ich komme aus …",
      "Ich wohne in ...",
    ],
    modifications:
      "Selected introductory question/answer patterns; split combined informal/formal lines; omitted family/marital-status phrases, templates, external worksheets and media.",
  },
  {
    title: "Personalpronomen",
    key: "personalpronomen",
    lessons: ["a1-1-l01", "a1-1-l02"],
    select: (raw: string) =>
      raw.split("\n").find((line) => line.includes("'''Nominativ'''")) ?? "",
    normalized: ["ich", "du", "er", "es", "sie", "wir", "ihr", "Sie"],
    modifications:
      "Extracted only nominative forms; removed formatting and the duplicate sie entry; excluded all case extensions, galleries and third-party links.",
  },
  {
    title: "Possessivartikel",
    key: "possessivartikel",
    lessons: ["a1-1-l03"],
    select: (raw: string) =>
      raw.split("== Interaktive Übungen")[0].replace(/<!--[\s\S]*?-->/g, ""),
    normalized: [
      "Das ist mein Buch.",
      "mein Ball",
      "mein Auto",
      "meine Frau",
      "meine Kinder",
      "unser Hund",
      "unser Haus",
      "unsere Mutter",
      "unsere Kinder",
    ],
    modifications:
      "Selected introductory nominative examples and possessive forms; removed wiki formatting and excluded accusative/dative examples, embeds and media.",
  },
  {
    title: "Sätze",
    key: "satze",
    lessons: ["a1-1-l01", "a1-1-l08", "a1-1-l09"],
    select: (raw: string) => raw.split("====Die Basis 2")[0],
    normalized: [
      "Ich gehe nach Hause.",
      "Er kommt aus Syrien.",
      "Ich wohne in Berlin.",
      "Ich fahre heute.",
      "Ich spiele Fußball.",
      "Ich kaufe Brot.",
      "Ich mache Hausaufgaben.",
      "Ich liebe dich.",
    ],
    modifications:
      "Selected eight short example statements only; omitted syntactic labels, datives, later grammar and all external materials. Level assignment is an unreviewed estimate.",
  },
];
async function main() {
  const checkedAt = process.argv[2];
  if (!/^\d{4}-\d{2}-\d{2}$/.test(checkedAt ?? ""))
    throw new Error("Supply the client date as YYYY-MM-DD.");
  const next = new Date(`${checkedAt}T00:00:00Z`);
  next.setUTCDate(next.getUTCDate() + 90);
  const evidenceUrl =
    "https://deutsch-lernen.zum.de/wiki/%C3%9Cber_ZUM_Deutsch_Lernen";
  const evidence = await fetch(evidenceUrl, {
    signal: AbortSignal.timeout(15000),
  });
  const evidenceText = await evidence.text();
  if (
    !evidence.ok ||
    !evidenceText.includes("creativecommons.org/licenses/by/4.0")
  )
    throw new Error(
      "Current ZUM default-license evidence could not be confirmed.",
    );
  await mkdir("content/source-assets", { recursive: true });
  const summary = [];
  for (const selection of selections) {
    const url = new URL("https://deutsch-lernen.zum.de/api.php");
    url.search = new URLSearchParams({
      action: "query",
      format: "json",
      formatversion: "2",
      prop: "revisions|contributors",
      titles: selection.title,
      rvprop: "ids|timestamp|content",
      rvslots: "main",
      pclimit: "max",
    }).toString();
    const response = await fetch(url, {
      headers: {
        "User-Agent": "DeutschJourneyContentAudit/1.0 (+https://nabil7.site/)",
      },
      signal: AbortSignal.timeout(15000),
    });
    if (!response.ok) throw new Error(`Source unavailable: ${selection.title}`);
    const result = await response.json(),
      page = result.query?.pages?.[0],
      revision = page?.revisions?.[0],
      raw = revision?.slots?.main?.content;
    if (!raw || result.continue?.pccontinue)
      throw new Error(
        "Missing text or incomplete contributor metadata; inspect manually.",
      );
    const excerpt = selection.select(raw);
    if (!excerpt)
      throw new Error(`The source layout changed: ${selection.title}`);
    const plain = excerpt.replace(/'''/g, "").replace(/<[^>]+>/g, "");
    for (const text of selection.normalized)
      if (
        !plain.includes(text) &&
        !(selection.key === "sich-vorstellen" && text === "Ich wohne in ...")
      )
        throw new Error(
          `Selected text changed; review ${selection.title}: ${text}`,
        );
    const authors: string[] = page.contributors.map(
      (c: { name: string }) => c.name,
    );
    const sourceUrl = `https://deutsch-lernen.zum.de/wiki/${encodeURIComponent(page.title.replaceAll(" ", "_"))}`;
    const revisionUrl = `https://deutsch-lernen.zum.de/index.php?title=${encodeURIComponent(page.title)}&oldid=${revision.revid}`;
    const asset = sourceAssetSchema.parse({
      schemaVersion: 1,
      id: `zum-${selection.key}-r${revision.revid}`,
      sourceId: "zum",
      sourceUrl,
      revisionUrl,
      historyUrl: `https://deutsch-lernen.zum.de/index.php?title=${encodeURIComponent(page.title)}&action=history`,
      revision: String(revision.revid),
      sourceUpdatedAt: revision.timestamp,
      fetchedAt: new Date().toISOString(),
      checkedAt,
      nextReviewAt: next.toISOString().slice(0, 10),
      title: page.title,
      authors,
      license: "CC-BY-4.0",
      licenseUrl: "https://creativecommons.org/licenses/by/4.0/",
      licenseEvidenceUrl: evidenceUrl,
      contentType: "text",
      sourceChecksum: fileHash(Buffer.from(raw, "utf8")),
      sourceExcerpt: excerpt,
      normalizedContent: selection.normalized,
      modifications: selection.modifications,
      attribution: `${page.title} — ${authors.join(", ")} / ZUM Deutsch Lernen. CC BY 4.0. ${selection.modifications}`,
      cefrEstimate: "A1",
      cefrStatus: "unreviewed_estimate",
      suggestedLessonIds: selection.lessons,
      reviewStatus: "draft",
    });
    const path = `content/source-assets/${asset.id}.json`;
    // Do not overwrite an existing revision with a different normalization.
    try {
      const old = sourceAssetSchema.parse(
        JSON.parse(await readFile(path, "utf8")),
      );
      if (
        old.sourceChecksum !== asset.sourceChecksum ||
        JSON.stringify(old.normalizedContent) !==
          JSON.stringify(asset.normalizedContent)
      )
        throw new Error(`Existing source revision conflicts: ${asset.id}`);
      summary.push({
        id: old.id,
        items: old.normalizedContent.length,
        status: "already_staged",
      });
      continue;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
    }
    await writeFile(path, JSON.stringify(asset, null, 2) + "\n");
    summary.push({
      id: asset.id,
      items: asset.normalizedContent.length,
      status: "draft",
    });
  }
  const assets = [];
  for (const file of (await readdir("content/source-assets"))
    .filter((name) => name.endsWith(".json"))
    .sort())
    assets.push(
      sourceAssetSchema.parse(
        JSON.parse(await readFile(`content/source-assets/${file}`, "utf8")),
      ),
    );
  await writeFile(
    "content/source-assets.json",
    JSON.stringify({ schemaVersion: 1, assets }, null, 2) + "\n",
  );
  console.log(
    JSON.stringify({
      assets: summary,
      mediaImported: 0,
      humanApprovalsCreated: 0,
    }),
  );
}
main().catch((error) => {
  console.error((error as Error).message);
  process.exitCode = 1;
});
