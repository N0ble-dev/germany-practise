import { describe, expect, it } from "vitest";
import { randomBytes } from "node:crypto";
import { createSchedule, type SessionDraft } from "@/lib/planner-schedule";
import {
  calendarFile,
  dayInZone,
  googleEvent,
  googleEventId,
  monthDays,
  shiftMonth,
  timeInZone,
} from "@/lib/planner-calendar";
import { sessionsSchema } from "@/lib/planner-model";
import { initialState } from "@/lib/content";
import { stateSchema } from "@/lib/learning";
import {
  openCalendarSecret,
  sealCalendarSecret,
  validOAuthState,
} from "@/lib/calendar-security";

const draft: SessionDraft = {
  title: "Practice introductions",
  date: "2030-03-30",
  time: "19:00",
  timeZone: "Europe/Berlin",
  duration: 20,
  kind: "lesson",
  lesson: 1,
  note: "Say my name out loud.",
  reminder: 10,
  repeat: "daily",
  until: "2030-04-01",
  weekdays: [1, 3, 5],
};

describe("study schedules", () => {
  it("preserves local time while UTC changes across daylight saving", () => {
    const sessions = createSchedule(draft);
    expect(sessions.map((s) => s.startsAt)).toEqual([
      "2030-03-30T18:00:00.000Z",
      "2030-03-31T17:00:00.000Z",
      "2030-04-01T17:00:00.000Z",
    ]);
    expect(
      sessions.every((s) => timeInZone(s.startsAt, s.timeZone) === "19:00"),
    ).toBe(true);
    expect(new Set(sessions.map((s) => s.seriesId)).size).toBe(1);
    expect(new Set(sessions.map((s) => s.id)).size).toBe(3);
  });
  it("rejects skipped and ambiguous times instead of silently moving reminders", () => {
    for (const date of ["2030-03-31", "2030-10-27"])
      expect(() =>
        createSchedule({ ...draft, repeat: "once", date, time: "02:30" }),
      ).toThrow("clock change");
  });
  it("creates only selected weekdays and enforces the planning window", () => {
    const sessions = createSchedule({
      ...draft,
      date: "2030-01-07",
      until: "2030-01-20",
      repeat: "weekly",
    });
    expect(sessions.map((s) => dayInZone(s.startsAt, s.timeZone))).toEqual([
      "2030-01-07",
      "2030-01-09",
      "2030-01-11",
      "2030-01-14",
      "2030-01-16",
      "2030-01-18",
    ]);
    expect(() =>
      createSchedule({ ...draft, repeat: "weekly", weekdays: [] }),
    ).toThrow("at least one day");
    expect(() => createSchedule({ ...draft, until: "2031-01-01" })).toThrow(
      "90 days",
    );
    expect(() => createSchedule({ ...draft, until: "2030-03-29" })).toThrow(
      "on or after",
    );
    expect(() =>
      createSchedule({
        ...draft,
        date: "2030-01-07",
        until: "2030-01-07",
        repeat: "weekly",
        weekdays: [2],
      }),
    ).toThrow("No selected weekdays");
  });
  it("keeps old learning backups compatible and rejects duplicate or invalid sessions", () => {
    const state = initialState(),
      { planner, ...legacy } = state;
    expect(stateSchema.parse(legacy).planner).toEqual(planner);
    const session = createSchedule({ ...draft, repeat: "once" })[0];
    expect(
      stateSchema.parse({
        ...state,
        planner: { ...planner, sessions: [session] },
      }).planner.sessions,
    ).toEqual([session]);
    expect(sessionsSchema.safeParse([session, session]).success).toBe(false);
    expect(
      sessionsSchema.safeParse([{ ...session, timeZone: "Mars/Olympus" }])
        .success,
    ).toBe(false);
    expect(
      sessionsSchema.safeParse([{ ...session, reminder: -10 }]).success,
    ).toBe(false);
    expect(
      sessionsSchema.safeParse([{ ...session, duration: 0 }]).success,
    ).toBe(false);
  });
  it("builds Monday-first months, handles year boundaries, and formats midnight", () => {
    const days = monthDays("2030-01");
    expect(days).toHaveLength(42);
    expect(new Date(`${days[0]}T12:00Z`).getUTCDay()).toBe(1);
    expect(shiftMonth("2030-01", -1)).toBe("2029-12");
    expect(shiftMonth("2029-12", 1)).toBe("2030-01");
    expect(timeInZone("2030-01-01T00:00Z", "UTC")).toBe("00:00");
  });
});

describe("calendar exports", () => {
  it("uses UTC times, alarms and escaped UTF-8 lines within 75 octets", () => {
    const session = createSchedule({
      ...draft,
      repeat: "once",
      title: "Üben, sprechen; lernen\\ " + "🇩🇪".repeat(15),
      note: "Line one\nLine two; comma, slash\\",
    })[0];
    const file = calendarFile(
      [session],
      "https://study.example",
      new Date("2030-01-01T12:00Z"),
    );
    const unfolded = file.replace(/\r\n /g, "");
    expect(unfolded).toContain(
      "DTSTART:20300330T180000Z\r\nDTEND:20300330T182000Z",
    );
    expect(unfolded).toContain("TRIGGER:-PT10M");
    expect(unfolded).toContain("Üben\\, sprechen\\; lernen\\\\");
    expect(unfolded).toContain("Line one\\nLine two\\; comma\\, slash\\\\");
    expect(unfolded).toContain("URL:https://study.example/lessons/1");
    expect(file.endsWith("\r\n")).toBe(true);
    expect(
      file.split("\r\n").every((line) => Buffer.byteLength(line) <= 75),
    ).toBe(true);
    expect(file).not.toContain("�");
  });
  it("omits skipped events and alarms for done or reminder-free sessions", () => {
    const session = createSchedule({ ...draft, repeat: "once" })[0];
    expect(
      calendarFile(
        [{ ...session, status: "skipped" }],
        "https://study.example",
      ),
    ).not.toContain("BEGIN:VEVENT");
    for (const s of [
      { ...session, reminder: null },
      { ...session, status: "done" as const },
    ]) {
      expect(calendarFile([s], "https://study.example")).not.toContain(
        "BEGIN:VALARM",
      );
      expect(googleEvent(s, "https://study.example").reminders).toEqual({
        useDefault: false,
        overrides: [],
      });
    }
    expect(
      calendarFile([{ ...session, reminder: 0 }], "https://study.example"),
    ).toContain("TRIGGER:PT0S");
  });
  it("sends stable Google IDs, time zones, and the selected popup offset", () => {
    const session = createSchedule({ ...draft, repeat: "once" })[0];
    const event = googleEvent(session, "https://study.example");
    expect(googleEventId(session.id)).toMatch(/^[a-v0-9]{5,1024}$/);
    expect(event.start).toEqual({
      dateTime: session.startsAt,
      timeZone: "Europe/Berlin",
    });
    expect(event.reminders).toEqual({
      useDefault: false,
      overrides: [{ method: "popup", minutes: 10 }],
    });
    expect(event.extendedProperties.private.deutschJourneySession).toBe(
      session.id,
    );
  });
});

describe("calendar credentials", () => {
  it("encrypts credentials with random IVs and binds decryption to the user", () => {
    const key = randomBytes(32).toString("base64"),
      value = "provider-refresh-test";
    const sealed = sealCalendarSecret(value, key, "user:a");
    expect(sealed).not.toContain(value);
    expect(sealCalendarSecret(value, key, "user:a")).not.toBe(sealed);
    expect(openCalendarSecret(sealed, key, "user:a")).toBe(value);
    expect(() => openCalendarSecret(sealed, key, "user:b")).toThrow();
    expect(() =>
      openCalendarSecret(sealed, randomBytes(32).toString("base64"), "user:a"),
    ).toThrow();
    const parts = sealed.split(".");
    parts[2] = Buffer.from("tampered").toString("base64url");
    expect(() => openCalendarSecret(parts.join("."), key, "user:a")).toThrow();
    expect(() => sealCalendarSecret(value, "short", "user:a")).toThrow(
      "32-byte",
    );
    expect(validOAuthState("state", "state")).toBe(true);
    expect(validOAuthState("state", "stale")).toBe(false);
    expect(validOAuthState("", "")).toBe(false);
    expect(validOAuthState("state", "state-longer")).toBe(false);
  });
});
