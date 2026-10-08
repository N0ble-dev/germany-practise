import { describe, expect, it } from "vitest";
import {
  bookLessons,
  bookModules,
  checkMission,
  personalize,
} from "../../src/lib/journey-content";
import {
  emptyLessonProgress,
  journeySteps,
  masteryReady,
  fullyLearned,
  wordEvidenceSchema,
  withRecallEvidence,
} from "../../src/lib/journey-model";
import { initialState } from "../../src/lib/content";
import { stateSchema, wordSchema } from "../../src/lib/learning";
import { germanNumber } from "../../src/lib/numbers";

describe("Menschen book journey", () => {
  it("forms German numbers with reversed units and special teens and tens", () => {
    expect(germanNumber(0)).toBe("null");
    expect(germanNumber(16)).toBe("sechzehn");
    expect(germanNumber(17)).toBe("siebzehn");
    expect(germanNumber(21)).toBe("einundzwanzig");
    expect(germanNumber(63)).toBe("dreiundsechzig");
    expect(germanNumber(100)).toBe("hundert");
    expect(() => germanNumber(101)).toThrow(RangeError);
  });
  it("covers twelve lessons in four modules in the strategy's order", () => {
    expect(bookModules.flatMap((m) => m.lessons)).toEqual(
      Array.from({ length: 12 }, (_, i) => i + 1),
    );
    expect(bookLessons).toHaveLength(12);
    expect(bookLessons[1].goal).toMatch(/work|job|profile/);
    expect(bookLessons[2].goal).toMatch(/family/);
    for (const lesson of bookLessons) {
      expect(lesson.words).toHaveLength(12);
      expect(lesson.grammar).toHaveLength(3);
      expect(lesson.listening).toHaveLength(3);
      for (const question of [...lesson.grammar, ...lesson.listening])
        expect(question.options[question.answer]).toBeTruthy();
    }
  });
  it("does not award chapter mastery for visits, missing skills, or a mission alone", () => {
    const visits = { ...emptyLessonProgress(), steps: [...journeySteps] };
    expect(masteryReady(visits)).toBe(false);
    const ready = {
      ...visits,
      vocabulary: 80,
      listening: 70,
      speaking: 70,
      grammar: 70,
      missionPassed: true,
    };
    expect(masteryReady(ready)).toBe(true);
    expect(masteryReady({ ...ready, vocabulary: 79 })).toBe(false);
    expect(masteryReady({ ...ready, listening: 69 })).toBe(false);
    expect(masteryReady({ ...ready, speaking: 69 })).toBe(false);
    expect(masteryReady({ ...ready, grammar: 69 })).toBe(false);
    expect(masteryReady({ ...ready, missionPassed: false })).toBe(false);
  });
  it("shows missing communication tasks instead of accepting any free text", () => {
    const rules = bookLessons[0].mission.criteria;
    expect(checkMission("Hallo!", rules).length).toBeLessThan(rules.length);
    const response =
      "Hallo! Ich heiße Nabil. Ich komme aus Ägypten. Ich wohne in Alexandria. Mir geht's gut. Wie heißt du? Tschüss!";
    expect(checkMission(response, rules)).toHaveLength(rules.length);
    expect(checkMission(response.toUpperCase(), rules)).toHaveLength(
      rules.length,
    );
    expect(checkMission("", rules)).toEqual([]);
  });
  it("compiles every authored mission and module rule", () => {
    for (const rules of [
      ...bookLessons.map((l) => l.mission.criteria),
      ...bookModules.map((m) => m.criteria),
    ])
      expect(() => checkMission("Test", rules)).not.toThrow();
  });
  it("uses the learner's saved details without leaving placeholders", () => {
    expect(
      personalize(
        "Ich heiße {name}. Ich komme aus {country}. Ich wohne in {city}. Ich bin {profession}. Ich spreche {languages}.",
        "Sara",
        {
          country: "Marokko",
          city: "Rabat",
          profession: "Ärztin",
          languages: "Arabisch und Deutsch",
        },
      ),
    ).toBe(
      "Ich heiße Sara. Ich komme aus Marokko. Ich wohne in Rabat. Ich bin Ärztin. Ich spreche Arabisch und Deutsch.",
    );
  });
  it("upgrades old v2 backups without discarding words, XP, or chapter history", () => {
    const before = initialState();
    const { journey, personalProfile, ...old } = before;
    void journey;
    void personalProfile;
    const restored = stateSchema.parse({
      ...old,
      xp: 100,
      completedLessons: [1],
      words: before.words.map(({ evidence, ...word }) => {
        void evidence;
        return word;
      }),
    });
    expect(restored.journey).toEqual({ lessons: {}, checkpoints: {} });
    expect(restored.personalProfile.city).toBe("");
    expect(restored.words).toHaveLength(before.words.length);
    expect(restored.xp).toBe(100);
    expect(restored.completedLessons).toEqual([1]);
    expect(restored.words[0].evidence.recalled).toBe(false);
  });
  it("requires delayed recall and all usage evidence to master a noun", () => {
    const demonstrated = wordEvidenceSchema.parse({
      recognized: true,
      article: true,
      recalled: true,
      sentence: true,
      audio: true,
      speech: true,
      situation: true,
      spacedRecall: true,
    });
    expect(fullyLearned(demonstrated, true)).toBe(true);
    expect(fullyLearned({ ...demonstrated, article: false }, true)).toBe(false);
    expect(fullyLearned({ ...demonstrated, article: false }, false)).toBe(true);
    expect(fullyLearned({ ...demonstrated, spacedRecall: false }, false)).toBe(
      false,
    );
    const first = withRecallEvidence(
      wordEvidenceSchema.parse({}),
      new Date("2026-10-01T12:00:00Z"),
    );
    expect(first.spacedRecall).toBe(false);
    expect(
      withRecallEvidence(first, new Date("2026-10-04T11:59:59Z")).spacedRecall,
    ).toBe(false);
    expect(
      withRecallEvidence(first, new Date("2026-10-04T12:00:00Z")).spacedRecall,
    ).toBe(true);
    expect(
      wordSchema.parse({ ...initialState().words[0], status: "mastered" })
        .status,
    ).toBe("reviewing");
  });
});
