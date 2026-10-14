"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  Archive,
  ArrowLeft,
  BookOpen,
  Download,
  ExternalLink,
  RefreshCw,
  ShieldCheck,
} from "lucide-react";
import { authClient } from "@/lib/auth-client";
import {
  intakeKinds,
  intakeReviewCategories,
  type IntakeKind,
  type IntakeReviewCategory,
} from "@/lib/content-intake/constants";
import type {
  IntakeSummary,
  IntakeRow,
  IntakeDetail,
} from "@/lib/content-intake/repository";
import type { CorrectedEntry } from "@/lib/content-intake/model";
import { levels } from "@/lib/content-factory/constants";
import { Button } from "./ui/button";
import { Dialog } from "./ui/dialog";
const names: Record<IntakeKind, string> = {
  source_document: "Source credits",
  chapter: "Chapter outlines",
  source_page: "Original pages",
  vocabulary: "Vocabulary",
  vocabulary_category: "Vocabulary topics",
  activity: "Activities",
  grammar_reference: "Grammar references",
  source_link: "External links",
  media_reference: "QR and media references",
  extraction_warning: "Extraction warnings",
  sentence_pair: "German–English pairs",
  wiki_page: "Curated wiki text",
  quarantine: "Source investigation",
};
type Overview = {
  archives: IntakeSummary[];
  roles: string[];
  userId: string;
  lessons: { id: string; title: string; level: string; subdivision: string }[];
};
function sourceLink(value: unknown) {
  try {
    const url = new URL(String(value));
    return ["https:", "http:"].includes(url.protocol) &&
      !url.username &&
      !url.password
      ? url.href
      : null;
  } catch {
    return null;
  }
}
function newEntry(detail: IntakeDetail): CorrectedEntry {
  const p = detail.item.payload,
    article = ["der", "die", "das"].includes(String(p.article))
      ? (p.article as "der" | "die" | "das")
      : null;
  return (
    detail.draft?.entry ?? {
      kind: detail.item.kind as CorrectedEntry["kind"],
      german: String(p.headword ?? detail.item.german ?? ""),
      english: detail.item.english ?? "",
      arabic: "",
      cefr: "A1",
      targetLesson: "",
      topic: detail.item.topic ?? "",
      context: "",
      partOfSpeech:
        detail.item.kind === "activity"
          ? "activity"
          : article
            ? "noun"
            : "phrase",
      article,
      plural: null,
      pluralKind: article ? "unknown" : "not_used",
      modifications: "",
      rightsNotes: "",
    }
  );
}
export function ContentImportStudio({
  initialProvider,
}: {
  initialProvider?: string;
}) {
  const { data: session, isPending } = authClient.useSession(),
    userId = session?.user.id;
  const account = useRef(userId);
  useEffect(() => {
    account.current = userId;
  }, [userId]);
  const [overview, setOverview] = useState<Overview | null>(null),
    [selected, setSelected] = useState("");
  const [kind, setKind] = useState<IntakeKind>("vocabulary"),
    [chapter, setChapter] = useState(""),
    [listType, setListType] = useState(""),
    [search, setSearch] = useState(""),
    [query, setQuery] = useState(""),
    [drafted, setDrafted] = useState("");
  const [listing, setListing] = useState<{
    userId: string;
    key: string;
    items: IntakeRow[];
    nextCursor: number | null;
  } | null>(null);
  const [detail, setDetail] = useState<{
      userId: string;
      value: IntakeDetail;
    } | null>(null),
    [entry, setEntry] = useState<CorrectedEntry | null>(null);
  const [message, setMessage] = useState<{
      userId: string;
      text: string;
      error: boolean;
    } | null>(null),
    [busyAccount, setBusyAccount] = useState<string | null>(null),
    [loadingItem, setLoadingItem] = useState(false),
    [reload, setReload] = useState(0);
  const busy = busyAccount === userId;
  const [leaveAction, setLeaveAction] = useState<(() => void) | null>(null);
  const [category, setCategory] = useState<IntakeReviewCategory | "">(""),
    [decision, setDecision] = useState<"approved" | "changes_requested" | "">(
      "",
    ),
    [comment, setComment] = useState("");
  const currentOverview = overview?.userId === userId ? overview : null,
    currentDetail = detail && detail.userId === userId ? detail.value : null;
  const archive = currentOverview?.archives.find((a) => a.id === selected);
  const selectedRef = useRef(selected);
  useEffect(() => {
    selectedRef.current = selected;
  }, [selected]);
  const dirty = !!(
    currentDetail &&
    entry &&
    JSON.stringify(entry) !== JSON.stringify(newEntry(currentDetail))
  );
  function leave(work: () => void) {
    if (dirty) setLeaveAction(() => work);
    else work();
  }
  const params = new URLSearchParams({
    archive: selected,
    kind,
    ...(chapter ? { chapter } : {}),
    ...(listType ? { listType } : {}),
    ...(query ? { q: query } : {}),
    ...(drafted ? { drafted } : {}),
  });
  const listKey = params.toString(),
    rows =
      listing && listing.userId === userId && listing.key === listKey
        ? listing
        : null;
  async function request(path: string, action?: unknown, signal?: AbortSignal) {
    const response = await fetch(`/api/admin/content/imports${path}`, {
      method: action ? "POST" : "GET",
      cache: "no-store",
      signal,
      headers: {
        "Content-Type": "application/json",
        "X-Learning-Account": userId ?? "",
      },
      ...(action ? { body: JSON.stringify(action) } : {}),
    });
    const body = await response.json();
    if (!response.ok)
      throw new Error(
        [
          body.error,
          ...(body.issues ?? []).map(
            (i: { path: string; message: string }) => `${i.path}: ${i.message}`,
          ),
        ].join("\n"),
      );
    return body;
  }
  useEffect(() => {
    if (!userId) return;
    const controller = new AbortController();
    void (async () => {
      try {
        const response = await fetch("/api/admin/content/imports", {
            cache: "no-store",
            signal: controller.signal,
            headers: { "X-Learning-Account": userId },
          }),
          body = await response.json();
        if (!response.ok)
          throw new Error(body.error ?? "Source imports could not load.");
        if (controller.signal.aborted) return;
        setOverview(body);
        const first =
          body.archives.find(
            (a: IntakeSummary) =>
              a.provider === initialProvider && a.state === "complete",
          ) ?? body.archives.find((a: IntakeSummary) => a.state === "complete");
        if (
          first &&
          !body.archives.some(
            (a: IntakeSummary) => a.id === selectedRef.current,
          )
        ) {
          setSelected(first.id);
          setKind(
            first.provider === "tatoeba"
              ? "sentence_pair"
              : first.provider === "zum"
                ? "wiki_page"
                : "vocabulary",
          );
        }
      } catch (error) {
        if (!controller.signal.aborted)
          setMessage({
            userId,
            text:
              error instanceof Error
                ? error.message
                : "Source imports could not load.",
            error: true,
          });
      }
    })();
    return () => controller.abort();
  }, [userId, reload, initialProvider]);
  useEffect(() => {
    if (!userId || !selected) return;
    const controller = new AbortController();
    void (async () => {
      try {
        const response = await fetch(`/api/admin/content/imports?${listKey}`, {
            cache: "no-store",
            signal: controller.signal,
            headers: { "X-Learning-Account": userId },
          }),
          body = await response.json();
        if (!response.ok)
          throw new Error(body.error ?? "Source items could not load.");
        if (!controller.signal.aborted)
          setListing({ ...body, userId, key: listKey });
      } catch (error) {
        if (!controller.signal.aborted)
          setMessage({
            userId,
            text:
              error instanceof Error
                ? error.message
                : "Source items could not load.",
            error: true,
          });
      }
    })();
    return () => controller.abort();
  }, [userId, selected, listKey, reload]);
  async function run(work: () => Promise<void>) {
    if (!userId) return;
    const owner = userId;
    setBusyAccount(owner);
    setMessage(null);
    try {
      await work();
    } catch (error) {
      if (account.current === owner)
        setMessage({
          userId: owner,
          text:
            error instanceof Error
              ? error.message
              : "This action could not finish.",
          error: true,
        });
    } finally {
      if (account.current === owner) setBusyAccount(null);
    }
  }
  async function open(itemId: number) {
    const owner = userId!;
    setLoadingItem(true);
    await run(async () => {
      const value = await request(`?item=${itemId}`);
      if (account.current === owner) {
        setDetail({ userId: owner, value });
        setEntry(newEntry(value));
        setCategory("");
        setDecision("");
        setComment("");
        document.getElementById("intake-editor-heading")?.focus();
      }
    });
    setLoadingItem(false);
  }
  function chooseArchive(value: IntakeSummary) {
    leave(() => {
      setSelected(value.id);
      setKind(
        value.provider === "tatoeba"
          ? "sentence_pair"
          : value.provider === "zum"
            ? "wiki_page"
            : "vocabulary",
      );
      setChapter("");
      setListType("");
      setSearch("");
      setQuery("");
      setDrafted("");
      setDetail(null);
      setEntry(null);
      setMessage(null);
    });
  }
  function exportReview() {
    if (!currentDetail?.draft || currentDetail.draft.blockers.length || dirty)
      return;
    const json = JSON.stringify(
      {
        schemaVersion: 1,
        status: "reviewed_for_authoring",
        sourceArchive: currentDetail.archive,
        item: currentDetail.item,
        correctedDraft: currentDetail.draft,
        notice:
          "This is a reviewed source bundle, not a published lesson or an audio approval.",
      },
      null,
      2,
    );
    const url = URL.createObjectURL(
      new Blob([json], { type: "application/json" }),
    );
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `source-${currentDetail.item.key}-draft-${currentDetail.draft.version}.json`;
    anchor.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  if (isPending)
    return (
      <section className="panel">
        <p role="status">Checking your content account…</p>
      </section>
    );
  if (!userId)
    return (
      <section className="panel">
        <h1>Source imports</h1>
        <p>
          Sign in with your authorized content-team account to review the
          archives.
        </p>
        <Link href="/signin?next=/admin/content/imports">
          Continue with Google
        </Link>
      </section>
    );
  return (
    <div className="content-studio intake-studio">
      <header className="studio-heading">
        <div>
          <span className="eyebrow">CONTENT FACTORY · SOURCE LIBRARY</span>
          <h1>Turn good sources into useful German.</h1>
          <p>
            Explore the full archives. Keep the original. Review every
            adaptation.
          </p>
        </div>
        <div>
          <Link href="/admin/content/coverage">Curriculum coverage →</Link>
          <br />
          <Link href="/admin/content">Lesson review studio →</Link>
        </div>
      </header>
      <div className="factory-note">
        <ShieldCheck size={22} aria-hidden="true" />
        <p>
          These imports are unverified source material. Corrections and reviewer
          decisions stay separate from the originals. Chapter numbers are not
          CEFR levels; QR codes are not playable recordings.
        </p>
      </div>
      {message?.userId === userId && (
        <div
          className="intake-message"
          role={message.error ? "alert" : "status"}
        >
          <p>{message.text}</p>
          {message.error && (
            <Button
              variant="outline"
              onClick={() => {
                if (currentDetail) {
                  leave(() => void open(currentDetail.item.id));
                  return;
                }
                setMessage(null);
                setOverview(null);
                setReload((n) => n + 1);
              }}
            >
              {currentDetail ? "Reload this source item" : "Reload sources"}
            </Button>
          )}
        </div>
      )}
      {!currentOverview && !message && (
        <p role="status">Opening the review branch…</p>
      )}
      {currentOverview && (
        <>
          <div className="intake-section-heading">
            <h2>Available archives</h2>
            <Button
              variant="outline"
              onClick={() => setReload((n) => n + 1)}
              disabled={busy}
            >
              <RefreshCw size={16} aria-hidden="true" />
              Refresh
            </Button>
          </div>
          <div className="intake-archives">
            {currentOverview.archives.map((source) => (
              <button
                type="button"
                key={source.id}
                disabled={source.state !== "complete" || busy}
                onClick={() => chooseArchive(source)}
                aria-pressed={selected === source.id}
              >
                <Archive size={20} aria-hidden="true" />
                <strong>{source.title}</strong>
                <span>
                  {source.expectedCount.toLocaleString()} source records
                </span>
                <small>
                  {source.state === "complete"
                    ? "Imported · Human review pending"
                    : "Import in progress · Not available yet"}
                </small>
              </button>
            ))}
          </div>
          {!currentOverview.archives.length && (
            <section className="panel">
              <h2>No source archives imported yet</h2>
              <p>
                Run the audited resource import on the configured review branch,
                then refresh this page.
              </p>
            </section>
          )}
          {archive && !currentDetail && (
            <section
              className="panel intake-browser"
              aria-labelledby="intake-browser-heading"
            >
              <div className="intake-section-heading">
                <div>
                  <h2 id="intake-browser-heading">{archive.title}</h2>
                  <p>{archive.manifest.attribution}</p>
                </div>
                <a
                  href={sourceLink(archive.manifest.sourceUrl) ?? "#"}
                  target="_blank"
                  rel="noreferrer"
                >
                  Source <ExternalLink size={15} aria-hidden="true" />
                </a>
              </div>
              <form
                className="intake-filters"
                onSubmit={(event) => {
                  event.preventDefault();
                  setQuery(search.trim());
                }}
              >
                <label>
                  Content type
                  <select
                    value={kind}
                    onChange={(event) => {
                      setKind(event.target.value as IntakeKind);
                      setListType("");
                    }}
                  >
                    {intakeKinds
                      .filter((k) => (archive.manifest.counts[k] ?? 0) > 0)
                      .map((k) => (
                        <option key={k} value={k}>
                          {names[k]} ({archive.manifest.counts[k]})
                        </option>
                      ))}
                  </select>
                </label>
                {archive.provider === "deutsch_im_blick" && (
                  <label>
                    Chapter
                    <select
                      value={chapter}
                      onChange={(event) => setChapter(event.target.value)}
                    >
                      <option value="">All chapters</option>
                      {Array.from({ length: 10 }, (_, i) => (
                        <option key={i} value={i + 1}>
                          Chapter {i + 1}
                        </option>
                      ))}
                    </select>
                  </label>
                )}
                {kind === "vocabulary" && (
                  <label>
                    Vocabulary list
                    <select
                      value={listType}
                      onChange={(event) => setListType(event.target.value)}
                    >
                      <option value="">All lists</option>
                      <option value="core">Core</option>
                      <option value="expanded">Expanded</option>
                    </select>
                  </label>
                )}
                <label>
                  Editorial status
                  <select
                    value={drafted}
                    onChange={(event) => setDrafted(event.target.value)}
                  >
                    <option value="">All items</option>
                    <option value="false">
                      Original · No correction draft
                    </option>
                    <option value="true">Has correction draft</option>
                  </select>
                </label>
                <label className="intake-search">
                  Search German or English
                  <input
                    type="search"
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder="Bahnhof, travel, greetings…"
                  />
                </label>
                <Button type="submit" disabled={busy}>
                  Search sources
                </Button>
              </form>
              {!rows && !message && <p role="status">Loading source items…</p>}
              {rows && (
                <>
                  <p className="muted small">
                    {rows.items.length} source items loaded · {names[kind]} ·
                    Unverified until reviewed
                  </p>
                  <div className="intake-items">
                    {rows.items.map((item) => (
                      <article key={item.id}>
                        <div className="intake-item-meta">
                          <span>
                            {item.chapter
                              ? `Chapter ${item.chapter}`
                              : names[item.kind]}
                          </span>
                          {item.page && <span>Page {item.page}</span>}
                          <span>
                            {item.hasDraft
                              ? "Correction draft"
                              : "Original source"}
                          </span>
                        </div>
                        <h3 lang="de">
                          {(item.german ?? item.topic ?? item.key)
                            .replace(/\s+/g, " ")
                            .slice(0, 100)}
                        </h3>
                        {item.english && <p>{item.english}</p>}
                        {item.topic && (
                          <p className="muted small">{item.topic}</p>
                        )}
                        <Button
                          variant="outline"
                          disabled={busy}
                          onClick={() => void open(item.id)}
                        >
                          Inspect source{" "}
                          <BookOpen size={15} aria-hidden="true" />
                        </Button>
                      </article>
                    ))}
                  </div>
                  {!rows.items.length && (
                    <div>
                      <h3>No matching source items</h3>
                      <p>
                        Try another chapter or use a different German or English
                        search term.
                      </p>
                    </div>
                  )}
                  {rows.nextCursor && (
                    <Button
                      variant="outline"
                      disabled={busy}
                      onClick={() =>
                        void run(async () => {
                          const next = await request(
                            `?${listKey}&cursor=${rows.nextCursor}`,
                          );
                          if (account.current === userId)
                            setListing({
                              userId,
                              key: listKey,
                              items: [...rows.items, ...next.items],
                              nextCursor: next.nextCursor,
                            });
                        })
                      }
                    >
                      Load more source items
                    </Button>
                  )}
                </>
              )}
            </section>
          )}
          {loadingItem && (
            <p role="status">Loading original text and review history…</p>
          )}
          {currentDetail && entry && (
            <section
              className="intake-editor"
              aria-labelledby="intake-editor-heading"
            >
              <Button
                variant="outline"
                disabled={busy}
                onClick={() =>
                  leave(() => {
                    setDetail(null);
                    setEntry(null);
                    setMessage(null);
                  })
                }
              >
                <ArrowLeft size={16} aria-hidden="true" />
                Back to source list
              </Button>
              <h2 id="intake-editor-heading" tabIndex={-1}>
                {names[currentDetail.item.kind]} ·{" "}
                {currentDetail.item.page
                  ? `Page ${currentDetail.item.page}`
                  : currentDetail.item.key}
              </h2>
              <div className="intake-editor-columns">
                <section className="panel">
                  <span className="eyebrow">ORIGINAL SOURCE · PRESERVED</span>
                  <h3>{currentDetail.archive.title}</h3>
                  <p lang="de" className="intake-original">
                    {currentDetail.item.german ??
                      String(
                        currentDetail.item.payload.sourceExcerpt ??
                          currentDetail.item.payload.rawRow ??
                          currentDetail.item.payload.reference_code ??
                          currentDetail.item.payload.title ??
                          "Source metadata below",
                      )}
                  </p>
                  {currentDetail.item.english && (
                    <p>{currentDetail.item.english}</p>
                  )}
                  {currentDetail.item.payload.plural_notation != null && (
                    <p>
                      <strong>Printed plural notation:</strong>{" "}
                      {String(currentDetail.item.payload.plural_notation)}.
                      Verify the full form before using it.
                    </p>
                  )}
                  {["activity", "media_reference"].includes(
                    currentDetail.item.kind,
                  ) && (
                    <p className="factory-warning">
                      This source has no verified answer key or licensed
                      playable media. Do not infer answers from a QR code or an
                      interview title.
                    </p>
                  )}
                  {sourceLink(
                    currentDetail.item.payload.url ??
                      currentDetail.item.payload.reference_url ??
                      currentDetail.item.payload.sourceUrl ??
                      currentDetail.archive.manifest.sourceUrl,
                  ) && (
                    <a
                      href={sourceLink(
                        currentDetail.item.payload.url ??
                          currentDetail.item.payload.reference_url ??
                          currentDetail.item.payload.sourceUrl ??
                          currentDetail.archive.manifest.sourceUrl,
                      )!}
                      target="_blank"
                      rel="noreferrer"
                    >
                      Inspect original location{" "}
                      <ExternalLink size={15} aria-hidden="true" />
                    </a>
                  )}
                  {currentDetail.sourcePage && (
                    <details>
                      <summary>
                        Read original page {currentDetail.sourcePage.page}
                      </summary>
                      <pre className="intake-page-text">
                        {currentDetail.sourcePage.text}
                      </pre>
                    </details>
                  )}
                  <details>
                    <summary>
                      Attribution, extraction and source metadata
                    </summary>
                    <p>{currentDetail.archive.manifest.attribution}</p>
                    <p>
                      License claim:{" "}
                      {currentDetail.archive.manifest.licenseClaim}; item rights
                      still need review.
                    </p>
                    <pre className="intake-page-text">
                      {JSON.stringify(currentDetail.item.payload, null, 2)}
                    </pre>
                  </details>
                </section>
                {["vocabulary", "sentence_pair", "activity"].includes(
                  currentDetail.item.kind,
                ) && (
                  <section className="panel">
                    <span className="eyebrow">
                      SEPARATE CORRECTION ·{" "}
                      {currentDetail.draft
                        ? `VERSION ${currentDetail.draft.version}`
                        : "NEW DRAFT"}
                    </span>
                    <h3>Prepare this for a lesson</h3>
                    <p>
                      Keep meaning, context and modifications explicit. Saving
                      creates an unapproved revision.
                    </p>
                    <form
                      className="intake-correction"
                      onSubmit={(event) => {
                        event.preventDefault();
                        void run(async () => {
                          const value = await request("", {
                            action: "save_draft",
                            itemId: currentDetail.item.id,
                            sourceHash: currentDetail.item.hash,
                            expectedVersion: currentDetail.draft?.version ?? 0,
                            entry,
                          });
                          if (account.current === userId) {
                            setDetail({ userId, value });
                            setEntry(value.draft.entry);
                            setMessage({
                              userId,
                              text: "Correction revision saved. Reviews start fresh for this hash.",
                              error: false,
                            });
                          }
                        });
                      }}
                    >
                      {(
                        [
                          ["german", "German"],
                          ["english", "English meaning / instructions"],
                          ["arabic", "Arabic meaning / instructions"],
                        ] as const
                      ).map(([field, label]) => (
                        <label key={field}>
                          {label}
                          <textarea
                            required
                            lang={
                              field === "german"
                                ? "de"
                                : field === "arabic"
                                  ? "ar"
                                  : "en"
                            }
                            dir={field === "arabic" ? "rtl" : undefined}
                            value={entry[field]}
                            onChange={(event) =>
                              setEntry({
                                ...entry,
                                [field]: event.target.value,
                              })
                            }
                          />
                        </label>
                      ))}
                      <div className="intake-form-pair">
                        <label>
                          Proposed level
                          <select
                            value={entry.cefr}
                            onChange={(event) =>
                              setEntry({
                                ...entry,
                                cefr: event.target
                                  .value as CorrectedEntry["cefr"],
                                targetLesson: "",
                              })
                            }
                          >
                            {levels.map((level) => (
                              <option key={level}>{level}</option>
                            ))}
                          </select>
                        </label>
                        <label>
                          Target lesson
                          <select
                            required
                            value={entry.targetLesson}
                            onChange={(event) =>
                              setEntry({
                                ...entry,
                                targetLesson: event.target.value,
                              })
                            }
                          >
                            <option value="">Choose a lesson</option>
                            {currentOverview.lessons
                              .filter((lesson) => lesson.level === entry.cefr)
                              .map((lesson) => (
                                <option key={lesson.id} value={lesson.id}>
                                  {lesson.subdivision} · {lesson.title}
                                </option>
                              ))}
                          </select>
                        </label>
                      </div>
                      <div className="intake-form-pair">
                        <label>
                          Part of speech / type
                          <select
                            value={entry.partOfSpeech}
                            onChange={(event) =>
                              setEntry({
                                ...entry,
                                partOfSpeech: event.target
                                  .value as CorrectedEntry["partOfSpeech"],
                                article:
                                  event.target.value === "noun"
                                    ? entry.article
                                    : null,
                                plural:
                                  event.target.value === "noun"
                                    ? entry.plural
                                    : null,
                                pluralKind:
                                  event.target.value === "noun"
                                    ? "unknown"
                                    : "not_used",
                              })
                            }
                          >
                            {[
                              "noun",
                              "verb",
                              "adjective",
                              "phrase",
                              "activity",
                            ].map((type) => (
                              <option key={type}>{type}</option>
                            ))}
                          </select>
                        </label>
                        {entry.partOfSpeech === "noun" && (
                          <label>
                            Article
                            <select
                              required
                              value={entry.article ?? ""}
                              onChange={(event) =>
                                setEntry({
                                  ...entry,
                                  article: event.target.value as
                                    "der" | "die" | "das",
                                })
                              }
                            >
                              <option value="">Choose an article</option>
                              {["der", "die", "das"].map((article) => (
                                <option key={article}>{article}</option>
                              ))}
                            </select>
                          </label>
                        )}
                      </div>
                      {entry.partOfSpeech === "noun" && (
                        <div className="intake-form-pair">
                          <label>
                            Plural status
                            <select
                              value={entry.pluralKind}
                              onChange={(event) =>
                                setEntry({
                                  ...entry,
                                  pluralKind: event.target
                                    .value as CorrectedEntry["pluralKind"],
                                  plural:
                                    event.target.value === "form"
                                      ? entry.plural
                                      : null,
                                })
                              }
                            >
                              <option value="unknown">Needs review</option>
                              <option value="form">Confirmed full form</option>
                              <option value="not_used">
                                Not used in this sense
                              </option>
                            </select>
                          </label>
                          {entry.pluralKind === "form" && (
                            <label>
                              Full plural form
                              <input
                                required
                                value={entry.plural ?? ""}
                                onChange={(event) =>
                                  setEntry({
                                    ...entry,
                                    plural: event.target.value,
                                  })
                                }
                              />
                            </label>
                          )}
                        </div>
                      )}
                      {(
                        [
                          ["topic", "Topic"],
                          ["context", "Intended situation and meaning"],
                          ["modifications", "What changed from the original"],
                          ["rightsNotes", "Item rights and attribution notes"],
                        ] as const
                      ).map(([field, label]) => (
                        <label key={field}>
                          {label}
                          <textarea
                            required
                            value={entry[field]}
                            onChange={(event) =>
                              setEntry({
                                ...entry,
                                [field]: event.target.value,
                              })
                            }
                          />
                        </label>
                      ))}
                      <div className="button-row">
                        <Button
                          type="submit"
                          disabled={
                            busy || !currentOverview.roles.includes("author")
                          }
                        >
                          Save correction revision
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          disabled={busy}
                          onClick={() => setEntry(newEntry(currentDetail))}
                        >
                          Reset form
                        </Button>
                      </div>
                    </form>
                  </section>
                )}
              </div>
              {currentDetail.draft && (
                <section className="panel intake-review">
                  <h3>Review this exact revision</h3>
                  {dirty && (
                    <p className="factory-warning">
                      Save or reset the unsaved corrections before reviewing or
                      exporting this revision.
                    </p>
                  )}
                  <p className="muted small">
                    Version {currentDetail.draft.version} · Author:{" "}
                    {currentDetail.draft.authorName} · Hash{" "}
                    {currentDetail.draft.contentHash.slice(0, 16)}…
                  </p>
                  {currentDetail.draft.blockers.length ? (
                    <ul>
                      {currentDetail.draft.blockers.map((blocker) => (
                        <li key={blocker}>{blocker}</li>
                      ))}
                    </ul>
                  ) : (
                    <div className="factory-note">
                      <ShieldCheck size={20} aria-hidden="true" />
                      <p>
                        Text is reviewed for lesson authoring. The resulting
                        lesson still needs its own language, assessment, rights
                        and audio checks.
                      </p>
                    </div>
                  )}
                  <form
                    className="intake-review-form"
                    onSubmit={(event) => {
                      event.preventDefault();
                      if (!category || !decision || dirty) return;
                      void run(async () => {
                        await request("", {
                          action: "review",
                          draftId: currentDetail.draft!.id,
                          contentHash: currentDetail.draft!.contentHash,
                          category,
                          decision,
                          comment,
                        });
                        const value = await request(
                          `?item=${currentDetail.item.id}`,
                        );
                        if (account.current === userId) {
                          setDetail({ userId, value });
                          setDecision("");
                          setComment("");
                          setMessage({
                            userId,
                            text: "Review recorded for this exact draft.",
                            error: false,
                          });
                        }
                      });
                    }}
                  >
                    <label>
                      Review area
                      <select
                        required
                        value={category}
                        onChange={(event) =>
                          setCategory(
                            event.target.value as IntakeReviewCategory,
                          )
                        }
                      >
                        <option value="">Choose your review area</option>
                        {intakeReviewCategories
                          .filter((role) =>
                            currentOverview.roles.includes(role),
                          )
                          .map((role) => (
                            <option key={role}>{role}</option>
                          ))}
                      </select>
                    </label>
                    <label>
                      Decision
                      <select
                        required
                        value={decision}
                        onChange={(event) =>
                          setDecision(event.target.value as typeof decision)
                        }
                      >
                        <option value="">Choose a decision</option>
                        <option value="changes_requested">
                          Request changes
                        </option>
                        <option value="approved">Approve this revision</option>
                      </select>
                    </label>
                    <label>
                      Review evidence / reason
                      <textarea
                        required
                        value={comment}
                        onChange={(event) => setComment(event.target.value)}
                      />
                    </label>
                    <Button
                      type="submit"
                      disabled={
                        busy ||
                        dirty ||
                        !category ||
                        !decision ||
                        !comment.trim()
                      }
                    >
                      Record review
                    </Button>
                  </form>
                  <div className="intake-review-history">
                    {currentDetail.draft.reviews.map((review, i) => (
                      <article key={i}>
                        <strong>
                          {review.category} ·{" "}
                          {review.decision === "approved"
                            ? "Approved"
                            : "Changes requested"}
                        </strong>
                        <p>{review.comment}</p>
                        <small>
                          {review.reviewerName} ·{" "}
                          {new Date(review.reviewedAt).toLocaleString()}
                        </small>
                      </article>
                    ))}
                  </div>
                  <Button
                    variant="outline"
                    disabled={
                      busy || dirty || currentDetail.draft.blockers.length > 0
                    }
                    onClick={exportReview}
                  >
                    <Download size={16} aria-hidden="true" />
                    Export reviewed source bundle
                  </Button>
                </section>
              )}
            </section>
          )}
        </>
      )}
      <Dialog
        open={!!leaveAction}
        title="Discard unsaved corrections?"
        description="Your saved revisions and original source stay available. The changes in this form have not been saved."
        onOpenChange={(open) => {
          if (!open) setLeaveAction(null);
        }}
      >
        <div className="button-row">
          <Button variant="outline" onClick={() => setLeaveAction(null)}>
            Keep editing
          </Button>
          <Button
            onClick={() => {
              leaveAction?.();
              setLeaveAction(null);
            }}
          >
            Discard changes
          </Button>
        </div>
      </Dialog>
    </div>
  );
}
