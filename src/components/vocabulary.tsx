"use client";
import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  Plus,
  Search,
  Star,
  Volume2,
  Trash2,
  BookOpen,
  Pencil,
} from "lucide-react";
import { useApp } from "./learning-app";
import { Button } from "./ui/button";
import { Dialog } from "./ui/dialog";
import { addWord, updateState } from "@/lib/store";
import { formatWord, wordSchema, type Word } from "@/lib/learning";
import { starterWords } from "@/lib/content";
import { speakGerman } from "@/lib/speech";
export function Vocabulary() {
  const { state, notify } = useApp();
  const params = useSearchParams();
  const [query, setQuery] = useState(params.get("q") ?? "");
  const [filter, setFilter] = useState("all");
  const [open, setOpen] = useState(params.get("add") === "1");
  const [editing, setEditing] = useState<Word | null>(null);
  const [deleting, setDeleting] = useState<Word | null>(null);
  const [draft, setDraft] = useState<Partial<Word>>({
    type: "noun",
    article: "der",
    lesson: state.currentLesson,
  });
  const [error, setError] = useState("");
  useEffect(() => {
    const q = params.get("q");
    if (q !== null) queueMicrotask(() => setQuery(q));
  }, [params]);
  const words = state.words.filter(
    (w) =>
      `${w.german} ${w.english} ${w.arabic} ${w.topic} ${w.hint}`
        .toLowerCase()
        .includes(query.toLowerCase()) &&
      (filter === "all" ||
        (filter === "favorites" && w.favorite) ||
        (filter === "difficult" && w.mistakes > 0) ||
        String(w.lesson) === filter),
  );
  function startAdd() {
    setEditing(null);
    setDraft({ type: "noun", article: "der", lesson: state.currentLesson });
    setError("");
    setOpen(true);
  }
  function suggest(german: string) {
    const found = starterWords.find(
      (w) =>
        w.german.toLowerCase() ===
        german
          .trim()
          .replace(/^(der|die|das)\s+/i, "")
          .toLowerCase(),
    );
    setDraft((d) =>
      found ? { ...d, ...found, german: found.german } : { ...d, german },
    );
  }
  function submit(event: React.FormEvent) {
    event.preventDefault();
    const result = wordSchema.safeParse({
      ...starterWords[0],
      ...draft,
      id: editing?.id ?? crypto.randomUUID(),
      german: draft.german?.trim().replace(/^(der|die|das)\s+/i, ""),
      arabic: draft.arabic ?? "",
      plural: draft.plural ?? "",
      example: draft.example ?? "",
      hint: draft.hint ?? "",
      topic: draft.topic || "My words",
      article: draft.type === "noun" ? draft.article : "",
    });
    if (!result.success) {
      setError(
        "Add a German word and its meaning, and check the field lengths.",
      );
      return;
    }
    if (result.data.type === "noun" && !result.data.article) {
      setError("Choose der, die, or das to learn the noun with its article.");
      return;
    }
    if (
      state.words.some(
        (w) =>
          w.id !== editing?.id &&
          w.german.toLowerCase() === result.data.german.toLowerCase(),
      )
    ) {
      setError(
        "This word is already in your collection. Search for it to update your notes.",
      );
      return;
    }
    if (!editing && state.words.length >= 5000) {
      setError(
        "Your collection is full. Export a backup and remove a word to make room.",
      );
      return;
    }
    if (editing)
      updateState((s) => ({
        ...s,
        words: s.words.map((w) =>
          w.id === editing.id
            ? {
                ...result.data,
                due: w.due,
                interval: w.interval,
                ease: w.ease,
                reviews: w.reviews,
                mistakes: w.mistakes,
                status: w.status,
                favorite: w.favorite,
              }
            : w,
        ),
      }));
    else if (!addWord(result.data)) return;
    setOpen(false);
    notify(
      editing
        ? "Word updated. Your review progress is kept."
        : "A new word for your journey. +2 XP",
    );
  }
  return (
    <>
      <div className="page-heading">
        <div>
          <h1>A growing collection of German.</h1>
          <p>
            Keep the article, a useful sentence, and a memory that makes it
            yours.
          </p>
        </div>
        <Button onClick={startAdd}>
          <Plus size={17} />
          Add a word
        </Button>
      </div>
      <div className="collection-summary">
        <span>
          <strong>{state.words.length}</strong> words collected
        </span>
        <span>
          <strong>{state.words.filter((w) => w.favorite).length}</strong>{" "}
          favorites
        </span>
        <span>
          <strong>
            {state.words.filter((w) => w.status === "mastered").length}
          </strong>{" "}
          familiar words
        </span>
      </div>
      <section className="panel">
        <div className="filter-row">
          <label className="search-field">
            <Search size={18} />
            <input
              aria-label="Search vocabulary"
              placeholder="Search German, English, Arabic, or a note…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </label>
          <select
            aria-label="Filter vocabulary"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
          >
            <option value="all">All words</option>
            <option value="favorites">Favorites</option>
            <option value="difficult">Needs a little care</option>
            {Array.from({ length: 12 }, (_, i) => (
              <option value={i + 1} key={i}>
                Lesson {i + 1}
              </option>
            ))}
          </select>
        </div>
        <div className="vocabulary-list">
          {words.map((w) => (
            <article className="vocabulary-row" key={w.id}>
              <div className="vocabulary-main">
                <h2 lang="de">
                  <span className={`article-${w.article}`}>{w.article}</span>{" "}
                  {w.german}
                </h2>
                <p>
                  {w.english}
                  {w.arabic && (
                    <span className="arabic-translation" lang="ar" dir="rtl">
                      {w.arabic}
                    </span>
                  )}
                </p>
                <small lang="de">
                  {w.example ||
                    w.plural ||
                    "Add a sentence to make this word useful."}
                </small>
                {w.hint && <span className="memory-hint">{w.hint}</span>}
              </div>
              <div className="vocabulary-meta">
                <span className="soft-badge">Lesson {w.lesson}</span>
                <small>{w.topic}</small>
                <span className={`word-status status-${w.status}`}>
                  {w.status}
                </span>
              </div>
              <div className="word-actions">
                <Button
                  size="icon"
                  variant="ghost"
                  aria-label={`Listen to ${w.german}`}
                  onClick={() =>
                    speakGerman(formatWord(w)).catch((e) => notify(e.message))
                  }
                >
                  <Volume2 size={17} />
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  aria-label={`${w.favorite ? "Unfavorite" : "Favorite"} ${w.german}`}
                  aria-pressed={w.favorite}
                  onClick={() =>
                    updateState((s) => ({
                      ...s,
                      words: s.words.map((word) =>
                        word.id === w.id
                          ? { ...word, favorite: !word.favorite }
                          : word,
                      ),
                    }))
                  }
                >
                  <Star size={17} fill={w.favorite ? "currentColor" : "none"} />
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  aria-label={`Edit ${w.german}`}
                  onClick={() => {
                    setEditing(w);
                    setDraft(w);
                    setError("");
                    setOpen(true);
                  }}
                >
                  <Pencil size={16} />
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  aria-label={`Delete ${w.german}`}
                  onClick={() => setDeleting(w)}
                >
                  <Trash2 size={16} />
                </Button>
              </div>
            </article>
          ))}
        </div>
        {!words.length && (
          <div className="empty-panel">
            <BookOpen size={36} />
            <h2>
              {state.words.length
                ? "No words match this search."
                : "Your first word is a small beginning."}
            </h2>
            <p>
              {state.words.length
                ? "Try another word or show all lessons."
                : "Add a word from your lesson and practice it in a sentence."}
            </p>
            <Button
              onClick={
                state.words.length
                  ? () => {
                      setQuery("");
                      setFilter("all");
                    }
                  : startAdd
              }
            >
              {state.words.length ? "Show all words" : "Add my first word"}
            </Button>
          </div>
        )}
      </section>
      <Dialog
        open={open}
        onOpenChange={setOpen}
        title={
          editing ? "Make this word your own" : "One more word for your journey"
        }
        description="Known starter words fill in automatically. You can edit every suggestion."
      >
        <form onSubmit={submit} className="word-form">
          <div className="form-grid">
            <label>
              German word
              <input
                required
                maxLength={120}
                value={draft.german ?? ""}
                onChange={(e) => suggest(e.target.value)}
                placeholder="Bahnhof"
              />
            </label>
            <label>
              English meaning
              <input
                required
                maxLength={240}
                value={draft.english ?? ""}
                onChange={(e) =>
                  setDraft((d) => ({ ...d, english: e.target.value }))
                }
                placeholder="train station"
              />
            </label>
            <label>
              Word type
              <select
                value={draft.type}
                onChange={(e) =>
                  setDraft((d) => ({
                    ...d,
                    type: e.target.value as Word["type"],
                  }))
                }
              >
                <option value="noun">Noun</option>
                <option value="verb">Verb</option>
                <option value="adjective">Adjective</option>
                <option value="phrase">Phrase</option>
              </select>
            </label>
            <label>
              Article
              <select
                disabled={draft.type !== "noun"}
                value={draft.article}
                onChange={(e) =>
                  setDraft((d) => ({
                    ...d,
                    article: e.target.value as Word["article"],
                  }))
                }
              >
                <option value="">No article</option>
                <option>der</option>
                <option>die</option>
                <option>das</option>
              </select>
            </label>
            <label>
              Arabic meaning
              <input
                lang="ar"
                dir="auto"
                maxLength={240}
                value={draft.arabic ?? ""}
                onChange={(e) =>
                  setDraft((d) => ({ ...d, arabic: e.target.value }))
                }
              />
            </label>
            <label>
              Plural
              <input
                maxLength={120}
                value={draft.plural ?? ""}
                onChange={(e) =>
                  setDraft((d) => ({ ...d, plural: e.target.value }))
                }
                placeholder="die Bahnhöfe"
              />
            </label>
            <label>
              Lesson
              <select
                value={draft.lesson}
                onChange={(e) =>
                  setDraft((d) => ({ ...d, lesson: Number(e.target.value) }))
                }
              >
                {Array.from({ length: 12 }, (_, i) => (
                  <option value={i + 1} key={i}>
                    Lesson {i + 1}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Topic
              <input
                maxLength={100}
                value={draft.topic ?? ""}
                onChange={(e) =>
                  setDraft((d) => ({ ...d, topic: e.target.value }))
                }
                placeholder="Travel"
              />
            </label>
            <label className="full-width">
              Example sentence
              <input
                maxLength={500}
                value={draft.example ?? ""}
                onChange={(e) =>
                  setDraft((d) => ({ ...d, example: e.target.value }))
                }
                placeholder="Wo ist der Bahnhof?"
              />
            </label>
            <label className="full-width">
              Your memory hint
              <textarea
                maxLength={500}
                value={draft.hint ?? ""}
                onChange={(e) =>
                  setDraft((d) => ({ ...d, hint: e.target.value }))
                }
                placeholder="What does this word remind you of?"
                rows={2}
              />
            </label>
          </div>
          {error && (
            <p className="form-error" role="alert">
              {error}
            </p>
          )}
          <Button type="submit">
            {editing ? "Save my changes" : "Add to my collection"}
          </Button>
        </form>
      </Dialog>
      <Dialog
        open={!!deleting}
        onOpenChange={(o) => !o && setDeleting(null)}
        title={`Remove ${deleting?.german ?? "this word"}?`}
        description="This removes the word and its review schedule from your collection. Your earned XP stays."
      >
        <div className="button-row">
          <Button variant="secondary" onClick={() => setDeleting(null)}>
            Keep the word
          </Button>
          <Button
            variant="destructive"
            onClick={() => {
              updateState((s) => ({
                ...s,
                words: s.words.filter((w) => w.id !== deleting?.id),
              }));
              setDeleting(null);
              notify("Word removed from your collection.");
            }}
          >
            Remove word
          </Button>
        </div>
      </Dialog>
    </>
  );
}
