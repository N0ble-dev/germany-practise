import { z } from "zod";
import { intakeKinds, intakeReviewCategories } from "./constants.ts";
import { levels } from "../content-factory/constants.ts";
const hash = z.string().regex(/^[a-f0-9]{64}$/);
const key = z.string().regex(/^[a-z0-9][a-z0-9_.:-]{0,199}$/);
const text = z.string().trim().min(1).max(5000);
export const intakeItemSchema = z
  .object({
    kind: z.enum(intakeKinds),
    key,
    hash,
    chapter: z.number().int().min(1).max(100).nullable(),
    page: z.number().int().positive().nullable(),
    german: z.string().max(100000).nullable(),
    english: z.string().max(10000).nullable(),
    topic: z.string().max(500).nullable(),
    listType: z.string().max(100).nullable(),
    payload: z.record(z.string(), z.unknown()),
  })
  .strict();
export type IntakeItem = z.infer<typeof intakeItemSchema>;
export const intakeArchiveSchema = z
  .object({
    id: key,
    provider: z.enum(["deutsch_im_blick", "tatoeba", "zum"]),
    title: text,
    manifestHash: hash,
    expectedCount: z.number().int().positive().max(1000000),
    manifest: z
      .object({
        schemaVersion: z.literal(1),
        sourceUrl: z.url(),
        licenseClaim: text,
        licenseUrl: z.url(),
        attribution: text,
        counts: z.record(z.string(), z.number().int().nonnegative()),
        files: z.array(
          z
            .object({
              path: z.string(),
              sha256: hash,
              bytes: z.number().int().nonnegative(),
            })
            .strict(),
        ),
        notes: z.array(text),
      })
      .strict(),
  })
  .strict();
export type IntakeArchive = z.infer<typeof intakeArchiveSchema>;
export const correctedEntrySchema = z
  .object({
    kind: z.enum(["vocabulary", "sentence_pair", "activity"]),
    german: text,
    english: text,
    arabic: text,
    cefr: z.enum(levels),
    targetLesson: z.string().regex(/^[a-z0-9][a-z0-9-]{0,99}$/),
    topic: text.max(120),
    context: text,
    partOfSpeech: z.enum(["noun", "verb", "adjective", "phrase", "activity"]),
    article: z.enum(["der", "die", "das"]).nullable(),
    plural: z.string().trim().min(1).max(200).nullable(),
    pluralKind: z.enum(["form", "not_used", "unknown"]),
    modifications: text,
    rightsNotes: text,
  })
  .strict()
  .superRefine((entry, ctx) => {
    const fail = (message: string) => ctx.addIssue({ code: "custom", message });
    if (entry.partOfSpeech === "noun" && !entry.article)
      fail("A noun draft needs its reviewed article.");
    if (entry.pluralKind === "form" && !entry.plural)
      fail("Supply the declared plural form.");
    if (entry.pluralKind !== "form" && entry.plural !== null)
      fail("A plural form needs pluralKind=form.");
    if (entry.partOfSpeech !== "noun" && entry.article !== null)
      fail("Articles belong to nouns.");
  });
export type CorrectedEntry = z.infer<typeof correctedEntrySchema>;
export const intakeActionSchema = z.discriminatedUnion("action", [
  z
    .object({
      action: z.literal("save_draft"),
      itemId: z.coerce.number().int().positive(),
      sourceHash: hash,
      expectedVersion: z.number().int().nonnegative(),
      entry: correctedEntrySchema,
    })
    .strict(),
  z
    .object({
      action: z.literal("review"),
      draftId: z.uuid(),
      contentHash: hash,
      category: z.enum(intakeReviewCategories),
      decision: z.enum(["approved", "changes_requested"]),
      comment: text.max(2000),
    })
    .strict(),
]);
export function intakeDraftBlockers(
  entry: CorrectedEntry,
  reviews: { category: string; decision: string; contentHash: string }[],
  contentHash: string,
) {
  const blockers: string[] = [];
  for (const category of intakeReviewCategories)
    if (
      reviews
        .filter((r) => r.category === category && r.contentHash === contentHash)
        .at(-1)?.decision !== "approved"
    )
      blockers.push(
        `${category}: human approval required for this exact draft.`,
      );
  if (entry.pluralKind === "unknown" && entry.partOfSpeech === "noun")
    blockers.push(
      "Resolve the noun's plural notation; the source abbreviation is not a confirmed form.",
    );
  if (entry.kind === "activity")
    blockers.push(
      "Activity outline only: create and review the actual exercise, answer key or open-response rubric in a lesson pack.",
    );
  return blockers;
}
