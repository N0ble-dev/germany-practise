import { Temporal } from "@js-temporal/polyfill";
import { studySessionSchema, type StudySession } from "./planner-model";

export type SessionDraft = Pick<
  StudySession,
  | "title"
  | "duration"
  | "timeZone"
  | "kind"
  | "lesson"
  | "note"
  | "reminder"
  | "examCode"
  | "examSkill"
> & {
  date: string;
  time: string;
  repeat: "once" | "daily" | "weekly";
  until: string;
  weekdays: number[];
};
export function createSchedule(draft: SessionDraft, now = new Date()) {
  const first = Temporal.PlainDate.from(draft.date);
  const last =
    draft.repeat === "once" ? first : Temporal.PlainDate.from(draft.until);
  if (Temporal.PlainDate.compare(last, first) < 0)
    throw new Error(
      "The repeat end date must be on or after the first session.",
    );
  if (first.until(last).days > 90)
    throw new Error("Plan up to 90 days at a time. You can add more later.");
  if (draft.repeat === "weekly" && draft.weekdays.length === 0)
    throw new Error("Choose at least one day for your weekly rhythm.");
  const time = Temporal.PlainTime.from(draft.time);
  const seriesId = draft.repeat === "once" ? null : crypto.randomUUID();
  const sessions: StudySession[] = [];
  for (
    let date = first;
    Temporal.PlainDate.compare(date, last) <= 0;
    date = date.add({ days: 1 })
  ) {
    if (draft.repeat === "weekly" && !draft.weekdays.includes(date.dayOfWeek))
      continue;
    let startsAt: string;
    try {
      startsAt = Temporal.ZonedDateTime.from(
        {
          timeZone: draft.timeZone,
          year: date.year,
          month: date.month,
          day: date.day,
          hour: time.hour,
          minute: time.minute,
        },
        { disambiguation: "reject" },
      )
        .toInstant()
        .toString({ smallestUnit: "millisecond" });
    } catch {
      throw new Error(
        `The time on ${date} is skipped or repeated by a clock change. Choose another time.`,
      );
    }
    sessions.push(
      studySessionSchema.parse({
        ...draft,
        id: crypto.randomUUID(),
        startsAt,
        seriesId,
        status: "planned",
        createdAt: now.toISOString(),
        updatedAt: now.toISOString(),
      }),
    );
  }
  if (!sessions.length)
    throw new Error(
      "No selected weekdays fall in this date range. Extend the end date or choose another weekday.",
    );
  return sessions;
}
