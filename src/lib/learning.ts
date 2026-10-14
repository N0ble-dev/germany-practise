import { z } from "zod";
import {
  journeySchema,
  personalProfileSchema,
  wordEvidenceSchema,
  fullyLearned,
} from "./journey-model";
import { motivationSchema } from "./motivation-model";
import { plannerSchema } from "./planner-model";
import { libraryBookmarkSchema, libraryCreditSchema } from "./library/model";

export const wordSchema = z
  .object({
    id: z.string().min(1).max(100),
    german: z.string().trim().min(1).max(120),
    english: z.string().trim().min(1).max(240),
    arabic: z.string().max(240).default(""),
    type: z.enum(["noun", "verb", "adjective", "phrase"]),
    article: z.enum(["", "der", "die", "das"]),
    plural: z.string().max(120).default(""),
    topic: z.string().max(100),
    lesson: z.number().int().min(1).max(12),
    example: z.string().max(500),
    hint: z.string().max(500),
    source: libraryCreditSchema.optional(),
    favorite: z.boolean(),
    status: z.enum(["new", "learning", "reviewing", "mastered"]),
    due: z.string().datetime(),
    interval: z.number().min(0).max(365),
    ease: z.number().min(1.3).max(3),
    reviews: z.number().int().min(0),
    mistakes: z.number().int().min(0),
    evidence: wordEvidenceSchema.default(() => wordEvidenceSchema.parse({})),
  })
  .transform((word) => ({
    ...word,
    status:
      word.status === "mastered" &&
      !fullyLearned(word.evidence, word.type === "noun")
        ? ("reviewing" as const)
        : word.status,
  }));
export type Word = z.infer<typeof wordSchema>;
export type Rating = "again" | "hard" | "good" | "easy";
export const activitySchema = z.object({
  id: z.string().max(100),
  kind: z.enum([
    "word",
    "review",
    "listening",
    "speaking",
    "game",
    "lesson",
    "situation",
  ]),
  label: z.string().max(250),
  xp: z.number().int().min(0).max(100),
  at: z.string().datetime(),
  lesson: z.number().int().min(1).max(12),
});
export type Activity = z.infer<typeof activitySchema>;
export const stateSchema = z.object({
  version: z.literal(2),
  onboardingComplete: z.boolean().default(false),
  name: z.string().trim().min(1).max(60),
  goal: z.union([z.literal(10), z.literal(20), z.literal(30)]),
  language: z.enum(["en", "ar"]),
  currentLesson: z.number().int().min(1).max(12),
  xp: z.number().int().min(0),
  words: z.array(wordSchema).max(5000),
  activities: z.array(activitySchema).max(10000),
  completedLessons: z.array(z.number().int().min(1).max(12)).max(12),
  savedSentences: z.array(z.string().max(500)).max(1000),
  libraryBookmarks: z.array(libraryBookmarkSchema).max(500).optional(),
  lessonNotes: z.record(z.string(), z.string().max(2000)),
  theme: z.enum(["light", "dark"]),
  updatedAt: z.string().datetime(),
  journey: journeySchema.default(() => journeySchema.parse({})),
  personalProfile: personalProfileSchema.default(() =>
    personalProfileSchema.parse({}),
  ),
  motivation: motivationSchema.default(() => motivationSchema.parse({})),
  planner: plannerSchema.default(() => plannerSchema.parse({})),
});
export type LearningState = z.infer<typeof stateSchema>;
export function localDay(date: Date = new Date()): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}
export function dailyActivities(
  state: LearningState,
  now = new Date(),
): Activity[] {
  return state.activities.filter(
    (a) => localDay(new Date(a.at)) === localDay(now),
  );
}
export function streak(state: LearningState, now = new Date()): number {
  const days = new Set(state.activities.map((a) => localDay(new Date(a.at))));
  const cursor = new Date(now);
  if (!days.has(localDay(cursor))) cursor.setDate(cursor.getDate() - 1);
  let count = 0;
  while (days.has(localDay(cursor))) {
    count++;
    cursor.setDate(cursor.getDate() - 1);
  }
  return count;
}
export function dueWords(state: LearningState, now = new Date()): Word[] {
  return state.words
    .filter((w) => new Date(w.due).getTime() <= now.getTime())
    .sort((a, b) => a.due.localeCompare(b.due));
}
export function scheduleReview(
  word: Word,
  rating: Rating,
  now = new Date(),
): Word {
  const next = { ...word, reviews: word.reviews + 1 };
  if (rating === "again") {
    next.mistakes++;
    next.interval = 0;
    next.ease = Math.max(1.3, word.ease - 0.2);
    next.status = "learning";
    next.due = new Date(now.getTime() + 60_000).toISOString();
    return next;
  }
  next.ease = Math.max(
    1.3,
    Math.min(
      3,
      word.ease + (rating === "easy" ? 0.15 : rating === "hard" ? -0.15 : 0),
    ),
  );
  next.interval =
    rating === "hard"
      ? Math.max(1, Math.round(word.interval * 1.2))
      : rating === "easy"
        ? Math.max(4, Math.round(word.interval * next.ease * 1.3))
        : Math.max(1, Math.round(word.interval * next.ease));
  next.interval = Math.min(365, next.interval);
  next.status =
    next.interval >= 21 && fullyLearned(next.evidence, next.type === "noun")
      ? "mastered"
      : "reviewing";
  const due = new Date(now);
  due.setDate(due.getDate() + next.interval);
  next.due = due.toISOString();
  return next;
}
export function normalizeAnswer(text: string): string {
  // Umlauts are meaningful in German; do not silently accept them as unaccented letters.
  return text
    .normalize("NFC")
    .toLocaleLowerCase("de-DE")
    .replace(/[.,!?;:„“”"']/g, "")
    .replace(/\s+/g, " ")
    .trim();
}
export function textSimilarity(expected: string, actual: string): number {
  const a = normalizeAnswer(expected),
    b = normalizeAnswer(actual);
  if (!a || !b) return 0;
  const row = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    let prev = row[0];
    row[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const old = row[j];
      row[j] = Math.min(
        row[j] + 1,
        row[j - 1] + 1,
        prev + (a[i - 1] === b[j - 1] ? 0 : 1),
      );
      prev = old;
    }
  }
  return Math.round((1 - row[b.length] / Math.max(a.length, b.length)) * 100);
}
export function sentencePatterns(word: Word): string[] {
  if (word.type === "noun" && word.article) {
    const acc = word.article === "der" ? "den" : word.article;
    return [
      ...new Set(
        [
          word.example,
          `Wo ist ${word.article} ${word.german}?`,
          `Ich sehe ${acc} ${word.german}.`,
        ].filter(Boolean),
      ),
    ];
  }
  if (word.type === "verb")
    return [
      ...new Set(
        [
          word.example,
          `Ich möchte ${word.german}.`,
          `Wir können ${word.german}.`,
        ].filter(Boolean),
      ),
    ];
  if (word.type === "adjective")
    return [
      ...new Set(
        [
          word.example,
          `Das ist ${word.german}.`,
          `Ich finde das ${word.german}.`,
        ].filter(Boolean),
      ),
    ];
  return [
    ...new Set(
      [
        word.example,
        /[.!?]$/.test(word.german) ? word.german : `${word.german}.`,
        `Ich sage: „${word.german}“.`,
      ].filter(Boolean),
    ),
  ];
}
export function formatWord(word: Word) {
  return `${word.article ? word.article + " " : ""}${word.german}`;
}
