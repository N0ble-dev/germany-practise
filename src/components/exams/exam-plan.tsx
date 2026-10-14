"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, CalendarDays, Check, Clock3 } from "lucide-react";
import { useApp } from "../learning-app";
import { Button } from "../ui/button";
import { examDefinitions, skillLabels } from "@/lib/exams/definitions";
import { examGoalSchema, type ExamGoal } from "@/lib/exams/model";
import { examWeek } from "@/lib/exams/calendar";
import { dayInZone, timeInZone } from "@/lib/planner-calendar";
import { type StudySession } from "@/lib/planner-model";
import { updateState } from "@/lib/store";
import { examFetch } from "./exam-studio";
export function ExamPlan() {
  const { state, identity, notify } = useApp();
  const [draft, setDraft] = useState<ExamGoal>(() => ({
    examCode: "goethe-a1-sd1-adult",
    date: null,
    bookingConfirmed: false,
    dailyMinutes: state.goal,
    timeZone:
      state.planner.timeZone ||
      Intl.DateTimeFormat().resolvedOptions().timeZone,
    language: state.language,
  }));
  const [startDate, setStartDate] = useState(() => {
    const date = new Date();
    date.setDate(date.getDate() + 1);
    return dayInZone(
      date.toISOString(),
      state.planner.timeZone ||
        Intl.DateTimeFormat().resolvedOptions().timeZone,
    );
  });
  const [startTime, setStartTime] = useState("19:00");
  const [preview, setPreview] = useState<StudySession[]>([]);
  const [previewKey, setPreviewKey] = useState("");
  const [addedKey, setAddedKey] = useState("");
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(!!identity);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");
  const key = JSON.stringify({ draft, startDate, startTime });
  const currentPreview = previewKey === key ? preview : [];
  const accountId = identity?.id;
  useEffect(() => {
    if (!accountId) return;
    const controller = new AbortController();
    examFetch<{ goal: ExamGoal | null }>("/api/exams/goal", {
      headers: { "X-Learning-Account": accountId },
      signal: controller.signal,
    })
      .then(({ goal }) => {
        if (goal) {
          setDraft(examGoalSchema.parse(goal));
          setSaved(true);
        }
      })
      .catch((cause) => {
        if (!controller.signal.aborted) setError((cause as Error).message);
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [accountId]);
  const change = (next: ExamGoal) => {
    setDraft(next);
    setSaved(false);
  };
  async function saveGoal() {
    if (!accountId) return;
    setSaving(true);
    setError("");
    try {
      await examFetch("/api/exams/goal", {
        method: "PUT",
        headers: { "X-Learning-Account": accountId },
        body: JSON.stringify(examGoalSchema.parse(draft)),
      });
      setSaved(true);
      notify("Your exam target and preparation pace are saved.");
    } catch (cause) {
      setError((cause as Error).message);
    } finally {
      setSaving(false);
    }
  }
  function prepare() {
    setError("");
    try {
      const goal = examGoalSchema.parse(draft);
      setPreview(examWeek(goal, startDate, startTime));
      setPreviewKey(key);
    } catch (cause) {
      setError(
        cause instanceof Error && "issues" in cause
          ? "Check your exam date, booking status, pace and time zone."
          : (cause as Error).message,
      );
    }
  }
  function addToCalendar() {
    if (!currentPreview.length) return;
    const newSessions = currentPreview.filter(
      (session) =>
        !state.planner.sessions.some(
          (existing) =>
            existing.kind === "exam" &&
            existing.startsAt === session.startsAt &&
            existing.examCode === session.examCode &&
            existing.examSkill === session.examSkill,
        ),
    );
    if (state.planner.sessions.length + newSessions.length > 500) {
      setError(
        "Your planner is full. Remove or archive sessions before adding this week.",
      );
      return;
    }
    updateState((s) => ({
      ...s,
      planner: {
        ...s.planner,
        timeZone: draft.timeZone,
        sessions: [...s.planner.sessions, ...newSessions],
      },
    }));
    setAddedKey(key);
    notify(
      newSessions.length
        ? `${newSessions.length} exam sessions added to your planner. You can edit them or connect your calendar there.`
        : "These exam sessions are already in your planner.",
    );
  }
  return (
    <div className="exam-arena">
      <nav className="arena-top-links" aria-label="Exam plan navigation">
        <Link href="/exams">← Exam Arena</Link>
        <Link href="/planner">My study calendar</Link>
        <Link href="/exams/mistakes">Results & mistake lab</Link>
      </nav>
      <header className="arena-guide-heading">
        <span className="eyebrow">EXAM PLAN · AT YOUR PACE</span>
        <h1>
          A date to work towards.
          <br />A week you can actually follow.
        </h1>
        <p>
          Balance the four skills, leave room to review, and add sessions only
          after you have checked the plan.
        </p>
      </header>
      {!identity && (
        <div className="arena-demo-note">
          <p>
            You can preview a plan and keep sessions in this browser as a guest.
            Continue with Google to save your exam target privately to your
            account.
          </p>
          <Button asChild variant="outline">
            <Link href="/signin?next=%2Fexams%2Fplan">
              Continue with Google
            </Link>
          </Button>
        </div>
      )}
      <div className="arena-plan-layout">
        <section className="panel">
          <h2>My target exam</h2>
          {loading && (
            <p role="status" className="muted">
              Loading your saved target…
            </p>
          )}
          <form
            className="arena-goal-form"
            onSubmit={(event) => {
              event.preventDefault();
              void saveGoal();
            }}
          >
            <label>
              Adult Goethe exam
              <select
                value={draft.examCode}
                disabled={loading || saving}
                onChange={(event) =>
                  change({
                    ...draft,
                    examCode: event.target.value as ExamGoal["examCode"],
                  })
                }
              >
                {examDefinitions.map((definition) => (
                  <option value={definition.code} key={definition.code}>
                    {definition.title}
                  </option>
                ))}
              </select>
            </label>
            <label>
              My exam date (optional)
              <input
                type="date"
                value={draft.date ?? ""}
                onChange={(event) =>
                  change({
                    ...draft,
                    date: event.target.value || null,
                    bookingConfirmed: event.target.value
                      ? draft.bookingConfirmed
                      : false,
                  })
                }
              />
            </label>
            <label className="arena-inline-check">
              <input
                type="checkbox"
                checked={draft.bookingConfirmed}
                disabled={!draft.date}
                onChange={(event) =>
                  change({ ...draft, bookingConfirmed: event.target.checked })
                }
              />
              <span>I have confirmed this booking with my exam centre.</span>
            </label>
            <p className="muted small">
              {draft.date
                ? draft.bookingConfirmed
                  ? "Booking marked confirmed by you. Check the centre's confirmation for the final details."
                  : "This is a planned date, not a booking made by Deutsch Journey."
                : "No date needed. You can start building a steady routine."}
            </p>
            <div className="arena-writing-fields">
              <label>
                Daily practice (minutes)
                <input
                  type="number"
                  min={5}
                  max={120}
                  required
                  value={draft.dailyMinutes}
                  onChange={(event) =>
                    change({
                      ...draft,
                      dailyMinutes: Number(event.target.value),
                    })
                  }
                />
              </label>
              <label>
                Helpful explanations
                <select
                  value={draft.language}
                  onChange={(event) =>
                    change({
                      ...draft,
                      language: event.target.value as "en" | "ar",
                    })
                  }
                >
                  <option value="en">English</option>
                  <option value="ar">العربية</option>
                </select>
              </label>
            </div>
            <label>
              Planning time zone
              <input
                maxLength={80}
                value={draft.timeZone}
                onChange={(event) =>
                  change({ ...draft, timeZone: event.target.value })
                }
              />
            </label>
            <Button
              type="submit"
              disabled={!identity || loading || saving || saved}
            >
              {saving
                ? "Saving target…"
                : saved
                  ? "Target saved"
                  : "Save my exam target"}
              {saved && <Check size={16} aria-hidden="true" />}
            </Button>
          </form>
        </section>
        <section className="arena-next-card">
          <span className="eyebrow">A BALANCED NEXT SEVEN DAYS</span>
          <h2>Preview your practice week.</h2>
          <p>
            Rotate listening, reading, writing and speaking. This is a study
            rhythm, not a forecast of passing.
          </p>
          <div className="arena-writing-fields">
            <label>
              First practice day
              <input
                type="date"
                value={startDate}
                onChange={(event) => setStartDate(event.target.value)}
              />
            </label>
            <label>
              Daily start time
              <input
                type="time"
                value={startTime}
                onChange={(event) => setStartTime(event.target.value)}
              />
            </label>
          </div>
          <Button variant="outline" onClick={prepare}>
            <CalendarDays size={17} aria-hidden="true" /> Preview my week
          </Button>
          {!!currentPreview.length && (
            <>
              <ol className="arena-plan-preview">
                {currentPreview.map((session) => (
                  <li key={session.id}>
                    <span>
                      <CalendarDays size={17} aria-hidden="true" />
                      {dayInZone(session.startsAt, session.timeZone)} ·{" "}
                      {timeInZone(session.startsAt, session.timeZone)}
                    </span>
                    <strong>{session.title}</strong>
                    <small>
                      <Clock3 size={13} aria-hidden="true" />
                      {session.duration} min ·{" "}
                      {skillLabels[session.examSkill!].en}
                    </small>
                  </li>
                ))}
              </ol>
              <Button onClick={addToCalendar} disabled={addedKey === key}>
                {addedKey === key
                  ? "Sessions added"
                  : "Add these sessions to my planner"}
                <ArrowRight size={16} aria-hidden="true" />
              </Button>
              <p className="muted small">
                Calendar reminders use the planner's existing export or explicit
                Google Calendar connection. Adding sessions here does not
                connect or sync an external calendar.
              </p>
              <Link className="arena-inline-source" href="/planner">
                Edit sessions & connect my calendar →
              </Link>
            </>
          )}
        </section>
      </div>
      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}
      <section className="arena-course-note">
        <BookNote />
        <p>
          Keep learning the full level alongside exam tactics. Your current A1.1
          companion builds foundations; a preparation calendar alone does not
          show that you have completed A1 or another CEFR level.
        </p>
      </section>
    </div>
  );
}
function BookNote() {
  return <CalendarDays size={21} aria-hidden="true" />;
}
