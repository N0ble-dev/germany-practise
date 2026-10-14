import { mkdir, writeFile } from "node:fs/promises";
import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { readFactory, readRelease } from "./factory-files.ts";
import {
  buildCoverage,
  authoringBrief,
} from "../../src/lib/content-factory/coverage.ts";
import { factoryEvidence } from "../../src/lib/content-factory/repository.ts";
import {
  ContentRepository,
  ContentError,
} from "../../src/lib/content-pipeline/repository.ts";
import { sourceEvidenceErrors } from "../../src/lib/content-pipeline/source-evidence.ts";

const args = process.argv.slice(3);
function option(name: string) {
  return args[args.indexOf(name) + 1];
}
function endpoint(value: string) {
  const url = new URL(value);
  if (!["postgres:", "postgresql:"].includes(url.protocol))
    throw new Error("Use a Postgres connection URL.");
  return `${url.hostname.replace("-pooler", "")}${url.pathname}`;
}
async function main() {
  const mode = process.argv[2] ?? "inventory";
  const { map, sources, drafts, intake } = await readFactory();
  if (mode === "brief") {
    console.log(JSON.stringify(authoringBrief(map, args[0], drafts), null, 2));
    return;
  }
  const releaseId = args.includes("--release")
    ? option("--release")
    : undefined;
  if (args.includes("--release") && !releaseId)
    throw new Error("Supply a release ID after --release.");
  const release = releaseId ? await readRelease(releaseId, drafts) : undefined;
  if (mode === "license-audit") {
    const report = (release?.packs ?? drafts).map((p) => ({
      lessonId: p.id,
      version: p.version,
      origin: p.rights.origin,
      commercialUseCleared: p.rights.commercialUseCleared,
      blockers: [
        ...sourceEvidenceErrors(p.references),
        ...(!p.rights.commercialUseCleared
          ? ["Human commercial-rights clearance pending."]
          : []),
      ],
      references: p.references.map((r) => ({
        id: r.id,
        use: r.use,
        url: r.url,
        license: r.license,
      })),
    }));
    await mkdir("artifacts/content", { recursive: true });
    await writeFile(
      "artifacts/content/license-audit.json",
      JSON.stringify(
        { sources: sources.sources, lessons: report, candidateIntake: intake },
        null,
        2,
      ) + "\n",
    );
    console.log(
      `Audited ${sources.sources.length} source policies and ${report.length} revisions; ${report.filter((r) => r.blockers.length).length} revisions need rights clearance. See artifacts/content/license-audit.json.`,
    );
    if (
      args.includes("--strict") &&
      (report.some((r) => r.blockers.length) ||
        (!release && intake.totalCandidates > 0))
    )
      throw new Error(
        "Release is blocked by unresolved source/rights evidence.",
      );
    return;
  }
  if (mode === "stage" || mode === "verify-production") {
    if (!release)
      throw new Error("Supply --release <id>. No bulk import is inferred.");
    const reviewUrl = process.env.CONTENT_REVIEW_DATABASE_URL,
      productionUrl = process.env.CONTENT_PUBLICATION_DATABASE_URL;
    if (
      !reviewUrl ||
      !productionUrl ||
      endpoint(reviewUrl) === endpoint(productionUrl)
    )
      throw new Error(
        "Configure distinct CONTENT_REVIEW_DATABASE_URL and CONTENT_PUBLICATION_DATABASE_URL branches.",
      );
    if (mode === "stage") {
      const expected = process.env.CONTENT_REVIEW_BRANCH_HOST;
      if (
        !expected ||
        new URL(reviewUrl).hostname.replace("-pooler", "") !==
          expected.replace("-pooler", "")
      )
        throw new Error(
          "CONTENT_REVIEW_BRANCH_HOST must explicitly identify the intended staging endpoint.",
        );
      const db = drizzle(neon(reviewUrl));
      const repository = new ContentRepository((query) => db.execute(query));
      // Preflight every immutable identity before any write. Each import is atomic and rerunnable.
      for (const pack of release.packs) {
        const errors = sourceEvidenceErrors(pack.references);
        if (errors.length) throw new Error(errors.join("\n"));
        try {
          const existing = await repository.detail(pack.id, pack.version);
          if (
            existing.contentHash !==
            release.manifest.lessons.find((l) => l.lessonId === pack.id)!
              .contentHash
          )
            throw new Error(`${pack.id}: immutable staging version differs.`);
        } catch (error) {
          if (!(error instanceof ContentError && error.status === 404))
            throw error;
        }
      }
      for (const pack of release.packs) await repository.importDraft(pack);
      const evidence = await factoryEvidence(
        (query) => db.execute(query),
        map.courses.flatMap((c) => c.lessons.map((l) => l.id)),
      );
      await mkdir("artifacts/content", { recursive: true });
      await writeFile(
        "artifacts/content/staging-report.json",
        JSON.stringify(
          {
            releaseId,
            releaseHash: release.releaseHash,
            coverage: buildCoverage(map, drafts, evidence, true),
          },
          null,
          2,
        ) + "\n",
      );
      console.log(
        `Staged ${release.packs.length} pinned draft revisions (${release.releaseHash}). No reviews, audio approvals, publications or learner records were created. See artifacts/content/staging-report.json.`,
      );
    } else {
      const db = drizzle(neon(productionUrl)),
        repository = new ContentRepository((query) => db.execute(query));
      const published = await repository.published();
      const missing = release.manifest.lessons.filter(
        (l) =>
          !published.some(
            (p) =>
              p.lessonKey === l.lessonId &&
              p.version === l.version &&
              p.contentHash === l.contentHash,
          ),
      );
      console.log(
        `${releaseId}: ${release.packs.length - missing.length}/${release.packs.length} exact revisions publicly available.`,
      );
      if (missing.length)
        throw new Error(
          `Not published: ${missing.map((l) => `${l.lessonId}@${l.version}`).join(", ")}.`,
        );
    }
    return;
  }
  if (mode !== "inventory" && mode !== "qa-report")
    throw new Error(
      "Use inventory, brief, license-audit, stage, qa-report or verify-production.",
    );
  const coverage = buildCoverage(map, drafts, [], false);
  await mkdir("artifacts/content", { recursive: true });
  await writeFile(
    "artifacts/content/factory-inventory.json",
    JSON.stringify(
      { release: release?.manifest ?? null, coverage, candidateIntake: intake },
      null,
      2,
    ) + "\n",
  );
  console.log(
    `${map.courses.length} courses · ${map.courses.flatMap((c) => c.modules).length} modules · ${coverage.totalPlanned} planning targets · ${coverage.totalDrafted} drafted lessons. Database publication status is unknown in this offline report. See artifacts/content/factory-inventory.json.`,
  );
}
main().catch((error) => {
  console.error(
    error instanceof Error &&
      !("severity" in error) &&
      !error.message.startsWith("Failed query:")
      ? error.message.replace(/postgres(?:ql)?:\/\/\S+/gi, "[database URL]")
      : "Content factory could not connect. Check branch credentials and migrations.",
  );
  process.exitCode = 1;
});
