"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Bell,
  BookOpen,
  CalendarDays,
  Check,
  ChevronLeft,
  ChevronRight,
  Edit3,
  Headphones,
  Layers,
  Mic,
  Plus,
  Trash2,
  GraduationCap,
} from "lucide-react";
import { useApp } from "./learning-app";
import { Button } from "./ui/button";
import { Dialog } from "./ui/dialog";
import { StudyCalendarConnection } from "./study-calendar-connection";
import { updateState } from "@/lib/store";
import { lessons } from "@/lib/content";
import {
  examDefinitions,
  examSkills,
  skillLabels,
} from "@/lib/exams/definitions";
import {
  studyHref,
  studyKinds,
  studyLabels,
  type StudySession,
} from "@/lib/planner-model";
import {
  dayInZone,
  monthDays,
  shiftMonth,
  timeInZone,
} from "@/lib/planner-calendar";
import { createSchedule, type SessionDraft } from "@/lib/planner-schedule";

const weekdays = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
];
const icons = {
  lesson: BookOpen,
  review: Layers,
  listening: Headphones,
  speaking: Mic,
  grammar: BookOpen,
  exam: GraduationCap,
};
function calendarDate(day: string, options: Intl.DateTimeFormatOptions) {
  return new Date(`${day}T12:00:00Z`).toLocaleDateString("en", {
    ...options,
    timeZone: "UTC",
  });
}
function addDays(day: string, days: number) {
  const date = new Date(`${day}T12:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}
function reminderLabel(minutes: number | null) {
  return minutes === null
    ? "No reminder"
    : minutes === 0
      ? "At the start"
      : minutes === 1440
        ? "1 day before"
        : `${minutes} min before`;
}

function SessionForm({
  initial,
  day,
  timeZone,
  onSaved,
}: {
  initial: StudySession | null;
  day: string;
  timeZone: string;
  onSaved: (day?: string) => void;
}) {
  const { state, notify } = useApp();
  const [draft, setDraft] = useState<SessionDraft>(() => ({
    title: initial?.title ?? "A little German",
    date: initial ? dayInZone(initial.startsAt, initial.timeZone) : day,
    time: initial ? timeInZone(initial.startsAt, initial.timeZone) : "19:00",
    timeZone: initial?.timeZone ?? timeZone,
    duration: initial?.duration ?? state.goal,
    kind: initial?.kind ?? "lesson",
    lesson: initial?.lesson ?? state.currentLesson,
    examCode: initial?.examCode ?? "goethe-a1-sd1-adult",
    examSkill: initial?.examSkill ?? "listening",
    note: initial?.note ?? "",
    reminder: initial ? initial.reminder : 10,
    repeat: "once",
    until: addDays(day, 27),
    weekdays: [1, 3, 5],
  }));
  const [error, setError] = useState("");
  const zones = Array.from(
    new Set([
      draft.timeZone,
      "Africa/Cairo",
      "Europe/Berlin",
      "UTC",
      ...Intl.supportedValuesOf("timeZone"),
    ]),
  );
  function save(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    try {
      const generated = createSchedule(draft);
      if (
        !initial &&
        generated.some((s) => new Date(s.startsAt).getTime() <= Date.now())
      )
        throw new Error(
          "Choose a future time so your calendar can remind you.",
        );
      const count =
        state.planner.sessions.length + (initial ? 0 : generated.length);
      if (count > 500)
        throw new Error(
          "Your planner can hold 500 sessions. Remove older sessions before adding more.",
        );
      updateState((s) => ({
        ...s,
        planner: {
          ...s.planner,
          sessions: initial
            ? s.planner.sessions.map((session) =>
                session.id === initial.id
                  ? {
                      ...generated[0],
                      id: initial.id,
                      seriesId: initial.seriesId,
                      status: initial.status,
                      createdAt: initial.createdAt,
                    }
                  : session,
              )
            : [...s.planner.sessions, ...generated],
        },
      }));
      notify(
        initial
          ? "Session updated. Sync your calendar to update its reminder."
          : `Added ${generated.length === 1 ? "a study session" : `${generated.length} study sessions`}. Send your plan to your calendar for reminders.`,
      );
      onSaved(dayInZone(generated[0].startsAt, timeZone));
    } catch (e) {
      setError((e as Error).message);
    }
  }
  return (
    <form className="study-session-form" onSubmit={save}>
      <label>
        Session name
        <input
          required
          maxLength={100}
          data-dialog-autofocus=""
          value={draft.title}
          onChange={(e) => setDraft({ ...draft, title: e.target.value })}
        />
      </label>
      <div className="plan-form-row">
        <label>
          Study focus
          <select
            value={draft.kind}
            aria-label="Study focus"
            onChange={(e) =>
              setDraft({
                ...draft,
                kind: e.target.value as SessionDraft["kind"],
              })
            }
          >
            {studyKinds.map((kind) => (
              <option value={kind} key={kind}>
                {studyLabels[kind]}
              </option>
            ))}
          </select>
        </label>
        <label>
          Length (minutes)
          <input
            type="number"
            min={5}
            max={180}
            required
            value={draft.duration}
            onChange={(e) =>
              setDraft({ ...draft, duration: Number(e.target.value) })
            }
          />
        </label>
      </div>
      {draft.kind === "exam" && (
        <div className="plan-form-row">
          <label>
            Target exam
            <select
              value={draft.examCode}
              onChange={(event) =>
                setDraft({
                  ...draft,
                  examCode: event.target.value as SessionDraft["examCode"],
                })
              }
            >
              {examDefinitions.map((definition) => (
                <option key={definition.code} value={definition.code}>
                  {definition.level} · adult Goethe exam
                </option>
              ))}
            </select>
          </label>
          <label>
            Exam skill
            <select
              value={draft.examSkill}
              onChange={(event) =>
                setDraft({
                  ...draft,
                  examSkill: event.target.value as SessionDraft["examSkill"],
                })
              }
            >
              {examSkills.map((skill) => (
                <option value={skill} key={skill}>
                  {skillLabels[skill].de} · {skillLabels[skill].en}
                </option>
              ))}
            </select>
          </label>
        </div>
      )}
      {(draft.kind === "lesson" || draft.kind === "grammar") && (
        <label>
          Book chapter
          <select
            value={draft.lesson}
            aria-label="Book chapter"
            onChange={(e) =>
              setDraft({ ...draft, lesson: Number(e.target.value) })
            }
          >
            {lessons.map((lesson, index) => (
              <option key={index} value={index + 1}>
                Chapter {index + 1} · {lesson.title}
              </option>
            ))}
          </select>
        </label>
      )}
      <div className="plan-form-row">
        <label>
          Day
          <input
            type="date"
            required
            value={draft.date}
            onChange={(e) =>
              setDraft({
                ...draft,
                date: e.target.value,
                until:
                  e.target.value && draft.until < e.target.value
                    ? addDays(e.target.value, 27)
                    : draft.until,
              })
            }
          />
        </label>
        <label>
          Start time
          <input
            type="time"
            required
            value={draft.time}
            onChange={(e) => setDraft({ ...draft, time: e.target.value })}
          />
        </label>
      </div>
      <div className="plan-form-row">
        <label>
          Session time zone
          <select
            value={draft.timeZone}
            aria-label="Session time zone"
            onChange={(e) => setDraft({ ...draft, timeZone: e.target.value })}
          >
            {zones.map((zone) => (
              <option key={zone} value={zone}>
                {zone.replaceAll("_", " ")}
              </option>
            ))}
          </select>
        </label>
        <label>
          Remind me
          <select
            value={draft.reminder === null ? "none" : draft.reminder}
            aria-label="Remind me"
            onChange={(e) =>
              setDraft({
                ...draft,
                reminder:
                  e.target.value === "none"
                    ? null
                    : (Number(e.target.value) as StudySession["reminder"]),
              })
            }
          >
            {[null, 0, 5, 10, 15, 30, 60, 1440].map((minutes) => (
              <option
                key={String(minutes)}
                value={minutes === null ? "none" : minutes}
              >
                {reminderLabel(minutes)}
              </option>
            ))}
          </select>
        </label>
      </div>
      {!initial && (
        <>
          <div className="plan-form-row">
            <label>
              Repeat
              <select
                value={draft.repeat}
                aria-label="Repeat"
                onChange={(e) =>
                  setDraft({
                    ...draft,
                    repeat: e.target.value as SessionDraft["repeat"],
                  })
                }
              >
                <option value="once">Just this session</option>
                <option value="daily">Every day</option>
                <option value="weekly">Choose weekdays</option>
              </select>
            </label>
            {draft.repeat !== "once" && (
              <label>
                Repeat until
                <input
                  type="date"
                  required
                  min={draft.date}
                  max={draft.date ? addDays(draft.date, 90) : undefined}
                  value={draft.until}
                  onChange={(e) =>
                    setDraft({ ...draft, until: e.target.value })
                  }
                />
              </label>
            )}
          </div>
          {draft.repeat === "weekly" && (
            <fieldset className="plan-weekday-options">
              <legend>Days to study</legend>
              {weekdays.map((day, index) => (
                <label key={day}>
                  <input
                    type="checkbox"
                    aria-label={day}
                    checked={draft.weekdays.includes(index + 1)}
                    onChange={(e) =>
                      setDraft({
                        ...draft,
                        weekdays: e.target.checked
                          ? [...draft.weekdays, index + 1]
                          : draft.weekdays.filter((d) => d !== index + 1),
                      })
                    }
                  />
                  <span>{day.slice(0, 3)}</span>
                </label>
              ))}
            </fieldset>
          )}
        </>
      )}
      <label>
        My study intention (optional)
        <textarea
          rows={2}
          maxLength={500}
          placeholder="Review ten words, then introduce myself out loud."
          value={draft.note}
          onChange={(e) => setDraft({ ...draft, note: e.target.value })}
        />
      </label>
      {initial?.seriesId && (
        <p className="muted small">
          This edits one session in your repeating plan.
        </p>
      )}
      {error && (
        <p role="alert" className="form-error">
          {error}
        </p>
      )}
      <div className="button-row">
        <Button type="submit">
          {initial
            ? "Save session changes"
            : draft.repeat === "once"
              ? "Add study session"
              : "Add repeating study plan"}
        </Button>
        <Button type="button" variant="ghost" onClick={() => onSaved()}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
export function StudyPlanner() {
  const { state, notify } = useApp();
  const zone =
    state.planner.timeZone || Intl.DateTimeFormat().resolvedOptions().timeZone;
  const today = dayInZone(new Date(), zone);
  const [selected, setSelected] = useState(today);
  const [month, setMonth] = useState(today.slice(0, 7));
  const [editor, setEditor] = useState<{
    session: StudySession | null;
    day: string;
  } | null>(null);
  const [removing, setRemoving] = useState<StudySession | null>(null);
  const [removeSeries, setRemoveSeries] = useState(false);
  const days = monthDays(month);
  const sessions = [...state.planner.sessions].sort((a, b) =>
    a.startsAt.localeCompare(b.startsAt),
  );
  const sessionsByDay = new Map<string, StudySession[]>();
  for (const session of sessions) {
    const day = dayInZone(session.startsAt, zone);
    const group = sessionsByDay.get(day) ?? [];
    group.push(session);
    sessionsByDay.set(day, group);
  }
  const selectedSessions = sessionsByDay.get(selected) ?? [];
  const firstWeekDay = Number(new Date(`${today}T12:00:00Z`).getUTCDay());
  const weekStart = addDays(today, -((firstWeekDay + 6) % 7));
  const week = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  const weekSessions = week
    .flatMap((day) => sessionsByDay.get(day) ?? [])
    .filter((s) => s.status !== "skipped");
  const zones = Array.from(
    new Set([
      zone,
      "Africa/Cairo",
      "Europe/Berlin",
      "UTC",
      ...Intl.supportedValuesOf("timeZone"),
    ]),
  );
  useEffect(() => {
    const url = new URL(window.location.href),
      result = url.searchParams.get("calendar");
    if (!result) return;
    if (result === "connected")
      notify(
        "Google Calendar connected. Sync your study plan to add your reminders.",
      );
    else if (result === "cancelled")
      notify("Calendar connection cancelled. Your study plan is still here.");
    else
      notify(
        "Google Calendar could not connect. Try again, or download your plan.",
      );
    url.searchParams.delete("calendar");
    window.history.replaceState(null, "", url.pathname + url.search + url.hash);
  }, [notify]);
  const removeCount = removing
    ? state.planner.sessions.filter(
        (s) =>
          s.id === removing.id ||
          (removeSeries &&
            removing.seriesId &&
            s.seriesId === removing.seriesId &&
            s.startsAt >= removing.startsAt),
      ).length
    : 0;
  function removeSessions() {
    if (!removing) return;
    updateState((s) => ({
      ...s,
      planner: {
        ...s.planner,
        sessions: s.planner.sessions.filter(
          (session) =>
            session.id !== removing.id &&
            !(
              removeSeries &&
              removing.seriesId &&
              session.seriesId === removing.seriesId &&
              session.startsAt >= removing.startsAt
            ),
        ),
      },
    }));
    setRemoving(null);
    notify(
      "Session removed. Sync your connected calendar to remove its reminder too.",
    );
  }
  return (
    <>
      <div className="page-heading">
        <div>
          <h1>Make time for your German.</h1>
          <p>
            A small session, a comfortable rhythm, and a reminder when you need
            it.
          </p>
        </div>
        <div className="button-row">
          <Button asChild variant="outline">
            <a href="#calendar-reminders">
              <Bell size={16} />
              Calendar reminders
            </a>
          </Button>
          <Button
            onClick={() =>
              setEditor({
                session: null,
                day: selected < today ? today : selected,
              })
            }
          >
            <Plus size={17} />
            Plan a session
          </Button>
        </div>
      </div>
      <section
        className="study-week-strip"
        aria-label="This week's study rhythm"
      >
        <div className="study-week-copy">
          <span className="eyebrow">YOUR RHYTHM THIS WEEK</span>
          <h2>
            {weekSessions.length
              ? `${weekSessions.length} small steps planned`
              : "Give your German a place in the week."}
          </h2>
          <p>
            {weekSessions.length
              ? `${weekSessions.reduce((sum, s) => sum + s.duration, 0)} minutes set aside · ${weekSessions.filter((s) => s.status === "done").length} checked off`
              : "You choose the days. Start with a little time you can keep."}
          </p>
        </div>
        <div className="study-week-days">
          {week.map((day, index) => {
            const planned = (sessionsByDay.get(day) ?? []).filter(
              (s) => s.status !== "skipped",
            );
            return (
              <button
                key={day}
                className={`${day === today ? "is-today" : ""} ${day === selected ? "is-selected" : ""}`}
                aria-label={`${weekdays[index]}, ${calendarDate(day, { month: "short", day: "numeric" })}, ${planned.length} study sessions`}
                aria-pressed={day === selected}
                onClick={() => {
                  setSelected(day);
                  setMonth(day.slice(0, 7));
                }}
              >
                <span>{weekdays[index].slice(0, 3)}</span>
                <strong>{day.slice(-2)}</strong>
                <div className="week-session-dots">
                  {planned.slice(0, 3).map((s) => (
                    <i
                      key={s.id}
                      className={`study-dot focus-${s.kind} ${s.status === "done" ? "session-done" : ""}`}
                    />
                  ))}
                </div>
              </button>
            );
          })}
        </div>
      </section>
      <div className="study-planner-grid">
        <section
          className="panel study-month"
          aria-labelledby="study-month-title"
        >
          <div className="study-month-toolbar">
            <div>
              <span className="eyebrow">MY STUDY CALENDAR</span>
              <h2 id="study-month-title">
                {calendarDate(`${month}-01`, {
                  month: "long",
                  year: "numeric",
                })}
              </h2>
            </div>
            <div className="button-row">
              <Button
                variant="ghost"
                size="icon"
                aria-label="Previous month"
                onClick={() => setMonth(shiftMonth(month, -1))}
              >
                <ChevronLeft size={18} />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setMonth(today.slice(0, 7));
                  setSelected(today);
                }}
              >
                Today
              </Button>
              <Button
                variant="ghost"
                size="icon"
                aria-label="Next month"
                onClick={() => setMonth(shiftMonth(month, 1))}
              >
                <ChevronRight size={18} />
              </Button>
            </div>
          </div>
          <label className="plan-view-timezone">
            Calendar time zone
            <select
              value={zone}
              aria-label="Calendar time zone"
              onChange={(e) =>
                updateState((s) => ({
                  ...s,
                  planner: { ...s.planner, timeZone: e.target.value },
                }))
              }
            >
              {zones.map((tz) => (
                <option value={tz} key={tz}>
                  {tz.replaceAll("_", " ")}
                </option>
              ))}
            </select>
          </label>
          <table className="study-month-table">
            <caption className="visually-hidden">
              Choose a day to see or plan a study session
            </caption>
            <thead>
              <tr>
                {weekdays.map((day) => (
                  <th key={day} scope="col">
                    <abbr title={day}>{day.slice(0, 3)}</abbr>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {Array.from({ length: 6 }, (_, row) => (
                <tr key={row}>
                  {days.slice(row * 7, row * 7 + 7).map((day) => {
                    const planned = (sessionsByDay.get(day) ?? []).filter(
                      (s) => s.status !== "skipped",
                    );
                    return (
                      <td key={day}>
                        <button
                          className={`study-date ${day === selected ? "selected-date" : ""} ${day === today ? "current-date" : ""} ${!day.startsWith(month) ? "outside-month" : ""}`}
                          aria-pressed={day === selected}
                          aria-label={`${calendarDate(day, { weekday: "long", month: "long", day: "numeric", year: "numeric" })}, ${planned.length} study sessions`}
                          onClick={() => {
                            setSelected(day);
                            if (!day.startsWith(month))
                              setMonth(day.slice(0, 7));
                          }}
                        >
                          <span className="date-number">
                            {Number(day.slice(-2))}
                          </span>
                          <span className="date-study-items">
                            {planned.slice(0, 2).map((s) => (
                              <span
                                key={s.id}
                                className={`date-study-chip focus-${s.kind}`}
                              >
                                <i className="study-dot" />
                                {s.status === "done" && <Check size={10} />}
                                <span>{s.title}</span>
                              </span>
                            ))}
                            {planned.length > 2 && (
                              <span className="more-study">
                                +{planned.length - 2} more
                              </span>
                            )}
                          </span>
                        </button>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
          <div className="study-focus-legend">
            {studyKinds.map((kind) => (
              <span key={kind}>
                <i className={`study-dot focus-${kind}`} />
                {studyLabels[kind]}
              </span>
            ))}
          </div>
          <p className="muted small">
            Calendar times are shown in {zone}. New sessions use this time zone.
          </p>
        </section>
        <section
          className="panel study-agenda"
          aria-labelledby="study-agenda-title"
        >
          <span className="eyebrow">A LITTLE TIME, WELL SPENT</span>
          <h2 id="study-agenda-title">
            {selected === today
              ? "Your sessions today"
              : calendarDate(selected, {
                  weekday: "short",
                  month: "short",
                  day: "numeric",
                })}
          </h2>
          <p className="muted">
            {calendarDate(selected, {
              weekday: "long",
              month: "long",
              day: "numeric",
            })}
          </p>
          {!selectedSessions.length ? (
            <div className="study-day-empty">
              <CalendarDays size={30} />
              <h3>A little space for German.</h3>
              <p>
                Set aside a few minutes for words, a chapter, or saying
                something out loud.
              </p>
              <Button
                variant="outline"
                onClick={() =>
                  setEditor({
                    session: null,
                    day: selected < today ? today : selected,
                  })
                }
              >
                <Plus size={16} />
                Add a session
              </Button>
            </div>
          ) : (
            <div className="study-agenda-list">
              {selectedSessions.map((s) => {
                const Icon = icons[s.kind];
                return (
                  <article
                    key={s.id}
                    className={`study-agenda-session ${s.status !== "planned" ? "study-session-finished" : ""}`}
                  >
                    <div className={`session-focus-icon focus-${s.kind}`}>
                      <Icon size={18} />
                    </div>
                    <div className="agenda-session-main">
                      <span className="session-time">
                        {timeInZone(s.startsAt, zone)} · {s.duration} min
                      </span>
                      <h3>{s.title}</h3>
                      <p>
                        {studyLabels[s.kind]}
                        {s.kind === "lesson" || s.kind === "grammar"
                          ? ` · Chapter ${s.lesson}`
                          : ""}
                      </p>
                      {s.note && <p className="session-note">{s.note}</p>}
                      <span className="session-reminder">
                        <Bell size={13} />
                        {s.status === "done"
                          ? "Checked off · reminders off"
                          : reminderLabel(s.reminder)}
                      </span>
                      <div className="session-action-row">
                        <Button asChild size="sm">
                          <Link href={studyHref(s)}>
                            Start practice
                            <ChevronRight size={14} />
                          </Link>
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          aria-label={`${s.status === "done" ? "Mark planned" : "Check off"}: ${s.title}`}
                          aria-pressed={s.status === "done"}
                          onClick={() =>
                            updateState((state) => ({
                              ...state,
                              planner: {
                                ...state.planner,
                                sessions: state.planner.sessions.map((item) =>
                                  item.id === s.id
                                    ? {
                                        ...item,
                                        status:
                                          item.status === "done"
                                            ? "planned"
                                            : "done",
                                        updatedAt: new Date().toISOString(),
                                      }
                                    : item,
                                ),
                              },
                            }))
                          }
                        >
                          <Check size={16} />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          aria-label={`Edit: ${s.title}`}
                          onClick={() =>
                            setEditor({ session: s, day: selected })
                          }
                        >
                          <Edit3 size={15} />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          aria-label={`Remove: ${s.title}`}
                          onClick={() => {
                            setRemoving(s);
                            setRemoveSeries(false);
                          }}
                        >
                          <Trash2 size={15} />
                        </Button>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
          <p className="agenda-habit-note">
            Check-offs help you follow your plan. Learning XP comes from
            practicing in the app.
          </p>
        </section>
      </div>
      <StudyCalendarConnection month={month} timeZone={zone} />
      <Dialog
        open={!!editor}
        onOpenChange={(open) => {
          if (!open) setEditor(null);
        }}
        title={
          editor?.session
            ? "Edit your study session"
            : "A little time for German"
        }
        description="Choose your focus, a time that fits your day, and when your calendar should remind you."
      >
        {editor && (
          <SessionForm
            key={editor.session?.id ?? editor.day}
            initial={editor.session}
            day={editor.day}
            timeZone={zone}
            onSaved={(day) => {
              setEditor(null);
              if (day) {
                setSelected(day);
                setMonth(day.slice(0, 7));
              }
            }}
          />
        )}
      </Dialog>
      <Dialog
        open={!!removing}
        onOpenChange={(open) => {
          if (!open) setRemoving(null);
        }}
        title="Remove this study session?"
        description="Sync your connected calendar afterward to remove the event and its reminder there too."
      >
        {removing && (
          <>
            <p>
              <strong>{removing.title}</strong> ·{" "}
              {calendarDate(dayInZone(removing.startsAt, zone), {
                month: "short",
                day: "numeric",
              })}
            </p>
            {removing.seriesId && (
              <label className="plan-series-remove">
                <input
                  type="checkbox"
                  checked={removeSeries}
                  onChange={(e) => setRemoveSeries(e.target.checked)}
                />
                Also remove the remaining sessions in this repeating plan
              </label>
            )}
            <div className="button-row">
              <Button variant="outline" onClick={() => setRemoving(null)}>
                Keep session
              </Button>
              <Button variant="destructive" onClick={removeSessions}>
                Remove {removeCount > 1 ? `${removeCount} sessions` : "session"}
              </Button>
            </div>
          </>
        )}
      </Dialog>
    </>
  );
}
