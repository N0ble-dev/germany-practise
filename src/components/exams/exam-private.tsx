"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  BookOpen,
  Check,
  Clock3,
  Download,
  RotateCcw,
  Trash2,
} from "lucide-react";
import { z } from "zod";
import { useApp } from "../learning-app";
import { Button } from "../ui/button";
import { Dialog } from "../ui/dialog";
import {
  examAnswerSchema,
  type ExamAnswer,
  type PublicExamTask,
  type ExamPack,
} from "@/lib/exams/model";
import {
  examSkills,
  skillLabels,
  type ExamCode,
  type ExamSkill,
} from "@/lib/exams/definitions";
import type { ExamReport } from "@/lib/exams/evaluation";
import {
  blankExamAnswer,
  examFetch,
  ExamFeedback,
  ExamTaskEditor,
  type TaskFeedback,
} from "./exam-studio";
import { ExamCredits } from "./exam-credits";
type Attempt = {
  id: string;
  title: string;
  examCode: ExamCode;
  version: number;
  mode: string;
  status: string;
  revision: number;
  deadline: string | null;
  serverNow: string;
  interrupted: boolean;
  tasks: PublicExamTask[];
  answers: Record<string, ExamAnswer>;
  credits?: ExamPack["rights"];
};
type ReportPayload = {
  id: string;
  title: string;
  examCode: ExamCode;
  version: number;
  mode: string;
  interrupted: boolean;
  submittedAt: string;
  report: ExamReport;
  credits?: ExamPack["rights"];
};
export type ExamHistoryItem = {
  id: string;
  title: string;
  examCode: ExamCode;
  version: number;
  mode: string;
  skill: ExamSkill | null;
  status: string;
  startedAt: string;
  submittedAt: string | null;
  interrupted: boolean;
  skills: ExamReport["skills"] | null;
  mistakes: ExamReport["mistakes"] | null;
};
function downloadJson(name: string, value: unknown) {
  const url = URL.createObjectURL(
    new Blob([JSON.stringify(value, null, 2)], { type: "application/json" }),
  );
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = name;
  anchor.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
function ExamAccountPrompt({ next }: { next: string }) {
  return (
    <section className="panel arena-account-prompt">
      <h2>Your exam practice is private.</h2>
      <p>
        Continue with Google to save attempts, open your reports, and return to
        your own preparation plan.
      </p>
      <Button asChild>
        <Link href={`/signin?next=${encodeURIComponent(next)}`}>
          Continue with Google <ArrowRight size={16} aria-hidden="true" />
        </Link>
      </Button>
      <Link href="/exams">Explore the exam guides →</Link>
    </section>
  );
}

export function PrivateExamAttempt({ attemptId }: { attemptId: string }) {
  const { identity, state } = useApp(),
    router = useRouter();
  const accountId = identity?.id;
  const [attempt, setAttempt] = useState<Attempt | null>(null);
  const [answers, setAnswers] = useState<Record<string, ExamAnswer>>({});
  const [index, setIndex] = useState(0);
  const [language, setLanguage] = useState<"en" | "ar">(state.language);
  const [error, setError] = useState("");
  const [saveStatus, setSaveStatus] = useState("Loading saved answers…");
  const [remaining, setRemaining] = useState<number | null>(null);
  const [feedback, setFeedback] = useState<TaskFeedback | null>(null);
  const [submitOpen, setSubmitOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [checking, setChecking] = useState(false);
  const [recovery, setRecovery] = useState<Record<string, ExamAnswer> | null>(
    null,
  );
  const revision = useRef(0),
    dirty = useRef<Record<string, ExamAnswer>>({}),
    answerRef = useRef<Record<string, ExamAnswer>>({});
  const saving = useRef(false),
    alive = useRef(true),
    timer = useRef<ReturnType<typeof setTimeout> | null>(null),
    operation = useRef<AbortController | null>(null);
  const cacheKey = `deutsch-exam-draft:v1:${accountId}:${attemptId}`;
  const flush = useCallback(async () => {
    if (!accountId || saving.current || !alive.current) return false;
    saving.current = true;
    setSaveStatus("Saving answers…");
    setError("");
    try {
      while (Object.keys(dirty.current).length && alive.current) {
        const taskId = Object.keys(dirty.current)[0],
          answer = dirty.current[taskId];
        const data = await examFetch<{ revision: number }>(
          `/api/exams/attempts/${attemptId}/answer`,
          {
            method: "PATCH",
            headers: { "X-Learning-Account": accountId },
            signal: operation.current?.signal,
            body: JSON.stringify({
              taskId,
              answer,
              revision: revision.current,
            }),
          },
        );
        if (!alive.current) return false;
        revision.current = data.revision;
        if (dirty.current[taskId] === answer) delete dirty.current[taskId];
      }
      if (!alive.current) return false;
      setSaveStatus("All answers saved");
      try {
        localStorage.removeItem(cacheKey);
      } catch {
        /* The server copy is the durable source. */
      }
      return true;
    } catch (cause) {
      if (alive.current) {
        setSaveStatus("Answers not saved");
        setError(
          (cause as Error).message +
            " Your current text is still visible. Retry saving or export this draft before leaving.",
        );
      }
      return false;
    } finally {
      saving.current = false;
    }
  }, [accountId, attemptId, cacheKey]);
  useEffect(() => {
    alive.current = true;
    if (!accountId) return;
    const controller = new AbortController();
    operation.current = controller;
    examFetch<Attempt>(`/api/exams/attempts/${attemptId}`, {
      headers: { "X-Learning-Account": accountId },
      signal: controller.signal,
    })
      .then((loaded) => {
        if (controller.signal.aborted) return;
        setAttempt(loaded);
        setAnswers(loaded.answers);
        answerRef.current = loaded.answers;
        revision.current = loaded.revision;
        setSaveStatus("All answers saved");
        try {
          const raw = localStorage.getItem(cacheKey);
          if (raw && loaded.status !== "submitted") {
            const parsed = z
              .record(z.string(), examAnswerSchema)
              .safeParse(JSON.parse(raw));
            if (parsed.success) {
              const valid = Object.fromEntries(
                Object.entries(parsed.data).filter(([id]) =>
                  loaded.tasks.some((task) => task.id === id),
                ),
              );
              if (JSON.stringify(valid) !== JSON.stringify(loaded.answers))
                setRecovery(valid);
            }
          }
        } catch {
          setError(
            "A browser draft could not be read. Your server-saved answers are shown.",
          );
        }
        if (loaded.deadline) {
          const end = new Date(loaded.deadline).getTime(),
            clock = new Date(loaded.serverNow).getTime(),
            began = performance.now();
          setRemaining(Math.max(0, Math.ceil((end - clock) / 1000)));
          timer.current = setInterval(
            () =>
              setRemaining(
                Math.max(
                  0,
                  Math.ceil((end - clock - (performance.now() - began)) / 1000),
                ),
              ),
            500,
          );
          try {
            const visitKey = `exam-visit:${accountId}:${attemptId}`;
            const resumed =
              !!sessionStorage.getItem(visitKey) ||
              Object.keys(loaded.answers).length > 0;
            sessionStorage.setItem(visitKey, "1");
            if (resumed && loaded.status !== "submitted")
              void examFetch(`/api/exams/attempts/${attemptId}/interrupt`, {
                method: "POST",
                headers: { "X-Learning-Account": accountId },
                signal: controller.signal,
              }).catch(() => {
                /* Saving failures give an explicit recovery path. */
              });
          } catch {
            /* The server deadline remains authoritative if browser storage is unavailable. */
          }
        }
      })
      .catch((cause) => {
        if (!controller.signal.aborted) setError((cause as Error).message);
      });
    return () => {
      alive.current = false;
      controller.abort();
      if (timer.current) clearInterval(timer.current);
    };
  }, [accountId, attemptId, cacheKey]);
  function change(taskId: string, value: ExamAnswer) {
    setAnswers((current) => ({ ...current, [taskId]: value }));
    answerRef.current = { ...answerRef.current, [taskId]: value };
    dirty.current[taskId] = value;
    setFeedback(null);
    setSaveStatus("Unsaved changes");
    try {
      localStorage.setItem(cacheKey, JSON.stringify(answerRef.current));
    } catch {
      setError(
        "This browser could not keep a recovery draft. Export your draft if saving fails.",
      );
    }
  }
  useEffect(() => {
    if (saveStatus !== "Unsaved changes") return;
    const id = setTimeout(() => {
      void flush();
    }, 600);
    return () => clearTimeout(id);
  }, [saveStatus, answers, flush]);
  const task = attempt?.tasks[index],
    answer = task ? (answers[task.id] ?? blankExamAnswer()) : blankExamAnswer();
  const locked =
    attempt?.status === "submitted" || remaining === 0 || submitting;
  async function submit() {
    if (!accountId || !attempt) return;
    setSubmitting(true);
    setError("");
    try {
      if (
        remaining !== 0 &&
        Object.keys(dirty.current).length &&
        !(await flush())
      ) {
        setSubmitting(false);
        return;
      }
      const result = await examFetch<{ id: string }>(
        `/api/exams/attempts/${attemptId}/submit`,
        {
          method: "POST",
          headers: { "X-Learning-Account": accountId },
          signal: operation.current?.signal,
          body: JSON.stringify({ revision: revision.current }),
        },
      );
      router.push(`/exams/attempts/${result.id}/report`);
    } catch (cause) {
      if (alive.current) {
        setError((cause as Error).message);
        setSubmitting(false);
      }
    }
  }
  if (!identity)
    return <ExamAccountPrompt next={`/exams/attempts/${attemptId}/take`} />;
  return (
    <div className="exam-arena">
      <nav className="arena-top-links" aria-label="Private attempt navigation">
        <Link href="/exams">← Exam Arena</Link>
        <Link href="/exams/mistakes">My results</Link>
      </nav>
      <header className="arena-studio-heading">
        <div>
          <span className="eyebrow">
            PRIVATE ORIGINAL PRACTICE{" "}
            {attempt?.mode === "preview" && "· STAFF DRAFT PREVIEW"}
          </span>
          <h1>{attempt?.title || "Opening your practice…"}</h1>
          <p>
            {attempt?.mode === "timed_section"
              ? "Timed section practice. The server enforces the deadline; this short set is not a full Goethe mock."
              : "Your own responses, saved to your account. Objective feedback is practice accuracy; open responses need human review."}
          </p>
        </div>
        <span className="soft-badge" role="status">
          {saveStatus}
        </span>
      </header>
      {remaining !== null && (
        <div className="arena-timer" role="timer">
          <Clock3 size={20} aria-hidden="true" />
          <strong>
            {Math.floor(remaining / 60)}:
            {String(remaining % 60).padStart(2, "0")}
          </strong>
          <span>
            {remaining
              ? "Time remaining · server deadline"
              : "Time ended. Submit your saved work to see the report."}
          </span>
        </div>
      )}
      <ExamCredits credits={attempt?.credits} />
      {attempt?.status === "submitted" && (
        <div className="arena-demo-note">
          <p>This attempt is submitted. Its responses are locked.</p>
          <Button asChild>
            <Link href={`/exams/attempts/${attemptId}/report`}>
              Open my report
            </Link>
          </Button>
        </div>
      )}
      {recovery && (
        <section className="arena-recovery">
          <h2>A browser draft is available.</h2>
          <p>
            Your saved server version is shown. Restore the browser text only if
            you want to use that version.
          </p>
          <div className="button-row">
            <Button
              onClick={() => {
                for (const [id, value] of Object.entries(recovery))
                  change(id, value);
                setRecovery(null);
              }}
            >
              Restore browser draft
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                setRecovery(null);
                try {
                  localStorage.removeItem(cacheKey);
                } catch {}
              }}
            >
              Use saved answers
            </Button>
            <Button
              variant="ghost"
              onClick={() =>
                downloadJson(`exam-draft-${attemptId}.json`, recovery)
              }
            >
              Export browser draft
            </Button>
          </div>
        </section>
      )}
      {task && (
        <div className="arena-studio-layout">
          <aside className="arena-task-list" aria-label="Exam practice tasks">
            {attempt.tasks.map((item, i) => (
              <button
                key={item.id}
                aria-current={i === index ? "step" : undefined}
                disabled={checking}
                onClick={() => {
                  setIndex(i);
                  setFeedback(null);
                }}
              >
                <span>{i + 1}</span>
                <span>{item.title.en}</span>
              </button>
            ))}
          </aside>
          <section className="panel arena-task-panel">
            <div className="arena-task-heading">
              <span className="eyebrow">
                TASK {index + 1} OF {attempt.tasks.length}
              </span>
              <h2 lang="de">{task.title.de}</h2>
            </div>
            {!locked ? (
              <>
                <label className="arena-help-language">
                  Helpful explanations
                  <select
                    disabled={attempt.mode === "timed_section"}
                    value={language}
                    onChange={(event) =>
                      setLanguage(event.target.value as "en" | "ar")
                    }
                  >
                    <option value="en">English</option>
                    <option value="ar">العربية</option>
                  </select>
                </label>
                {task.type === "choice" &&
                  task.skill === "listening" &&
                  (task.audioId ? (
                    <audio
                      key={task.id}
                      controls
                      src={`/api/exams/attempts/${attemptId}/audio?taskId=${encodeURIComponent(task.id)}`}
                      aria-label="Play the original task recording"
                    />
                  ) : (
                    <p className="arena-demo-note">
                      This staff preview has no reviewed recording yet. Use the
                      public walkthrough to test listening controls.
                    </p>
                  ))}
                <fieldset disabled={checking}>
                  <ExamTaskEditor
                    key={task.id}
                    task={task}
                    answer={answer}
                    onChange={(value) => change(task.id, value)}
                    language={language}
                    timed={attempt.mode === "timed_section"}
                  />
                </fieldset>
                {attempt.mode !== "timed_section" && (
                  <Button
                    variant="outline"
                    disabled={checking}
                    onClick={async () => {
                      if (!(await flush())) return;
                      setChecking(true);
                      try {
                        const data = await examFetch<{ result: TaskFeedback }>(
                          `/api/exams/attempts/${attemptId}/check`,
                          {
                            method: "POST",
                            headers: { "X-Learning-Account": accountId! },
                            body: JSON.stringify({ taskId: task.id }),
                          },
                        );
                        if (alive.current) setFeedback(data.result);
                      } catch (cause) {
                        setError((cause as Error).message);
                      } finally {
                        if (alive.current) setChecking(false);
                      }
                    }}
                  >
                    {checking ? "Opening feedback…" : "Understand my response"}
                  </Button>
                )}
              </>
            ) : (
              <p className="arena-demo-note">
                Your saved responses will be included in the report. Editing is
                closed for this attempt.
              </p>
            )}
            {feedback && <ExamFeedback result={feedback} language={language} />}
            <div className="arena-task-footer">
              <Button
                variant="ghost"
                onClick={() =>
                  downloadJson(
                    `exam-draft-${attemptId}.json`,
                    answerRef.current,
                  )
                }
              >
                <Download size={16} aria-hidden="true" /> Export current draft
              </Button>
              <Button
                disabled={
                  submitting ||
                  checking ||
                  saveStatus === "Saving answers…" ||
                  attempt.status === "submitted"
                }
                onClick={() => setSubmitOpen(true)}
              >
                {submitting ? "Submitting…" : "Submit my practice"}
                <Check size={16} aria-hidden="true" />
              </Button>
            </div>
          </section>
        </div>
      )}
      {error && (
        <div className="arena-error" role="alert">
          <p>{error}</p>
          {task && !locked && (
            <Button variant="outline" onClick={() => void flush()}>
              <RotateCcw size={16} aria-hidden="true" /> Retry saving
            </Button>
          )}
        </div>
      )}
      <Dialog
        open={submitOpen}
        onOpenChange={setSubmitOpen}
        title="Submit this practice?"
        description="Submission locks these responses and opens your private report. Unanswered objective items remain unanswered; writing and speaking do not receive an automatic exam mark."
      >
        <div className="button-row">
          <Button variant="outline" onClick={() => setSubmitOpen(false)}>
            Keep practising
          </Button>
          <Button
            disabled={submitting}
            onClick={() => {
              setSubmitOpen(false);
              void submit();
            }}
          >
            Submit & open report
          </Button>
        </div>
      </Dialog>
    </div>
  );
}

export function PrivateExamReport({ attemptId }: { attemptId: string }) {
  const { identity, state } = useApp();
  const [data, setData] = useState<ReportPayload | null>(null),
    [error, setError] = useState("");
  const accountId = identity?.id;
  useEffect(() => {
    if (!accountId) return;
    const controller = new AbortController();
    examFetch<ReportPayload>(`/api/exams/attempts/${attemptId}/report`, {
      headers: { "X-Learning-Account": accountId },
      signal: controller.signal,
    })
      .then(setData)
      .catch((cause) => {
        if (!controller.signal.aborted) setError((cause as Error).message);
      });
    return () => controller.abort();
  }, [accountId, attemptId]);
  if (!identity)
    return <ExamAccountPrompt next={`/exams/attempts/${attemptId}/report`} />;
  return (
    <div className="exam-arena">
      <nav className="arena-top-links" aria-label="Report navigation">
        <Link href="/exams">← Exam Arena</Link>
        <Link href="/exams/mistakes">Results & mistake lab</Link>
        <Link href="/exams/plan">My exam plan</Link>
      </nav>
      <header className="arena-studio-heading">
        <div>
          <span className="eyebrow">YOUR PRIVATE PRACTICE REPORT</span>
          <h1>Make the next attempt more useful.</h1>
          <p>
            {data?.title} {data && `· version ${data.version}`}
          </p>
        </div>
        {data && (
          <Button
            variant="outline"
            onClick={() => downloadJson(`exam-report-${attemptId}.json`, data)}
          >
            <Download size={16} aria-hidden="true" /> Export my report
          </Button>
        )}
      </header>
      {data ? (
        <>
          <ExamCredits credits={data.credits} />
          <div className="arena-demo-note">
            <p>{data.report.note}</p>
            {data.mode === "preview" && (
              <p>
                Staff draft preview: these results are excluded from learner
                readiness evidence.
              </p>
            )}
            {data.interrupted && (
              <p>
                This timed attempt was resumed or interrupted. Its conditions
                were not equivalent to an uninterrupted session.
              </p>
            )}
          </div>
          <div className="arena-skill-cards">
            {data.report.skills.map((skill) => (
              <article
                className={`arena-skill arena-skill-${skill.skill}`}
                key={skill.skill}
              >
                <h2 lang="de">{skillLabels[skill.skill].de}</h2>
                <p>
                  {skill.objectiveTotal
                    ? `${skill.correct}/${skill.objectiveTotal} objective items correct`
                    : `${skill.answered}/${skill.total} responses saved`}
                </p>
                <p className="muted small">
                  {skill.reviewPending
                    ? `${skill.reviewPending} open responses need a human check.`
                    : "Raw practice evidence; no official score assigned."}
                </p>
              </article>
            ))}
          </div>
          <section className="arena-report-items">
            {data.report.items.map((item) => (
              <article className="panel" key={item.id}>
                <span className="eyebrow">
                  {skillLabels[item.skill].en} ·{" "}
                  {item.objective.replaceAll("_", " ")}
                </span>
                <h2 lang="de">{item.title.de}</h2>
                <ExamFeedback result={item.result} language={state.language} />
                <div className="arena-feedback-next">
                  <span>
                    <BookOpen size={18} aria-hidden="true" /> Use the next
                    attempt to practise this skill.
                  </span>
                  <Link
                    href={`/lessons/${item.lesson}?step=${item.skill === "listening" ? "listen" : item.skill === "speaking" ? "speak" : "patterns"}`}
                  >
                    Understand lesson {item.lesson}
                    <ArrowRight size={15} aria-hidden="true" />
                  </Link>
                  <Link href={`/exams/${data.examCode}/practice/${item.skill}`}>
                    Try this skill again
                    <ArrowRight size={15} aria-hidden="true" />
                  </Link>
                </div>
              </article>
            ))}
          </section>
        </>
      ) : (
        <p role="status">{error || "Loading your private report…"}</p>
      )}
      {error && data && <p role="alert">{error}</p>}
    </div>
  );
}

export function ExamMistakeLab() {
  const { identity } = useApp();
  const [attempts, setAttempts] = useState<ExamHistoryItem[]>([]),
    [loading, setLoading] = useState(!!identity),
    [error, setError] = useState("");
  const [remove, setRemove] = useState<ExamHistoryItem | null>(null),
    [busy, setBusy] = useState(false);
  const accountId = identity?.id;
  useEffect(() => {
    if (!accountId) return;
    const controller = new AbortController();
    examFetch<{ attempts: ExamHistoryItem[] }>("/api/exams/attempts", {
      headers: { "X-Learning-Account": accountId },
      signal: controller.signal,
    })
      .then((data) => setAttempts(data.attempts))
      .catch((cause) => {
        if (!controller.signal.aborted) setError((cause as Error).message);
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [accountId]);
  if (!identity) return <ExamAccountPrompt next="/exams/mistakes" />;
  const evidence = attempts.filter(
    (attempt) => attempt.status === "submitted" && attempt.mode !== "preview",
  );
  const mistakes = evidence.flatMap((attempt) =>
    (attempt.mistakes ?? []).map((mistake) => ({
      ...mistake,
      attemptId: attempt.id,
    })),
  );
  return (
    <div className="exam-arena">
      <nav className="arena-top-links" aria-label="Mistake lab navigation">
        <Link href="/exams">← Exam Arena</Link>
        <Link href="/exams/plan">Plan my next week</Link>
      </nav>
      <header className="arena-guide-heading">
        <span className="eyebrow">RESULTS & MISTAKE LAB</span>
        <h1>
          A difficult question.
          <br />A useful next step.
        </h1>
        <p>
          Your latest 30 attempts, with concrete evidence and a route back to
          learning. These indicators do not predict a Goethe pass.
        </p>
      </header>
      {loading && <p role="status">Loading your private practice…</p>}
      {error && (
        <p role="alert" className="form-error">
          {error}
        </p>
      )}
      <div className="arena-skill-cards">
        {examSkills.map((skill) => {
          const observations = evidence.flatMap((attempt) =>
            (attempt.skills ?? []).filter((row) => row.skill === skill),
          );
          const correct = observations.reduce(
              (sum, row) => sum + row.correct,
              0,
            ),
            total = observations.reduce(
              (sum, row) => sum + row.objectiveTotal,
              0,
            ),
            open = observations.reduce(
              (sum, row) => sum + row.reviewPending,
              0,
            );
          return (
            <article className={`arena-skill arena-skill-${skill}`} key={skill}>
              <h2 lang="de">{skillLabels[skill].de}</h2>
              <p>
                {total
                  ? `${correct}/${total} items correct`
                  : open
                    ? `${open} open responses saved`
                    : "No submitted evidence yet"}
              </p>
              <span className="muted small">
                {open
                  ? "No human assessment recorded."
                  : "Practice evidence from recent attempts."}
              </span>
            </article>
          );
        })}
      </div>
      {!loading && !attempts.length && (
        <section className="arena-empty-state">
          <h2>Your practice story starts here.</h2>
          <p>
            Explore the A1 format walkthroughs now. Submitted reviewed practice
            will appear here when those sets are available.
          </p>
          <Button asChild>
            <Link href="/exams/goethe-a1-sd1-adult/practice/reading">
              Explore reading <ArrowRight size={16} aria-hidden="true" />
            </Link>
          </Button>
        </section>
      )}
      {!!mistakes.length && (
        <section className="arena-mistake-list">
          <h2>Understand → practise → retry</h2>
          {mistakes.slice(0, 12).map((mistake, i) => (
            <article
              className="arena-next-card"
              key={`${mistake.attemptId}-${mistake.taskId}-${i}`}
            >
              <span className="eyebrow">{skillLabels[mistake.skill].en}</span>
              <h3>{mistake.objective.replaceAll("_", " ")}</h3>
              <div className="arena-hint-actions">
                <Link href={`/exams/attempts/${mistake.attemptId}/report`}>
                  Understand the feedback
                </Link>
                <Link href={mistake.href}>
                  Practise lesson {mistake.lesson}
                </Link>
              </div>
            </article>
          ))}
        </section>
      )}
      <section className="arena-attempt-history">
        <h2>Recent private attempts</h2>
        {attempts.map((attempt) => (
          <article key={attempt.id}>
            <div>
              <h3>{attempt.title}</h3>
              <p>
                {new Date(attempt.startedAt).toLocaleDateString("en", {
                  dateStyle: "medium",
                })}{" "}
                · version {attempt.version} ·{" "}
                {attempt.mode === "preview"
                  ? "staff preview"
                  : attempt.mode.replaceAll("_", " ")}
                {attempt.interrupted && " · interrupted"}
              </p>
            </div>
            <Link
              href={`/exams/attempts/${attempt.id}/${attempt.status === "submitted" ? "report" : "take"}`}
            >
              {attempt.status === "submitted"
                ? "Open report"
                : "Continue practice"}
              <ArrowRight size={15} aria-hidden="true" />
            </Link>
            <Button
              size="icon"
              variant="ghost"
              aria-label={`Delete private attempt ${attempt.title}`}
              onClick={() => setRemove(attempt)}
            >
              <Trash2 size={17} aria-hidden="true" />
            </Button>
          </article>
        ))}
      </section>
      <Dialog
        open={!!remove}
        onOpenChange={(open) => {
          if (!open) setRemove(null);
        }}
        title="Delete this private attempt?"
        description="This removes your responses and report. It does not change the shared paper or any of your book progress."
      >
        <div className="button-row">
          <Button variant="outline" onClick={() => setRemove(null)}>
            Keep attempt
          </Button>
          <Button
            variant="destructive"
            disabled={busy}
            onClick={async () => {
              if (!remove || !accountId) return;
              setBusy(true);
              try {
                await examFetch(`/api/exams/attempts/${remove.id}`, {
                  method: "DELETE",
                  headers: { "X-Learning-Account": accountId },
                });
                setAttempts((current) =>
                  current.filter((attempt) => attempt.id !== remove.id),
                );
                setRemove(null);
              } catch (cause) {
                setError((cause as Error).message);
              } finally {
                setBusy(false);
              }
            }}
          >
            Delete my attempt
          </Button>
        </div>
      </Dialog>
    </div>
  );
}
