import { z } from "zod";
import { contentHash } from "../content-pipeline/hash.ts";
const localized = z.object({
  language: z.string(),
  value: z.string().min(1).max(5000),
});
const entitySchema = z
  .object({
    id: z.string().regex(/^L[1-9]\d*$/),
    type: z.literal("lexeme"),
    lastrevid: z.number().int().positive(),
    language: z.literal("Q188"),
    lexicalCategory: z.string().regex(/^Q[1-9]\d*$/),
    lemmas: z.record(z.string(), localized),
    forms: z
      .array(
        z.object({
          id: z.string().regex(/^L[1-9]\d*-F[1-9]\d*$/),
          representations: z.record(z.string(), localized),
          grammaticalFeatures: z.array(z.string().regex(/^Q[1-9]\d*$/)),
        }),
      )
      .max(1000),
    senses: z
      .array(
        z.object({
          id: z.string().regex(/^L[1-9]\d*-S[1-9]\d*$/),
          glosses: z.record(z.string(), localized),
        }),
      )
      .max(1000),
    claims: z.record(z.string(), z.array(z.unknown())),
  })
  .passthrough();
export function normalizeWikidataLexeme(input: unknown, retrievedAt: string) {
  const entity = entitySchema.parse(input),
    lemma = entity.lemmas.de;
  if (!lemma || lemma.language !== "de")
    throw new Error("A German lexeme needs an explicit German lemma.");
  if (!z.iso.datetime().safeParse(retrievedAt).success)
    throw new Error("Record the actual retrieval time.");
  for (const item of [...entity.forms, ...entity.senses])
    if (!item.id.startsWith(`${entity.id}-`))
      throw new Error("Form/sense IDs must belong to the lexeme.");
  if (
    new Set(entity.forms.map((f) => f.id)).size !== entity.forms.length ||
    new Set(entity.senses.map((s) => s.id)).size !== entity.senses.length
  )
    throw new Error("Duplicate form or sense ID.");
  return {
    schemaVersion: 1,
    id: `wikidata-${entity.id.toLowerCase()}`,
    status: "needs_review",
    lemma: lemma.value.normalize("NFC"),
    lexicalCategoryId: entity.lexicalCategory,
    gender: null,
    forms: entity.forms.map((form) => ({
      externalId: form.id,
      german:
        form.representations.de?.language === "de"
          ? form.representations.de.value
          : null,
      featureIds: form.grammaticalFeatures,
    })),
    senses: entity.senses.map((sense) => ({
      externalId: sense.id,
      de: sense.glosses.de?.value ?? null,
      en: sense.glosses.en?.value ?? null,
      ar: sense.glosses.ar?.value ?? null,
    })),
    source: {
      id: entity.id,
      revision: entity.lastrevid,
      url: `https://www.wikidata.org/wiki/Lexeme:${entity.id}`,
      revisionUrl: `https://www.wikidata.org/w/index.php?title=Lexeme:${entity.id}&oldid=${entity.lastrevid}`,
      license: "CC0-1.0",
      licenseUrl: "https://creativecommons.org/publicdomain/zero/1.0/",
      retrievedAt,
      sourceHash: contentHash(input),
    },
    reviewWarnings: [
      "German lemma, sense, forms and intended level require human language review.",
      "Gender and number/case mappings remain unresolved; original claim/feature IDs are preserved instead of guessed.",
      ...(!entity.forms.length ? ["No forms supplied by source."] : []),
      ...(!entity.senses.length ? ["No sense supplied by source."] : []),
      ...(entity.senses.some((s) => !s.glosses.ar)
        ? [
            "Arabic gloss missing for one or more senses; author and review a translation.",
          ]
        : []),
    ],
    originalClaims: entity.claims,
  };
}
