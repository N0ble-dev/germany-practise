"use client";
import { useSyncExternalStore } from "react";
import { initialState, starterWords } from "./content";
import {
  stateSchema,
  wordSchema,
  type Activity,
  type LearningState,
  type Rating,
  type Word,
  scheduleReview,
} from "./learning";
import {
  emptyLessonProgress,
  fullyLearned,
  masteryReady,
  withRecallEvidence,
  type JourneyStep,
  type LessonProgress,
  type WordEvidence,
} from "./journey-model";
import { bookLessons } from "./journey-content";
import { LearningStorage, type LearningSnapshot } from "./learning-storage";
export { STORAGE_KEY } from "./learning-storage";

let snapshot: LearningSnapshot | null = null;
let repository: LearningStorage | null = null;
let initialized = false;
const listeners = new Set<() => void>();
function emit() {
  listeners.forEach((fn) => fn());
}
export function migrateLegacy(
  storage: Pick<Storage, "getItem">,
): LearningState {
  const state = initialState();
  const legacy = storage.getItem("dj_words");
  if (legacy) {
    const words: unknown = JSON.parse(legacy);
    if (!Array.isArray(words)) throw new Error("Invalid legacy vocabulary");
    state.words = words.map((raw, i) => {
      const w = raw as Record<string, unknown>;
      const seed = starterWords.find(
        (s) =>
          s.german.toLocaleLowerCase() === String(w.german).toLocaleLowerCase(),
      );
      return wordSchema.parse({
        ...starterWords[0],
        ...seed,
        id: `legacy-${String(w.id ?? i)}`,
        german: w.german,
        english: w.meaning,
        type: w.type,
        article: w.article || "",
        topic: w.topic || "General",
        hint: w.hint || "",
      });
    });
  }
  const xp = Number(storage.getItem("dj_xp") || 0);
  state.xp = Number.isFinite(xp) ? Math.max(0, Math.floor(xp)) : 0;
  state.theme = storage.getItem("dj_theme") === "dark" ? "dark" : "light";
  return state;
}
function initialize() {
  if (initialized || typeof window === "undefined") return;
  initialized = true;
  repository = new LearningStorage(
    {
      getItem: (key) => window.localStorage.getItem(key),
      setItem: (key, value) => window.localStorage.setItem(key, value),
    },
    () => migrateLegacy(window.localStorage),
  );
  snapshot = repository.current;
  emit();
  window.addEventListener("storage", (event) => {
    if (repository?.receive(event.key, event.newValue)) {
      snapshot = repository.current;
      emit();
    }
  });
}
export function activateLearningAccount(
  user: { id: string; name: string } | null,
) {
  initialize();
  if (repository?.activate(user)) {
    snapshot = repository.current;
    emit();
  }
}

function subscribe(fn: () => void) {
  listeners.add(fn);
  queueMicrotask(initialize);
  return () => {
    listeners.delete(fn);
  };
}
const getSnapshot = () => snapshot;
const getServerSnapshot = () => null;
export function useLearning() {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
export function updateState(
  updater: (state: LearningState) => LearningState,
  replaceCorrupt = false,
) {
  if (!snapshot) return;
  const data = stateSchema.parse({
    ...updater(snapshot.data),
    updatedAt: new Date().toISOString(),
  });
  if (!repository) return;
  repository.write(data, replaceCorrupt);
  snapshot = repository.current;
  emit();
}

export function makeActivity(
  kind: Activity["kind"],
  label: string,
  xp: number,
  lesson = 1,
): Activity {
  return {
    id: crypto.randomUUID(),
    kind,
    label,
    xp,
    lesson,
    at: new Date().toISOString(),
  };
}
function withActivity(state: LearningState, activity: Activity): LearningState {
  return {
    ...state,
    xp: state.xp + activity.xp,
    activities: [...state.activities, activity].slice(-10000),
  };
}
export function recordActivity(
  kind: Activity["kind"],
  label: string,
  xp: number,
  lesson = 1,
) {
  updateState((s) => withActivity(s, makeActivity(kind, label, xp, lesson)));
}
export function addWord(word: Word): boolean {
  if (
    !snapshot ||
    snapshot.data.words.some(
      (w) => w.german.toLocaleLowerCase() === word.german.toLocaleLowerCase(),
    )
  )
    return false;
  updateState((s) =>
    withActivity(
      { ...s, words: [word, ...s.words] },
      makeActivity("word", `Added ${word.german}`, 2, word.lesson),
    ),
  );
  return true;
}
export function reviewWord(
  id: string,
  rating: Rating,
  productiveRecall = false,
  articleRecall = false,
) {
  updateState((s) => {
    const word = s.words.find((w) => w.id === id);
    if (!word) return s;
    return withActivity(
      {
        ...s,
        words: s.words.map((w) =>
          w.id === id
            ? scheduleReview(
                {
                  ...w,
                  evidence:
                    rating === "good" || rating === "easy"
                      ? {
                          ...(productiveRecall
                            ? withRecallEvidence(w.evidence)
                            : w.evidence),
                          recognized: true,
                          article: w.evidence.article || articleRecall,
                        }
                      : w.evidence,
                },
                rating,
              )
            : w,
        ),
      },
      makeActivity(
        "review",
        `Reviewed ${word.german}`,
        rating === "again" ? 1 : 2,
        word.lesson,
      ),
    );
  });
}
export function completeLesson(lesson: number) {
  updateState((s) => {
    const progress = s.journey.lessons[lesson] ?? emptyLessonProgress();
    if (!masteryReady(progress) || progress.completedAt) return s;
    return withActivity(
      {
        ...s,
        completedLessons: [...new Set([...s.completedLessons, lesson])],
        currentLesson: Math.min(12, lesson + 1),
        journey: {
          ...s.journey,
          lessons: {
            ...s.journey.lessons,
            [lesson]: { ...progress, completedAt: new Date().toISOString() },
          },
        },
      },
      makeActivity("lesson", `Completed lesson ${lesson}`, 20, lesson),
    );
  });
}
function patchLesson(
  state: LearningState,
  lesson: number,
  patch: Partial<LessonProgress>,
): LearningState {
  return {
    ...state,
    currentLesson: lesson,
    journey: {
      ...state.journey,
      lessons: {
        ...state.journey.lessons,
        [lesson]: {
          ...(state.journey.lessons[lesson] ?? emptyLessonProgress()),
          ...patch,
        },
      },
    },
  };
}
export function markJourneyStep(lesson: number, step: JourneyStep) {
  updateState((s) => {
    const p = s.journey.lessons[lesson] ?? emptyLessonProgress();
    return p.steps.includes(step)
      ? s
      : withActivity(
          patchLesson(s, lesson, { steps: [...p.steps, step] }),
          makeActivity("lesson", `Lesson ${lesson}: ${step}`, 1, lesson),
        );
  });
}
export function saveJourneyScore(
  lesson: number,
  skill: "vocabulary" | "listening" | "speaking" | "grammar",
  score: number,
  method: LessonProgress["speakingMethod"] = null,
) {
  updateState((s) => {
    const p = s.journey.lessons[lesson] ?? emptyLessonProgress();
    const best = Math.max(p[skill] ?? 0, score);
    const next = patchLesson(s, lesson, {
      [skill]: best,
      ...(skill === "speaking" && score >= (p.speaking ?? 0)
        ? { speakingMethod: method }
        : {}),
    });
    return withActivity(
      next,
      makeActivity(
        skill === "vocabulary"
          ? "review"
          : skill === "grammar"
            ? "game"
            : skill,
        `Lesson ${lesson}: ${skill} ${Math.round(score)}%`,
        score >= 70 ? 3 : 1,
        lesson,
      ),
    );
  });
}
export function addLessonWords(lesson: number): number {
  if (!snapshot) return 0;
  const core = bookLessons[lesson - 1]?.words ?? [];
  const existing = new Set(
    snapshot.data.words.map((w) => w.german.toLocaleLowerCase("de-DE")),
  );
  const fresh = core.filter(
    (w) => !existing.has(w.german.toLocaleLowerCase("de-DE")),
  );
  if (snapshot.data.words.length + fresh.length > 5000) return 0;
  updateState((s) => ({
    ...s,
    words: [
      ...s.words.map((w) => {
        const book = core.find(
          (b) =>
            b.german.toLocaleLowerCase("de-DE") ===
            w.german.toLocaleLowerCase("de-DE"),
        );
        return book && w.id.startsWith("seed-")
          ? {
              ...w,
              lesson,
              example: book.example,
              plural: book.plural || w.plural,
            }
          : w;
      }),
      ...fresh,
    ],
  }));
  return fresh.length;
}
export function addWordEvidence(
  germanWords: string[],
  patch: Partial<WordEvidence>,
  recalled = false,
) {
  const terms = new Set(germanWords.map((w) => w.toLocaleLowerCase("de-DE")));
  updateState((s) => ({
    ...s,
    words: s.words.map((w) => {
      if (!terms.has(w.german.toLocaleLowerCase("de-DE"))) return w;
      let evidence = { ...w.evidence, ...patch };
      if (recalled) evidence = withRecallEvidence(evidence);
      return {
        ...w,
        evidence,
        status:
          fullyLearned(evidence, w.type === "noun") && w.interval >= 21
            ? "mastered"
            : w.status === "mastered"
              ? "reviewing"
              : w.status,
      };
    }),
  }));
}
export function saveMission(lesson: number, response: string, passed: boolean) {
  updateState((s) => {
    const p = s.journey.lessons[lesson] ?? emptyLessonProgress();
    const next = patchLesson(s, lesson, {
      missionResponse: response,
      missionPassed: p.missionPassed || passed,
    });
    return withActivity(
      next,
      makeActivity(
        "situation",
        `Lesson ${lesson}: life mission ${passed ? "passed" : "practice"}`,
        passed ? 5 : 1,
        lesson,
      ),
    );
  });
}
export function saveCheckpoint(
  module: number,
  responses: Record<string, string>,
  passed: string[],
  total: number,
) {
  updateState((s) => {
    const old = s.journey.checkpoints[module];
    const done = passed.length === total;
    return withActivity(
      {
        ...s,
        journey: {
          ...s.journey,
          checkpoints: {
            ...s.journey.checkpoints,
            [module]: {
              responses,
              passed,
              completedAt: done
                ? (old?.completedAt ?? new Date().toISOString())
                : null,
            },
          },
        },
      },
      makeActivity(
        "situation",
        `Module ${module}: mixed life challenge`,
        done && !old?.completedAt ? 10 : 1,
        module * 3,
      ),
    );
  });
}
export function importState(input: unknown) {
  const parsed = stateSchema.parse(input);
  updateState(() => parsed, true);
}
export function exportState(state: LearningState) {
  const blob = new Blob([JSON.stringify(state, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "deutsch-journey-backup.json";
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
