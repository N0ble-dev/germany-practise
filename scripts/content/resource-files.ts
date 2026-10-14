import { createReadStream } from "node:fs";
import { readFile, readdir, mkdir, writeFile, stat } from "node:fs/promises";
import { createHash } from "node:crypto";
import { createInterface } from "node:readline";
import { DatabaseSync } from "node:sqlite";
import { contentHash } from "../../src/lib/content-pipeline/hash.ts";
import {
  intakeItemSchema,
  type IntakeItem,
  type IntakeArchive,
} from "../../src/lib/content-intake/model.ts";
import { normalizeTatoebaPair } from "../../src/lib/content-factory/tatoeba.ts";
import { sourceAssetSchema } from "../../src/lib/content-pipeline/resources.ts";
const tables = {
  source_documents: "source_document",
  chapters: "chapter",
  source_pages: "source_page",
  vocabulary: "vocabulary",
  vocabulary_categories: "vocabulary_category",
  activities: "activity",
  chapter_grammar_references: "grammar_reference",
  source_links: "source_link",
  media_references: "media_reference",
  extraction_warnings: "extraction_warning",
} as const;
type Row = Record<string, unknown>;
export function parseCsv(input: string): string[][] {
  const rows: string[][] = [];
  let cells: string[] = [],
    cell = "",
    quoted = false;
  for (let i = 0; i < input.length; i++) {
    const c = input[i];
    if (c === '"') {
      if (quoted && input[i + 1] === '"') {
        cell += '"';
        i++;
      } else quoted = !quoted;
    } else if (c === "," && !quoted) {
      cells.push(cell);
      cell = "";
    } else if ((c === "\n" || c === "\r") && !quoted) {
      if (c === "\r" && input[i + 1] === "\n") i++;
      cells.push(cell);
      if (cells.some(Boolean)) rows.push(cells);
      cells = [];
      cell = "";
    } else cell += c;
  }
  if (quoted) throw new Error("Unterminated CSV quotation.");
  if (cell || cells.length) {
    cells.push(cell);
    rows.push(cells);
  }
  return rows;
}
async function fileFingerprint(path: string) {
  const hash = createHash("sha256");
  for await (const chunk of createReadStream(path)) hash.update(chunk);
  return { path, sha256: hash.digest("hex"), bytes: (await stat(path)).size };
}
export function dibItem(table: keyof typeof tables, row: Row): IntakeItem {
  const kind = tables[table];
  const key =
    kind === "source_page" ? `page-${row.page_number}` : String(row.id);
  const chapter = row.chapter_id == null ? null : Number(row.chapter_id),
    page =
      row.page_number == null
        ? row.source_page == null
          ? null
          : Number(row.source_page)
        : Number(row.page_number);
  return intakeItemSchema.parse({
    kind,
    key,
    hash: contentHash(row),
    chapter,
    page,
    german:
      typeof row.german === "string"
        ? row.german
        : typeof row.raw_text === "string"
          ? row.raw_text
          : typeof row.source_excerpt === "string"
            ? row.source_excerpt
            : typeof row.title_de === "string"
              ? row.title_de
              : typeof row.german_title === "string"
                ? row.german_title
                : typeof row.topic === "string"
                  ? row.topic
                  : null,
    english:
      typeof row.english === "string"
        ? row.english
        : typeof row.english_title === "string"
          ? row.english_title
          : null,
    topic: typeof row.topic_de === "string" ? row.topic_de : null,
    listType: typeof row.list_type === "string" ? row.list_type : null,
    payload: row,
  });
}
function makeArchive(
  provider: IntakeArchive["provider"],
  title: string,
  manifest: IntakeArchive["manifest"],
): IntakeArchive {
  const expectedCount = Object.values(manifest.counts).reduce(
      (n, c) => n + c,
      0,
    ),
    manifestHash = contentHash({ provider, title, manifest, expectedCount });
  return {
    id: `${provider.replaceAll("_", "-")}-${manifestHash.slice(0, 16)}`,
    provider,
    title,
    manifestHash,
    expectedCount,
    manifest,
  };
}
export async function prepareResources(root = "recources") {
  const inventory: Awaited<ReturnType<typeof fileFingerprint>>[] = [];
  async function visit(path: string) {
    for (const entry of await readdir(path, { withFileTypes: true })) {
      if (entry.isSymbolicLink())
        throw new Error("Resource archives cannot contain symbolic links.");
      if (entry.isDirectory()) await visit(`${path}/${entry.name}`);
      else inventory.push(await fileFingerprint(`${path}/${entry.name}`));
    }
  }
  await visit(root);
  const report = JSON.parse(
    await readFile(`${root}/extraction_report.json`, "utf8"),
  );
  const rowsByTable = new Map<keyof typeof tables, Row[]>();
  const sqlite = new DatabaseSync(`${root}/deutsch_im_blick_content.db`, {
    readOnly: true,
    allowExtension: false,
  });
  try {
    if (
      sqlite
        .prepare("PRAGMA quick_check")
        .all()
        .some((r) => r.quick_check !== "ok")
    )
      throw new Error("SQLite archive integrity failed.");
    if (sqlite.prepare("PRAGMA foreign_key_check").all().length)
      throw new Error("SQLite archive has broken source relationships.");
    for (const table of Object.keys(tables) as (keyof typeof tables)[]) {
      const raw = await readFile(`${root}/data/${table}.jsonl`, "utf8"),
        rows: Row[] = raw.trim()
          ? raw
              .trim()
              .split(/\r?\n/)
              .map((line) => JSON.parse(line))
          : [];
      const actual = sqlite.prepare(`SELECT * FROM ${table}`).all();
      const fingerprint = (values: unknown[]) => values.map(contentHash).sort();
      if (
        contentHash(fingerprint(actual)) !== contentHash(fingerprint(rows)) ||
        rows.length !== report.counts[table]
      )
        throw new Error(
          `${table}: SQLite, JSONL or extraction report disagrees.`,
        );
      const csv = inventory.find((f) => f.path === `${root}/data/${table}.csv`);
      if (csv) {
        const [columns, ...csvRows] = parseCsv(
          await readFile(csv.path, "utf8"),
        );
        if (
          csvRows.length !== rows.length ||
          csvRows.some(
            (cells, i) =>
              cells.length !== columns.length ||
              columns.some(
                (column, j) => cells[j] !== String(rows[i][column] ?? ""),
              ),
          )
        )
          throw new Error(`${table}: CSV does not match its canonical JSONL.`);
      }
      rowsByTable.set(table, rows);
    }
  } finally {
    sqlite.close();
  }
  const docs = rowsByTable.get("source_documents")!,
    chapters = rowsByTable.get("chapters")!,
    pages = rowsByTable.get("source_pages")!;
  if (
    docs.length !== 1 ||
    docs[0].sha256 !== report.pdf_sha256 ||
    Number(docs[0].pages) !== report.pages ||
    pages.length !== report.pages
  )
    throw new Error(
      "Source document and claimed PDF checksum/page count disagree.",
    );
  const source = docs[0],
    chapterIds = new Set(chapters.map((c) => c.id)),
    pageIds = new Set(pages.map((p) => p.page_number));
  for (const [table, rows] of rowsByTable)
    for (const row of rows) {
      if (table !== "source_documents" && row.source_id !== source.id)
        throw new Error(`${table}: unknown source document.`);
      if (row.chapter_id != null && !chapterIds.has(row.chapter_id))
        throw new Error(`${table}: unknown chapter.`);
      for (const column of ["page_number", "source_page"])
        if (row[column] != null && !pageIds.has(row[column]))
          throw new Error(`${table}: missing source page.`);
      if (
        (row.review_status != null && row.review_status !== "pending_review") ||
        row.cefr_level != null ||
        row.cefr_verified === 1 ||
        row.level_verified === 1 ||
        row.media_license_verified === 1 ||
        row.asset_downloaded === 1
      )
        throw new Error(
          `${table}: extraction cannot carry human approval or downloaded-media claims.`,
        );
    }
  if (
    (await readFile(`${root}/neon_schema.sql`, "utf8")) !==
    (await readFile(`${root}/data/neon_schema.sql`, "utf8"))
  )
    throw new Error("Duplicate supplied SQL schemas disagree.");
  const dibRows = [...rowsByTable].flatMap(([table, rows]) =>
      rows.map((row) => dibItem(table, row)),
    ),
    identities = new Set(dibRows.map((r) => `${r.kind}:${r.key}`));
  if (identities.size !== dibRows.length)
    throw new Error("Duplicate source identity in Deutsch im Blick export.");
  const dib = makeArchive(
    "deutsch_im_blick",
    "Deutsch im Blick · Second edition (2017)",
    {
      schemaVersion: 1,
      sourceUrl: String(source.url),
      licenseClaim: String(source.license_id),
      licenseUrl: String(source.license_url),
      attribution: String(source.attribution),
      counts: Object.fromEntries(
        Object.keys(tables).map((table) => [
          tables[table as keyof typeof tables],
          report.counts[table],
        ]),
      ),
      files: inventory.filter(
        (f) => !f.path.endsWith("/deu.txt") && !f.path.endsWith("/_about.txt"),
      ),
      notes: [
        "SQLite, JSONL, CSV and extraction counts match. The source PDF is not present in this folder; its supplied checksum remains a provenance claim, not a reverified binary checksum.",
        "All extracted language, CEFR, answer keys and rights require review. Third-party assets are not cleared by the book's license.",
        "QR/URL references are not recordings. No media has been downloaded.",
      ],
    },
  );
  await mkdir(".cache/resource-intake", { recursive: true });
  const dibPath = ".cache/resource-intake/deutsch-im-blick.jsonl";
  await writeFile(
    dibPath,
    dibRows.map((r) => JSON.stringify(r)).join("\n") + "\n",
  );
  const sentencePath = ".cache/resource-intake/tatoeba.jsonl";
  // The full export is streamed. Keep only compact typed payloads; shared attribution policy is on the archive.
  const seen = new Map<string, string>();
  let inputRows = 0,
    duplicates = 0;
  const counts: Record<string, number> = { sentence_pair: 0, quarantine: 0 };
  const append = await import("node:fs/promises");
  await writeFile(sentencePath, "");
  let batch: string[] = [];
  for await (const line of createInterface({
    input: createReadStream(`${root}/deu.txt`),
    crlfDelay: Infinity,
  })) {
    inputRows++;
    const pair = normalizeTatoebaPair(line, 40);
    let item: IntakeItem;
    if (pair) {
      const payload = {
        german: pair.text.de,
        english: pair.text.en,
        germanId: pair.source.germanId,
        englishId: pair.source.englishId,
        germanAuthor: pair.source.germanAuthor,
        englishAuthor: pair.source.englishAuthor,
        attribution: pair.source.attribution,
      };
      const hash = contentHash(payload);
      const existing = seen.get(pair.id);
      if (existing === hash) {
        duplicates++;
        continue;
      }
      if (existing) {
        const payload = {
          rawRow: line,
          reason:
            "Same sentence-pair ID carries different text or attribution.",
          lineNumber: inputRows,
        };
        item = {
          kind: "quarantine",
          key: `line-${inputRows}`,
          hash: contentHash(payload),
          chapter: null,
          page: null,
          german: null,
          english: null,
          topic: null,
          listType: null,
          payload,
        };
      } else {
        seen.set(pair.id, hash);
        item = {
          kind: "sentence_pair",
          key: pair.id,
          hash,
          chapter: null,
          page: null,
          german: pair.text.de,
          english: pair.text.en,
          topic: null,
          listType: null,
          payload,
        };
      }
    } else {
      const payload = {
        rawRow: line,
        reason:
          "Missing/ambiguous attribution or outside the supported 40-word/1000-character normalization bounds.",
        lineNumber: inputRows,
      };
      item = {
        kind: "quarantine",
        key: `line-${inputRows}`,
        hash: contentHash(payload),
        chapter: null,
        page: null,
        german: null,
        english: null,
        topic: null,
        listType: null,
        payload,
      };
    }
    counts[item.kind]++;
    batch.push(JSON.stringify(item));
    if (batch.length === 1000) {
      await append.appendFile(sentencePath, batch.join("\n") + "\n");
      batch = [];
    }
  }
  if (batch.length)
    await append.appendFile(sentencePath, batch.join("\n") + "\n");
  const tatoeba = makeArchive(
    "tatoeba",
    "Tatoeba / ManyThings · Full supplied German–English export",
    {
      schemaVersion: 1,
      sourceUrl: "https://www.manythings.org/anki/",
      licenseClaim: "CC-BY-2.0-FR (per-row source claim)",
      licenseUrl: "https://creativecommons.org/licenses/by/2.0/fr/",
      attribution:
        "Sentence-level German and English author names and Tatoeba IDs are preserved; export compiled by ManyThings.org/anki.",
      counts,
      files: inventory.filter(
        (f) => f.path.endsWith("/deu.txt") || f.path.endsWith("/_about.txt"),
      ),
      notes: [
        `${inputRows} source rows; ${duplicates} exact duplicate identities skipped; ${counts.quarantine} rows retained in quarantine, not silently dropped.`,
        "Shortness does not establish CEFR. German, translations, context and rights still need human review.",
        "Arabic, verified level and licensed audio are absent.",
      ],
    },
  );
  const zumRows: IntakeItem[] = [],
    zumFiles: Awaited<ReturnType<typeof fileFingerprint>>[] = [];
  for (const name of await readdir("content/source-assets")) {
    if (!name.endsWith(".json")) continue;
    const path = `content/source-assets/${name}`,
      asset = sourceAssetSchema.parse(JSON.parse(await readFile(path, "utf8")));
    zumFiles.push(await fileFingerprint(path));
    zumRows.push({
      kind: "wiki_page",
      key: asset.id,
      hash: contentHash(asset),
      chapter: null,
      page: null,
      german: asset.sourceExcerpt,
      english: null,
      topic: asset.title,
      listType: null,
      payload: asset,
    });
  }
  const zum = makeArchive("zum", "ZUM · Existing curated revision evidence", {
    schemaVersion: 1,
    sourceUrl: "https://deutsch-lernen.zum.de/wiki/Hauptseite",
    licenseClaim: "CC-BY-4.0 (exact selected text evidence)",
    licenseUrl: "https://creativecommons.org/licenses/by/4.0/",
    attribution:
      "Original authors, exact revisions, license evidence and adaptation notices are retained in each source item.",
    counts: { wiki_page: zumRows.length },
    files: zumFiles,
    notes: [
      "Reuses existing curated text evidence rather than the supplied prototype's unverified API path or placeholder crawler identity.",
      "Embedded media and external materials have not been imported.",
    ],
  });
  const zumPath = ".cache/resource-intake/zum.jsonl";
  await writeFile(
    zumPath,
    zumRows.map((r) => JSON.stringify(r)).join("\n") + "\n",
  );
  const prepared = [
    { archive: dib, path: dibPath },
    { archive: tatoeba, path: sentencePath },
    { archive: zum, path: zumPath },
  ];
  for (const original of [...inventory, ...zumFiles]) {
    const current = await fileFingerprint(original.path);
    if (current.sha256 !== original.sha256 || current.bytes !== original.bytes)
      throw new Error(
        "Source files changed during audit; run it again with a stable archive.",
      );
  }
  const audit = {
    schemaVersion: 1,
    files: inventory,
    archives: prepared.map((p) => p.archive),
    inputRows,
    duplicates,
    quarantined: counts.quarantine,
    sqlAction:
      "Supplied schemas and importers were inspected; their behavior is implemented through isolated Drizzle migrations and immutable TypeScript imports.",
    sqliteParity: "passed",
    csvParity: "passed",
    originalPdfPresent: inventory.some((f) =>
      f.path.toLowerCase().endsWith(".pdf"),
    ),
  };
  await mkdir("artifacts/content", { recursive: true });
  await writeFile(
    "artifacts/content/recources-audit.json",
    JSON.stringify(audit, null, 2) + "\n",
  );
  return { prepared, audit };
}
