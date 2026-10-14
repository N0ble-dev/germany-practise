import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import { renderToStaticMarkup } from "react-dom/server";
import { createElement } from "react";
import {
  resourceCatalogSchema,
  sourceAssetSchema,
  examGuideSchema,
  normalizeGerman,
} from "@/lib/content-pipeline/resources";
import { lessonPackSchema } from "@/lib/content-pipeline/model";
import { sourceEvidenceErrors } from "@/lib/content-pipeline/source-evidence";
import { publicationBlockers } from "@/lib/content-pipeline/gates";
import { ContentSourceCredits } from "@/components/content-source-credits";
const read = (path: string) => JSON.parse(readFileSync(path, "utf8"));
const pilot = () =>
  lessonPackSchema.parse(read("content/lessons/a1-1/lesson-01.v2.json"));
describe("trusted content resources and source provenance", () => {
  it("catalogs official A1–C2 models while retaining restricted sources as links", () => {
    const catalog = resourceCatalogSchema.parse(
      read("content/resources/catalog.json"),
    );
    for (const level of ["A1", "A2", "B1", "B2", "C1", "C2"] as const)
      expect(
        catalog.resources.some(
          (r) =>
            r.kind === "exam" &&
            r.provider === "Goethe-Institut" &&
            r.levels.includes(level),
        ),
      ).toBe(true);
    for (const id of ["deutsch-info", "schubert", "dw"])
      expect(catalog.resources.find((r) => r.id === id)?.allowedUse).toBe(
        "link_only",
      );
    const info = catalog.resources.find((r) => r.id === "deutsch-info")!;
    info.allowedUse = "selective_import";
    expect(resourceCatalogSchema.safeParse(catalog).success).toBe(false);
  });
  it("keeps all 31 imported fragments as attributed, unreviewed text without imported media", () => {
    const assets = readdirSync("content/source-assets")
      .filter((name) => name.endsWith(".json"))
      .map((file) =>
        sourceAssetSchema.parse(read(`content/source-assets/${file}`)),
      );
    expect(assets).toHaveLength(4);
    expect(assets.reduce((n, a) => n + a.normalizedContent.length, 0)).toBe(31);
    for (const asset of assets) {
      expect(asset.reviewStatus).toBe("draft");
      expect(asset.cefrStatus).toBe("unreviewed_estimate");
      expect(asset.authors.length).toBeGreaterThan(0);
      expect(asset.license).toBe("CC-BY-4.0");
      expect(asset.revisionUrl).toContain("oldid=");
      expect(asset.contentType).toBe("text");
    }
  });
  it("validates source-backed version 2 without granting any human approvals", () => {
    const pack = pilot();
    expect(sourceEvidenceErrors(pack.references)).toEqual([]);
    expect(pack.version).toBe(2);
    expect(pack.rights.commercialUseCleared).toBe(false);
    expect(publicationBlockers(pack, [], [], [])).toHaveLength(12);
    expect(read("content/lessons/a1-1/lesson-01.v1.json").version).toBe(1);
  });
  it("rejects altered or missing evidence and incomplete reuse notices", () => {
    const pack = pilot(),
      ref = pack.references.find((r) => r.use === "licensed_content")!;
    ref.sourceAssetHash = "f".repeat(64);
    expect(sourceEvidenceErrors(pack.references)).not.toEqual([]);
    const missing = pilot();
    delete missing.references.find((r) => r.use === "licensed_content")!
      .licenseUrl;
    expect(lessonPackSchema.safeParse(missing).success).toBe(false);
    const unregistered = pilot();
    unregistered.references.find((r) => r.use === "licensed_content")!.id =
      "unknown-source";
    expect(sourceEvidenceErrors(unregistered.references)).not.toEqual([]);
  });
  it("keeps meaningful German case distinctions during deduplication", () => {
    expect(normalizeGerman("  Ich  wohne\n in Berlin. ")).toBe(
      "Ich wohne in Berlin.",
    );
    expect(normalizeGerman("Sie")).not.toBe(normalizeGerman("sie"));
  });
  it("scopes timing and scoring guidance to the adult A1 exam", () => {
    const guide = examGuideSchema.parse(
      read("content/resources/a1-exam-guide.json"),
    );
    expect(guide.audience).toBe("adults");
    expect(
      Object.fromEntries(guide.sections.map((s) => [s.id, s.minutes])),
    ).toEqual({ listening: 20, reading: 25, writing: 20, speaking: 15 });
    expect(guide.schedule.map((w) => w.week)).toEqual([1, 2, 3, 4]);
  });
  it("renders exact source, contributor, license and modification credits for adapted lessons", () => {
    const html = renderToStaticMarkup(
      createElement(ContentSourceCredits, { references: pilot().references }),
    );
    expect(html).toContain("Karl Kirst");
    expect(html).toContain("CC-BY-4.0");
    expect(html).toContain("https://creativecommons.org/licenses/by/4.0/");
    expect(html).toContain("Changes:");
    expect(html).toContain("oldid=78352");
    expect(html).toContain('rel="noopener noreferrer"');
  });
});
