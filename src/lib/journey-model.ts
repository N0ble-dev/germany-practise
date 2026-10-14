import { z } from "zod";

export const journeySteps = [
  "story",
  "words",
  "sound",
  "patterns",
  "grammar",
  "listen",
  "build",
  "speak",
  "chat",
  "germany",
  "review",
  "mission",
] as const;
export type JourneyStep = (typeof journeySteps)[number];
export const stepLabels: Record<JourneyStep, string> = {
  story: "Story & goal",
  words: "Essential words",
  sound: "Sound & rhythm",
  patterns: "Sentence patterns",
  grammar: "Grammar in context",
  listen: "Listen",
  build: "Build a sentence",
  speak: "Speak",
  chat: "Conversation",
  germany: "Germany situation",
  review: "Recall",
  mission: "Life test",
};
export const lessonProgressSchema = z.object({
  steps: z.array(z.enum(journeySteps)).max(12).default([]),
  vocabulary: z.number().min(0).max(100).nullable().default(null),
  listening: z.number().min(0).max(100).nullable().default(null),
  grammar: z.number().min(0).max(100).nullable().default(null),
  speaking: z.number().min(0).max(100).nullable().default(null),
  speakingMethod: z
    .enum(["recognized-text", "self-check"])
    .nullable()
    .default(null),
  missionPassed: z.boolean().default(false),
  missionResponse: z.string().max(3000).default(""),
  completedAt: z.string().datetime().nullable().default(null),
});
export type LessonProgress = z.infer<typeof lessonProgressSchema>;
export const checkpointSchema = z.object({
  responses: z.record(z.string(), z.string().max(2000)).default({}),
  passed: z.array(z.string()).max(20).default([]),
  completedAt: z.string().datetime().nullable().default(null),
});
export const journeySchema = z.object({
  lessons: z.record(z.string(), lessonProgressSchema).default({}),
  checkpoints: z.record(z.string(), checkpointSchema).default({}),
});
export const personalProfileSchema = z.object({
  country: z.string().max(80).default(""),
  city: z.string().max(80).default(""),
  profession: z.string().max(80).default(""),
  languages: z.string().max(150).default(""),
  motivation: z
    .enum(["home", "career", "study", "people", "travel"])
    .nullable()
    .default(null),
  interests: z
    .array(z.enum(["coffee", "cooking", "music", "sport", "reading", "travel"]))
    .max(6)
    .refine((items) => new Set(items).size === items.length)
    .default([]),
  situations: z
    .array(
      z.enum([
        "work",
        "neighbors",
        "cafe",
        "shopping",
        "transport",
        "friends",
        "family",
        "home",
      ]),
    )
    .max(8)
    .refine((items) => new Set(items).size === items.length)
    .default([]),
});
export type PersonalProfile = z.infer<typeof personalProfileSchema>;
export const wordEvidenceSchema = z.object({
  recognized: z.boolean().default(false),
  article: z.boolean().default(false),
  recalled: z.boolean().default(false),
  sentence: z.boolean().default(false),
  audio: z.boolean().default(false),
  speech: z.boolean().default(false),
  situation: z.boolean().default(false),
  firstRecallAt: z.string().datetime().nullable().default(null),
  spacedRecall: z.boolean().default(false),
});
export type WordEvidence = z.infer<typeof wordEvidenceSchema>;
export function emptyLessonProgress(): LessonProgress {
  return lessonProgressSchema.parse({});
}
export const masteryRequirements = [
  { key: "vocabulary", label: "Vocabulary recall", threshold: 80 },
  { key: "listening", label: "Listening", threshold: 70 },
  { key: "speaking", label: "Speaking", threshold: 70 },
  { key: "grammar", label: "Grammar", threshold: 70 },
] as const;
export function masteryReady(progress: LessonProgress): boolean {
  return (
    masteryRequirements.every((r) => (progress[r.key] ?? -1) >= r.threshold) &&
    progress.missionPassed
  );
}
export function journeyPercent(progress: LessonProgress): number {
  return Math.round((progress.steps.length / journeySteps.length) * 100);
}
export function fullyLearned(evidence: WordEvidence, noun: boolean): boolean {
  return (
    evidence.recognized &&
    evidence.recalled &&
    evidence.sentence &&
    evidence.audio &&
    evidence.speech &&
    evidence.situation &&
    evidence.spacedRecall &&
    (!noun || evidence.article)
  );
}
export function withRecallEvidence(
  evidence: WordEvidence,
  now = new Date(),
): WordEvidence {
  return {
    ...evidence,
    recalled: true,
    recognized: true,
    firstRecallAt: evidence.firstRecallAt ?? now.toISOString(),
    spacedRecall:
      evidence.spacedRecall ||
      !!(
        evidence.firstRecallAt &&
        now.getTime() - new Date(evidence.firstRecallAt).getTime() >=
          3 * 86400_000
      ),
  };
}
