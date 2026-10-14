import { describe, it, expect, vi } from "vitest";
import { readFile } from "node:fs/promises";
import {
  factoryCurriculumSchema,
  releaseManifestSchema,
} from "@/lib/content-factory/model";
import {
  factoryCurriculum,
  readFactoryDrafts,
} from "@/lib/content-factory/catalog";
import {
  buildCoverage,
  authoringBrief,
  type FactoryEvidence,
} from "@/lib/content-factory/coverage";
import { normalizeWikidataLexeme } from "@/lib/content-factory/lexemes";
import { contentHash } from "@/lib/content-pipeline/hash";
import {
  reviewCategories,
  type ContentReview,
} from "@/lib/content-pipeline/model";
import { normalizeTatoebaPair } from "@/lib/content-factory/tatoeba";
import { readCandidateIntake } from "@/lib/content-factory/intake";
import { readFactory, readRelease } from "../../scripts/content/factory-files";
import { authDestination } from "@/lib/auth-navigation";
vi.mock("server-only", () => ({}));
const mocks = vi.hoisted(() => ({ actor: vi.fn(), execute: vi.fn() }));
vi.mock("@/db", () => ({ getDb: () => ({ execute: mocks.execute }) }));
vi.mock("@/lib/content-pipeline/server", () => ({
  contentActor: mocks.actor,
  contentResponse: (body: unknown, status = 200) =>
    Response.json(body, {
      status,
      headers: { "Cache-Control": "private, no-store", Vary: "Cookie" },
    }),
  contentFailure: () => Response.json({ error: "No access" }, { status: 403 }),
}));
import { GET as coverageApi } from "@/app/api/admin/content/coverage/route";
import { GET as draftApi } from "@/app/api/admin/content/draft/route";
const stamp = "2026-10-14T12:00:00.000Z";

describe("content factory curriculum and releases", () => {
  it("preserves twelve legacy IDs while covering all levels, modules and four-skill targets", async () => {
    const legacy = JSON.parse(
      await readFile("content/a1-1-curriculum.json", "utf8"),
    );
    expect(factoryCurriculum.courses.flatMap((c) => c.lessons)).toHaveLength(
      132,
    );
    expect(factoryCurriculum.courses.flatMap((c) => c.modules)).toHaveLength(
      33,
    );
    expect(factoryCurriculum.courses[0].lessons.map((l) => l.id)).toEqual(
      legacy.lessons.map((l: { id: string }) => l.id),
    );
    expect(
      factoryCurriculum.courses
        .filter((c) => c.level === "C1" || c.level === "C2")
        .every((c) =>
          c.lessons.every((l) =>
            /specialist|experienced/.test(l.authoringDirection),
          ),
        ),
    ).toBe(true);
  });
  it("rejects missing skills, inconsistent modules, cross-level outcomes, unknown/cyclic prerequisites and invalid exam alignment", () => {
    const edit = (mutate: (map: typeof factoryCurriculum) => void) => {
      const map = structuredClone(factoryCurriculum);
      mutate(map);
      expect(factoryCurriculumSchema.safeParse(map).success).toBe(false);
    };
    edit((m) => (m.courses[0].lessons[0].requiredSkills[3] = "reading"));
    edit((m) => m.courses[0].modules[0].lessonIds.pop());
    edit((m) => (m.courses[0].lessons[0].outcomeIds[0] = "c2-listening"));
    edit((m) => (m.courses[0].lessons[0].prerequisites = ["missing-lesson"]));
    edit((m) => (m.courses[0].lessons[0].prerequisites = ["a1-1-l02"]));
    edit((m) => (m.courses[0].lessons[0].examCode = "goethe-c2-adult"));
  });
  it("loads three pilot revisions with exact pinned hashes and refuses mutable/repeated release identities", async () => {
    const { drafts } = await readFactory(),
      release = await readRelease("a1-1-factory-pilot", drafts);
    expect(release.packs).toHaveLength(3);
    for (const p of release.packs)
      expect(
        release.manifest.lessons.find((l) => l.lessonId === p.id)?.contentHash,
      ).toBe(contentHash(p));
    const altered = structuredClone(drafts);
    altered.find((p) => p.id === "a1-1-l02")!.title.en = "Changed";
    await expect(readRelease("a1-1-factory-pilot", altered)).rejects.toThrow(
      /hash/,
    );
    await expect(readRelease("../escape", drafts)).rejects.toThrow(
      /release ID/,
    );
    expect(
      releaseManifestSchema.safeParse({
        ...release.manifest,
        lessons: [release.manifest.lessons[0], release.manifest.lessons[0]],
      }).success,
    ).toBe(false);
  });
  it("produces goal-bounded advanced briefs without generating or approving content", async () => {
    const brief = authoringBrief(
      factoryCurriculum,
      "c2-l01",
      await readFactoryDrafts(),
    );
    expect(brief.level).toBe("C2");
    expect(brief.requiredActivities).toContain("writing");
    expect(brief.direction).toContain("specialist");
    expect(brief.approvalPolicy).toContain("no language");
    expect(() => authoringBrief(factoryCurriculum, "missing", [])).toThrow();
  });
});
describe("coverage reflects exact Neon evidence", () => {
  async function fixture() {
    const drafts = await readFactoryDrafts();
    const pack = structuredClone(drafts.find((p) => p.id === "a1-1-l02")!);
    return { drafts, pack };
  }
  it("distinguishes missing, Git drafts, pending staging reviews and unknown publication status", async () => {
    const { drafts, pack } = await fixture(),
      offline = buildCoverage(factoryCurriculum, drafts, [], false);
    expect(offline.totalDrafted).toBe(3);
    expect(offline.databaseAvailable).toBe(false);
    expect(offline.lessons.find((l) => l.id === pack.id)?.state).toBe("draft");
    expect(offline.lessons.find((l) => l.id === "c2-l01")?.state).toBe(
      "missing",
    );
    const evidence: FactoryEvidence = {
      pack,
      reviews: [],
      mediaChecks: [],
      published: false,
      contentHash: contentHash(pack),
    };
    expect(
      buildCoverage(factoryCurriculum, drafts, [evidence], true).lessons.find(
        (l) => l.id === pack.id,
      )?.state,
    ).toBe("needs_review");
  });
  it("does not count scripted builders as writing or drafts as published skill coverage", async () => {
    const { drafts } = await fixture(),
      report = buildCoverage(factoryCurriculum, drafts, [], true);
    expect(report.totalPublished).toBe(0);
    expect(
      report.lessons.find((l) => l.id === "a1-1-l02")?.missingActivities,
    ).toContain("writing");
    expect(report.levels.find((l) => l.level === "A1")?.skills).toEqual({
      listening: 0,
      reading: 0,
      writing: 0,
      speaking: 0,
    });
  });
  it("retains actual older publications while a newer draft is pending, and identifies same-version hash drift", async () => {
    const { drafts, pack } = await fixture();
    const evidence: FactoryEvidence = {
      pack,
      reviews: [],
      mediaChecks: [],
      published: true,
      contentHash: contentHash(pack),
    };
    const newer = structuredClone(pack);
    newer.version = 2;
    const report = buildCoverage(
        factoryCurriculum,
        [...drafts, newer],
        [evidence],
        true,
      ),
      row = report.lessons.find((l) => l.id === pack.id)!;
    expect(row.state).toBe("draft");
    expect(row.publishedVersion).toBe(1);
    expect(report.totalPublished).toBe(1);
    expect(report.levels[0].skills.writing).toBe(0);
    const changed = structuredClone(pack);
    changed.title.en = "Different";
    expect(
      buildCoverage(
        factoryCurriculum,
        [changed],
        [evidence],
        true,
      ).lessons.find((l) => l.id === pack.id)?.state,
    ).toBe("needs_revision");
  });
  it("uses latest hash-bound rejection and does not resurrect older approval", async () => {
    const { drafts, pack } = await fixture(),
      hash = contentHash(pack);
    const reviews: ContentReview[] = reviewCategories.map((category) => ({
      category,
      decision: "approved" as const,
      reviewerId: "reviewer",
      reviewerName: "Fixture",
      comment: "Checked",
      contentHash: hash,
      reviewedAt: stamp,
    }));
    reviews.push({
      ...reviews[0],
      decision: "changes_requested",
      comment: "Incorrect German",
    });
    const report = buildCoverage(
      factoryCurriculum,
      drafts,
      [{ pack, reviews, mediaChecks: [], published: false, contentHash: hash }],
      true,
    );
    expect(report.lessons.find((l) => l.id === pack.id)?.state).toBe(
      "needs_revision",
    );
  });
});
describe("structured lexeme staging", () => {
  const entity = {
    id: "L7341",
    type: "lexeme",
    lastrevid: 123,
    language: "Q188",
    lexicalCategory: "Q1084",
    lemmas: { de: { language: "de", value: "Haus" } },
    forms: [
      {
        id: "L7341-F1",
        representations: { de: { language: "de", value: "Häuser" } },
        grammaticalFeatures: ["Q146786"],
      },
    ],
    senses: [
      { id: "L7341-S1", glosses: { en: { language: "en", value: "house" } } },
    ],
    claims: {},
  };
  it("keeps canonical identity, senses, original features and missing translations without guessing gender or approval", () => {
    const staged = normalizeWikidataLexeme(entity, stamp);
    expect(staged.id).toBe("wikidata-l7341");
    expect(staged.gender).toBeNull();
    expect(staged.status).toBe("needs_review");
    expect(staged.forms[0].featureIds).toEqual(["Q146786"]);
    expect(staged.senses[0].ar).toBeNull();
    expect(staged.source.sourceHash).toBe(contentHash(entity));
    expect(staged.source.license).toBe("CC0-1.0");
  });
  it("rejects non-German, missing lemmas, foreign form IDs and duplicate senses", () => {
    expect(() =>
      normalizeWikidataLexeme({ ...entity, language: "Q1860" }, stamp),
    ).toThrow();
    expect(() =>
      normalizeWikidataLexeme({ ...entity, lemmas: {} }, stamp),
    ).toThrow(/German lemma/);
    expect(() =>
      normalizeWikidataLexeme(
        { ...entity, forms: [{ ...entity.forms[0], id: "L99-F1" }] },
        stamp,
      ),
    ).toThrow(/belong/);
    expect(() =>
      normalizeWikidataLexeme(
        { ...entity, senses: [entity.senses[0], entity.senses[0]] },
        stamp,
      ),
    ).toThrow(/Duplicate/);
  });
});
describe("attributed sentence intake", () => {
  const row =
    "Hello.\tHallo.\tCC-BY 2.0 (France) Attribution: tatoeba.org #123 (English author) & #456 (German author)";
  it("preserves canonical IDs, authors, exact row evidence and missing review work", () => {
    const candidate = normalizeTatoebaPair(row)!;
    expect(candidate.canonicalSentenceId).toBe("tatoeba-de-456");
    expect(candidate.source.englishAuthor).toBe("English author");
    expect(candidate.source.germanAuthor).toBe("German author");
    expect(candidate.source.rowHash).toBe(contentHash(row));
    expect(candidate.cefr).toBeNull();
    expect(candidate.text.ar).toBeNull();
    expect(candidate.rightsCleared).toBe(false);
    expect(candidate.audio).toBeNull();
  });
  it("rejects unlicensed, unattributed, malformed and excessively long candidates", () => {
    expect(normalizeTatoebaPair("Hello.\tHallo.")).toBeNull();
    expect(
      normalizeTatoebaPair(
        row.replace("CC-BY 2.0 (France)", "Unknown license"),
      ),
    ).toBeNull();
    expect(
      normalizeTatoebaPair(row.replace("#456 (German author)", "#456")),
    ).toBeNull();
    expect(
      normalizeTatoebaPair(
        row.replace("Hallo.", "Hallo mein Name ist Karim."),
        2,
      ),
    ).toBeNull();
  });
  it("validates the bounded real export batch and keeps it outside the published curriculum", async () => {
    const intake = await readCandidateIntake();
    expect(intake.totalCandidates).toBe(100);
    expect(intake.batches[0].status).toBe("needs_review");
    expect(intake.batches[0].sample).toHaveLength(5);
    expect(
      intake.batches[0].sample.every((s) =>
        s.sourceUrl.startsWith("https://tatoeba.org/en/sentences/show/"),
      ),
    ).toBe(true);
  });
});
describe("editorial endpoints", () => {
  it("checks access before reading content or querying the database", async () => {
    mocks.actor.mockRejectedValue(new Error("unauthorized"));
    mocks.execute.mockClear();
    expect(
      (
        await coverageApi(
          new Request("https://example.test/api/admin/content/coverage"),
        )
      ).status,
    ).toBe(403);
    expect(
      (
        await draftApi(
          new Request(
            "https://example.test/api/admin/content/draft?lesson=a1-1-l02&version=1",
          ),
        )
      ).status,
    ).toBe(403);
    expect(mocks.execute).not.toHaveBeenCalled();
  });
  it("returns explicit unknown counts on Neon failure, no-store, and protected draft preview", async () => {
    mocks.actor.mockResolvedValue({ id: "editor" });
    mocks.execute.mockRejectedValue(new Error("database unavailable"));
    const response = await coverageApi(
        new Request("https://example.test/api/admin/content/coverage"),
      ),
      body = await response.json();
    expect(response.status).toBe(200);
    expect(response.headers.get("Cache-Control")).toContain("no-store");
    expect(body.coverage.databaseAvailable).toBe(false);
    expect(body.warning).toContain("unavailable");
    const preview = await draftApi(
      new Request(
        "https://example.test/api/admin/content/draft?lesson=a1-1-l02&version=1",
      ),
    );
    expect((await preview.json()).pack.status).toBe("draft");
    expect(authDestination("/admin/content/coverage")).toBe(
      "/admin/content/coverage",
    );
    expect(authDestination("https://evil.test/admin/content/coverage")).toBe(
      "/",
    );
  });
});
