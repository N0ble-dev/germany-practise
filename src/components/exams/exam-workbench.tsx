"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { Check, Copy, LockKeyhole, Upload } from "lucide-react";
import { Button } from "../ui/button";
import { Dialog } from "../ui/dialog";
import {
  examReviewCategories,
  type ExamPack,
  type ExamReview,
} from "@/lib/exams/model";
import { examFetch } from "./exam-studio";
type Paper = {
  id: string;
  slug: string;
  version: number;
  status: string;
  hash: string;
  title: string;
  examCode: string;
};
type Detail = {
  pack: ExamPack;
  hash: string;
  status: string;
  reviews: ExamReview[];
  blockers: string[];
};
export function ExamWorkbench() {
  const [papers, setPapers] = useState<Paper[]>([]),
    [roles, setRoles] = useState<string[]>([]),
    [selected, setSelected] = useState<Paper | null>(null),
    [detail, setDetail] = useState<Detail | null>(null);
  const [json, setJson] = useState(""),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [loading, setLoading] = useState(true);
  const [category, setCategory] = useState<ExamReview["category"]>("language"),
    [decision, setDecision] =
      useState<ExamReview["decision"]>("changes_requested"),
    [comment, setComment] = useState(""),
    [attested, setAttested] = useState(false);
  const [confirm, setConfirm] = useState<"publish" | "retire" | null>(null);
  useEffect(() => {
    const controller = new AbortController();
    examFetch<{ papers: Paper[]; roles: string[] }>("/api/admin/exams", {
      signal: controller.signal,
    })
      .then((data) => {
        setPapers(data.papers);
        setRoles(data.roles);
      })
      .catch((cause) => {
        if (!controller.signal.aborted) setError((cause as Error).message);
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, []);
  async function refresh(id?: string) {
    const data = await examFetch<{ papers: Paper[]; roles: string[] }>(
      "/api/admin/exams",
    );
    setPapers(data.papers);
    setRoles(data.roles);
    const row = data.papers.find((row) => row.id === (id ?? selected?.id));
    if (row) {
      setSelected(row);
      setDetail(await examFetch<Detail>(`/api/admin/exams?id=${row.id}`));
    }
  }
  async function act(body: unknown) {
    setBusy(true);
    setError("");
    try {
      await examFetch("/api/admin/exams", {
        method: "POST",
        body: JSON.stringify(body),
      });
      await refresh();
      setComment("");
      setAttested(false);
    } catch (cause) {
      setError((cause as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function importJson() {
    setBusy(true);
    setError("");
    try {
      const result = await examFetch<{ id: string }>("/api/admin/exams", {
        method: "POST",
        body: JSON.stringify({ action: "import", pack: JSON.parse(json) }),
      });
      await refresh(result.id);
    } catch (cause) {
      setError(
        cause instanceof SyntaxError
          ? "Use a valid original exam JSON pack."
          : (cause as Error).message,
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="exam-arena arena-workbench">
      <nav className="arena-top-links" aria-label="Exam content navigation">
        <Link href="/exams">← Exam Arena</Link>
        <Link href="/admin/content">Lesson content studio</Link>
      </nav>
      <header className="arena-guide-heading">
        <span className="eyebrow">
          <LockKeyhole size={15} aria-hidden="true" /> PRIVATE EXAM CONTENT
          STUDIO
        </span>
        <h1>Make every exam item earn its place.</h1>
        <p>
          Original, immutable paper versions with separate language,
          exam-pedagogy, translation, rights and audio review. Every signoff
          records the signed-in reviewer and the exact content hash.
        </p>
      </header>
      {loading && <p role="status">Checking your content permissions…</p>}
      {error && (
        <div className="arena-error" role="alert">
          <p>{error}</p>
          <Link href="/signin?next=%2Fadmin%2Fexams">
            Sign in with the content team's Google account →
          </Link>
        </div>
      )}
      <div className="arena-admin-layout">
        <section className="panel">
          <h2>Paper versions</h2>
          <div className="arena-task-list">
            {papers.map((paper) => (
              <button
                key={paper.id}
                disabled={busy}
                aria-current={selected?.id === paper.id ? "true" : undefined}
                onClick={async () => {
                  setBusy(true);
                  setError("");
                  try {
                    const loaded = await examFetch<Detail>(
                      `/api/admin/exams?id=${paper.id}`,
                    );
                    setSelected(paper);
                    setDetail(loaded);
                    setComment("");
                    setAttested(false);
                  } catch (cause) {
                    setError((cause as Error).message);
                  } finally {
                    setBusy(false);
                  }
                }}
              >
                <span>
                  <strong>{paper.title}</strong>
                  <small>
                    v{paper.version} · {paper.status}
                  </small>
                </span>
              </button>
            ))}
          </div>
          {!loading && !papers.length && (
            <p className="muted">
              No exam packs imported yet. Import an original draft to begin
              review.
            </p>
          )}
          <label className="arena-pack-editor">
            Original pack JSON
            <textarea
              rows={12}
              maxLength={600000}
              value={json}
              onChange={(event) => setJson(event.target.value)}
              spellCheck={false}
            />
          </label>
          <Button
            disabled={!roles.includes("author") || busy || !json.trim()}
            onClick={() => void importJson()}
          >
            <Upload size={16} aria-hidden="true" /> Import immutable draft
          </Button>
          <p className="muted small">
            Importing does not publish. Corrections require a new version; no
            learner notebook data is changed.
          </p>
        </section>
        {detail && selected && (
          <section className="panel arena-admin-detail">
            <span className="eyebrow">
              {detail.pack.examCode} · VERSION {detail.pack.version}
            </span>
            <h2>{detail.pack.title}</h2>
            <code className="arena-content-hash">{detail.hash}</code>
            <p>
              {detail.pack.tasks.length} tasks · {detail.pack.media.length}{" "}
              owned recording manifests ·{" "}
              {detail.pack.kind.replaceAll("_", " ")}
            </p>
            <div className="button-row">
              <Button
                variant="outline"
                disabled={busy || !roles.includes("author")}
                onClick={() =>
                  setJson(
                    JSON.stringify(
                      { ...detail.pack, version: detail.pack.version + 1 },
                      null,
                      2,
                    ),
                  )
                }
              >
                <Copy size={16} aria-hidden="true" /> Clone into new version
              </Button>
              <Button
                variant="outline"
                disabled={busy || !roles.includes("author")}
                onClick={async () => {
                  setBusy(true);
                  try {
                    const result = await examFetch<{ id: string }>(
                      "/api/exams/attempts",
                      {
                        method: "POST",
                        body: JSON.stringify({
                          paperVersionId: selected.id,
                          mode: "preview",
                          idempotencyKey: crypto.randomUUID(),
                        }),
                      },
                    );
                    window.location.assign(`/exams/attempts/${result.id}/take`);
                  } catch (cause) {
                    setError((cause as Error).message);
                    setBusy(false);
                  }
                }}
              >
                Open private draft preview
              </Button>
            </div>
            <section className="arena-admin-blockers">
              <h3>Publication checks</h3>
              {detail.blockers.length ? (
                <ul>
                  {detail.blockers.map((blocker) => (
                    <li key={blocker}>{blocker}</li>
                  ))}
                </ul>
              ) : (
                <p>
                  <Check size={17} aria-hidden="true" /> All required gates are
                  complete for this hash.
                </p>
              )}
            </section>
            {detail.pack.media.map((asset) => (
              <div className="arena-pack-row" key={asset.id}>
                <span>
                  {asset.id} · {asset.creator} · {asset.license}
                </span>
                <Button
                  variant="outline"
                  disabled={busy || !roles.includes("audio")}
                  onClick={() =>
                    void act({
                      action: "verify_media",
                      id: selected.id,
                      hash: detail.hash,
                      assetId: asset.id,
                    })
                  }
                >
                  Inspect stored recording
                </Button>
              </div>
            ))}
            <form
              className="arena-review-form"
              onSubmit={(event) => {
                event.preventDefault();
                void act({
                  action: "review",
                  id: selected.id,
                  hash: detail.hash,
                  category,
                  decision,
                  comment,
                });
              }}
            >
              <h3>Record a human review</h3>
              <label>
                Review category
                <select
                  value={category}
                  onChange={(event) => {
                    setCategory(event.target.value as ExamReview["category"]);
                    setAttested(false);
                  }}
                >
                  {examReviewCategories
                    .filter((role) => roles.includes(role))
                    .map((role) => (
                      <option key={role} value={role}>
                        {role === "pedagogy"
                          ? "Exam blueprint & pedagogy"
                          : role}
                      </option>
                    ))}
                </select>
              </label>
              <label>
                Decision
                <select
                  value={decision}
                  onChange={(event) => {
                    setDecision(event.target.value as ExamReview["decision"]);
                    setAttested(false);
                  }}
                >
                  <option value="changes_requested">Changes requested</option>
                  <option value="approved">Approved after review</option>
                </select>
              </label>
              <label>
                Review notes
                <textarea
                  required
                  minLength={10}
                  maxLength={2000}
                  rows={3}
                  value={comment}
                  onChange={(event) => setComment(event.target.value)}
                />
              </label>
              <label className="arena-inline-check">
                <input
                  type="checkbox"
                  checked={attested}
                  onChange={(event) => setAttested(event.target.checked)}
                />
                <span>
                  I personally reviewed this category for the exact version and
                  hash shown above.
                </span>
              </label>
              <Button
                disabled={
                  busy ||
                  !attested ||
                  !roles.includes(category) ||
                  comment.trim().length < 10
                }
              >
                Record my review
              </Button>
            </form>
            <div className="arena-review-history">
              <h3>Review history</h3>
              {detail.reviews.map((review, i) => (
                <article key={i}>
                  <strong>
                    {review.category} · {review.decision.replaceAll("_", " ")}
                  </strong>
                  <p>{review.comment}</p>
                  <small>
                    {review.reviewerName} ·{" "}
                    {new Date(review.reviewedAt).toLocaleString("en")}
                  </small>
                </article>
              ))}
            </div>
            <div className="button-row">
              <Button
                disabled={
                  busy ||
                  !roles.includes("publisher") ||
                  !!detail.blockers.length
                }
                onClick={() => setConfirm("publish")}
              >
                Publish reviewed version
              </Button>
              <Button
                variant="outline"
                disabled={
                  busy ||
                  !roles.includes("publisher") ||
                  detail.status !== "published"
                }
                onClick={() => setConfirm("retire")}
              >
                Retire for new attempts
              </Button>
            </div>
          </section>
        )}
      </div>
      <Dialog
        open={!!confirm}
        onOpenChange={(open) => {
          if (!open) setConfirm(null);
        }}
        title={
          confirm === "publish"
            ? "Publish this exact reviewed exam version?"
            : "Retire this exam version?"
        }
        description={
          confirm === "publish"
            ? "The server rechecks the immutable content hash, rights, human reviews and recording verification. Existing versions keep their historical attempts."
            : "New attempts will no longer use this version. Existing private responses and reports remain available to their owners."
        }
      >
        <div className="button-row">
          <Button variant="outline" onClick={() => setConfirm(null)}>
            Cancel
          </Button>
          <Button
            disabled={busy}
            onClick={() => {
              if (confirm && selected && detail) {
                void act({
                  action: confirm,
                  id: selected.id,
                  hash: detail.hash,
                });
                setConfirm(null);
              }
            }}
          >
            Confirm {confirm}
          </Button>
        </div>
      </Dialog>
    </div>
  );
}
