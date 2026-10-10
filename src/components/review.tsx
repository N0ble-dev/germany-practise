"use client";
import { useRef, useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import {
  ArrowRight,
  Check,
  RotateCcw,
  Volume2,
  Brain,
  Layers,
  Sparkles,
  Eye,
  Gauge,
  Clock3,
} from "lucide-react";
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
import type { FlashcardStackHandle } from "./flashcard-stack";

const FlashcardStack = dynamic(() =>
  import("./flashcard-stack").then((module) => module.FlashcardStack),
);
export function Review() {
  const { state, notify } = useApp();
  const [queue, setQueue] = useState<string[] | null>(null);
  const [index, setIndex] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [repeat, setRepeat] = useState<string[]>([]);
  const [mode, setMode] = useState<"meaning" | "recall" | "article">("meaning");
  const [answer, setAnswer] = useState("");
  const stackRef = useRef<FlashcardStackHandle>(null);
  const available = dueWords(state);
  const eligible = available.filter(
    (w) => mode !== "article" || w.type === "noun",
  );
  const collectionCount = state.words.filter(
    (w) => mode !== "article" || w.type === "noun",
  ).length;
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
    stackRef.current?.next();
    setIndex((i) => i + 1);
    setRevealed(false);
    setAnswer("");
  }
  return (
    <div className="review-page">
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
        <section
          className="review-intro review-launch panel"
          aria-label="Prepare your flashcard session"
        >
          <div className="review-launch-main">
            <div className="review-launch-copy">
              <span className="review-kicker">
                <Layers size={16} />
                YOUR MEMORY, A LITTLE STRONGER
              </span>
              <h2>
                {!state.words.length
                  ? "Your first word starts here."
                  : eligible.length
                    ? "A little practice. A lasting memory."
                    : mode === "article" && available.length
                      ? "No noun cards are due right now."
                      : "Your reviews are all caught up."}
              </h2>
              <p>
                {!state.words.length
                  ? "Add a word you want to remember. We’ll help it feel familiar, one small session at a time."
                  : eligible.length
                    ? "We’ll take up to ten at a time. Rate how each word feels and we’ll plan its next visit."
                    : mode === "article" && !collectionCount
                      ? "Add a noun to practice der, die and das, or choose another card direction."
                      : "Let your memory rest, or practice your collection whenever you like."}
              </p>
              <div className="review-session-facts">
                <span>
                  <Sparkles size={15} />
                  <strong>{eligible.length}</strong>{" "}
                  {eligible.length === 1 ? "word ready" : "words ready"}
                </span>
                <span>
                  <Clock3 size={15} />
                  Up to 10 cards
                </span>
              </div>
            </div>
            <div className="review-preview" aria-hidden="true">
              <div className="review-preview-sheet review-preview-sheet-back" />
              <div className="review-preview-sheet review-preview-sheet-middle" />
              <div className="review-preview-sheet review-preview-sheet-front">
                <span className="review-preview-label">
                  {mode === "article"
                    ? "FIND THE ARTICLE"
                    : mode === "recall"
                      ? "RECALL IN GERMAN"
                      : "A LITTLE GERMAN"}
                </span>
                <strong lang={mode === "recall" ? "en" : "de"}>
                  {mode === "article"
                    ? "… Sonne"
                    : mode === "recall"
                      ? "hello"
                      : "Hallo"}
                </strong>
                <span className="review-preview-meaning">
                  {mode === "article"
                    ? "die Sonne · the sun"
                    : mode === "recall"
                      ? "Hallo"
                      : "hello · مرحبًا"}
                </span>
                <span className="review-preview-spark">
                  <Sparkles size={18} />
                </span>
              </div>
            </div>
          </div>
          <div className="review-launch-controls">
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
            <Button
              className="review-gloss-button review-start-button"
              disabled={!eligible.length}
              onClick={() => start()}
            >
              Start my review <ArrowRight size={18} />
            </Button>
            <Button
              variant="outline"
              className="review-practice-button"
              disabled={!collectionCount}
              onClick={() => start(true)}
            >
              Practice any time <RotateCcw size={16} />
            </Button>
          </div>
          {!state.words.length && (
            <Link
              href="/vocabulary?add=1"
              className="text-link review-add-first"
            >
              Add your first word
              <ArrowRight size={16} />
            </Link>
          )}
          <div className="review-explainer">
            <span>
              <Eye size={18} aria-hidden="true" />
              <strong>Try to remember</strong>Give your memory a moment.
            </span>
            <span>
              <Layers size={18} aria-hidden="true" />
              <strong>Reveal the answer</strong>See the meaning and an example.
            </span>
            <span>
              <Check size={18} aria-hidden="true" />
              <strong>Tell us how it felt</strong>Your rating plans the next
              review.
            </span>
          </div>
        </section>
      ) : done ? (
        <section className="session-complete review-complete panel">
          <div className="large-icon mint">
            <Check size={36} />
          </div>
          <h2>You showed up for your German.</h2>
          <p>
            {index} reviews completed. The words you found tricky will come back
            sooner.
          </p>
          <div className="button-row">
            <Button asChild className="review-gloss-button">
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
            <span role="status" aria-live="polite">
              Word {index + 1} of {ids.length}
            </span>
            <Button variant="ghost" size="sm" onClick={() => setQueue(null)}>
              Finish for now
            </Button>
          </div>
          <div className="progress-track">
            <span style={{ width: `${(index / ids.length) * 100}%` }} />
          </div>
          <FlashcardStack ref={stackRef} theme={state.theme}>
            <section
              aria-label="Current flashcard"
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
                  <Button type="submit" className="review-gloss-button">
                    Check my recall <Check size={18} />
                  </Button>
                </form>
              ) : (
                <Button
                  className="review-gloss-button review-reveal-button"
                  onClick={() => setRevealed(true)}
                >
                  <Eye size={18} />
                  Show the meaning
                </Button>
              )}
            </section>
          </FlashcardStack>
          {revealed && (
            <section
              className="review-rating-section"
              aria-label="Rate your recall"
            >
              <div className="review-rating-heading">
                <h2>How did that feel?</h2>
                <p>Your rating sets the next review.</p>
              </div>
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
                    <span className="review-rating-label">
                      {rating === "again" ? (
                        <RotateCcw size={18} aria-hidden="true" />
                      ) : rating === "hard" ? (
                        <Gauge size={18} aria-hidden="true" />
                      ) : rating === "good" ? (
                        <Check size={18} aria-hidden="true" />
                      ) : (
                        <Sparkles size={18} aria-hidden="true" />
                      )}
                      <strong>{label}</strong>
                    </span>
                    <small>{detail}</small>
                  </button>
                ))}
              </div>
            </section>
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
    </div>
  );
}
