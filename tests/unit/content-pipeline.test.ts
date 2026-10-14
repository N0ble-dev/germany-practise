import { describe, it, expect } from "vitest";
import {
  pilotPack,
  completePack,
  recordingBytes,
} from "../fixtures/content-pack";
import {
  lessonPackSchema,
  reviewCategories,
  type ContentReview,
} from "@/lib/content-pipeline/model";
import { contentHash, canonicalJson } from "@/lib/content-pipeline/hash";
import {
  publicationBlockers,
  validateRelationships,
} from "@/lib/content-pipeline/gates";
import { inspectWav } from "@/lib/content-pipeline/audio";
import { rolesForEmail } from "@/lib/content-pipeline/access";
describe("content structure and publication checks", () => {
  it("keeps the checked-in pilot structurally valid and explicitly unpublishable", () => {
    const pack = pilotPack();
    expect(pack.status).toBe("draft");
    expect(pack.rights.commercialUseCleared).toBe(false);
    expect(publicationBlockers(pack, [], [], [])).toHaveLength(11);
  });
  it("rejects broken IDs, missing translations, invalid answer keys and unresolved references", () => {
    const cases = Array.from({ length: 6 }, () => pilotPack());
    cases[0].vocabulary[0].id = cases[0].vocabulary[1].id;
    cases[1].title.ar = "";
    const question = cases[2].exercises[0];
    if (question.type === "multiple_choice")
      question.correctOptionId = "absent";
    const options = cases[3].exercises[0];
    if (options.type === "multiple_choice")
      options.options[1].id = options.options[0].id;
    const builder = cases[4].exercises.find(
      (e) => e.type === "sentence_builder",
    )!;
    if (builder.type !== "multiple_choice") builder.wordIds = ["absent"];
    cases[5].vocabulary[0].type = "noun";
    for (const pack of cases)
      expect(lessonPackSchema.safeParse(pack).success).toBe(false);
  });
  it("canonicalizes JSON keys but changes hashes for text, translation and media revisions", () => {
    expect(canonicalJson({ z: 1, a: { y: 2, x: 1 } })).toBe(
      canonicalJson({ a: { x: 1, y: 2 }, z: 1 }),
    );
    const pack = completePack(),
      hash = contentHash(pack);
    pack.title.ar += " جديد";
    expect(contentHash(pack)).not.toBe(hash);
    const changed = completePack();
    changed.media[0].fileHash = "f".repeat(64);
    expect(contentHash(changed)).not.toBe(hash);
  });
  it("requires matching human decisions and all byte checks; invalidates approvals on edits", () => {
    const pack = completePack();
    const reviews: ContentReview[] = reviewCategories.map((category) => ({
      category,
      reviewerId: "test-only",
      reviewerName: "Synthetic test reviewer",
      decision: "approved",
      comment: "Test",
      contentHash: contentHash(pack),
      reviewedAt: new Date().toISOString(),
    }));
    expect(
      publicationBlockers(
        pack,
        reviews,
        pack.media.map((m) => m.id),
        [],
      ),
    ).toEqual([]);
    expect(publicationBlockers(pack, reviews, [], [])).toHaveLength(5);
    pack.title.en += " revised";
    expect(
      publicationBlockers(
        pack,
        reviews,
        pack.media.map((m) => m.id),
        [],
      ),
    ).toHaveLength(5);
    pack.dialogues[0].lines[0].text.de += "!";
    expect(
      publicationBlockers(
        pack,
        reviews,
        pack.media.map((m) => m.id),
        [],
      ).some((b) => b.includes("script")),
    ).toBe(true);
  });
  it("rejects duplicate versions, unknown and cyclic prerequisites", () => {
    const first = pilotPack(),
      second = pilotPack();
    second.id = "a1-1-l02";
    second.prerequisites = [first.id];
    first.prerequisites = [second.id];
    expect(
      validateRelationships([first, second]).some((e) => e.includes("Cyclic")),
    ).toBe(true);
    expect(
      validateRelationships([first]).some((e) => e.includes("unknown")),
    ).toBe(true);
    expect(
      validateRelationships([first, first]).some((e) =>
        e.includes("Duplicate"),
      ),
    ).toBe(true);
  });
  it("inspects WAV bytes, rejects empty/silent/clipped/truncated recordings and hashes actual data", () => {
    const bytes = recordingBytes();
    expect(inspectWav(bytes)).toMatchObject({
      duration: 0.5,
      sampleRate: 16000,
      channels: 1,
      bytes: bytes.length,
    });
    expect(() => inspectWav(Buffer.alloc(0))).toThrow();
    const silent = Buffer.from(bytes);
    silent.fill(0, 44);
    expect(() => inspectWav(silent)).toThrow(/silent/);
    const clipped = Buffer.from(bytes);
    for (let i = 44; i < clipped.length; i += 2) clipped.writeInt16LE(32767, i);
    expect(() => inspectWav(clipped)).toThrow(/clipping/);
    expect(() => inspectWav(bytes.subarray(0, 100))).toThrow(/Truncated/);
  });
  it("requires verified Google email and exact server-side permission membership", () => {
    const env = {
      CONTENT_AUTHOR_EMAILS: "nabil@example.test",
      CONTENT_PUBLISHER_EMAILS: "publisher@example.test",
    };
    expect(rolesForEmail("NABIL@example.test", true, env)).toEqual(["author"]);
    expect(rolesForEmail("nabil@example.test", false, env)).toEqual([]);
    expect(rolesForEmail("evilnabil@example.test", true, env)).toEqual([]);
    expect(rolesForEmail("publisher@example.test", true, env)).toEqual([
      "publisher",
    ]);
  });
});
