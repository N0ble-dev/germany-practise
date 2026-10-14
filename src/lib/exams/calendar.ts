import { Temporal } from "@js-temporal/polyfill";
import { createSchedule } from "../planner-schedule";
import {
  examDefinition,
  examSkills,
  skillLabels,
  type ExamSkill,
} from "./definitions";
import type { ExamGoal } from "./model";
export function examWeek(
  goal: ExamGoal,
  startDate: string,
  startTime: string,
  now = new Date(),
  weakSkill?: ExamSkill,
) {
  const first = Temporal.PlainDate.from(startDate),
    definition = examDefinition(goal.examCode)!;
  const order = weakSkill
    ? [weakSkill, ...examSkills.filter((skill) => skill !== weakSkill)]
    : [...examSkills];
  const sessions = [];
  for (let day = 0; day < 7; day++) {
    const date = first.add({ days: day }).toString();
    if (goal.date && date > goal.date) break;
    const skill = order[day % order.length];
    const generated = createSchedule(
      {
        title: `Goethe ${definition.level} · ${skillLabels[skill].de}`,
        date,
        time: startTime,
        timeZone: goal.timeZone,
        duration: goal.dailyMinutes,
        kind: "exam",
        examCode: goal.examCode,
        examSkill: skill,
        lesson: 1,
        note: `Independent ${definition.level} preparation. ${skillLabels[skill].en}: ${definition.level === "A1" ? "Use the skill walkthrough or a reviewed set, then revisit one difficulty." : "Use the level guide and an official model; record one difficulty."}`,
        reminder: 10,
        repeat: "once",
        until: date,
        weekdays: [],
      },
      now,
    );
    if (new Date(generated[0].startsAt).getTime() <= now.getTime())
      throw new Error("Choose a start date and time in the future.");
    sessions.push(generated[0]);
  }
  if (!sessions.length)
    throw new Error("Choose a start date on or before your planned exam date.");
  return sessions;
}
