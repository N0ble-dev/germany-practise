import { describe, expect, it, vi } from "vitest";
import starter from "../../content/exams/goethe-a1-sd1-adult/starter-01.v1.json";
import {
  examDefinitions,
  officialPassRule,
} from "../../src/lib/exams/definitions";
import {
  examAnswerSchema,
  examGoalSchema,
  examPackSchema,
  publicExamTask,
} from "../../src/lib/exams/model";
import {
  answerErrors,
  evaluateTask,
  examPublicationBlockers,
  examReport,
} from "../../src/lib/exams/evaluation";
import { examWeek } from "../../src/lib/exams/calendar";
import { contentHash } from "../../src/lib/content-pipeline/hash";
import { studyHref, studySessionSchema } from "../../src/lib/planner-model";
import { stateSchema } from "../../src/lib/learning";
import { initialState } from "../../src/lib/content";
import { authDestination } from "../../src/lib/auth-navigation";
vi.mock("server-only", () => ({}));
const pack = examPackSchema.parse(starter);
describe("Independent Goethe exam preparation", () => {
  it("keeps adult definitions, durations, audience and passing rules distinct", () => {
    expect(examDefinitions.map((row) => row.level)).toEqual([
      "A1",
      "A2",
      "B1",
      "B2",
      "C1",
      "C2",
    ]);
    expect(examDefinitions[0].minutes).toEqual({
      listening: 20,
      reading: 25,
      writing: 20,
      speaking: 15,
    });
    expect(officialPassRule(examDefinitions[0])).toContain("60/100 overall");
    expect(officialPassRule(examDefinitions[1])).toContain("45 points");
    expect(officialPassRule(examDefinitions[1])).toContain("15 in the oral");
    for (const row of examDefinitions.slice(2))
      expect(row.scoring).toEqual({ kind: "per_module", moduleMinimum: 60 });
    expect(examDefinitions[4].minutes.speaking).toBe(20);
    expect(examDefinitions[5].minutes).toEqual({
      listening: 35,
      reading: 80,
      writing: 80,
      speaking: 15,
    });
    expect(examDefinitions[5].speakingSetup).toContain("Individual");
  });
  it("keeps the draft pack original, incomplete and blocked by actual review and audio gaps", () => {
    expect(pack.tasks).toHaveLength(11);
    expect(pack.blueprint.complete).toBe(false);
    expect(pack.rights.verified).toBe(false);
    const blockers = examPublicationBlockers(pack, contentHash(pack), [], []);
    expect(blockers).toHaveLength(9);
    expect(blockers.some((message) => message.includes("Human language"))).toBe(
      true,
    );
    expect(
      blockers.some((message) =>
        message.includes("owned, reviewed recorded audio"),
      ),
    ).toBe(true);
  });
  it("never ships objective keys or listening transcripts in a new task payload", () => {
    const tasks = pack.tasks.map((task) => publicExamTask(task));
    expect(JSON.stringify(tasks)).not.toMatch(
      /"correct"|"explanation"|"evidence"/,
    );
    const listen = tasks.filter((task) => task.skill === "listening");
    expect(JSON.stringify(listen)).not.toContain("Sprachzentrum");
    expect(
      JSON.stringify(tasks.filter((task) => task.skill === "reading")),
    ).toContain("Stadtbibliothek");
  });
  it("evaluates every option and blanks deterministically without assigning an official score", () => {
    const tasks = pack.tasks.filter((task) => task.type === "choice");
    for (const task of tasks) {
      for (const option of task.options) {
        const answer = examAnswerSchema.parse({ choice: option.id });
        const result = evaluateTask(task, answer);
        expect(result.kind === "objective" && result.correct).toBe(
          option.id === task.correct,
        );
      }
      const empty = evaluateTask(task, examAnswerSchema.parse({}));
      expect(empty).toMatchObject({
        kind: "objective",
        answered: false,
        earned: 0,
      });
      expect(
        answerErrors(task, examAnswerSchema.parse({ choice: "unknown" })),
      ).not.toEqual([]);
    }
    const report = examReport(pack, {});
    expect(report.officialScore).toBeNull();
    expect(report.mistakes).toHaveLength(6);
    expect(
      report.mistakes.every((item) =>
        /^\/lessons\/\d+\?step=(?:listen|patterns)$/.test(item.href),
      ),
    ).toBe(true);
  });
  it("reports writing and speaking as ungraded and rejects foreign form fields or check IDs", () => {
    const form = pack.tasks.find((task) => task.id === "course-form")!;
    const answer = examAnswerSchema.parse({
      fields: { name: "Sara" },
      checks: [0],
    });
    expect(evaluateTask(form, answer)).toMatchObject({
      kind: "subjective_pending",
      completeFields: 1,
      selfReviewedPoints: 1,
    });
    expect(
      answerErrors(
        form,
        examAnswerSchema.parse({ fields: { passport: "private" } }),
      ),
    ).not.toEqual([]);
    expect(
      answerErrors(form, examAnswerSchema.parse({ checks: [10] })),
    ).not.toEqual([]);
    expect(examAnswerSchema.safeParse({ checks: [1, 1] }).success).toBe(false);
    const speaking = pack.tasks.find((task) => task.skill === "speaking")!;
    expect(
      evaluateTask(
        speaking,
        examAnswerSchema.parse({ text: "Ich heiße Sara." }),
      ).kind,
    ).toBe("subjective_pending");
  });
  it("validates immutable IDs, answer evidence and declared section counts", () => {
    const invalid = structuredClone(pack);
    invalid.tasks.push(invalid.tasks[0]);
    expect(examPackSchema.safeParse(invalid).success).toBe(false);
    const wrong = structuredClone(pack);
    if (wrong.tasks[0].type === "choice") wrong.tasks[0].correct = "unknown";
    expect(examPackSchema.safeParse(wrong).success).toBe(false);
    const evidence = structuredClone(pack);
    if (evidence.tasks[0].type === "choice")
      evidence.tasks[0].evidence = "a statement that isn't in this passage";
    expect(examPackSchema.safeParse(evidence).success).toBe(false);
  });
  it("blocks unknown, noncommercial and no-derivatives publication even with a verified flag", () => {
    for (const code of ["UNKNOWN", "CC-BY-NC", "CC-BY-ND"] as const) {
      const candidate = structuredClone(pack);
      candidate.rights.verified = true;
      candidate.rights.licenseCode = code;
      expect(
        examPublicationBlockers(candidate, contentHash(candidate), [], []).some(
          (message) => message.includes("cannot be published"),
        ),
      ).toBe(true);
    }
  });
  it("makes balanced future sessions with native exam links and safe reminder metadata", () => {
    const goal = examGoalSchema.parse({
      examCode: pack.examCode,
      date: "2030-01-06",
      bookingConfirmed: false,
      dailyMinutes: 20,
      timeZone: "Europe/Berlin",
      language: "ar",
    });
    const sessions = examWeek(
      goal,
      "2030-01-02",
      "19:00",
      new Date("2030-01-01T12:00:00Z"),
    );
    expect(sessions).toHaveLength(5);
    expect(sessions.slice(0, 4).map((session) => session.examSkill)).toEqual([
      "listening",
      "reading",
      "writing",
      "speaking",
    ]);
    expect(sessions[0].startsAt).toBe("2030-01-02T18:00:00.000Z");
    expect(studyHref(sessions[0])).toBe(
      "/exams/goethe-a1-sd1-adult/practice/listening",
    );
    expect(
      sessions.every(
        (session) => session.kind === "exam" && session.reminder === 10,
      ),
    ).toBe(true);
    expect(
      examGoalSchema.safeParse({ ...goal, date: null, bookingConfirmed: true })
        .success,
    ).toBe(false);
    expect(
      examGoalSchema.safeParse({ ...goal, date: "2030-02-31" }).success,
    ).toBe(false);
    expect(() =>
      examWeek(goal, "2029-01-01", "19:00", new Date("2030-01-01T12:00:00Z")),
    ).toThrow(/future/);
    expect(
      studySessionSchema.safeParse({ ...sessions[0], examCode: undefined })
        .success,
    ).toBe(false);
    const restored = stateSchema.parse({
      ...initialState(),
      planner: { ...initialState().planner, sessions },
    });
    expect(restored.planner.sessions[0].examSkill).toBe("listening");
  });
  it("allows only narrow internal OAuth exam destinations", () => {
    expect(authDestination("/exams/plan")).toBe("/exams/plan");
    expect(
      authDestination("/exams/goethe-a1-sd1-adult/practice/speaking"),
    ).toBe("/exams/goethe-a1-sd1-adult/practice/speaking");
    expect(
      authDestination(
        "/exams/attempts/aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa/report",
      ),
    ).toContain("/report");
    expect(authDestination("/exams/../../evil")).toBe("/");
    expect(authDestination("//example.com/exams/plan")).toBe("/");
  });
});
