"use client";
import { useState } from "react";
import Link from "next/link";
import { Check, FileUp, Headphones, Send, ShieldCheck } from "lucide-react";
import { Button } from "./ui/button";
import { ContentSourceCredits } from "./content-source-credits";
import { authClient } from "@/lib/auth-client";
import { diffContent, type ContentChange } from "@/lib/content-pipeline/diff";
import {
  reviewCategories,
  type ContentDetail,
  type ContentRole,
  type AdminContentAction,
} from "@/lib/content-pipeline/model";

type LessonRow = {
  lessonKey: string;
  version: number;
  title: { de: string; en: string; ar: string };
  courseId: string;
  contentHash: string;
  approvedGates: number;
  published: boolean;
};
export function ContentReviewWorkbench({
  roles,
  userId,
}: {
  roles: ContentRole[];
  userId: string;
}) {
  const { data: session, isPending } = authClient.useSession();
  const [lessons, setLessons] = useState<LessonRow[]>([]),
    [detail, setDetail] = useState<ContentDetail | null>(null);
  const [draft, setDraft] = useState(""),
    [comment, setComment] = useState(""),
    [busy, setBusy] = useState(false),
    [message, setMessage] = useState("");
  const [loaded, setLoaded] = useState(false),
    [confirmed, setConfirmed] = useState(false);
  const [changes, setChanges] = useState<ContentChange[] | null>(null);
  async function request(path = "", action?: AdminContentAction) {
    const response = await fetch(`/api/admin/content${path}`, {
      method: action ? "POST" : "GET",
      cache: "no-store",
      headers: {
        "Content-Type": "application/json",
        "X-Learning-Account": userId,
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
  async function run(work: () => Promise<void>) {
    setBusy(true);
    setMessage("");
    try {
      await work();
    } catch (error) {
      setMessage((error as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function refresh() {
    const body = await request();
    setLessons(body.lessons);
    setLoaded(true);
  }
  async function choose(row: LessonRow) {
    await run(async () => {
      setDetail(
        await request(
          `?lesson=${encodeURIComponent(row.lessonKey)}&version=${row.version}`,
        ),
      );
      setComment("");
      setConfirmed(false);
      setChanges(null);
    });
  }
  async function mutate(action: AdminContentAction) {
    await run(async () => {
      const result = await request("", action);
      if (action.action === "import") {
        setDetail(
          await request(
            `?lesson=${result.lessonKey}&version=${result.version}`,
          ),
        );
        setDraft("");
        setMessage("Draft imported. Human review is still required.");
      } else {
        setDetail(result);
        setMessage(
          action.action === "publish"
            ? "Reviewed version published."
            : action.action === "check_audio"
              ? "Recording files checked. Listen before approving audio."
              : "Review recorded for this version.",
        );
      }
      setConfirmed(false);
      setComment("");
      await refresh();
    });
  }
  if (isPending)
    return (
      <section className="panel">
        <p role="status">Checking your content session…</p>
      </section>
    );
  if (session?.user.id !== userId)
    return (
      <section className="panel">
        <h1>Your content session changed.</h1>
        <p>
          Sign in with your authorized Google account, then reload the studio.
        </p>
        <Link href="/signin?next=/admin/content">Sign in with Google</Link>
      </section>
    );
  return (
    <div className="content-studio">
      <header className="studio-heading">
        <div>
          <span className="eyebrow">DEUTSCH JOURNEY · CONTENT STUDIO</span>
          <h1>Good German starts with careful review.</h1>
          <p>Original lessons. Named reviewers. Every recording checked.</p>
        </div>
        <div>
          <Link href="/admin/content/coverage">Curriculum coverage →</Link>
          <br />
          <Link href="/admin/content/imports">Source imports →</Link>
          <br />
          <Link href="/courses">View published courses →</Link>
        </div>
      </header>
      <div className="studio-principle">
        <ShieldCheck size={22} aria-hidden="true" />
        <p>
          A structural check is a starting point. Language, teaching,
          translations, rights and audio each need a human decision.
        </p>
      </div>
      <p role="status" className="studio-message">
        {message}
      </p>
      <div className="studio-layout">
        <aside className="panel studio-queue">
          <h2>Review queue</h2>
          <Button
            variant="outline"
            disabled={busy}
            onClick={() => void run(refresh)}
          >
            Load / refresh lessons
          </Button>
          {!loaded ? (
            <p className="muted">
              Load the queue to see imported lesson versions.
            </p>
          ) : !lessons.length ? (
            <p className="muted">
              Import the Lesson 1 pilot to begin. No drafts are public.
            </p>
          ) : (
            <ul>
              {lessons.map((row) => (
                <li key={`${row.lessonKey}-${row.version}`}>
                  <button
                    disabled={busy}
                    onClick={() => void choose(row)}
                    aria-pressed={
                      detail?.pack.id === row.lessonKey &&
                      detail.pack.version === row.version
                    }
                  >
                    <span>{row.title.en}</span>
                    <small>
                      {row.courseId} · v{row.version} · {row.approvedGates}/5
                      reviews {row.published ? "· Published" : ""}
                    </small>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </aside>
        <div className="studio-main">
          {roles.includes("author") && (
            <section className="panel">
              <h2>Import an original lesson</h2>
              <p>
                Choose a JSON pack or edit a new version below. Imported
                versions cannot be overwritten.
              </p>
              <label className="studio-file">
                Lesson JSON
                <input
                  type="file"
                  accept="application/json,.json"
                  disabled={busy}
                  onChange={(event) => {
                    const file = event.target.files?.[0];
                    if (!file) return;
                    if (file.size > 500_000) {
                      setMessage("Choose a lesson file smaller than 500 KB.");
                      return;
                    }
                    void file
                      .text()
                      .then(setDraft)
                      .catch(() => setMessage("This file could not be read."));
                  }}
                />
              </label>
              {draft && (
                <form
                  onSubmit={(event) => {
                    event.preventDefault();
                    try {
                      void mutate({
                        action: "import",
                        pack: JSON.parse(draft),
                      });
                    } catch {
                      setMessage("Check the JSON format before importing.");
                    }
                  }}
                >
                  <label>
                    New lesson pack
                    <textarea
                      className="studio-json"
                      value={draft}
                      onChange={(e) => setDraft(e.target.value)}
                      required
                      spellCheck={false}
                    />
                  </label>
                  <Button disabled={busy}>
                    <FileUp size={17} />
                    Validate and import draft
                  </Button>
                </form>
              )}
            </section>
          )}
          {!detail ? (
            <section className="panel">
              <h2>Choose a lesson to inspect</h2>
              <p>
                Preview the words, answer keys and recordings before making a
                review decision.
              </p>
            </section>
          ) : (
            <>
              <section className="panel">
                <div className="studio-version">
                  <span className="soft-badge">
                    {detail.pack.courseSubdivision} · Version{" "}
                    {detail.pack.version}
                  </span>
                  {detail.published && (
                    <span className="soft-badge">Publication pointer</span>
                  )}
                </div>
                <h2>{detail.pack.title.de}</h2>
                <p>{detail.pack.title.en}</p>
                <p lang="ar" dir="rtl">
                  {detail.pack.title.ar}
                </p>
                <p className="muted small studio-hash">
                  Content SHA-256: {detail.contentHash}
                </p>
                <h3>What the learner can do</h3>
                <ul>
                  {detail.pack.canDo.map((goal) => (
                    <li key={goal}>{goal}</li>
                  ))}
                </ul>
                {roles.includes("author") && (
                  <Button
                    variant="outline"
                    disabled={busy}
                    onClick={() =>
                      setDraft(
                        JSON.stringify(
                          {
                            ...detail.pack,
                            version:
                              Math.max(
                                detail.pack.version,
                                ...lessons
                                  .filter((l) => l.lessonKey === detail.pack.id)
                                  .map((l) => l.version),
                              ) + 1,
                            media: [],
                            dialogues: detail.pack.dialogues.map((d) => ({
                              ...d,
                              lines: d.lines.map((l) => ({
                                ...l,
                                audioKey: null,
                              })),
                            })),
                          },
                          null,
                          2,
                        ),
                      )
                    }
                  >
                    Create a new version from this lesson
                  </Button>
                )}
                <details>
                  <summary>Inspect complete pack and rights evidence</summary>
                  <pre className="studio-source">
                    {JSON.stringify(detail.pack, null, 2)}
                  </pre>
                </details>
                {lessons.some(
                  (l) =>
                    l.lessonKey === detail.pack.id &&
                    l.version < detail.pack.version,
                ) && (
                  <label>
                    Compare with an earlier version
                    <select
                      defaultValue=""
                      disabled={busy}
                      onChange={(event) => {
                        const version = Number(event.target.value);
                        if (!version) {
                          setChanges(null);
                          return;
                        }
                        void run(async () => {
                          const previous: ContentDetail = await request(
                            `?lesson=${detail.pack.id}&version=${version}`,
                          );
                          setChanges(diffContent(previous.pack, detail.pack));
                        });
                      }}
                    >
                      <option value="">Choose a version</option>
                      {lessons
                        .filter(
                          (l) =>
                            l.lessonKey === detail.pack.id &&
                            l.version < detail.pack.version,
                        )
                        .map((l) => (
                          <option key={l.version} value={l.version}>
                            Version {l.version}
                          </option>
                        ))}
                    </select>
                  </label>
                )}
                {changes && (
                  <details open>
                    <summary>{changes.length} changes to inspect</summary>
                    <ul className="studio-diff">
                      {changes.map((change) => (
                        <li key={change.path}>
                          <strong>{change.path}</strong>
                          <p>Before: {change.before}</p>
                          <p>After: {change.after}</p>
                        </li>
                      ))}
                    </ul>
                  </details>
                )}
              </section>
              <section className="panel">
                <h2>Language preview</h2>
                <div className="studio-vocabulary">
                  {detail.pack.vocabulary.map((word) => (
                    <article key={word.id}>
                      <strong lang="de">
                        {word.article ? `${word.article} ` : ""}
                        {word.de}
                      </strong>
                      <span>{word.en}</span>
                      <span lang="ar" dir="rtl">
                        {word.ar}
                      </span>
                      <small>
                        {word.plural ? `Plural: ${word.plural}` : ""}
                      </small>
                      <p lang="de">{word.example}</p>
                    </article>
                  ))}
                </div>
                {detail.pack.dialogues.map((dialogue) => (
                  <div className="studio-dialogue" key={dialogue.id}>
                    <h3>{dialogue.context.en}</h3>
                    {dialogue.lines.map((line) => (
                      <article key={line.id}>
                        <strong>{line.speaker}</strong>
                        <p lang="de">{line.text.de}</p>
                        <p>{line.text.en}</p>
                        <p lang="ar" dir="rtl">
                          {line.text.ar}
                        </p>
                        {line.audioKey ? (
                          <audio
                            controls
                            preload="none"
                            src={`/api/admin/content/audio?lesson=${detail.pack.id}&version=${detail.pack.version}&line=${line.id}`}
                            aria-label={`German recording: ${line.text.de}`}
                          />
                        ) : (
                          <span className="muted small">Recording needed</span>
                        )}
                      </article>
                    ))}
                  </div>
                ))}
              </section>
              <section className="panel">
                <h2>Exercise review</h2>
                <p className="muted">
                  Inspect the key and explanation for ambiguity, level and
                  natural language.
                </p>
                {detail.pack.exercises.map((item) => (
                  <article key={item.id} className="studio-exercise">
                    <span className="eyebrow">
                      {item.type.replaceAll("_", " ")}
                    </span>
                    <h3>{item.prompt.en}</h3>
                    <p lang="de">{item.prompt.de}</p>
                    <p lang="ar" dir="rtl">
                      {item.prompt.ar}
                    </p>
                    {item.type === "multiple_choice" ? (
                      <ul>
                        {item.options.map((option) => (
                          <li key={option.id}>
                            {option.text.de}
                            {option.id === item.correctOptionId
                              ? " ✓ Answer key"
                              : ""}
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p>
                        Acceptable answers: {item.acceptableAnswers.join(" / ")}
                      </p>
                    )}
                    <p>{item.explanation.en}</p>
                  </article>
                ))}
              </section>
              <section className="panel">
                <h2>Human review</h2>
                <p>
                  Your decision is recorded with your Google identity and this
                  content hash. Approve only the categories you can competently
                  review.
                </p>
                <label>
                  Review notes
                  <textarea
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    maxLength={2000}
                    placeholder="What did you check? What needs changing?"
                  />
                </label>
                <div className="studio-gates">
                  {reviewCategories.map((category) => {
                    const review = detail.reviews
                      .filter(
                        (r) =>
                          r.category === category &&
                          r.contentHash === detail.contentHash,
                      )
                      .at(-1);
                    return (
                      <article key={category}>
                        <div>
                          <h3>{category}</h3>
                          <p className="small">
                            {review
                              ? `${review.decision.replaceAll("_", " ")} · ${review.reviewerName}`
                              : "Awaiting a human review"}
                          </p>
                          {review && (
                            <p className="small muted">{review.comment}</p>
                          )}
                        </div>
                        {roles.includes(category) && (
                          <div className="button-row">
                            <Button
                              variant="outline"
                              disabled={busy || !comment.trim()}
                              onClick={() =>
                                void mutate({
                                  action: "review",
                                  lessonKey: detail.pack.id,
                                  version: detail.pack.version,
                                  contentHash: detail.contentHash,
                                  category,
                                  decision: "approved",
                                  comment,
                                })
                              }
                            >
                              <Check size={15} />
                              Approve
                            </Button>
                            <Button
                              variant="ghost"
                              disabled={busy || !comment.trim()}
                              onClick={() =>
                                void mutate({
                                  action: "review",
                                  lessonKey: detail.pack.id,
                                  version: detail.pack.version,
                                  contentHash: detail.contentHash,
                                  category,
                                  decision: "changes_requested",
                                  comment,
                                })
                              }
                            >
                              Request changes
                            </Button>
                          </div>
                        )}
                      </article>
                    );
                  })}
                </div>
                {roles.includes("audio") && (
                  <Button
                    variant="outline"
                    disabled={busy || !detail.pack.media.length}
                    onClick={() =>
                      void mutate({
                        action: "check_audio",
                        lessonKey: detail.pack.id,
                        version: detail.pack.version,
                        contentHash: detail.contentHash,
                      })
                    }
                  >
                    <Headphones size={17} />
                    Check stored recording files
                  </Button>
                )}
                <details>
                  <summary>Review history</summary>
                  <ul>
                    {detail.reviews.map((review, i) => (
                      <li key={i}>
                        {review.category} ·{" "}
                        {review.decision.replaceAll("_", " ")} ·{" "}
                        {review.reviewerName} ·{" "}
                        {new Date(review.reviewedAt).toLocaleString()}
                        <p>{review.comment}</p>
                      </li>
                    ))}
                  </ul>
                </details>
              </section>
              <ContentSourceCredits references={detail.pack.references} />
              <section className="panel studio-release">
                <h2>Publish this version</h2>
                {detail.blockers.length ? (
                  <>
                    <p>
                      Finish these checks before this lesson can reach learners.
                    </p>
                    <ul>
                      {detail.blockers.map((blocker) => (
                        <li key={blocker}>{blocker}</li>
                      ))}
                    </ul>
                  </>
                ) : (
                  <p>
                    All five reviews and recording checks pass for this version.
                  </p>
                )}
                {roles.includes("publisher") && (
                  <>
                    <label className="studio-confirm">
                      <input
                        type="checkbox"
                        checked={confirmed}
                        onChange={(e) => setConfirmed(e.target.checked)}
                        disabled={busy || !!detail.blockers.length}
                      />
                      I reviewed this exact version and approve making it public
                      in this environment.
                    </label>
                    <Button
                      disabled={busy || !confirmed || !!detail.blockers.length}
                      onClick={() =>
                        void mutate({
                          action: "publish",
                          lessonKey: detail.pack.id,
                          version: detail.pack.version,
                          contentHash: detail.contentHash,
                          confirm: "Publish this reviewed version",
                        })
                      }
                    >
                      <Send size={17} />
                      {detail.published
                        ? "Republish reviewed version"
                        : "Publish reviewed version"}
                    </Button>
                  </>
                )}
              </section>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
