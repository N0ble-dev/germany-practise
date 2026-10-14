import { z } from "zod";
import { examCodes, examSkills } from "./definitions.ts";
import { timeZoneSchema } from "../planner-model.ts";

const id = z.string().regex(/^[a-z0-9][a-z0-9-]{0,99}$/);
const text = z.string().trim().min(1).max(8000);
const translated = z.object({ de: text, en: text, ar: text }).strict();
const licenseCode = z.enum([
  "DJ-ORIGINAL",
  "CC-BY-4.0",
  "CC0-1.0",
  "LICENSED",
  "UNKNOWN",
  "CC-BY-NC",
  "CC-BY-ND",
]);
const evidenceUrl = z.url().refine((value) => {
  const url = new URL(value);
  return url.protocol === "https:" && !url.username && !url.password;
});
const base = {
  id,
  skill: z.enum(examSkills),
  title: translated,
  instructions: translated,
  objective: z.enum([
    "personal_information",
    "time_numbers",
    "negation",
    "everyday_details",
    "message_points",
    "questions",
    "polite_requests",
  ]),
  lesson: z.number().int().min(1).max(12),
  weight: z.number().int().min(1).max(10).default(1),
};
const objective = z
  .object({
    ...base,
    type: z.literal("choice"),
    skill: z.enum(["listening", "reading"]),
    passage: text,
    options: z.array(z.object({ id, text })).min(2).max(5),
    correct: id,
    explanation: translated,
    evidence: text,
    audioId: id.nullable().default(null),
  })
  .strict();
const writing = z
  .object({
    ...base,
    type: z.literal("writing"),
    skill: z.literal("writing"),
    formFields: z.array(z.object({ id, label: text })).max(8),
    contentPoints: z.array(translated).min(1).max(8),
    targetWords: z.number().int().min(20).max(1000),
  })
  .strict();
const speaking = z
  .object({
    ...base,
    type: z.literal("speaking"),
    skill: z.literal("speaking"),
    part: z.number().int().min(1).max(3),
    card: text,
    contentPoints: z.array(translated).min(1).max(8),
  })
  .strict();
export const examTaskSchema = z
  .discriminatedUnion("type", [objective, writing, speaking])
  .superRefine((task, ctx) => {
    if (task.type === "choice") {
      if (!task.options.some((option) => option.id === task.correct))
        ctx.addIssue({
          code: "custom",
          message: "Answer key must name an existing option.",
        });
      if (
        new Set(task.options.map((option) => option.id)).size !==
          task.options.length ||
        new Set(task.options.map((option) => option.text)).size !==
          task.options.length
      )
        ctx.addIssue({
          code: "custom",
          message: "Choices must have unique IDs and distinct visible text.",
        });
      if (!task.passage.includes(task.evidence))
        ctx.addIssue({
          code: "custom",
          message:
            "The explanation evidence must occur in the original passage.",
        });
      if (task.skill === "reading" && task.audioId)
        ctx.addIssue({
          code: "custom",
          message: "Reading items must not depend on listening media.",
        });
    }
  });
export type ExamTask = z.infer<typeof examTaskSchema>;
export const examReviewCategories = [
  "language",
  "pedagogy",
  "arabic",
  "rights",
  "audio",
] as const;
const media = z
  .object({
    id,
    storageKey: z
      .string()
      .regex(/^[a-zA-Z0-9][a-zA-Z0-9/_.-]+\.wav$/)
      .refine((value) => !value.includes("..")),
    fileHash: z.string().regex(/^[a-f0-9]{64}$/),
    scriptHash: z.string().regex(/^[a-f0-9]{64}$/),
    bytes: z.number().int().positive().max(12000000),
    duration: z.number().positive().max(90),
    license: text,
    licenseCode,
    licenseEvidence: evidenceUrl,
    creator: text,
  })
  .strict();
export const examPackSchema = z
  .object({
    schemaVersion: z.literal(1),
    id,
    version: z.number().int().positive(),
    examCode: z.enum(examCodes),
    title: text,
    definitionRevision: text,
    kind: z.enum(["drill", "section", "full_mock"]),
    status: z.literal("draft"),
    creator: text,
    rights: z
      .object({
        provenance: z.enum([
          "original",
          "licensed",
          "openly_licensed",
          "reference_only",
        ]),
        license: text,
        licenseCode,
        evidence: text,
        verified: z.boolean(),
        sourceUrl: evidenceUrl.nullable(),
        licenseUrl: evidenceUrl.nullable(),
        authors: z.array(text).min(1).max(10),
        modified: z.boolean(),
        scope: z.literal("commercial_saas"),
      })
      .strict(),
    blueprint: z
      .object({
        revision: text,
        complete: z.boolean(),
        sectionCounts: z.object({
          listening: z.number().int().min(0),
          reading: z.number().int().min(0),
          writing: z.number().int().min(0),
          speaking: z.number().int().min(0),
        }),
        notes: text,
      })
      .strict(),
    media: z.array(media).max(100),
    tasks: z.array(examTaskSchema).min(1).max(200),
  })
  .strict()
  .superRefine((pack, ctx) => {
    if (new Set(pack.tasks.map((task) => task.id)).size !== pack.tasks.length)
      ctx.addIssue({ code: "custom", message: "Task IDs must be unique." });
    if (new Set(pack.media.map((asset) => asset.id)).size !== pack.media.length)
      ctx.addIssue({ code: "custom", message: "Media IDs must be unique." });
    for (const skill of examSkills)
      if (
        pack.blueprint.sectionCounts[skill] !==
        pack.tasks.filter((task) => task.skill === skill).length
      )
        ctx.addIssue({
          code: "custom",
          message: `${skill} count differs from this pack's declared blueprint.`,
        });
    for (const task of pack.tasks)
      if (
        task.type === "choice" &&
        task.audioId &&
        !pack.media.some((asset) => asset.id === task.audioId)
      )
        ctx.addIssue({
          code: "custom",
          message: `Recording ${task.audioId} is missing.`,
        });
    if (
      pack.kind === "full_mock" &&
      (!pack.blueprint.complete ||
        examSkills.some((skill) => pack.blueprint.sectionCounts[skill] < 1))
    )
      ctx.addIssue({
        code: "custom",
        message: "Full mocks require a complete four-skill blueprint.",
      });
  });
export type ExamPack = z.infer<typeof examPackSchema>;
export type PublicExamTask =
  | (Omit<
      Extract<ExamTask, { type: "choice" }>,
      "correct" | "explanation" | "evidence" | "passage"
    > & { passage?: string })
  | Exclude<ExamTask, { type: "choice" }>;
export function publicExamTask(
  task: ExamTask,
  showListeningScript = false,
): PublicExamTask {
  if (task.type !== "choice") return task;
  const { correct, explanation, evidence, passage, ...safe } = task;
  void correct;
  void explanation;
  void evidence;
  return {
    ...safe,
    ...(task.skill === "reading" || showListeningScript ? { passage } : {}),
  };
}
export const examAnswerSchema = z
  .object({
    choice: id.optional(),
    text: z.string().max(12000).default(""),
    fields: z.record(id, z.string().max(160)).default({}),
    checks: z.array(z.number().int().min(0).max(10)).max(11).default([]),
  })
  .strict()
  .superRefine((answer, ctx) => {
    if (new Set(answer.checks).size !== answer.checks.length)
      ctx.addIssue({
        code: "custom",
        message: "Self-review checks must be unique.",
      });
  });
export type ExamAnswer = z.infer<typeof examAnswerSchema>;
export const examGoalSchema = z
  .object({
    examCode: z.enum(examCodes),
    date: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/)
      .refine(
        (value) =>
          !Number.isNaN(Date.parse(value)) &&
          new Date(value).toISOString().slice(0, 10) === value,
      )
      .nullable(),
    bookingConfirmed: z.boolean(),
    dailyMinutes: z.number().int().min(5).max(120),
    timeZone: timeZoneSchema,
    language: z.enum(["en", "ar"]),
  })
  .strict()
  .refine((goal) => !goal.bookingConfirmed || !!goal.date, {
    message: "A confirmed booking needs an exam date.",
  });
export type ExamGoal = z.infer<typeof examGoalSchema>;
export type ExamReview = {
  category: (typeof examReviewCategories)[number];
  decision: "approved" | "changes_requested";
  hash: string;
  reviewerId: string;
  reviewerName: string;
  comment: string;
  reviewedAt: string;
};
