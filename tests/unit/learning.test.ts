import { describe, expect, it } from "vitest";
import { initialState, starterWords } from "../../src/lib/content";
import {
  dailyActivities,
  dueWords,
  localDay,
  normalizeAnswer,
  scheduleReview,
  sentencePatterns,
  stateSchema,
  streak,
  textSimilarity,
  type Activity,
} from "../../src/lib/learning";
import { migrateLegacy } from "../../src/lib/store";
import { wordEvidenceSchema } from "../../src/lib/journey-model";
const now = new Date(2026, 9, 3, 12, 0);
const activity = (date: Date): Activity => ({
  id: date.toISOString(),
  kind: "review",
  label: "Reviewed",
  xp: 2,
  at: date.toISOString(),
  lesson: 1,
});
describe("spaced reviews", () => {
  it("brings a forgotten word back after one minute and tracks the mistake", () => {
    const result = scheduleReview(starterWords[0], "again", now);
    expect(new Date(result.due).getTime() - now.getTime()).toBe(60_000);
    expect(result.mistakes).toBe(1);
    expect(result.status).toBe("learning");
  });
  it("spaces successful recalls out and requires usage evidence for mastery", () => {
    const good = scheduleReview(starterWords[0], "good", now);
    expect(good.interval).toBe(1);
    const easy = scheduleReview(starterWords[0], "easy", now);
    expect(easy.interval).toBe(4);
    const mature = scheduleReview(
      { ...starterWords[0], interval: 15 },
      "good",
      now,
    );
    expect(mature.status).toBe("reviewing");
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
    expect(
      scheduleReview(
        { ...starterWords[0], interval: 15, evidence: demonstrated },
        "good",
        now,
      ).status,
    ).toBe("mastered");
    expect(
      scheduleReview({ ...starterWords[0], interval: 300 }, "easy", now)
        .interval,
    ).toBe(365);
  });
  it("only includes words due by the current moment", () => {
    const state = initialState();
    state.words = [
      scheduleReview(starterWords[0], "easy", now),
      starterWords[1],
    ];
    expect(dueWords(state, now).map((w) => w.id)).toEqual([starterWords[1].id]);
  });
});
describe("daily progress", () => {
  it("resets daily activity at local midnight without losing XP", () => {
    const state = initialState();
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    state.activities = [activity(yesterday), activity(now)];
    state.xp = 4;
    expect(dailyActivities(state, now)).toHaveLength(1);
    expect(state.xp).toBe(4);
  });
  it("calculates consecutive days and allows yesterday’s streak before today’s practice", () => {
    const state = initialState();
    state.activities = [0, 1, 2].map((offset) => {
      const d = new Date(now);
      d.setDate(d.getDate() - offset);
      return activity(d);
    });
    expect(streak(state, now)).toBe(3);
    state.activities = state.activities.slice(1);
    expect(streak(state, now)).toBe(2);
    const future = new Date(now);
    future.setDate(future.getDate() + 2);
    expect(streak(state, future)).toBe(0);
  });
  it("uses the local calendar day rather than UTC", () => {
    expect(localDay(new Date(2026, 9, 3, 0, 1))).toBe("2026-10-03");
  });
});
describe("German answers and data safety", () => {
  it("accepts punctuation and capitalization but preserves umlauts and word order", () => {
    expect(normalizeAnswer("Ich komme aus Ägypten!")).toBe(
      normalizeAnswer("ich komme aus Ägypten"),
    );
    expect(normalizeAnswer("Ägypten")).not.toBe(normalizeAnswer("Agypten"));
    expect(
      textSimilarity("Ich lerne Deutsch", "Deutsch lerne Ich"),
    ).toBeLessThan(100);
    expect(textSimilarity("Hallo", "Hallo")).toBe(100);
  });
  it("uses den for a masculine accusative noun", () => {
    expect(
      sentencePatterns(starterWords.find((w) => w.german === "Bahnhof")!),
    ).toContain("Ich sehe den Bahnhof.");
  });
  it("validates backups and refuses unbounded input", () => {
    expect(stateSchema.safeParse(initialState()).success).toBe(true);
    expect(stateSchema.safeParse({ ...initialState(), name: "" }).success).toBe(
      false,
    );
    expect(
      stateSchema.safeParse({
        ...initialState(),
        words: [{ ...starterWords[0], german: "x".repeat(121) }],
      }).success,
    ).toBe(false);
  });
  it("imports existing words and XP without inventing dated daily activity", () => {
    const values: Record<string, string> = {
      dj_words: JSON.stringify([
        {
          id: 42,
          german: "Bahnhof",
          meaning: "train station",
          type: "noun",
          article: "der",
          topic: "Travel",
          hint: "My station",
        },
      ]),
      dj_xp: "125",
      dj_cardsToday: "99",
      dj_theme: "dark",
    };
    const state = migrateLegacy({ getItem: (key) => values[key] ?? null });
    expect(state.words).toHaveLength(1);
    expect(state.words[0].english).toBe("train station");
    expect(state.words[0].hint).toBe("My station");
    expect(state.xp).toBe(125);
    expect(state.theme).toBe("dark");
    expect(state.activities).toHaveLength(0);
  });
  it("keeps an intentionally empty legacy collection empty", () => {
    expect(
      migrateLegacy({ getItem: (key) => (key === "dj_words" ? "[]" : null) })
        .words,
    ).toEqual([]);
  });
});
