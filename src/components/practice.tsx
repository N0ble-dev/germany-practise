"use client";
import { useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  Volume2,
  Star,
  Check,
  RotateCcw,
  Coffee,
  TrainFront,
  Croissant,
  Store,
  Users,
  Puzzle,
  PencilLine,
} from "lucide-react";
import { useApp } from "./learning-app";
import { PersonalLifeHint } from "./personal-life-support";
import { Button } from "./ui/button";
import { formatWord, normalizeAnswer, sentencePatterns } from "@/lib/learning";
import { lessons, situations } from "@/lib/content";
import { recordActivity, updateState } from "@/lib/store";
import { speakGerman } from "@/lib/speech";
export function SentenceLab() {
  const { state, notify } = useApp();
  const [wordId, setWordId] = useState(state.words[0]?.id ?? "");
  const word = state.words.find((w) => w.id === wordId) ?? state.words[0];
  const sentences = word ? sentencePatterns(word) : [];
  function save(sentence: string) {
    if (state.savedSentences.includes(sentence))
      updateState((s) => ({
        ...s,
        savedSentences: s.savedSentences.filter((x) => x !== sentence),
      }));
    else {
      if (state.savedSentences.length >= 1000) {
        notify(
          "Your sentence collection is full. Remove a saved sentence to make room.",
        );
        return;
      }
      updateState((s) => ({
        ...s,
        savedSentences: [...s.savedSentences, sentence],
      }));
      notify("Sentence saved for another day.");
    }
  }
  return (
    <>
      <div className="page-heading">
        <div>
          <h1>Give your words somewhere to live.</h1>
          <p>A word becomes useful when you can put it in a sentence.</p>
        </div>
        <span className="soft-badge">
          <PencilLine size={16} />
          A1 sentence patterns
        </span>
      </div>
      <PersonalLifeHint kind="sentences" />
      <section className="panel sentence-lab">
        <label>
          Choose a word from your collection
          <select
            value={word?.id ?? ""}
            disabled={!word}
            onChange={(e) => setWordId(e.target.value)}
          >
            {state.words.map((w) => (
              <option value={w.id} key={w.id}>
                {formatWord(w)} — {w.english}
              </option>
            ))}
          </select>
        </label>
        {word ? (
          <>
            <p className="muted">
              Simple patterns using{" "}
              <strong lang="de">{formatWord(word)}</strong>. Save one, listen,
              then try saying it yourself.
            </p>
            <div className="sentence-list">
              {sentences.map((s) => (
                <div className="sentence-row" key={s}>
                  <p lang="de">{s}</p>
                  <div>
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label={`Listen to ${s}`}
                      onClick={() =>
                        speakGerman(s).catch((e) => notify(e.message))
                      }
                    >
                      <Volume2 size={18} />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label={`${state.savedSentences.includes(s) ? "Unsave" : "Save"} ${s}`}
                      aria-pressed={state.savedSentences.includes(s)}
                      onClick={() => save(s)}
                    >
                      <Star
                        size={18}
                        fill={
                          state.savedSentences.includes(s)
                            ? "currentColor"
                            : "none"
                        }
                      />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
            <p className="muted small">
              These are reusable practice patterns. Some verbs need an object or
              more context; use your example sentence as a guide.
            </p>
          </>
        ) : (
          <div className="empty-panel">
            <h2>Start with a word.</h2>
            <Button asChild>
              <Link href="/vocabulary?add=1">Add your first word</Link>
            </Button>
          </div>
        )}
      </section>
      <section className="panel saved-sentences">
        <h2>Your useful sentences</h2>
        {state.savedSentences.length ? (
          state.savedSentences.map((s) => (
            <div className="sentence-row" key={s}>
              <p lang="de">{s}</p>
              <div>
                <Button
                  size="icon"
                  variant="ghost"
                  aria-label={`Listen to saved sentence ${s}`}
                  onClick={() => speakGerman(s).catch((e) => notify(e.message))}
                >
                  <Volume2 size={18} />
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  aria-label={`Remove saved sentence ${s}`}
                  onClick={() => save(s)}
                >
                  <Star size={18} fill="currentColor" />
                </Button>
              </div>
            </div>
          ))
        ) : (
          <p className="muted">
            Save a sentence above. Keep the ones you want to use in real life.
          </p>
        )}
      </section>
    </>
  );
}
function shuffle<T>(items: T[]): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}
export function Games() {
  const { state, notify } = useApp();
  const [mode, setMode] = useState<"builder" | "articles" | "match">("builder");
  const [index, setIndex] = useState(state.currentLesson - 1);
  const [tokens, setTokens] = useState<{ value: string; id: number }[]>([]);
  const [picked, setPicked] = useState<number[]>([]);
  const [checked, setChecked] = useState(false);
  const [choice, setChoice] = useState<string | null>(null);
  const [matchWord, setMatchWord] = useState<string | null>(null);
  const [matched, setMatched] = useState<string[]>([]);
  const [matchMessage, setMatchMessage] = useState("");
  const [rightColumn, setRightColumn] = useState<string[]>([]);
  const sentence = lessons[index].example;
  const nouns = state.words.filter((w) => w.type === "noun" && w.article);
  const noun = nouns[index % nouns.length];
  const pairs = state.words.slice(0, 4);
  function prepare(nextIndex = index) {
    setTokens(
      shuffle(
        lessons[nextIndex].example
          .replace(/[.!?]$/, " ")
          .trim()
          .split(/\s+/)
          .map((value, id) => ({ value, id })),
      ),
    );
    setPicked([]);
    setChecked(false);
    setChoice(null);
  }
  function next() {
    const nextIndex = (index + 1) % lessons.length;
    setIndex(nextIndex);
    prepare(nextIndex);
  }
  const built = picked
    .map((id) => tokens.find((t) => t.id === id)?.value)
    .join(" ");
  const correct = normalizeAnswer(built) === normalizeAnswer(sentence);
  function match(id: string) {
    if (!matchWord) return;
    if (id === matchWord) {
      const nextMatched = [...matched, id];
      setMatched(nextMatched);
      setMatchMessage("A good connection. +1 XP");
      recordActivity(
        "game",
        `Matched ${state.words.find((w) => w.id === id)?.german ?? "a word"}`,
        1,
        state.currentLesson,
      );
      if (nextMatched.length === pairs.length)
        notify("Every pair connected. Schön gemacht!");
    } else
      setMatchMessage(
        "Not quite. Read both meanings and try another connection.",
      );
    setMatchWord(null);
  }
  return (
    <>
      <div className="page-heading">
        <div>
          <h1>A little play helps the words stay.</h1>
          <p>
            Build a sentence, find an article, or connect a word with its
            meaning.
          </p>
        </div>
        <span className="soft-badge">
          <Puzzle size={16} />
          Practice without pressure
        </span>
      </div>
      <div className="practice-tabs">
        {(
          [
            ["builder", "Sentence builder"],
            ["articles", "der, die, das"],
            ["match", "Match the meaning"],
          ] as const
        ).map(([key, label]) => (
          <button
            key={key}
            className={mode === key ? "active" : ""}
            onClick={() => {
              setMode(key);
              prepare();
              setMatched([]);
              setMatchWord(null);
              setMatchMessage("");
              setRightColumn(shuffle(pairs.map((w) => w.id)));
            }}
          >
            {label}
          </button>
        ))}
      </div>
      <section className="panel game-panel">
        {mode === "builder" && (
          <>
            <h2>Put the words in their place.</h2>
            <p className="muted">
              {tokens.length
                ? "Tap a word to add it. Tap it again in your sentence to put it back."
                : "Make a familiar A1 sentence from a handful of words."}
            </p>
            {!tokens.length ? (
              <Button onClick={() => prepare()}>
                Start building <ArrowRight size={17} />
              </Button>
            ) : (
              <>
                <div className="built-sentence" aria-label="Your sentence">
                  {picked.length ? (
                    picked.map((id) => (
                      <button
                        disabled={checked}
                        key={id}
                        onClick={() =>
                          setPicked((p) => p.filter((x) => x !== id))
                        }
                      >
                        {tokens.find((t) => t.id === id)?.value}
                      </button>
                    ))
                  ) : (
                    <span className="muted">Your sentence begins here…</span>
                  )}
                </div>
                <div className="word-chips token-bank">
                  {tokens
                    .filter((t) => !picked.includes(t.id))
                    .map((t) => (
                      <button
                        disabled={checked}
                        key={t.id}
                        onClick={() => setPicked((p) => [...p, t.id])}
                      >
                        {t.value}
                      </button>
                    ))}
                </div>
                <div className="button-row">
                  <Button
                    disabled={checked || picked.length !== tokens.length}
                    onClick={() => {
                      setChecked(true);
                      if (correct)
                        recordActivity(
                          "game",
                          `Built: ${sentence}`,
                          3,
                          index + 1,
                        );
                    }}
                  >
                    Check my sentence
                  </Button>
                  <Button variant="outline" onClick={() => prepare()}>
                    <RotateCcw size={16} />
                    Try this again
                  </Button>
                </div>
                {checked && (
                  <div
                    className={`answer-feedback ${correct ? "positive" : "gentle"}`}
                    role="status"
                  >
                    {correct
                      ? "That’s a sentence you can use. +3 XP"
                      : "Notice where the verb goes. Try building it once more."}
                    <p lang="de">{sentence}</p>
                  </div>
                )}
                <Button variant="ghost" onClick={next}>
                  Next sentence <ArrowRight size={16} />
                </Button>
              </>
            )}
          </>
        )}
        {mode === "articles" && (
          <>
            {noun ? (
              <>
                <h2>Which article belongs here?</h2>
                <p className="article-question" lang="de">
                  <span>___</span> {noun.german}
                </p>
                <div className="article-choices">
                  {["der", "die", "das"].map((a) => (
                    <button
                      disabled={choice !== null}
                      className={`article-${a} ${choice !== null && a === noun.article ? "correct" : choice === a ? "incorrect" : ""}`}
                      key={a}
                      onClick={() => {
                        setChoice(a);
                        if (a === noun.article)
                          recordActivity(
                            "game",
                            `Article: ${formatWord(noun)}`,
                            2,
                            noun.lesson,
                          );
                        else
                          updateState((s) => ({
                            ...s,
                            words: s.words.map((w) =>
                              w.id === noun.id
                                ? { ...w, mistakes: w.mistakes + 1 }
                                : w,
                            ),
                          }));
                      }}
                    >
                      {a}
                    </button>
                  ))}
                </div>
                {choice && (
                  <div
                    className={`answer-feedback ${choice === noun.article ? "positive" : "gentle"}`}
                    role="status"
                  >
                    {choice === noun.article
                      ? "Richtig! +2 XP"
                      : "Learn the noun and article as one word."}
                    <p lang="de">{formatWord(noun)}</p>
                    <small>{noun.hint}</small>
                  </div>
                )}
                <Button variant="outline" onClick={next}>
                  Next word <ArrowRight size={16} />
                </Button>
              </>
            ) : (
              <div className="empty-panel">
                <h2>Give your nouns their articles.</h2>
                <Button asChild>
                  <Link href="/vocabulary">Add a noun to play</Link>
                </Button>
              </div>
            )}
          </>
        )}
        {mode === "match" && (
          <>
            <h2>A word and its meaning belong together.</h2>
            <p className="muted">
              Pick a German word, then its English meaning.
            </p>
            <div className="matching-grid">
              <div>
                {pairs.map((w) => (
                  <button
                    key={w.id}
                    lang="de"
                    disabled={matched.includes(w.id)}
                    className={
                      matched.includes(w.id)
                        ? "correct"
                        : matchWord === w.id
                          ? "selected"
                          : ""
                    }
                    onClick={() => setMatchWord(w.id)}
                  >
                    {formatWord(w)}
                    {matched.includes(w.id) && <Check size={17} />}
                  </button>
                ))}
              </div>
              <div>
                {(rightColumn.length
                  ? rightColumn
                  : pairs.map((w) => w.id).reverse()
                ).map((id) => {
                  const w = pairs.find((w) => w.id === id);
                  return (
                    w && (
                      <button
                        disabled={matched.includes(id) || !matchWord}
                        className={matched.includes(id) ? "correct" : ""}
                        key={id}
                        onClick={() => match(id)}
                      >
                        {w.english}
                      </button>
                    )
                  );
                })}
              </div>
            </div>
            {matchMessage && (
              <p role="status" className="answer-feedback">
                {matchMessage}
              </p>
            )}
            {!pairs.length && (
              <Link href="/vocabulary">Add words to start matching.</Link>
            )}
          </>
        )}
      </section>
    </>
  );
}
const sceneIcons = {
  bakery: Croissant,
  train: TrainFront,
  coffee: Coffee,
  shop: Store,
  friends: Users,
};
export function Germany() {
  const { state, notify } = useApp();
  const [index, setIndex] = useState(0);
  const [answer, setAnswer] = useState<number | null>(null);
  const scene = situations[index];
  const Icon = sceneIcons[scene.icon as keyof typeof sceneIcons];
  return (
    <>
      <div className="page-heading">
        <div>
          <h1>A small conversation. A real possibility.</h1>
          <p>
            Imagine yourself there. Practice the German you’ll actually use.
          </p>
        </div>
        <span className="soft-badge">
          <span className="german-flag" />
          Germany mode
        </span>
      </div>
      <div className="situations-nav">
        {situations.map((s, i) => {
          const I = sceneIcons[s.icon as keyof typeof sceneIcons];
          return (
            <button
              key={s.name}
              className={i === index ? "active" : ""}
              onClick={() => {
                setIndex(i);
                setAnswer(null);
              }}
            >
              <I size={21} />
              {s.name}
            </button>
          );
        })}
      </div>
      <section className="situation-scene panel">
        <div className="scene-visual">
          <Icon size={68} strokeWidth={1.2} />
          <span lang="de">{scene.place}</span>
          <div className="scene-dots">
            <span />
            <span />
            <span />
          </div>
        </div>
        <div className="scene-content">
          <span className="soft-badge">A moment in Germany</span>
          <h2>{scene.context}</h2>
          <div className="conversation-bubble">
            <p lang="de">“{scene.line}”</p>
            <Button
              size="icon"
              variant="ghost"
              aria-label="Listen to the conversation"
              onClick={() =>
                speakGerman(scene.line).catch((e) => notify(e.message))
              }
            >
              <Volume2 size={18} />
            </Button>
          </div>
          <h3>What would you say?</h3>
          <div className="choice-list">
            {scene.options.map((o, i) => (
              <button
                key={o}
                lang="de"
                disabled={answer !== null}
                className={
                  answer !== null && i === scene.answer
                    ? "correct"
                    : answer === i
                      ? "incorrect"
                      : ""
                }
                onClick={() => {
                  setAnswer(i);
                  recordActivity(
                    "situation",
                    `${scene.name}: ${answer === scene.answer ? "conversation" : "practice"}`,
                    i === scene.answer ? 3 : 1,
                    scene.lesson,
                  );
                }}
              >
                {o}
                {answer !== null && i === scene.answer && <Check size={18} />}
              </button>
            ))}
          </div>
          {answer !== null && (
            <div
              className={`answer-feedback ${answer === scene.answer ? "positive" : "gentle"}`}
              role="status"
            >
              <strong>
                {answer === scene.answer
                  ? "You found the words. Sehr gut! +3 XP"
                  : "A new phrase for next time. +1 XP for trying."}
              </strong>
              <p>{scene.explanation}</p>
              {state.language === "ar" && (
                <p dir="rtl" lang="ar">
                  {scene.arabic}
                </p>
              )}
              <Button
                variant="ghost"
                size="sm"
                onClick={() =>
                  speakGerman(scene.options[scene.answer]).catch((e) =>
                    notify(e.message),
                  )
                }
              >
                <Volume2 size={16} />
                Listen and repeat
              </Button>
            </div>
          )}
          <div className="exercise-footer">
            <span className="muted small">
              Situation {index + 1} of {situations.length}
            </span>
            <Button
              variant="outline"
              onClick={() => {
                setIndex((i) => (i + 1) % situations.length);
                setAnswer(null);
              }}
            >
              Another situation <ArrowRight size={17} />
            </Button>
          </div>
        </div>
      </section>
    </>
  );
}
