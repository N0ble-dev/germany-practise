import type { StudySession } from "./planner-model";
import { studyHref, studyLabels } from "./planner-model";

export function dayInZone(date: Date | string, timeZone: string) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date(date));
  const get = (type: string) => parts.find((p) => p.type === type)!.value;
  return `${get("year")}-${get("month")}-${get("day")}`;
}
export function timeInZone(date: Date | string, timeZone: string) {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone,
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).format(new Date(date));
}
export function endOfSession(s: StudySession) {
  return new Date(
    new Date(s.startsAt).getTime() + s.duration * 60_000,
  ).toISOString();
}
export function monthDays(month: string) {
  const [year, m] = month.split("-").map(Number);
  const first = new Date(Date.UTC(year, m - 1, 1, 12));
  first.setUTCDate(1 - ((first.getUTCDay() + 6) % 7));
  return Array.from({ length: 42 }, (_, index) => {
    const day = new Date(first);
    day.setUTCDate(day.getUTCDate() + index);
    return day.toISOString().slice(0, 10);
  });
}
export function shiftMonth(month: string, delta: number) {
  const [year, m] = month.split("-").map(Number);
  return new Date(Date.UTC(year, m - 1 + delta, 1, 12))
    .toISOString()
    .slice(0, 7);
}
export function sessionDescription(s: StudySession, appUrl: string) {
  return [
    `A little German, every day.`,
    studyLabels[s.kind],
    s.note,
    `Practice: ${new URL(studyHref(s), appUrl).href}`,
  ]
    .filter(Boolean)
    .join("\n");
}
function icalText(text: string) {
  return text
    .replaceAll("\\", "\\\\")
    .replace(/\r\n|\r|\n/g, "\\n")
    .replaceAll(";", "\\;")
    .replaceAll(",", "\\,")
    .replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, "");
}
function stamp(value: string) {
  return new Date(value)
    .toISOString()
    .replace(/[-:]/g, "")
    .replace(/\.\d{3}Z$/, "Z");
}
function fold(line: string) {
  let result = "",
    segment = "",
    bytes = 0;
  for (const char of line) {
    const length = new TextEncoder().encode(char).length;
    if (bytes + length > 75) {
      result += segment + "\r\n";
      segment = " ";
      bytes = 1;
    }
    segment += char;
    bytes += length;
  }
  return result + segment;
}
export function calendarFile(
  sessions: StudySession[],
  appUrl: string,
  now = new Date(),
) {
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Deutsch Journey//Study Planner//EN",
    "CALSCALE:GREGORIAN",
    "X-WR-CALNAME:Deutsch Journey study plan",
  ];
  for (const s of sessions.filter((s) => s.status !== "skipped")) {
    lines.push(
      "BEGIN:VEVENT",
      `UID:${s.id}@deutsch-journey`,
      `DTSTAMP:${stamp(now.toISOString())}`,
      `LAST-MODIFIED:${stamp(s.updatedAt)}`,
      `DTSTART:${stamp(s.startsAt)}`,
      `DTEND:${stamp(endOfSession(s))}`,
      `SUMMARY:${icalText((s.status === "done" ? "Completed · " : "") + s.title)}`,
      `DESCRIPTION:${icalText(sessionDescription(s, appUrl))}`,
      `URL:${new URL(studyHref(s), appUrl).href}`,
      "STATUS:CONFIRMED",
      "TRANSP:OPAQUE",
    );
    if (s.reminder !== null && s.status === "planned")
      lines.push(
        "BEGIN:VALARM",
        "ACTION:DISPLAY",
        `DESCRIPTION:${icalText(`Time for a little German: ${s.title}`)}`,
        `TRIGGER:${s.reminder === 0 ? "PT0S" : `-PT${s.reminder}M`}`,
        "END:VALARM",
      );
    lines.push("END:VEVENT");
  }
  lines.push("END:VCALENDAR");
  return lines.map(fold).join("\r\n") + "\r\n";
}
export function googleEventId(id: string) {
  return `dj${id.replaceAll("-", "")}`;
}
export function googleEvent(s: StudySession, appUrl: string) {
  return {
    summary: `${s.status === "done" ? "Completed · " : "Deutsch · "}${s.title}`,
    description: sessionDescription(s, appUrl),
    start: { dateTime: s.startsAt, timeZone: s.timeZone },
    end: { dateTime: endOfSession(s), timeZone: s.timeZone },
    reminders: {
      useDefault: false,
      overrides:
        s.reminder !== null && s.status === "planned"
          ? [{ method: "popup" as const, minutes: s.reminder }]
          : [],
    },
    extendedProperties: { private: { deutschJourneySession: s.id } },
    visibility: "private",
    transparency: "opaque",
  };
}
