import { describe, expect, it } from "vitest";
import { initialState } from "../../src/lib/content";
import { stateSchema, type Activity } from "../../src/lib/learning";
import { motivationForToday } from "../../src/lib/motivation";
import { motivationSchema } from "../../src/lib/motivation-model";
const now = new Date(2026, 9, 8, 12);
const activity = (date: Date, id = "practice"): Activity => ({
  id,
  kind: "speaking",
  at: date.toISOString(),
  label: "Said a sentence",
  lesson: 1,
  xp: 1,
});
describe("Germany motivation", () => {
  it("recognizes actual local-day practice and counts study days once", () => {
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    const future = new Date(now);
    future.setDate(future.getDate() + 1);
    const state = initialState();
    state.activities = [
      activity(yesterday),
      activity(now, "one"),
      activity(now, "two"),
      activity(future, "future"),
    ];
    const result = motivationForToday(state, now);
    expect(result.practiced).toBe(true);
    expect(result.practiceDays).toBe(2);
  });
  it("keeps a daily encouragement stable and resets the practice reminder at midnight", () => {
    const state = initialState();
    state.activities = [activity(now)];
    const evening = new Date(now);
    evening.setHours(23, 59);
    expect(motivationForToday(state, now).encouragement).toEqual(
      motivationForToday(state, evening).encouragement,
    );
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 1);
    expect(motivationForToday(state, tomorrow).practiced).toBe(false);
    expect(motivationForToday(state, tomorrow).practiceDays).toBe(1);
    expect(motivationForToday(state, tomorrow).encouragement).not.toEqual(
      motivationForToday(state, now).encouragement,
    );
  });
  it("adds safe defaults to old backups without inventing study activity", () => {
    const { motivation, ...old } = initialState();
    void motivation;
    const upgraded = stateSchema.parse({ ...old, xp: 125 });
    expect(upgraded.motivation).toEqual({ destination: "berlin", why: "" });
    expect(upgraded.xp).toBe(125);
    expect(motivationForToday(upgraded, now).practiced).toBe(false);
    expect(motivationForToday(upgraded, now).practiceDays).toBe(0);
  });
  it("bounds reasons and rejects unsupported destinations", () => {
    expect(motivationSchema.safeParse({ destination: "unknown" }).success).toBe(
      false,
    );
    expect(motivationSchema.safeParse({ why: "x".repeat(281) }).success).toBe(
      false,
    );
    expect(motivationSchema.parse({ why: "  For a new home  " }).why).toBe(
      "For a new home",
    );
  });
});
