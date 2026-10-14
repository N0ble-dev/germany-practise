import { z } from "zod";

const text = z.string().trim().min(1).max(5000);
const id = z.string().regex(/^[a-z0-9][a-z0-9-]{0,99}$/);
export const sha256Schema = z.string().regex(/^[a-f0-9]{64}$/);
const translated = z.object({ de: text, en: text, ar: text }).strict();
export const reviewCategories = [
  "language",
  "pedagogy",
  "arabic",
  "rights",
  "audio",
] as const;
export type ReviewCategory = (typeof reviewCategories)[number];
export const contentRoles = [
  "author",
  ...reviewCategories,
  "publisher",
] as const;
export type ContentRole = (typeof contentRoles)[number];
const source = z
  .object({
    id,
    name: text,
    url: z.url().refine((url) => url.startsWith("https://")),
    use: z.enum(["curriculum_reference_only", "licensed_content"]),
    license: text.nullable(),
    permissionRef: text.nullable(),
    attribution: text.nullable(),
    licenseUrl: z
      .url()
      .refine(
        (url) =>
          new URL(url).protocol === "https:" &&
          !new URL(url).username &&
          !new URL(url).password,
      )
      .optional(),
    authors: z.array(text).min(1).optional(),
    modifications: text.optional(),
    sourceAssetHash: sha256Schema.optional(),
    revision: text.optional(),
  })
  .strict();
const vocabulary = z
  .object({
    id,
    de: text,
    en: text,
    ar: text,
    type: z.enum(["noun", "verb", "adjective", "phrase"]),
    article: z.enum(["der", "die", "das"]).nullable(),
    plural: text.nullable(),
    pluralKind: z.enum(["form", "not_used", "unknown"]),
    example: text,
    conjugation: z.record(text, text).nullable(),
  })
  .strict();
const exercise = z.discriminatedUnion("type", [
  z
    .object({
      id,
      type: z.literal("multiple_choice"),
      skill: z.enum(["grammar", "listening", "reading"]),
      prompt: translated,
      options: z
        .array(z.object({ id, text: translated }).strict())
        .min(2)
        .max(8),
      correctOptionId: id,
      explanation: translated,
      audioLineIds: z.array(id),
    })
    .strict(),
  z
    .object({
      id,
      type: z.enum(["dictation", "sentence_builder", "free_speech"]),
      prompt: translated,
      acceptableAnswers: z.array(text).min(1).max(30),
      explanation: translated,
      wordIds: z.array(id),
      grammarIds: z.array(id),
      audioLineIds: z.array(id),
    })
    .strict(),
]);
export const lessonPackSchema = z
  .object({
    schemaVersion: z.literal(1),
    id,
    version: z.number().int().min(1),
    courseId: id,
    cefr: z.enum(["A1", "A2", "B1", "B2", "C1", "C2"]),
    courseSubdivision: text,
    lessonNumber: z.number().int().min(1).max(1000),
    status: z.literal("draft"),
    title: translated,
    estimatedMinutes: z.number().int().min(5).max(180),
    canDo: z.array(text).min(2).max(4),
    scene: translated,
    prerequisites: z.array(id).max(20),
    pronunciationFocus: translated,
    listeningOutcomes: z.array(text).min(1).max(5),
    speakingOutcome: text,
    assessmentRules: z
      .object({
        vocabulary: z.number().min(0).max(100),
        listening: z.number().min(0).max(100),
        grammar: z.number().min(0).max(100),
        speaking: z.number().min(0).max(100),
        missionRequired: z.literal(true),
      })
      .strict(),
    references: z.array(source).min(1).max(30),
    rights: z
      .object({
        origin: z.enum(["original", "licensed", "mixed"]),
        commercialUseCleared: z.boolean(),
        evidenceRef: text,
        notes: text,
      })
      .strict(),
    vocabulary: z.array(vocabulary).min(10).max(100),
    grammar: z
      .array(
        z
          .object({
            id,
            title: translated,
            explanation: translated,
            examples: z.array(text).min(1),
          })
          .strict(),
      )
      .min(1)
      .max(20),
    dialogues: z
      .array(
        z
          .object({
            id,
            context: translated,
            lines: z
              .array(
                z
                  .object({
                    id,
                    speaker: text,
                    text: translated,
                    audioKey: text.nullable(),
                  })
                  .strict(),
              )
              .min(2)
              .max(30),
          })
          .strict(),
      )
      .min(1)
      .max(10),
    exercises: z.array(exercise).min(5).max(100),
    mission: z
      .object({
        id,
        prompt: translated,
        acceptableAnswers: z.array(text).min(1),
        criteria: z.array(translated).min(1),
      })
      .strict(),
    // Initial decoder supports PCM WAV. Compressed formats need a real decoder before approval.
    media: z
      .array(
        z
          .object({
            id,
            lineId: id,
            storageKey: text,
            fileHash: sha256Schema,
            scriptHash: sha256Schema,
            bytes: z.number().int().positive().max(12_000_000),
            mime: z.literal("audio/wav"),
            licenseRef: text,
            attribution: text,
          })
          .strict(),
      )
      .max(300),
  })
  .strict()
  .superRefine((pack, ctx) => {
    function error(path: (string | number)[], message: string) {
      ctx.addIssue({ code: "custom", path, message });
    }
    function unique(values: string[], path: string) {
      if (new Set(values).size !== values.length)
        error([path], "IDs must be unique.");
    }
    const lines = pack.dialogues.flatMap((d) => d.lines);
    const wordIds = new Set(pack.vocabulary.map((w) => w.id));
    const grammarIds = new Set(pack.grammar.map((g) => g.id));
    const lineIds = new Set(lines.map((l) => l.id));
    for (const [key, values] of Object.entries({
      vocabulary: [...wordIds],
      grammar: [...grammarIds],
      dialogues: pack.dialogues.map((d) => d.id),
      lines: lines.map((l) => l.id),
      exercises: pack.exercises.map((e) => e.id),
      media: pack.media.map((m) => m.id),
      mediaLines: pack.media.map((m) => m.lineId),
      storageKeys: pack.media.map((m) => m.storageKey),
      prerequisites: pack.prerequisites,
    }))
      unique(values, key);
    // Use original arrays as well: converting to Set must not hide duplicates.
    unique(
      pack.vocabulary.map((w) => w.id),
      "vocabulary",
    );
    unique(
      pack.grammar.map((g) => g.id),
      "grammar",
    );
    const allIds = [
      pack.id,
      pack.mission.id,
      ...pack.vocabulary.map((w) => w.id),
      ...pack.grammar.map((g) => g.id),
      ...pack.dialogues.map((d) => d.id),
      ...lines.map((l) => l.id),
      ...pack.exercises.map((e) => e.id),
      ...pack.media.map((m) => m.id),
    ];
    unique(allIds, "id");
    if (pack.prerequisites.includes(pack.id))
      error(["prerequisites"], "A lesson cannot require itself.");
    pack.vocabulary.forEach((word, i) => {
      if (word.type === "noun" && !word.article)
        error(["vocabulary", i, "article"], "Nouns require an article.");
      if (word.type === "noun" && word.pluralKind === "form" && !word.plural)
        error(["vocabulary", i, "plural"], "Provide the declared plural form.");
      if (word.pluralKind !== "form" && word.plural !== null)
        error(
          ["vocabulary", i, "plural"],
          "A plural form needs pluralKind=form.",
        );
      if (word.type !== "noun" && word.article !== null)
        error(["vocabulary", i, "article"], "Articles belong to nouns.");
      if (
        word.type === "verb" &&
        (!word.conjugation || !Object.keys(word.conjugation).length)
      )
        error(
          ["vocabulary", i, "conjugation"],
          "Verbs require relevant conjugation forms.",
        );
    });
    pack.exercises.forEach((item, i) => {
      if (item.type === "multiple_choice") {
        unique(
          item.options.map((o) => o.id),
          `exercises.${i}.options`,
        );
        if (!item.options.some((o) => o.id === item.correctOptionId))
          error(
            ["exercises", i, "correctOptionId"],
            "The answer must refer to an option.",
          );
      } else {
        for (const ref of item.wordIds)
          if (!wordIds.has(ref))
            error(["exercises", i, "wordIds"], `Unknown word: ${ref}`);
        for (const ref of item.grammarIds)
          if (!grammarIds.has(ref))
            error(["exercises", i, "grammarIds"], `Unknown grammar: ${ref}`);
      }
      for (const ref of item.audioLineIds)
        if (!lineIds.has(ref))
          error(["exercises", i, "audioLineIds"], `Unknown audio line: ${ref}`);
      if (
        (item.type === "dictation" ||
          (item.type === "multiple_choice" && item.skill === "listening")) &&
        !item.audioLineIds.length
      )
        error(
          ["exercises", i, "audioLineIds"],
          "Listening tasks need an audio script.",
        );
    });
    const prefix = `de/${pack.courseId}/${pack.id}/v${pack.version}/`;
    for (const [i, asset] of pack.media.entries()) {
      const line = lines.find((l) => l.id === asset.lineId);
      if (!line || line.audioKey !== asset.storageKey)
        error(["media", i], "Audio must match its dialogue line's key.");
      if (
        !asset.storageKey.startsWith(prefix) ||
        !/^[a-zA-Z0-9/_.-]+\.wav$/.test(asset.storageKey) ||
        asset.storageKey.includes("..")
      )
        error(
          ["media", i, "storageKey"],
          `Use an immutable WAV key under ${prefix}`,
        );
    }
    for (const [i, line] of lines.entries())
      if (
        line.audioKey &&
        !pack.media.some(
          (m) => m.lineId === line.id && m.storageKey === line.audioKey,
        )
      )
        error(["dialogues", i, "audioKey"], "No manifest asset for audio key.");
    for (const [i, ref] of pack.references.entries())
      if (
        ref.use === "licensed_content" &&
        (!ref.license ||
          !ref.permissionRef ||
          !ref.attribution ||
          !ref.licenseUrl ||
          !ref.authors?.length ||
          !ref.modifications ||
          !ref.sourceAssetHash)
      )
        error(
          ["references", i],
          "Reused content needs license/link, source evidence hash, authors, attribution and modification notes.",
        );
  });
export type LessonPack = z.infer<typeof lessonPackSchema>;
export const curriculumSchema = z
  .object({
    schemaVersion: z.literal(1),
    courseId: id,
    cefr: z.enum(["A1", "A2", "B1", "B2", "C1", "C2"]),
    courseSubdivision: text,
    status: z.literal("planning_draft"),
    sourceHash: sha256Schema,
    references: z.array(z.url()).min(1),
    lessons: z
      .array(
        z
          .object({
            id,
            number: z.number().int().positive(),
            title: text,
            canDo: z.array(text).min(2).max(4),
            scene: text,
            estimatedMinutes: z.number().int().positive(),
            prerequisites: z.array(id),
            introducedGrammar: z.array(text).min(1),
            pronunciationFocus: text,
            listeningOutcomes: z.array(text).min(1),
            speakingOutcome: text,
            cefrDescriptorRefs: z.array(z.url()).min(1),
          })
          .passthrough(),
      )
      .min(1),
  })
  .superRefine((course, ctx) => {
    const ids = course.lessons.map((l) => l.id);
    if (new Set(ids).size !== ids.length)
      ctx.addIssue({
        code: "custom",
        message: "Curriculum lesson IDs must be unique.",
      });
    for (const lesson of course.lessons)
      for (const key of lesson.prerequisites)
        if (!ids.includes(key) || key === lesson.id)
          ctx.addIssue({
            code: "custom",
            message: `Invalid curriculum prerequisite: ${key}`,
          });
  });
export type ContentReview = {
  category: ReviewCategory;
  reviewerId: string;
  reviewerName: string;
  decision: "approved" | "changes_requested";
  comment: string;
  contentHash: string;
  reviewedAt: string;
};
export type ContentDetail = {
  pack: LessonPack;
  contentHash: string;
  reviews: ContentReview[];
  published: boolean;
  blockers: string[];
  mediaChecks: { id: string; checkedAt: string }[];
};
export const adminActionSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("import"), pack: lessonPackSchema }).strict(),
  z
    .object({
      action: z.literal("review"),
      lessonKey: id,
      version: z.number().int().positive(),
      contentHash: sha256Schema,
      category: z.enum(reviewCategories),
      decision: z.enum(["approved", "changes_requested"]),
      comment: text.max(2000),
    })
    .strict(),
  z
    .object({
      action: z.literal("check_audio"),
      lessonKey: id,
      version: z.number().int().positive(),
      contentHash: sha256Schema,
    })
    .strict(),
  z
    .object({
      action: z.literal("publish"),
      lessonKey: id,
      version: z.number().int().positive(),
      contentHash: sha256Schema,
      confirm: z.literal("Publish this reviewed version"),
    })
    .strict(),
]);
export type AdminContentAction = z.infer<typeof adminActionSchema>;
