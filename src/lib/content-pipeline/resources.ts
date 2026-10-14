import { z } from "zod";
const https = z.url().refine((value) => {
  const url = new URL(value);
  return url.protocol === "https:" && !url.username && !url.password;
}, "Use a public HTTPS URL.");
const id = z.string().regex(/^[a-z0-9-]+$/),
  text = z.string().trim().min(1);
export const resourceLevels = ["A1", "A2", "B1", "B2", "C1", "C2"] as const;
export const resourceCatalogSchema = z
  .object({
    schemaVersion: z.literal(1),
    checkedAt: z.iso.date(),
    resources: z
      .array(
        z
          .object({
            id,
            title: text,
            provider: text,
            url: https,
            levels: z.array(z.enum(resourceLevels)).min(1),
            skills: z
              .array(
                z.enum([
                  "listening",
                  "reading",
                  "writing",
                  "speaking",
                  "grammar",
                  "vocabulary",
                  "culture",
                ]),
              )
              .min(1),
            kind: z.enum([
              "exam",
              "course",
              "reference",
              "open_content",
              "dataset",
            ]),
            allowedUse: z.enum(["link_only", "selective_import"]),
            license: text.nullable(),
            termsUrl: https,
            description: text,
            availability: z.enum([
              "available",
              "unavailable",
              "restricted",
              "not_checked",
            ]),
            checkedAt: z.iso.date(),
            nextReviewAt: z.iso.date(),
          })
          .strict(),
      )
      .min(1),
  })
  .strict()
  .superRefine((value, ctx) => {
    if (
      new Set(value.resources.map((r) => r.id)).size !== value.resources.length
    )
      ctx.addIssue({ code: "custom", message: "Resource IDs must be unique." });
    for (const row of value.resources)
      if (row.allowedUse === "selective_import" && !row.license)
        ctx.addIssue({
          code: "custom",
          message: `${row.id}: selective import needs documented license terms.`,
        });
    for (const row of value.resources)
      if (
        row.allowedUse === "selective_import" &&
        /(?:BY-NC|non-commercial)/i.test(row.license ?? "")
      )
        ctx.addIssue({
          code: "custom",
          message: `${row.id}: a noncommercial default license must remain link-only for this catalog.`,
        });
  });
export type LearningResource = z.infer<
  typeof resourceCatalogSchema
>["resources"][number];
export const sourceAssetSchema = z
  .object({
    schemaVersion: z.literal(1),
    id,
    sourceId: id,
    sourceUrl: https,
    revisionUrl: https,
    historyUrl: https,
    revision: text,
    sourceUpdatedAt: z.string().datetime(),
    fetchedAt: z.string().datetime(),
    checkedAt: z.iso.date(),
    nextReviewAt: z.iso.date(),
    title: text,
    authors: z.array(text).min(1),
    license: z.enum(["CC-BY-4.0", "CC0-1.0"]),
    licenseUrl: https,
    licenseEvidenceUrl: https,
    contentType: z.literal("text"),
    sourceChecksum: z.string().regex(/^[a-f0-9]{64}$/),
    sourceExcerpt: text,
    normalizedContent: z.array(text).min(1),
    modifications: text,
    attribution: text,
    cefrEstimate: z.enum(resourceLevels),
    cefrStatus: z.literal("unreviewed_estimate"),
    suggestedLessonIds: z.array(id).min(1),
    reviewStatus: z.literal("draft"),
  })
  .strict()
  .superRefine((asset, ctx) => {
    const licenseUrls = {
      "CC-BY-4.0": "https://creativecommons.org/licenses/by/4.0/",
      "CC0-1.0": "https://creativecommons.org/publicdomain/zero/1.0/",
    };
    if (asset.licenseUrl !== licenseUrls[asset.license])
      ctx.addIssue({
        code: "custom",
        message: "License URL does not match the declared license.",
      });
    if (
      new Set(asset.normalizedContent.map(normalizeGerman)).size !==
      asset.normalizedContent.length
    )
      ctx.addIssue({
        code: "custom",
        message: "Deduplicate normalized German content within the asset.",
      });
  });
export type SourceAsset = z.infer<typeof sourceAssetSchema>;
export function normalizeGerman(value: string) {
  return value.normalize("NFC").replace(/\s+/g, " ").trim();
}
export const examGuideSchema = z
  .object({
    schemaVersion: z.literal(1),
    level: z.literal("A1"),
    exam: z.literal("Goethe-Zertifikat A1: Start Deutsch 1"),
    audience: z.literal("adults"),
    checkedAt: z.iso.date(),
    formatSource: https,
    scoringSource: https,
    passRule: text,
    sections: z
      .array(
        z
          .object({
            id: z.enum(["listening", "reading", "writing", "speaking"]),
            title: text,
            label: text,
            minutes: z.number().int().positive(),
            description: text,
            tips: z.array(text).min(1),
          })
          .strict(),
      )
      .length(4),
    schedule: z
      .array(
        z
          .object({
            week: z.number().int().min(1).max(4),
            title: text,
            tasks: z.array(text).min(1),
          })
          .strict(),
      )
      .length(4),
  })
  .strict()
  .superRefine((guide, ctx) => {
    if (
      new Set(guide.sections.map((s) => s.id)).size !== 4 ||
      new Set(guide.schedule.map((w) => w.week)).size !== 4
    )
      ctx.addIssue({
        code: "custom",
        message: "Skills and weeks must each occur exactly once.",
      });
  });
