"use client";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowUpRight, BookOpen, RefreshCw, ShieldCheck } from "lucide-react";
import { authClient } from "@/lib/auth-client";
import {
  levels,
  skills,
  coverageStates,
  type CoverageState,
} from "@/lib/content-factory/constants";
import type { FactoryCoverage } from "@/lib/content-factory/coverage";
import type { z } from "zod";
import type { sourceCatalogSchema } from "@/lib/content-factory/model";
import type { readCandidateIntake } from "@/lib/content-factory/intake";
import { Button } from "./ui/button";
type Source = z.infer<typeof sourceCatalogSchema>["sources"][number];
const labels: Record<CoverageState, string> = {
  missing: "Not authored",
  draft: "Git draft",
  needs_review: "Needs review",
  ready: "Ready for release",
  published: "Published",
  needs_revision: "Needs changes",
};

export function ContentCoverage() {
  const { data: session, isPending } = authClient.useSession();
  const accountId = session?.user.id;
  const [result, setResult] = useState<{
    userId: string;
    coverage: FactoryCoverage;
    sources: Source[];
    warning?: string;
    intake?: Awaited<ReturnType<typeof readCandidateIntake>>;
  } | null>(null);
  const [error, setError] = useState<{
    userId: string;
    message: string;
  } | null>(null);
  const [retry, setRetry] = useState(0);
  const [level, setLevel] = useState<(typeof levels)[number]>("A1");
  const [state, setState] = useState("all"),
    [search, setSearch] = useState("");
  useEffect(() => {
    if (!accountId) return;
    const controller = new AbortController();
    async function load() {
      try {
        const response = await fetch("/api/admin/content/coverage", {
          cache: "no-store",
          signal: controller.signal,
          headers: { "X-Learning-Account": accountId! },
        });
        const body = await response.json();
        if (!response.ok)
          throw new Error(body.error ?? "Coverage could not load. Try again.");
        if (!controller.signal.aborted)
          setResult({ ...body, userId: accountId });
      } catch (failure) {
        if (!controller.signal.aborted)
          setError({
            userId: accountId!,
            message:
              failure instanceof Error
                ? failure.message
                : "Coverage could not load. Try again.",
          });
      }
    }
    void load();
    return () => controller.abort();
  }, [accountId, retry]);
  const current = result?.userId === accountId ? result : null;
  const rows = useMemo(
    () =>
      current?.coverage.lessons.filter(
        (l) =>
          l.level === level &&
          (state === "all" || l.state === state) &&
          `${l.title} ${l.scene} ${l.subdivision} ${l.mission}`
            .toLowerCase()
            .includes(search.trim().toLowerCase()),
      ) ?? [],
    [current, level, state, search],
  );
  const message = error && error.userId === accountId ? error.message : "";
  const refresh = () => {
    setResult(null);
    setError(null);
    setRetry((n) => n + 1);
  };
  if (isPending)
    return (
      <section className="panel">
        <p role="status">Checking your content account…</p>
      </section>
    );
  if (!accountId)
    return (
      <section className="panel">
        <h1>Curriculum coverage</h1>
        <p>Sign in with your authorized content-team account.</p>
        <Link href="/signin?next=/admin/content/coverage">
          Continue with Google
        </Link>
      </section>
    );
  return (
    <div className="content-studio factory-coverage">
      <header className="studio-heading">
        <div>
          <span className="eyebrow">CONTENT FACTORY · EDITORIAL ATLAS</span>
          <h1>A clear path from A1 to C2.</h1>
          <p>
            Plan the journey. Find the gaps. Release lessons after careful
            review.
          </p>
        </div>
        <Link href="/admin/content">
          Open review studio <ArrowUpRight size={17} aria-hidden="true" />
        </Link>
      </header>
      <div className="factory-note">
        <ShieldCheck size={22} aria-hidden="true" />
        <p>
          These are proposed lesson briefs. A course needs reviewed listening,
          reading, writing and speaking before it can be called complete. CEFR
          mappings still need specialist review.
        </p>
      </div>
      {message && (
        <div className="panel" role="alert">
          <p>{message}</p>
          <Button onClick={refresh}>Try again</Button>
        </div>
      )}
      {!current && !message && (
        <p role="status">Loading the curriculum and checking Neon…</p>
      )}
      {current && (
        <>
          {current.warning && (
            <div className="factory-warning" role="status">
              {current.warning}
            </div>
          )}
          <div className="factory-stats">
            <article>
              <span>Planning targets</span>
              <strong>{current.coverage.totalPlanned}</strong>
              <small>Nine internal course subdivisions</small>
            </article>
            <article>
              <span>Lessons with drafts</span>
              <strong>{current.coverage.totalDrafted}</strong>
              <small>Drafts still need review and audio</small>
            </article>
            <article>
              <span>Published lessons</span>
              <strong>
                {current.coverage.databaseAvailable
                  ? current.coverage.totalPublished
                  : "—"}
              </strong>
              <small>
                {current.coverage.databaseAvailable
                  ? "Effective Neon publications"
                  : "Database status unavailable"}
              </small>
            </article>
          </div>
          <section
            className="panel factory-matrix"
            aria-labelledby="factory-matrix-heading"
          >
            <div className="factory-section-heading">
              <div>
                <h2 id="factory-matrix-heading">Published skill coverage</h2>
                <p>
                  Lessons with a native skill activity / planned lessons. Lesson
                  counts do not certify a language level.
                </p>
              </div>
              <Button
                variant="outline"
                onClick={refresh}
                aria-label="Refresh coverage"
              >
                <RefreshCw size={16} aria-hidden="true" />
                Refresh
              </Button>
            </div>
            <div
              className="factory-matrix-scroll"
              role="region"
              aria-label="Coverage by level and skill"
              tabIndex={0}
            >
              <table>
                <thead>
                  <tr>
                    <th scope="col">Level</th>
                    <th scope="col">Drafted</th>
                    {skills.map((s) => (
                      <th scope="col" key={s}>
                        {s}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {current.coverage.levels.map((row) => (
                    <tr key={row.level}>
                      <th scope="row">{row.level}</th>
                      <td>
                        {row.drafted} / {row.planned}
                      </td>
                      {skills.map((s) => (
                        <td key={s}>
                          <span
                            className={
                              row.skills[s] > 0
                                ? "factory-skill-count has-content"
                                : "factory-skill-count"
                            }
                          >
                            {current.coverage.databaseAvailable
                              ? `${row.skills[s]} / ${row.planned}`
                              : "Unavailable"}
                          </span>
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
          <section aria-labelledby="factory-lessons-heading">
            <div className="factory-section-heading">
              <div>
                <h2 id="factory-lessons-heading">Lesson blueprints</h2>
                <p>Choose a level to inspect its goals and remaining work.</p>
              </div>
              <span className="muted">{rows.length} lessons shown</span>
            </div>
            <div
              className="factory-levels"
              role="group"
              aria-label="Curriculum level"
            >
              {levels.map((item) => (
                <button
                  key={item}
                  type="button"
                  aria-pressed={level === item}
                  onClick={() => setLevel(item)}
                >
                  {item}
                </button>
              ))}
            </div>
            <div className="factory-filters">
              <label>
                Find a lesson
                <input
                  type="search"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Scenario, goal or course…"
                />
              </label>
              <label>
                Editorial status
                <select
                  value={state}
                  onChange={(event) => setState(event.target.value)}
                >
                  <option value="all">All statuses</option>
                  {coverageStates.map((s) => (
                    <option key={s} value={s}>
                      {labels[s]}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <div className="factory-lessons">
              {rows.map((lesson) => (
                <article key={lesson.id} className="panel factory-lesson">
                  <div className="factory-lesson-top">
                    <span className="eyebrow">
                      {lesson.subdivision} ·{" "}
                      {String(lesson.number).padStart(2, "0")}
                    </span>
                    <span
                      className={`factory-status factory-status-${lesson.state}`}
                    >
                      {labels[lesson.state]}
                    </span>
                  </div>
                  <h3>{lesson.title}</h3>
                  <p>{lesson.mission}</p>
                  <div className="factory-lesson-meta">
                    <BookOpen size={15} aria-hidden="true" />
                    <span>{lesson.scene}</span>
                    <span>
                      {lesson.version
                        ? `Draft v${lesson.version} · ${lesson.origin === "git" ? "Git" : "Neon"}`
                        : "Planning brief"}
                    </span>
                  </div>
                  {lesson.publishedVersion !== null && (
                    <p className="small">
                      Published v{lesson.publishedVersion}
                      {lesson.publishedSkills.length < 4
                        ? " · Four-skill coverage is incomplete"
                        : ""}
                    </p>
                  )}
                  <details>
                    <summary>
                      Goals & remaining work ({lesson.blockers.length})
                    </summary>
                    <ul>
                      {lesson.blockers.map((b, i) => (
                        <li key={i}>{b}</li>
                      ))}
                    </ul>
                    <p>
                      <strong>Grammar:</strong> {lesson.grammar.join("; ")}
                    </p>
                    <p>
                      <strong>Authoring:</strong> {lesson.authoringDirection}
                    </p>
                    <p>
                      <strong>Recordings:</strong> {lesson.audioChecked} /{" "}
                      {lesson.audioRequired} checked
                    </p>
                    <p className="small">
                      <strong>Goethe alignment:</strong> {lesson.examCode};
                      proposed until specialist review.
                    </p>
                    {lesson.version && (
                      <Link
                        href={`/admin/content/preview/${lesson.id}?version=${lesson.version}`}
                      >
                        Preview draft{" "}
                        <ArrowUpRight size={15} aria-hidden="true" />
                      </Link>
                    )}
                  </details>
                </article>
              ))}
            </div>
            {!rows.length && (
              <div className="panel">
                <h3>No matching lessons</h3>
                <p>Choose another status or clear your search.</p>
                <Button
                  variant="outline"
                  onClick={() => {
                    setState("all");
                    setSearch("");
                  }}
                >
                  Clear filters
                </Button>
              </div>
            )}
          </section>
          {current.intake && (
            <section className="panel factory-sources">
              <h2>Review-only source intake</h2>
              <p>
                <strong>
                  {current.intake.totalCandidates} sentence candidates
                </strong>{" "}
                await language, context, Arabic and rights review. None count as
                a published lesson or a verified CEFR item.
              </p>
              {current.intake.batches.map((batch) => (
                <details key={batch.id}>
                  <summary>
                    {batch.source}
                    <span>
                      {batch.total} unverified pairs · First five shown
                    </span>
                  </summary>
                  {batch.sample.map((item) => (
                    <article className="studio-exercise" key={item.id}>
                      <p lang="de">
                        <strong>{item.german}</strong>
                      </p>
                      <p>{item.english}</p>
                      <p className="small">
                        Source author: {item.author} · License claim:{" "}
                        {item.licenseClaim}
                      </p>
                      <a href={item.sourceUrl} target="_blank" rel="noreferrer">
                        Inspect original sentence{" "}
                        <ArrowUpRight size={15} aria-hidden="true" />
                      </a>
                    </article>
                  ))}
                </details>
              ))}
            </section>
          )}
          <section className="panel factory-sources">
            <h2>Source register</h2>
            <p>
              References guide the curriculum. Reused text or data needs exact
              item evidence and the applicable license.
            </p>
            {current.sources.map((source) => (
              <details key={source.id}>
                <summary>
                  {source.name}
                  <span>{source.policy.replaceAll("_", " ")}</span>
                </summary>
                <p>{source.restrictions}</p>
                <div className="button-row">
                  <a href={source.url} target="_blank" rel="noreferrer">
                    Source <ArrowUpRight size={15} aria-hidden="true" />
                  </a>
                  <a href={source.termsUrl} target="_blank" rel="noreferrer">
                    Usage terms <ArrowUpRight size={15} aria-hidden="true" />
                  </a>
                </div>
              </details>
            ))}
          </section>
        </>
      )}
    </div>
  );
}
