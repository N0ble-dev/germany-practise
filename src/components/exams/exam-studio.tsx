"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  Check,
  Eye,
  Headphones,
  Mic,
  PenLine,
  RotateCcw,
  Volume2,
} from "lucide-react";
import { Button } from "../ui/button";
import { VoiceRecorder } from "../journey/voice-recorder";
import { speakGerman } from "@/lib/speech";
import {
  skillLabels,
  type ExamCode,
  type ExamSkill,
} from "@/lib/exams/definitions";
import type { ExamAnswer, PublicExamTask } from "@/lib/exams/model";
import type { evaluateTask } from "@/lib/exams/evaluation";
export type TaskFeedback = ReturnType<typeof evaluateTask>;
export const blankExamAnswer = (): ExamAnswer => ({
  text: "",
  fields: {},
  checks: [],
});
export async function examFetch<T>(
  url: string,
  options: RequestInit = {},
): Promise<T> {
  const response = await fetch(url, {
    ...options,
    headers: { "Content-Type": "application/json", ...options.headers },
    cache: "no-store",
  });
  const body = await response.json();
  if (!response.ok)
    throw new Error(
      body.error || "The exam action could not finish. Try again.",
    );
  return body as T;
}

export function ExamTaskEditor({
  task,
  answer,
  onChange,
  language,
  timed = false,
}: {
  task: PublicExamTask;
  answer: ExamAnswer;
  onChange: (answer: ExamAnswer) => void;
  language: "en" | "ar";
  timed?: boolean;
}) {
  const points = task.type === "choice" ? [] : task.contentPoints;
  const wordCount = answer.text.trim()
    ? answer.text.trim().split(/\s+/u).length
    : 0;
  return (
    <>
      <p className="arena-task-instructions" lang="de">
        {task.instructions.de}
      </p>
      {!timed && (
        <p
          className="arena-coaching-copy"
          lang={language}
          dir={language === "ar" ? "rtl" : undefined}
        >
          {task.instructions[language]}
        </p>
      )}
      {task.type === "choice" && (
        <>
          {task.passage && (
            <div className="arena-source-passage" lang="de">
              {task.passage}
            </div>
          )}
          <fieldset className="arena-answer-options">
            <legend className="sr-only">Your answer</legend>
            {task.options.map((option) => (
              <label
                key={option.id}
                className={answer.choice === option.id ? "selected" : ""}
              >
                <input
                  type="radio"
                  name={`answer-${task.id}`}
                  value={option.id}
                  checked={answer.choice === option.id}
                  onChange={() => onChange({ ...answer, choice: option.id })}
                />
                <span lang="de">{option.text}</span>
                {answer.choice === option.id && (
                  <Check size={17} aria-hidden="true" />
                )}
              </label>
            ))}
          </fieldset>
        </>
      )}
      {task.type === "writing" && (
        <>
          {!!task.formFields.length && (
            <div className="arena-writing-fields">
              {task.formFields.map((field) => (
                <label key={field.id} lang="de">
                  {field.label}
                  <input
                    lang="de"
                    autoComplete="off"
                    maxLength={160}
                    value={answer.fields[field.id] ?? ""}
                    onChange={(event) =>
                      onChange({
                        ...answer,
                        fields: {
                          ...answer.fields,
                          [field.id]: event.target.value,
                        },
                      })
                    }
                  />
                </label>
              ))}
            </div>
          )}
          {!task.formFields.length && (
            <label className="arena-writing-editor">
              Your message in German
              <textarea
                lang="de"
                rows={8}
                maxLength={12000}
                spellCheck={!timed}
                value={answer.text}
                onChange={(event) =>
                  onChange({ ...answer, text: event.target.value })
                }
                placeholder="Schreiben Sie hier…"
              />
              <span className="muted small">
                {wordCount} words · practice target about {task.targetWords}
              </span>
            </label>
          )}
        </>
      )}
      {task.type === "speaking" && (
        <>
          <div className="arena-oral-card">
            <span className="eyebrow">
              ORIGINAL REHEARSAL CARD · PART {task.part}
            </span>
            <p lang="de">{task.card}</p>
          </div>
          <p className="muted small">
            Rehearse aloud or record in this tab. Starting the recorder requests
            microphone access. Recordings are not uploaded or used for automated
            grading.
          </p>
          <VoiceRecorder key={task.id} seconds={60} />
          {!timed && (
            <label className="arena-writing-editor">
              Optional notes or a typed rehearsal
              <textarea
                lang="de"
                rows={3}
                maxLength={12000}
                value={answer.text}
                onChange={(event) =>
                  onChange({ ...answer, text: event.target.value })
                }
              />
            </label>
          )}
        </>
      )}
      {!!points.length && !timed && (
        <fieldset className="arena-self-review">
          <legend>My content-point self-check</legend>
          <p className="muted small">
            Check these yourself after reading or replaying your response. These
            are not teacher marks.
          </p>
          {points.map((point, index) => (
            <label key={index}>
              <input
                type="checkbox"
                checked={answer.checks.includes(index)}
                onChange={() =>
                  onChange({
                    ...answer,
                    checks: answer.checks.includes(index)
                      ? answer.checks.filter((item) => item !== index)
                      : [...answer.checks, index],
                  })
                }
              />
              <span lang={language} dir={language === "ar" ? "rtl" : undefined}>
                {point[language]}
              </span>
            </label>
          ))}
        </fieldset>
      )}
    </>
  );
}

export function ExamFeedback({
  result,
  language,
}: {
  result: TaskFeedback;
  language: "en" | "ar";
}) {
  return (
    <div className="arena-feedback" role="status">
      <span className="eyebrow">
        {result.kind === "objective"
          ? "UNDERSTAND THE CLUE"
          : "A REVIEW OF YOUR RESPONSE"}
      </span>
      {result.kind === "objective" ? (
        <>
          <h3>
            {result.correct
              ? "Your choice matches the example."
              : "Look at the detail that changes the answer."}
          </h3>
          <p lang={language} dir={language === "ar" ? "rtl" : undefined}>
            {result.explanation[language]}
          </p>
          <blockquote lang="de">{result.evidence}</blockquote>
        </>
      ) : (
        <>
          <h3>Keep meaning at the centre.</h3>
          {!!result.wordCount && <p>{result.wordCount} words in your draft.</p>}
          {!!result.completeFields && (
            <p>{result.completeFields} form fields filled in.</p>
          )}
          <p>
            {result.selfReviewedPoints} content points checked by you. A
            proficient speaker or teacher can check whether the intended meaning
            is clear.
          </p>
          <p className="muted small">
            No writing, speaking or pronunciation mark has been assigned.
          </p>
        </>
      )}
    </div>
  );
}

export function ExamStudio({
  skill,
  tasks,
  examCode,
}: {
  skill: ExamSkill;
  tasks: PublicExamTask[];
  examCode: ExamCode;
}) {
  const router = useRouter();
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, ExamAnswer>>({});
  const [language, setLanguage] = useState<"en" | "ar">("en");
  const [feedback, setFeedback] = useState<TaskFeedback | null>(null);
  const [script, setScript] = useState("");
  const [showScript, setShowScript] = useState(false);
  const [busy, setBusy] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [error, setError] = useState("");
  const [packs, setPacks] = useState<
    { id: string; title: string; version: number; skills: string[] }[] | null
  >(null);
  const [catalogError, setCatalogError] = useState("");
  const alive = useRef(true);
  const task = tasks[index];
  const answer = task
    ? (answers[task.id] ?? blankExamAnswer())
    : blankExamAnswer();
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
      if ("speechSynthesis" in window) window.speechSynthesis.cancel();
    };
  }, []);
  function choose(next: number) {
    if ("speechSynthesis" in window) window.speechSynthesis.cancel();
    setIndex(next);
    setFeedback(null);
    setScript("");
    setShowScript(false);
    setError("");
  }
  async function scriptText() {
    if (script) return script;
    const result = await examFetch<{ script: string }>("/api/exams/demo", {
      method: "POST",
      body: JSON.stringify({ taskId: task.id, action: "script" }),
    });
    if (alive.current) setScript(result.script);
    return result.script;
  }
  async function play(slow = false) {
    setPlaying(true);
    setError("");
    try {
      await speakGerman(await scriptText(), slow);
    } catch (cause) {
      if (alive.current) setError((cause as Error).message);
    } finally {
      if (alive.current) setPlaying(false);
    }
  }
  async function explain() {
    setBusy(true);
    setError("");
    try {
      const result = await examFetch<{ result: TaskFeedback }>(
        "/api/exams/demo",
        {
          method: "POST",
          body: JSON.stringify({ taskId: task.id, action: "explain", answer }),
        },
      );
      if (alive.current) setFeedback(result.result);
    } catch (cause) {
      if (alive.current) setError((cause as Error).message);
    } finally {
      if (alive.current) setBusy(false);
    }
  }
  async function findPacks() {
    setCatalogError("");
    try {
      const data = await examFetch<{ papers: NonNullable<typeof packs> }>(
        `/api/exams/catalog?examCode=${examCode}`,
      );
      if (alive.current)
        setPacks(data.papers.filter((paper) => paper.skills.includes(skill)));
    } catch (cause) {
      if (alive.current) setCatalogError((cause as Error).message);
    }
  }
  async function begin(id: string) {
    setBusy(true);
    setError("");
    try {
      const data = await examFetch<{ id: string }>("/api/exams/attempts", {
        method: "POST",
        body: JSON.stringify({
          paperVersionId: id,
          mode: "coach",
          skill,
          idempotencyKey: crypto.randomUUID(),
        }),
      });
      router.push(`/exams/attempts/${data.id}/take`);
    } catch (cause) {
      setError((cause as Error).message);
    } finally {
      if (alive.current) setBusy(false);
    }
  }
  const Icon = {
    listening: Headphones,
    reading: BookOpen,
    writing: PenLine,
    speaking: Mic,
  }[skill];
  return (
    <div className="exam-arena">
      <nav className="arena-top-links" aria-label="Skill studio navigation">
        <Link href="/exams">← Exam Arena</Link>
        <Link href={`/exams/${examCode}/guide`}>Understand the exam</Link>
        <Link href="/exams/resources">Resources library</Link>
      </nav>
      <header className="arena-studio-heading">
        <div>
          <span className="eyebrow">A1 ADULT · SKILL STUDIO</span>
          <h1>
            <Icon size={29} aria-hidden="true" />
            <span lang="de">{skillLabels[skill].de}</span>
            <span className="muted"> / {skillLabels[skill].en}</span>
          </h1>
          <p>Learn the controls and practise a small communication task.</p>
        </div>
        <label>
          Helpful explanations
          <select
            value={language}
            onChange={(event) => setLanguage(event.target.value as "en" | "ar")}
          >
            <option value="en">English</option>
            <option value="ar">العربية</option>
          </select>
        </label>
      </header>
      <div className="arena-demo-note">
        <span className="soft-badge">Format walkthrough</span>
        <p>
          Illustrative original examples, not a scored or teacher-reviewed exam.{" "}
          {skill === "listening"
            ? "Audio here uses your device’s German voice; reviewed drills use owned recordings."
            : "Your walkthrough responses stay in this tab."}
        </p>
      </div>
      {!task ? (
        <section className="panel">
          <h2>No walkthrough is available for this skill yet.</h2>
          <Link href="/exams/resources">Use the official models →</Link>
        </section>
      ) : (
        <div className="arena-studio-layout">
          <aside className="arena-task-list" aria-label="Walkthrough examples">
            {tasks.map((item, i) => (
              <button
                key={item.id}
                aria-current={index === i ? "step" : undefined}
                onClick={() => choose(i)}
                disabled={busy || playing}
              >
                <span>{String(i + 1).padStart(2, "0")}</span>
                <span>{item.title.en}</span>
                <ArrowRight size={15} aria-hidden="true" />
              </button>
            ))}
            <p className="muted small">
              You can move between examples. This walkthrough does not add exam
              scores or readiness evidence.
            </p>
          </aside>
          <section className="arena-task-panel panel">
            <div className="arena-task-heading">
              <span className="eyebrow">
                EXAMPLE {index + 1} OF {tasks.length}
              </span>
              <h2 lang="de">{task.title.de}</h2>
            </div>
            {skill === "listening" && (
              <div className="arena-audio-controls">
                <Button disabled={playing || busy} onClick={() => void play()}>
                  <Volume2 size={17} aria-hidden="true" />
                  {playing ? "Playing example…" : "Play example"}
                </Button>
                <Button
                  variant="outline"
                  disabled={playing || busy}
                  onClick={() => void play(true)}
                >
                  Play slowly
                </Button>
                <Button
                  variant="ghost"
                  disabled={busy}
                  onClick={async () => {
                    setBusy(true);
                    try {
                      await scriptText();
                      if (alive.current) setShowScript((value) => !value);
                    } catch (cause) {
                      setError((cause as Error).message);
                    } finally {
                      if (alive.current) setBusy(false);
                    }
                  }}
                >
                  <Eye size={16} aria-hidden="true" />
                  {showScript ? "Hide script" : "Show script"}
                </Button>
                {showScript && (
                  <p className="arena-source-passage" lang="de">
                    {script}
                  </p>
                )}
              </div>
            )}
            <ExamTaskEditor
              task={task}
              answer={answer}
              language={language}
              onChange={(next) => {
                setAnswers((current) => ({ ...current, [task.id]: next }));
                setFeedback(null);
              }}
            />
            <div className="arena-task-actions">
              <Button
                onClick={() => void explain()}
                disabled={busy || (task.type === "choice" && !answer.choice)}
              >
                {busy
                  ? "Opening explanation…"
                  : task.type === "choice"
                    ? "Check this example"
                    : "Review my response"}
                <ArrowRight size={16} aria-hidden="true" />
              </Button>
              <Button
                variant="ghost"
                onClick={() => {
                  setAnswers((current) => ({
                    ...current,
                    [task.id]: blankExamAnswer(),
                  }));
                  setFeedback(null);
                }}
                disabled={busy}
              >
                <RotateCcw size={16} aria-hidden="true" /> Try again
              </Button>
            </div>
            {error && (
              <p role="alert" className="form-error">
                {error}
              </p>
            )}
            {feedback && (
              <>
                <ExamFeedback result={feedback} language={language} />
                <div className="arena-feedback-next">
                  <span>
                    <BookOpen size={19} aria-hidden="true" /> Bring this skill
                    back to your learning journey.
                  </span>
                  <Link
                    href={`/lessons/${task.lesson}?step=${skill === "listening" ? "listen" : skill === "speaking" ? "speak" : "patterns"}`}
                  >
                    Practise lesson {task.lesson}{" "}
                    <ArrowRight size={15} aria-hidden="true" />
                  </Link>
                </div>
              </>
            )}
            <div className="arena-task-footer">
              <Button
                variant="outline"
                disabled={index === 0 || busy || playing}
                onClick={() => choose(index - 1)}
              >
                <ArrowLeft size={16} aria-hidden="true" /> Previous
              </Button>
              <Button
                variant="outline"
                disabled={index === tasks.length - 1 || busy || playing}
                onClick={() => choose(index + 1)}
              >
                Next example <ArrowRight size={16} aria-hidden="true" />
              </Button>
            </div>
          </section>
        </div>
      )}
      <section className="arena-reviewed-practice">
        <div>
          <span className="eyebrow">PRIVATE ATTEMPTS & FEEDBACK</span>
          <h2>Ready for reviewed practice?</h2>
          <p>
            Approved sets save your responses to your account and give you a
            report with targeted next steps.
          </p>
        </div>
        <Button variant="outline" onClick={() => void findPacks()}>
          Find reviewed practice
        </Button>
        {packs && !packs.length && (
          <p role="status" className="arena-reviewed-empty">
            Scored sets open after language, translation, rights and audio
            review. Use the walkthroughs and official models while those sets
            are being prepared.
          </p>
        )}
        {packs?.map((paper) => (
          <div className="arena-pack-row" key={paper.id}>
            <span>
              {paper.title} · version {paper.version}
            </span>
            <Button disabled={busy} onClick={() => void begin(paper.id)}>
              Start reviewed practice{" "}
              <ArrowRight size={16} aria-hidden="true" />
            </Button>
          </div>
        ))}
        {catalogError && <p role="alert">{catalogError}</p>}
        <Link
          className="arena-inline-source"
          href={`/signin?next=${encodeURIComponent(`/exams/${examCode}/practice/${skill}`)}`}
        >
          Continue with Google for private attempts →
        </Link>
      </section>
    </div>
  );
}
