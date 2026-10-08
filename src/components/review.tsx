"use client";
import { useState } from "react";
import Link from "next/link";
import { ArrowRight, Check, RotateCcw, Volume2, Brain } from "lucide-react";
import { useApp } from "./learning-app";
import { Button } from "./ui/button";
import {
  dueWords,
  formatWord,
  normalizeAnswer,
  type Rating,
} from "@/lib/learning";
import { reviewWord, addWordEvidence } from "@/lib/store";
import { speakGerman } from "@/lib/speech";
export function Review() {
  const { state, notify } = useApp();
  const [queue, setQueue] = useState<string[] | null>(null);
  const [index, setIndex] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [repeat, setRepeat] = useState<string[]>([]);
  const [mode, setMode] = useState<"meaning" | "recall" | "article">("meaning");
  const [answer, setAnswer] = useState("");
  const available = dueWords(state);
  const ids = queue?.filter((id) => state.words.some((w) => w.id === id)) ?? [];
  const word = state.words.find((w) => w.id === ids[index]);
  const done = queue !== null && index >= ids.length;
  function start(all = false) {
    const next = (all ? state.words : available)
      .filter((w) => mode !== "article" || w.type === "noun")
      .slice(0, 10)
      .map((w) => w.id);
    setQueue(next);
    setIndex(0);
    setRevealed(false);
    setRepeat([]);
    setAnswer("");
  }
  function rate(rating: Rating) {
    if (!word || !revealed) return;
    const correct =
      normalizeAnswer(answer) ===
      normalizeAnswer(mode === "article" ? word.article : formatWord(word));
    reviewWord(
      word.id,
      rating,
      mode === "recall" && correct,
      (mode === "article" || mode === "recall") &&
        correct &&
        word.type === "noun",
    );
    if (rating === "again" && !repeat.includes(word.id)) {
      setQueue((q) => [...(q ?? []), word.id]);
      setRepeat((r) => [...r, word.id]);
    }
    setIndex((i) => i + 1);
    setRevealed(false);
    setAnswer("");
  }
  return (
    <>
      <div className="page-heading">
        <div>
          <h1>A little repetition. A stronger memory.</h1>
          <p>Try to remember first. Seeing a word again is part of learning.</p>
        </div>
        <span className="soft-badge">
          <Brain size={16} />
          Spaced repetition
        </span>
      </div>
      {queue === null ? (
        <section className="review-intro panel">
          <div className="large-icon purple">
            <Brain size={36} />
          </div>
          <h2>
            {available.length
              ? `${available.length} words are ready for another look.`
              : "Your reviews are all caught up."}
          </h2>
          <p>
            {available.length
              ? "We’ll take up to ten at a time. Rate how each word feels and we’ll plan its next visit."
              : "Let your memory rest, or practice your collection whenever you like."}
          </p>
          <div className="button-row">
            <label>
              Card direction
              <select
                value={mode}
                onChange={(e) => setMode(e.target.value as typeof mode)}
              >
                <option value="meaning">German → meaning</option>
                <option value="recall">Meaning → German</option>
                <option value="article">Recall noun articles</option>
              </select>
            </label>
            <Button disabled={!available.length} onClick={() => start()}>
              Start my review <ArrowRight size={17} />
            </Button>
            <Button
              variant="outline"
              disabled={
                !state.words.some(
                  (w) => mode !== "article" || w.type === "noun",
                )
              }
              onClick={() => start(true)}
            >
              Practice any time
            </Button>
          </div>
          {!state.words.length && (
            <Link href="/vocabulary" className="text-link">
              Add your first word
            </Link>
          )}
          <div className="review-explainer">
            <span>
              <strong>Again</strong>We’ll revisit it this session.
            </span>
            <span>
              <strong>Good</strong>See it tomorrow or later.
            </span>
            <span>
              <strong>Easy</strong>Give it a little more space.
            </span>
          </div>
        </section>
      ) : done ? (
        <section className="session-complete panel">
          <div className="large-icon mint">
            <Check size={36} />
          </div>
          <h2>You showed up for your German.</h2>
          <p>
            {index} reviews completed. The words you found tricky will come back
            sooner.
          </p>
          <div className="button-row">
            <Button asChild>
              <Link href="/listening">
                Try a little listening <ArrowRight size={17} />
              </Link>
            </Button>
            <Button variant="outline" onClick={() => setQueue(null)}>
              Back to reviews
            </Button>
          </div>
        </section>
      ) : word ? (
        <div className="review-workspace">
          <div className="session-top">
            <span>
              Word {index + 1} of {ids.length}
            </span>
            <Button variant="ghost" size="sm" onClick={() => setQueue(null)}>
              Finish for now
            </Button>
          </div>
          <div className="progress-track">
            <span style={{ width: `${(index / ids.length) * 100}%` }} />
          </div>
          <section
            className={`flashcard ${revealed ? "flashcard-revealed" : ""}`}
          >
            <span className="soft-badge">
              Lesson {word.lesson} · {word.topic}
            </span>
            <Button
              className="flash-audio"
              variant="ghost"
              size="icon"
              aria-label="Listen to this word"
              disabled={mode !== "meaning" && !revealed}
              onClick={() =>
                speakGerman(formatWord(word))
                  .then(() => addWordEvidence([word.german], { audio: true }))
                  .catch((e) => notify(e.message))
              }
            >
              <Volume2 size={23} />
            </Button>
            <span className="muted small">
              {mode === "meaning"
                ? "What does this mean?"
                : mode === "article"
                  ? "Which article belongs with this noun?"
                  : "Recall the German, including the article for nouns."}
            </span>
            {mode === "recall" ? (
              <h2>{word.english}</h2>
            ) : (
              <h2 lang="de">
                <span className={`article-${word.article}`}>
                  {mode === "article" && !revealed ? "…" : word.article}
                </span>{" "}
                {word.german}
              </h2>
            )}
            {revealed ? (
              <div className="flash-answer">
                <h3 lang={mode === "meaning" ? "en" : "de"}>
                  {mode === "meaning" ? word.english : formatWord(word)}
                </h3>
                {mode !== "meaning" && (
                  <p role="status">
                    {normalizeAnswer(answer) ===
                    normalizeAnswer(
                      mode === "article" ? word.article : formatWord(word),
                    )
                      ? "You recalled it."
                      : "Compare the answer, then let this word come back."}
                  </p>
                )}
                {word.arabic && (
                  <p lang="ar" dir="rtl">
                    {word.arabic}
                  </p>
                )}
                <p lang="de">{word.example}</p>
                <small>{word.hint}</small>
              </div>
            ) : mode !== "meaning" ? (
              <form
                className="flash-recall"
                onSubmit={(e) => {
                  e.preventDefault();
                  setRevealed(true);
                }}
              >
                <label>
                  {mode === "article" ? "Noun article" : "Your German answer"}
                  <input
                    lang="de"
                    required
                    autoComplete="off"
                    spellCheck={false}
                    maxLength={150}
                    value={answer}
                    onChange={(e) => setAnswer(e.target.value)}
                  />
                </label>
                <Button type="submit" variant="secondary">
                  Check my recall
                </Button>
              </form>
            ) : (
              <Button variant="secondary" onClick={() => setRevealed(true)}>
                Show the meaning
              </Button>
            )}
          </section>
          {revealed && (
            <div className="rating-buttons">
              {(
                [
                  ["again", "Again", "In a minute"],
                  ["hard", "Hard", "1 day or more"],
                  ["good", "Good", "1 day or more"],
                  ["easy", "Easy", "4 days or more"],
                ] as const
              ).map(([rating, label, detail]) => (
                <button
                  key={rating}
                  className={`rating-${rating}`}
                  disabled={
                    (rating === "good" || rating === "easy") &&
                    mode !== "meaning" &&
                    normalizeAnswer(answer) !==
                      normalizeAnswer(
                        mode === "article" ? word.article : formatWord(word),
                      )
                  }
                  onClick={() => rate(rating)}
                >
                  <strong>{label}</strong>
                  <small>{detail}</small>
                </button>
              ))}
            </div>
          )}
          <p className="practice-reassurance">
            <RotateCcw size={15} />
            Forgotten a word? That’s exactly why we’re here.
          </p>
        </div>
      ) : (
        <div className="empty-panel">
          <h2>This word is no longer in your collection.</h2>
          <Button onClick={() => setQueue(null)}>Start a fresh review</Button>
        </div>
      )}
    </>
  );
}
