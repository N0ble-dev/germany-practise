"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import {
  BookOpen,
  Check,
  ChevronRight,
  Volume2,
  ArrowRight,
} from "lucide-react";
import { useApp } from "./learning-app";
import { Button } from "./ui/button";
import { lessons } from "@/lib/content";
import { recordActivity, updateState } from "@/lib/store";
import { speakGerman } from "@/lib/speech";
export function Lessons() {
  const { state, notify } = useApp();
  const grammar = usePathname() === "/grammar";
  const params = useSearchParams();
  const requested = Number(params.get("lesson"));
  const validRequested =
    Number.isInteger(requested) && requested >= 1 && requested <= 12;
  const [selected, setSelected] = useState(
    validRequested ? requested : state.currentLesson,
  );
  const [answer, setAnswer] = useState<number | null>(null);
  useEffect(() => {
    if (validRequested)
      queueMicrotask(() => {
        setSelected(requested);
        setAnswer(null);
      });
  }, [requested, validRequested]);
  const lesson = lessons[selected - 1];
  const words = state.words.filter((w) => w.lesson === selected);
  function choose(i: number) {
    if (answer !== null) return;
    setAnswer(i);
    if (i === lesson.answer)
      recordActivity(
        "game",
        `Grammar practice: lesson ${selected}`,
        3,
        selected,
      );
  }
  return (
    <>
      <div className="page-heading">
        <div>
          <h1>
            {grammar
              ? "Grammar, one useful idea at a time."
              : "Your path to everyday German."}
          </h1>
          <p>12 small chapters. Explore freely, and move at your own pace.</p>
        </div>
        <span className="soft-badge">
          {
            Object.values(state.journey.lessons).filter((p) => p.completedAt)
              .length
          }{" "}
          of 12 mastered
        </span>
      </div>
      <div className="lesson-layout">
        <section className="lesson-path" aria-label="A1.1 lessons">
          {lessons.map((l, i) => (
            <button
              key={l.title}
              className={`lesson-step ${selected === i + 1 ? "selected" : ""}`}
              onClick={() => {
                setSelected(i + 1);
                setAnswer(null);
              }}
            >
              <span
                className={`lesson-number ${state.journey.lessons[i + 1]?.completedAt ? "completed" : ""}`}
              >
                {state.journey.lessons[i + 1]?.completedAt ? (
                  <Check size={18} />
                ) : (
                  i + 1
                )}
              </span>
              <span>
                <strong lang="de">{l.title}</strong>
                <small>{l.translation}</small>
              </span>
              <ChevronRight size={17} />
            </button>
          ))}
        </section>
        <section className="panel lesson-detail">
          <span className="soft-badge">
            <BookOpen size={16} />
            Lesson {selected} · A1.1
          </span>
          <h2 lang="de">{lesson.title}</h2>
          <p className="muted">{lesson.translation}</p>
          <div className="grammar-note">
            <h3>{lesson.grammar}</h3>
            <p>{lesson.explanation}</p>
            {state.language === "ar" && (
              <p lang="ar" dir="rtl">
                {lesson.arabic}
              </p>
            )}
            <div className="example-line">
              <strong lang="de">{lesson.example}</strong>
              <Button
                size="icon"
                variant="ghost"
                aria-label="Listen to the grammar example"
                onClick={() =>
                  speakGerman(lesson.example).catch((e) => notify(e.message))
                }
              >
                <Volume2 size={18} />
              </Button>
            </div>
          </div>
          <h3>Try it for yourself</h3>
          <p className="exercise-prompt" lang="de">
            {lesson.question}
          </p>
          <div className="choice-list">
            {lesson.options.map((o, i) => (
              <button
                key={o}
                lang="de"
                disabled={answer !== null}
                className={
                  answer === null
                    ? ""
                    : i === lesson.answer
                      ? "correct"
                      : i === answer
                        ? "incorrect"
                        : ""
                }
                onClick={() => choose(i)}
              >
                {o}
                {answer !== null && i === lesson.answer && <Check size={18} />}
              </button>
            ))}
          </div>
          {answer !== null && (
            <div
              className={`answer-feedback ${answer === lesson.answer ? "positive" : "gentle"}`}
              role="status"
            >
              {answer === lesson.answer
                ? "Richtig! You’ve got it. +3 XP"
                : `One to remember: ${lesson.question.replace("___", lesson.options[lesson.answer])} Read the explanation above and try again.`}
              {answer !== lesson.answer && (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setAnswer(null)}
                >
                  Try again
                </Button>
              )}
            </div>
          )}
          <div className="lesson-vocab">
            <h3>Words for this chapter</h3>
            {words.length ? (
              <div className="word-chips">
                {words.map((w) => (
                  <Link
                    key={w.id}
                    href={`/vocabulary?q=${encodeURIComponent(w.german)}`}
                  >
                    {w.article} {w.german}
                  </Link>
                ))}
              </div>
            ) : (
              <p className="muted">
                Add words from this chapter to build your own collection.
              </p>
            )}
            <Link href="/vocabulary?add=1" className="text-link">
              Add lesson vocabulary <ArrowRight size={15} />
            </Link>
          </div>
          <label className="lesson-notes">
            A note for future you
            <textarea
              key={selected}
              rows={3}
              maxLength={2000}
              placeholder="A pattern, an example, or something you want to remember…"
              defaultValue={state.lessonNotes[selected] ?? ""}
              onBlur={(e) => {
                const value = e.target.value;
                updateState((s) => ({
                  ...s,
                  lessonNotes: { ...s.lessonNotes, [selected]: value },
                }));
              }}
            />
          </label>
          <div className="button-row">
            <Button asChild>
              <Link href={`/lessons/${selected}?step=grammar`}>
                Practice this chapter in the book journey
                <ArrowRight size={16} />
              </Link>
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                updateState((s) => ({ ...s, currentLesson: selected }));
                notify(`Lesson ${selected} is now your current chapter.`);
              }}
            >
              Make this my current lesson
            </Button>
          </div>
          <p className="muted small">
            This is a quick grammar warm-up. The book journey checks recall,
            listening, speaking, grammar, and a life mission before chapter
            completion.
          </p>
          <p className="muted small">
            Original practice material, organized to accompany Menschen A1.1.
            Use your textbook for the full lesson.
          </p>
        </section>
      </div>
    </>
  );
}
