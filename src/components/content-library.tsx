"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  BookOpen,
  Bookmark,
  Check,
  ExternalLink,
  Layers,
  Search,
  Volume2,
  X,
} from "lucide-react";
import { useApp } from "./learning-app";
import { Button } from "./ui/button";
import { Dialog } from "./ui/dialog";
import {
  libraryBookmarkSchema,
  libraryKindLabels,
  libraryKinds,
  recallText,
  type LibraryItem,
  type LibraryOverview,
  type LibraryPage,
  type LibraryQuery,
} from "@/lib/library/model";
import { wordSchema } from "@/lib/learning";
import { addWord, updateState } from "@/lib/store";
import { speakGerman } from "@/lib/speech";

async function libraryFetch<T>(path: string, signal?: AbortSignal): Promise<T> {
  const response = await fetch(`/api/library${path}`, { signal });
  const body = await response.json();
  if (!response.ok)
    throw new Error(body.error ?? "The library could not load.");
  return body;
}
function SourceCredit({ item }: { item: LibraryItem }) {
  return (
    <details className="library-credit">
      <summary>Source & attribution</summary>
      <p>{item.source.attribution}</p>
      <div>
        <a href={item.source.url} target="_blank" rel="noreferrer">
          Original source <ExternalLink size={13} />
        </a>
        <a href={item.source.licenseUrl} target="_blank" rel="noreferrer">
          {item.source.license}
        </a>
      </div>
      <small>
        Source text is preserved; display formatting is adapted. CEFR level and
        Arabic translation have not been assigned.
      </small>
    </details>
  );
}
export function LibraryBookmarks() {
  const { state } = useApp();
  const bookmarks = state.libraryBookmarks ?? [];
  const [visible, setVisible] = useState(8);
  if (!bookmarks.length) return null;
  return (
    <section
      className="panel library-bookmarks"
      aria-labelledby="library-bookmarks-title"
    >
      <div className="section-heading">
        <div>
          <h2 id="library-bookmarks-title">My saved library sentences</h2>
          <p>{bookmarks.length} source texts, kept with their credits.</p>
        </div>
        <Link href="/library">
          Explore the library <ArrowRight size={15} />
        </Link>
      </div>
      {bookmarks.slice(0, visible).map((item) => (
        <article key={item.id}>
          <p lang="de">{item.german}</p>
          <p className="muted">{item.english}</p>
          <small>{item.source.attribution}</small>
          <div>
            <Link href={`/library?item=${item.id}`}>Open source</Link>
            <Button
              size="sm"
              variant="ghost"
              aria-label={`Remove saved ${item.german}`}
              onClick={() =>
                updateState((s) => ({
                  ...s,
                  libraryBookmarks: (s.libraryBookmarks ?? []).filter(
                    (saved) => saved.id !== item.id,
                  ),
                }))
              }
            >
              <X size={15} /> Remove
            </Button>
          </div>
        </article>
      ))}
      {visible < bookmarks.length && (
        <Button variant="outline" onClick={() => setVisible(visible + 8)}>
          Show more saved sources
        </Button>
      )}
    </section>
  );
}
export function ContentLibrary({
  initial,
}: {
  initial: LibraryQuery & { item?: number };
}) {
  const { state, notify } = useApp();
  const [overview, setOverview] = useState<LibraryOverview | null>(null);
  const [collection, setCollection] = useState(initial.collection);
  const [kind, setKind] = useState(initial.kind);
  const [chapter, setChapter] = useState(
    initial.chapter ? String(initial.chapter) : "",
  );
  const [search, setSearch] = useState(initial.q);
  const [query, setQuery] = useState(initial.q);
  const [length, setLength] = useState(initial.length);
  const [listing, setListing] = useState<
    (LibraryPage & { key: string }) | null
  >(null);
  const [error, setError] = useState("");
  const [overviewError, setOverviewError] = useState("");
  const [reload, setReload] = useState(0);
  const [busy, setBusy] = useState(false);
  const [detail, setDetail] = useState<LibraryItem | null>(null);
  const [deck, setDeck] = useState<LibraryItem[]>([]);
  const [index, setIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [recall, setRecall] = useState("");
  const [feedback, setFeedback] = useState("");
  const detailRequest = useRef<AbortController | null>(null);
  const params = new URLSearchParams({
    collection,
    kind,
    q: query,
    length,
    ...(chapter ? { chapter } : {}),
  });
  const key = params.toString(),
    rows = listing?.key === key ? listing : null;
  const chosen = overview?.collections.find(
    (item) => item.provider === collection,
  );
  const currentCard = deck[index];
  useEffect(() => {
    const controller = new AbortController();
    libraryFetch<LibraryOverview>("", controller.signal)
      .then((value) => {
        if (!controller.signal.aborted) {
          setOverview(value);
          setOverviewError("");
        }
      })
      .catch((e) => {
        if (!controller.signal.aborted) setOverviewError(e.message);
      });
    return () => controller.abort();
  }, [reload]);
  useEffect(() => {
    const controller = new AbortController();
    libraryFetch<LibraryPage>(`?${key}`, controller.signal)
      .then((value) => {
        if (!controller.signal.aborted) {
          setListing({ ...value, key });
          setError("");
        }
      })
      .catch((e) => {
        if (!controller.signal.aborted) setError(e.message);
      });
    return () => controller.abort();
  }, [key, reload]);
  useEffect(() => {
    if (!initial.item) return;
    const controller = new AbortController();
    libraryFetch<LibraryItem>(`?item=${initial.item}`, controller.signal)
      .then((value) => {
        if (!controller.signal.aborted) setDetail(value);
      })
      .catch((e) => {
        if (!controller.signal.aborted) setError(e.message);
      });
    return () => controller.abort();
  }, [initial.item]);
  useEffect(() => () => detailRequest.current?.abort(), []);
  function choose(
    next: LibraryQuery["collection"],
    type: LibraryQuery["kind"],
    nextChapter = "",
  ) {
    setCollection(next);
    setKind(type);
    setChapter(nextChapter);
    setQuery("");
    setSearch("");
    setLength("all");
    setError("");
  }
  async function inspect(item: LibraryItem) {
    detailRequest.current?.abort();
    const controller = new AbortController();
    detailRequest.current = controller;
    try {
      const value = await libraryFetch<LibraryItem>(
        `?item=${item.id}`,
        controller.signal,
      );
      if (!controller.signal.aborted) setDetail(value);
    } catch (e) {
      if (!controller.signal.aborted)
        setError(
          e instanceof Error ? e.message : "This source could not load.",
        );
    }
  }
  function hear(item: LibraryItem) {
    void speakGerman(item.german).catch((e) => notify(e.message));
  }
  function keep(item: LibraryItem) {
    if (item.kind === "vocabulary") {
      if (state.words.length >= 5000) {
        notify(
          "Your vocabulary is full. Export a backup and remove a word first.",
        );
        return;
      }
      const parsed = wordSchema.safeParse({
        id: `library-${item.id}`,
        german: item.headword ?? item.german.replace(/^(der|die|das)\s+/u, ""),
        english: item.english,
        arabic: "",
        type: item.article ? "noun" : "phrase",
        article: item.article ?? "",
        plural: "",
        topic: item.topic?.slice(0, 100) || "Content library",
        lesson: state.currentLesson,
        example: "",
        hint: item.plural
          ? `Source plural notation: ${item.plural}. Check the full form before using it.`
          : "Imported source text. Add your own example and verify the meaning.",
        favorite: false,
        status: "new",
        due: new Date().toISOString(),
        interval: 0,
        ease: 2.5,
        reviews: 0,
        mistakes: 0,
        source: item.source,
      });
      if (!parsed.success) {
        notify(
          "This source entry needs a shorter headword or meaning. Open Vocabulary to add your own version.",
        );
        return;
      }
      notify(
        addWord(parsed.data)
          ? "Added to your vocabulary with source credits. Ready for your spaced reviews."
          : "This word is already in your vocabulary.",
      );
    } else {
      const parsed = libraryBookmarkSchema.safeParse({
        id: item.id,
        german: item.german,
        english: item.english,
        source: item.source,
      });
      if (!parsed.success || (state.libraryBookmarks ?? []).length >= 500) {
        notify(
          "Your saved library is full, or this source is too long to bookmark.",
        );
        return;
      }
      updateState((s) => ({
        ...s,
        libraryBookmarks: (s.libraryBookmarks ?? []).some(
          (saved) => saved.id === item.id,
        )
          ? s.libraryBookmarks
          : [...(s.libraryBookmarks ?? []), parsed.data],
      }));
      notify(
        "Source text saved privately with its attribution. Find it in your profile.",
      );
    }
  }
  function kept(item: LibraryItem) {
    return item.kind === "vocabulary"
      ? state.words.some(
          (word) =>
            word.id === `library-${item.id}` ||
            word.german.toLocaleLowerCase("de") ===
              (
                item.headword ?? item.german.replace(/^(der|die|das)\s+/u, "")
              ).toLocaleLowerCase("de"),
        )
      : (state.libraryBookmarks ?? []).some((saved) => saved.id === item.id);
  }
  function nextCard() {
    setIndex(index + 1);
    setFlipped(false);
    setRecall("");
    setFeedback("");
  }
  const practiceItems =
    rows?.items
      .filter(
        (item) =>
          ["vocabulary", "sentence_pair"].includes(item.kind) &&
          item.german &&
          item.english,
      )
      .slice(0, 10) ?? [];
  return (
    <div className="content-library">
      <header className="library-hero">
        <div>
          <span className="eyebrow">YOUR GERMAN · OPEN TO EXPLORE</span>
          <h1>
            More words.
            <br />
            More of your world.
          </h1>
          <p>
            Explore the supplied books and sentence collection. Hear a phrase,
            practise recalling it, and keep what matters to you.
          </p>
          <div className="library-hero-links">
            <Link href="/lessons">
              Your learning journey <ArrowRight size={16} />
            </Link>
            <Link href="/vocabulary">My vocabulary</Link>
          </div>
        </div>
        <div className="library-numbers" aria-label="Available library content">
          <div>
            <strong>{overview ? overview.words.toLocaleString() : "…"}</strong>
            <span>words & expressions</span>
          </div>
          <div>
            <strong>
              {overview ? overview.sentences.toLocaleString() : "…"}
            </strong>
            <span>German–English pairs</span>
          </div>
          <div>
            <strong>{overview ? overview.chapters.length : "…"}</strong>
            <span>book chapters</span>
          </div>
        </div>
      </header>
      <nav className="library-tabs" aria-label="Explore library collections">
        <button
          aria-pressed={collection === "deutsch_im_blick" && kind === "chapter"}
          onClick={() => choose("deutsch_im_blick", "chapter")}
        >
          <BookOpen size={18} /> Book chapters
        </button>
        <button
          aria-pressed={
            collection === "deutsch_im_blick" && kind === "vocabulary"
          }
          onClick={() => choose("deutsch_im_blick", "vocabulary")}
        >
          <Bookmark size={18} /> Words
        </button>
        <button
          aria-pressed={collection === "tatoeba"}
          onClick={() => choose("tatoeba", "sentence_pair")}
        >
          <Layers size={18} /> Sentences
        </button>
        <button
          aria-pressed={collection === "zum"}
          onClick={() => choose("zum", "wiki_page")}
        >
          ZUM readings
        </button>
      </nav>
      {(error || overviewError) && (
        <div className="library-error" role="alert">
          <p>{error || overviewError}</p>
          <Button
            variant="outline"
            onClick={() => {
              setError("");
              setOverviewError("");
              setReload(reload + 1);
            }}
          >
            Try again
          </Button>
        </div>
      )}
      {overview && !overview.available && (
        <p role="status">
          Some collections are still loading. Available collections can be
          explored below.
        </p>
      )}
      <section
        className="library-browse"
        aria-labelledby="library-browse-title"
      >
        <div className="section-heading">
          <div>
            <h2 id="library-browse-title">
              {chosen?.title ?? "Explore German"}
            </h2>
            <p>
              Source edition · German and English · Choose content by topic and
              sentence length.
            </p>
          </div>
          <Button
            disabled={!practiceItems.length}
            onClick={() => {
              setDeck(practiceItems);
              setIndex(0);
              setFlipped(false);
              setRecall("");
              setFeedback("");
            }}
          >
            Practise these {practiceItems.length || ""} <ArrowRight size={16} />
          </Button>
        </div>
        <form
          className="library-filters"
          onSubmit={(event) => {
            event.preventDefault();
            setQuery(search.trim());
          }}
        >
          <label className="library-search">
            Search German or English
            <div>
              <Search size={17} />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="work, family, Bahnhof…"
              />
            </div>
          </label>
          {chosen && (
            <label>
              Content type
              <select
                value={kind}
                onChange={(event) =>
                  setKind(event.target.value as LibraryQuery["kind"])
                }
              >
                {libraryKinds
                  .filter((type) => (chosen.counts[type] ?? 0) > 0)
                  .map((type) => (
                    <option key={type} value={type}>
                      {libraryKindLabels[type]} (
                      {chosen.counts[type].toLocaleString()})
                    </option>
                  ))}
              </select>
            </label>
          )}
          {collection === "deutsch_im_blick" && (
            <label>
              Chapter
              <select
                value={chapter}
                onChange={(event) => setChapter(event.target.value)}
              >
                <option value="">All chapters</option>
                {overview?.chapters.map((item) => (
                  <option
                    key={item.id}
                    value={item.chapter ?? Number(item.key)}
                  >
                    {item.german}
                  </option>
                ))}
              </select>
            </label>
          )}
          {kind === "sentence_pair" && (
            <label>
              Sentence length
              <select
                value={length}
                onChange={(event) =>
                  setLength(event.target.value as LibraryQuery["length"])
                }
              >
                <option value="all">All lengths</option>
                <option value="short">Up to 6 words</option>
                <option value="medium">7–12 words</option>
                <option value="long">13+ words</option>
              </select>
            </label>
          )}
          <Button type="submit">Search library</Button>
        </form>
        {!rows && !error && <p role="status">Loading source content…</p>}
        {rows && (
          <>
            <p className="library-loaded">
              {rows.items.length} items loaded · {libraryKindLabels[kind]}
              {chapter ? ` · Chapter ${chapter}` : ""}
            </p>
            <div
              className={`library-items ${kind === "chapter" ? "library-chapters" : ""}`}
            >
              {rows.items.map((item) => (
                <article key={item.id}>
                  <div className="library-item-meta">
                    <span>
                      {item.chapter
                        ? `Chapter ${item.chapter}`
                        : libraryKindLabels[item.kind]}
                    </span>
                    {item.page && <span>Page {item.page}</span>}
                  </div>
                  <h3 lang="de">
                    {item.kind === "source_page"
                      ? `Page ${item.page}`
                      : item.german}
                  </h3>
                  {item.english && <p>{item.english}</p>}
                  {item.topic && <small className="muted">{item.topic}</small>}
                  <div className="library-item-actions">
                    {item.kind === "chapter" ? (
                      <>
                        <Button
                          size="sm"
                          onClick={() =>
                            choose(
                              "deutsch_im_blick",
                              "vocabulary",
                              String(item.chapter ?? Number(item.key)),
                            )
                          }
                        >
                          Study chapter words <ArrowRight size={15} />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() =>
                            choose(
                              "deutsch_im_blick",
                              "activity",
                              String(item.chapter ?? Number(item.key)),
                            )
                          }
                        >
                          Activities
                        </Button>
                      </>
                    ) : (
                      <>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => void inspect(item)}
                        >
                          Read & explore
                        </Button>
                        {["vocabulary", "sentence_pair"].includes(
                          item.kind,
                        ) && (
                          <>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => hear(item)}
                              aria-label={`Hear ${item.german}`}
                            >
                              <Volume2 size={16} />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => keep(item)}
                              disabled={kept(item)}
                            >
                              {kept(item) ? (
                                <Check size={16} />
                              ) : (
                                <Bookmark size={16} />
                              )}
                              {kept(item)
                                ? "Kept"
                                : item.kind === "vocabulary"
                                  ? "Add word"
                                  : "Keep sentence"}
                            </Button>
                          </>
                        )}
                        {item.url && (
                          <a href={item.url} target="_blank" rel="noreferrer">
                            Open resource <ExternalLink size={14} />
                          </a>
                        )}
                      </>
                    )}
                  </div>
                  {["vocabulary", "sentence_pair", "wiki_page"].includes(
                    item.kind,
                  ) && <SourceCredit item={item} />}
                </article>
              ))}
            </div>
            {!rows.items.length && (
              <div className="library-empty">
                <Search size={28} />
                <h3>No matching content</h3>
                <p>Try a shorter search or explore another chapter.</p>
                <Button
                  variant="outline"
                  onClick={() => {
                    setSearch("");
                    setQuery("");
                    setChapter("");
                    setLength("all");
                  }}
                >
                  Clear filters
                </Button>
              </div>
            )}
            {rows.nextCursor && (
              <Button
                className="library-load-more"
                variant="outline"
                disabled={busy}
                onClick={async () => {
                  setBusy(true);
                  try {
                    const more = await libraryFetch<LibraryPage>(
                      `?${key}&cursor=${rows.nextCursor}`,
                    );
                    setListing((old) =>
                      old?.key === key
                        ? {
                            key,
                            items: [...old.items, ...more.items],
                            nextCursor: more.nextCursor,
                          }
                        : old,
                    );
                  } catch (e) {
                    setError(
                      e instanceof Error
                        ? e.message
                        : "More content could not load.",
                    );
                  } finally {
                    setBusy(false);
                  }
                }}
              >
                Load more content
              </Button>
            )}
          </>
        )}
      </section>
      <LibraryBookmarks />
      <Dialog
        open={!!detail}
        onOpenChange={(open) => !open && setDetail(null)}
        title={
          detail?.kind === "source_page"
            ? `Book page ${detail.page}`
            : (detail?.german.slice(0, 160) ?? "Source content")
        }
        description="Read the supplied source text and keep its original context and credits."
      >
        {detail && (
          <div className="library-detail">
            <p lang="de">{detail.kind !== "source_page" && detail.german}</p>
            {detail.english && <p className="muted">{detail.english}</p>}
            {detail.text && <pre>{detail.text}</pre>}
            {detail.plural && (
              <p>
                Source plural notation: <span lang="de">{detail.plural}</span>
              </p>
            )}
            <div className="button-row">
              {["vocabulary", "sentence_pair"].includes(detail.kind) && (
                <>
                  <Button onClick={() => hear(detail)}>
                    <Volume2 size={16} /> Hear with device voice
                  </Button>
                  <Button
                    variant="outline"
                    disabled={kept(detail)}
                    onClick={() => keep(detail)}
                  >
                    {kept(detail)
                      ? "Kept in your collection"
                      : detail.kind === "vocabulary"
                        ? "Add to my vocabulary"
                        : "Keep sentence with credits"}
                  </Button>
                </>
              )}
              {detail.url && (
                <Button variant="outline" asChild>
                  <a href={detail.url} target="_blank" rel="noreferrer">
                    Open original resource <ExternalLink size={15} />
                  </a>
                </Button>
              )}
              {detail.chapter && (
                <Button
                  variant="outline"
                  onClick={() => {
                    choose(
                      "deutsch_im_blick",
                      "source_page",
                      String(detail.chapter),
                    );
                    setDetail(null);
                  }}
                >
                  Read chapter pages
                </Button>
              )}
            </div>
            {detail.kind === "media_reference" && !detail.url && (
              <p>
                This is a QR reference from the supplied book. Open the original
                chapter to find its recording.
              </p>
            )}
            <SourceCredit item={detail} />
          </div>
        )}
      </Dialog>
      <Dialog
        open={!!deck.length}
        onOpenChange={(open) => !open && setDeck([])}
        title="Practise the source text"
        description="Recall the German, reveal its supplied English meaning, and compare your spelling. This is personal practice, not an exam grade."
      >
        {currentCard ? (
          <div className="library-practice">
            <span className="eyebrow">
              {index + 1} / {deck.length}
            </span>
            <div className="library-practice-card">
              <span>
                {flipped ? "SUPPLIED ENGLISH MEANING" : "GERMAN TO REMEMBER"}
              </span>
              <p lang={flipped ? "en" : "de"}>
                {flipped ? currentCard.english : currentCard.german}
              </p>
              <Button variant="ghost" onClick={() => setFlipped(!flipped)}>
                {flipped ? "Show German" : "Reveal meaning"}
              </Button>
            </div>
            <Button variant="outline" onClick={() => hear(currentCard)}>
              <Volume2 size={16} /> Hear German
            </Button>
            <form
              onSubmit={(event) => {
                event.preventDefault();
                setFeedback(
                  recallText(recall) === recallText(currentCard.german)
                    ? "Your text matches the supplied German."
                    : `Compare with the source: ${currentCard.german}`,
                );
              }}
            >
              <label htmlFor="library-recall">
                Type the German from memory
              </label>
              <input
                id="library-recall"
                lang="de"
                autoComplete="off"
                maxLength={1000}
                value={recall}
                onChange={(event) => {
                  setRecall(event.target.value);
                  setFeedback("");
                }}
              />
              <Button disabled={!recall.trim()}>Check recall</Button>
            </form>
            {feedback && <p role="status">{feedback}</p>}
            <div className="button-row">
              <Button onClick={nextCard}>
                Next source <ArrowRight size={16} />
              </Button>
              <Button
                variant="outline"
                onClick={() => keep(currentCard)}
                disabled={kept(currentCard)}
              >
                {kept(currentCard) ? "Kept" : "Keep this source"}
              </Button>
            </div>
            <SourceCredit item={currentCard} />
          </div>
        ) : (
          <div className="library-empty">
            <Check size={30} />
            <h3>You explored {deck.length} source texts.</h3>
            <p>Come back to the ones you want to remember.</p>
            <Button onClick={() => setDeck([])}>Back to the library</Button>
          </div>
        )}
      </Dialog>
    </div>
  );
}
