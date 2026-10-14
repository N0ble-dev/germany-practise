import { z } from "zod";
import { examCodes, examSkills } from "./exams/definitions.ts";

export function validTimeZone(value: string) {
  try {
    new Intl.DateTimeFormat("en", { timeZone: value }).format();
    return true;
  } catch {
    return false;
  }
}
export const timeZoneSchema = z
  .string()
  .min(1)
  .max(80)
  .refine(validTimeZone, "Choose a valid time zone.");
export const studyKinds = [
  "lesson",
  "review",
  "listening",
  "speaking",
  "grammar",
  "exam",
] as const;
export type StudyKind = (typeof studyKinds)[number];
export const studySessionSchema = z
  .object({
    id: z.string().uuid(),
    title: z.string().trim().min(1).max(100),
    startsAt: z.string().datetime(),
    duration: z.number().int().min(5).max(180),
    timeZone: timeZoneSchema,
    kind: z.enum(studyKinds),
    lesson: z.number().int().min(1).max(12).default(1),
    examCode: z.enum(examCodes).optional(),
    examSkill: z.enum(examSkills).optional(),
    note: z.string().trim().max(500).default(""),
    reminder: z
      .union([
        z.literal(0),
        z.literal(5),
        z.literal(10),
        z.literal(15),
        z.literal(30),
        z.literal(60),
        z.literal(1440),
      ])
      .nullable()
      .default(10),
    seriesId: z.string().uuid().nullable().default(null),
    status: z.enum(["planned", "done", "skipped"]).default("planned"),
    createdAt: z.string().datetime(),
    updatedAt: z.string().datetime(),
  })
  .refine(
    (session) =>
      session.kind !== "exam" || (!!session.examCode && !!session.examSkill),
    { message: "Exam sessions need a target exam and skill." },
  );
export type StudySession = z.infer<typeof studySessionSchema>;
export const sessionsSchema = z
  .array(studySessionSchema)
  .max(500)
  .refine(
    (sessions) => new Set(sessions.map((s) => s.id)).size === sessions.length,
    "Study sessions must have unique IDs.",
  );
export const plannerSchema = z.object({
  sessions: sessionsSchema.default([]),
  timeZone: z.union([z.literal(""), timeZoneSchema]).default(""),
  calendar: z.enum(["google", "apple", "outlook"]).default("google"),
});
export type StudyPlanner = z.infer<typeof plannerSchema>;
export const studyLabels: Record<StudyKind, string> = {
  lesson: "Book journey",
  review: "Vocabulary review",
  listening: "Listening",
  speaking: "Speaking",
  grammar: "Grammar",
  exam: "Exam preparation",
};
export function studyHref(
  session: Pick<StudySession, "kind" | "lesson" | "examCode" | "examSkill">,
) {
  if (session.kind === "exam")
    return session.examCode && session.examSkill
      ? `/exams/${session.examCode}/practice/${session.examSkill}`
      : "/exams";
  return session.kind === "lesson"
    ? `/lessons/${session.lesson}`
    : session.kind === "grammar"
      ? `/lessons/${session.lesson}?step=grammar`
      : `/${session.kind}`;
}
