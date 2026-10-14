"use client";
import { useEffect, useId, useRef, useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  Check,
  Globe2,
  PenLine,
  Search,
  Share2,
  Trash2,
} from "lucide-react";
import { useApp } from "./learning-app";
import { Button } from "./ui/button";
import { Dialog } from "./ui/dialog";
import { CommunitySentenceCard } from "./community-sentence-card";
import { SignatureInk, SignaturePad } from "./signature-pad";
import { communityFetch } from "@/lib/community-client";
import {
  editPublicSentenceSchema,
  publishSentencesSchema,
  type OwnPublicSentence,
  type PublicSentence,
  type SignatureDrawing,
  type signatureStyles,
} from "@/lib/community-model";
type SignatureStyle = (typeof signatureStyles)[number];

function SignatureFields({
  signature,
  style,
  drawing,
  onSignature,
  onStyle,
  onDrawing,
  disabled,
}: {
  signature: string;
  style: SignatureStyle;
  drawing: SignatureDrawing | null;
  onSignature: (value: string) => void;
  onStyle: (value: SignatureStyle) => void;
  onDrawing: (value: SignatureDrawing | null) => void;
  disabled: boolean;
}) {
  const groupId = useId();
  return (
    <div className="community-signature-fields">
      <label>
        Your name or handle{" "}
        <span className="muted small">
          optional · shown below your signature
        </span>
        <input
          maxLength={60}
          value={signature}
          onChange={(event) => onSignature(event.target.value)}
          placeholder="How would you like to sign it?"
          disabled={disabled}
          dir="auto"
        />
      </label>
      <fieldset disabled={disabled}>
        <legend>Signature style</legend>
        <div className="community-signature-styles">
          {(["drawn", "written", "clean"] as const).map((value) => (
            <label key={value} className={style === value ? "is-selected" : ""}>
              <input
                type="radio"
                name={groupId}
                value={value}
                checked={style === value}
                onChange={() => onStyle(value)}
              />
              <span
                className={`community-signature community-signature-${value}`}
              >
                {value === "drawn"
                  ? "Draw it"
                  : value === "written"
                    ? "Personal"
                    : "Simple"}
              </span>
              <span className="small">
                {value === "drawn"
                  ? "Your own handwriting"
                  : value === "written"
                    ? "Name style"
                    : "Clean & clear"}
              </span>
            </label>
          ))}
        </div>
      </fieldset>
      {style === "drawn" && (
        <SignaturePad
          value={drawing}
          onChange={onDrawing}
          disabled={disabled}
        />
      )}
    </div>
  );
}
export function SentenceSharingSection() {
  const { state, identity, displayName, notify } = useApp();
  const [posts, setPosts] = useState<OwnPublicSentence[]>([]),
    [loading, setLoading] = useState(!!identity),
    [error, setError] = useState(""),
    [open, setOpen] = useState(false),
    [selected, setSelected] = useState<string[]>([]),
    [search, setSearch] = useState(""),
    [signature, setSignature] = useState(displayName.slice(0, 60)),
    [style, setStyle] = useState<SignatureStyle>("drawn"),
    [drawing, setDrawing] = useState<SignatureDrawing | null>(null),
    [busy, setBusy] = useState(false),
    [dialogError, setDialogError] = useState(""),
    [edit, setEdit] = useState<OwnPublicSentence | null>(null),
    [remove, setRemove] = useState<OwnPublicSentence | null>(null),
    [reload, setReload] = useState(0);
  const alive = useRef(true),
    controller = useRef<AbortController | null>(null);
  const userId = identity?.id;
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
      controller.current?.abort();
    };
  }, []);
  useEffect(() => {
    if (!userId) return;
    const abort = new AbortController();
    communityFetch<{ posts: OwnPublicSentence[] }>("/api/community/mine", {
      signal: abort.signal,
      headers: { "X-Learning-Account": userId },
    })
      .then((data) => {
        if (!abort.signal.aborted) setPosts(data.posts);
      })
      .catch((error) => {
        if (!abort.signal.aborted) setError(error.message);
      })
      .finally(() => {
        if (!abort.signal.aborted) setLoading(false);
      });
    return () => abort.abort();
  }, [userId, reload]);
  function reloadOwnPosts() {
    setLoading(true);
    setError("");
    setReload((value) => value + 1);
  }
  const sentences = [...new Set(state.savedSentences)];
  const shown = sentences.filter((sentence) =>
    sentence.toLocaleLowerCase().includes(search.toLocaleLowerCase()),
  );
  const alreadyShared = new Set(posts.map((post) => post.german));
  const maxSelection = Math.min(5, 50 - posts.length);
  const preview: PublicSentence = {
    id: "00000000-0000-4000-8000-000000000000",
    german: selected[0] || "Wähle einen Satz aus deiner Sammlung.",
    signature: signature.trim(),
    signatureStyle: style,
    signatureDrawing: style === "drawn" ? drawing : null,
    createdAt: "2026-01-01T00:00:00Z",
    updatedAt: "2026-01-01T00:00:00Z",
  };
  function begin() {
    setSelected([]);
    setSearch("");
    setDialogError("");
    const previous = posts[0];
    setSignature(previous?.signature ?? displayName.slice(0, 60));
    setStyle(previous?.signatureStyle ?? "drawn");
    setDrawing(previous?.signatureDrawing ?? null);
    setOpen(true);
  }
  async function publish() {
    if (!userId || busy) return;
    const input = publishSentencesSchema.safeParse({
      sentences: selected,
      signature,
      signatureStyle: style,
      signatureDrawing: style === "drawn" ? drawing : null,
      public: true,
    });
    if (!input.success) {
      setDialogError("Choose one to five sentences and check your signature.");
      return;
    }
    controller.current = new AbortController();
    setBusy(true);
    setDialogError("");
    try {
      const data = await communityFetch<{ posts: OwnPublicSentence[] }>(
        "/api/community/mine",
        {
          method: "POST",
          headers: { "X-Learning-Account": userId },
          body: JSON.stringify(input.data),
          signal: controller.current.signal,
        },
      );
      if (alive.current) {
        setPosts(data.posts);
        setOpen(false);
        notify(
          `${selected.length === 1 ? "Your sentence is" : "Your selected sentences are"} now public in the gallery.`,
        );
      }
    } catch (error) {
      if (alive.current)
        setDialogError(
          error instanceof Error
            ? error.message
            : "Publishing could not finish.",
        );
    } finally {
      if (alive.current) setBusy(false);
    }
  }
  async function saveEdit() {
    if (!userId || !edit || busy) return;
    const input = editPublicSentenceSchema.safeParse({
      german: edit.german,
      signature: edit.signature,
      signatureStyle: edit.signatureStyle,
      signatureDrawing:
        edit.signatureStyle === "drawn"
          ? (edit.signatureDrawing ?? null)
          : null,
      revision: edit.revision,
    });
    if (!input.success) {
      setDialogError(
        "Use a sentence of up to 500 characters and a signature of up to 60.",
      );
      return;
    }
    controller.current = new AbortController();
    setBusy(true);
    setDialogError("");
    try {
      const data = await communityFetch<{ posts: OwnPublicSentence[] }>(
        `/api/community/mine/${edit.id}`,
        {
          method: "PATCH",
          body: JSON.stringify(input.data),
          headers: { "X-Learning-Account": userId },
          signal: controller.current.signal,
        },
      );
      if (alive.current) {
        setPosts(data.posts);
        setEdit(null);
        notify("Your public sentence was updated.");
      }
    } catch (error) {
      if (alive.current)
        setDialogError(
          error instanceof Error ? error.message : "The edit could not finish.",
        );
    } finally {
      if (alive.current) setBusy(false);
    }
  }
  async function unpublish() {
    if (!userId || !remove || busy) return;
    controller.current = new AbortController();
    setBusy(true);
    setDialogError("");
    try {
      await communityFetch(`/api/community/mine/${remove.id}`, {
        method: "DELETE",
        headers: { "X-Learning-Account": userId },
        signal: controller.current.signal,
      });
      if (alive.current) {
        setPosts((previous) =>
          previous.filter((post) => post.id !== remove.id),
        );
        setRemove(null);
        notify("Sentence removed from the public gallery.");
      }
    } catch (error) {
      if (alive.current)
        setDialogError(
          error instanceof Error
            ? error.message
            : "The sentence could not be removed.",
        );
    } finally {
      if (alive.current) setBusy(false);
    }
  }
  return (
    <section
      className="community-sharing panel"
      aria-labelledby="sentence-sharing-title"
    >
      <div className="community-sharing-intro">
        <span className="community-share-symbol">
          <Share2 size={23} aria-hidden="true" />
        </span>
        <div>
          <span className="eyebrow">YOUR WORDS, A LITTLE FURTHER</span>
          <h2 id="sentence-sharing-title">
            Share a sentence. Leave your signature.
          </h2>
          <p className="muted">
            Choose a few saved sentences for the public gallery. Let somebody
            else find a phrase they needed today.
          </p>
        </div>
      </div>
      <div className="community-sharing-actions">
        {identity ? (
          <Button
            onClick={begin}
            disabled={loading || !!error || !sentences.length || !maxSelection}
          >
            <Globe2 size={16} aria-hidden="true" /> Choose sentences to publish
          </Button>
        ) : (
          <Button asChild>
            <Link href="/signin?next=%2Fsentences">
              Continue with Google to share{" "}
              <ArrowRight size={16} aria-hidden="true" />
            </Link>
          </Button>
        )}
        <Button asChild variant="outline">
          <Link href="/community">
            Visit the sentence gallery{" "}
            <ArrowRight size={16} aria-hidden="true" />
          </Link>
        </Button>
      </div>
      <p className="community-sharing-note">
        Only the sentences you select and your chosen signature will be public.
      </p>
      {identity && !maxSelection && (
        <p className="muted small">
          You have 50 public sentences. Remove one below before sharing another.
        </p>
      )}
      {identity && !sentences.length && (
        <p className="muted small">
          Save a sentence first, then come back to choose what to share.
        </p>
      )}
      {loading && <p role="status">Checking your public sentences…</p>}
      {error && (
        <div role="alert" className="community-error">
          <p>{error}</p>
          <Button variant="outline" onClick={reloadOwnPosts}>
            Reload my public sentences
          </Button>
        </div>
      )}
      {!!posts.length && (
        <details className="community-own-posts">
          <summary>
            Manage my public sentences <span>{posts.length}/50</span>
          </summary>
          <Button
            variant="ghost"
            disabled={loading || busy}
            onClick={reloadOwnPosts}
          >
            Refresh my public sentences
          </Button>
          <div className="community-own-list">
            {posts.map((post) => (
              <article key={post.id}>
                <div>
                  <p lang="de" dir="auto">
                    {post.german}
                  </p>
                  <span
                    className={`community-signature community-signature-${post.signatureStyle}`}
                    dir="auto"
                  >
                    {post.signature || "A fellow learner"}
                  </span>
                  {post.signatureStyle === "drawn" && post.signatureDrawing && (
                    <div className="community-drawn-signature">
                      <SignatureInk drawing={post.signatureDrawing} />
                    </div>
                  )}
                </div>
                <div className="community-own-actions">
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label={`Edit public sentence ${post.german}`}
                    onClick={() => {
                      setDialogError("");
                      setEdit(post);
                    }}
                  >
                    <PenLine size={17} aria-hidden="true" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label={`Remove public sentence ${post.german}`}
                    onClick={() => {
                      setDialogError("");
                      setRemove(post);
                    }}
                  >
                    <Trash2 size={17} aria-hidden="true" />
                  </Button>
                </div>
              </article>
            ))}
          </div>
        </details>
      )}
      <Dialog
        open={open}
        onOpenChange={(value) => {
          if (!busy) setOpen(value);
        }}
        title="Choose what you want to share"
        description="Publish selected sentences and your signature where anyone can read them."
      >
        <form
          className="community-publish-form"
          onSubmit={(event) => {
            event.preventDefault();
            void publish();
          }}
        >
          <label className="search-field">
            <Search size={16} aria-hidden="true" />
            <input
              aria-label="Find a saved sentence to share"
              data-dialog-autofocus
              placeholder="Find a saved sentence"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </label>
          <div className="community-picker-heading">
            <strong>Your saved sentences</strong>
            <span role="status">
              {selected.length}/{maxSelection} selected
            </span>
          </div>
          <div className="community-sentence-picker">
            {shown.map((sentence) => (
              <label
                key={sentence}
                className={selected.includes(sentence) ? "is-selected" : ""}
              >
                <input
                  type="checkbox"
                  checked={selected.includes(sentence)}
                  disabled={
                    busy ||
                    alreadyShared.has(sentence.trim().normalize("NFC")) ||
                    (selected.length >= maxSelection &&
                      !selected.includes(sentence))
                  }
                  onChange={(event) =>
                    setSelected((previous) =>
                      event.target.checked
                        ? [...previous, sentence]
                        : previous.filter((value) => value !== sentence),
                    )
                  }
                />
                <span lang="de" dir="auto">
                  {sentence}
                </span>
                {alreadyShared.has(sentence.trim().normalize("NFC")) && (
                  <span className="community-public-badge">
                    <Check size={13} aria-hidden="true" /> Public
                  </span>
                )}
              </label>
            ))}
            {!shown.length && (
              <p className="muted">No saved sentences match this search.</p>
            )}
          </div>
          <SignatureFields
            signature={signature}
            style={style}
            drawing={drawing}
            onSignature={setSignature}
            onStyle={setStyle}
            onDrawing={setDrawing}
            disabled={busy}
          />
          {selected.length > 0 && (
            <div className="community-publish-preview">
              <span className="eyebrow">
                HOW YOUR {selected.length > 1 ? "FIRST SENTENCE" : "SENTENCE"}{" "}
                WILL LOOK
              </span>
              <CommunitySentenceCard preview post={preview} />
            </div>
          )}
          {dialogError && (
            <p role="alert" className="form-error">
              {dialogError}
            </p>
          )}
          <div className="community-dialog-actions">
            <Button
              type="button"
              variant="ghost"
              disabled={busy}
              onClick={() => setOpen(false)}
            >
              Keep private
            </Button>
            <Button
              type="submit"
              disabled={
                busy || !selected.length || (style === "drawn" && !drawing)
              }
            >
              <Globe2 size={16} aria-hidden="true" />{" "}
              {busy
                ? "Publishing…"
                : `Publish ${selected.length === 1 ? "1 sentence" : `${selected.length} sentences`}`}
            </Button>
          </div>
        </form>
      </Dialog>
      <Dialog
        open={!!edit}
        onOpenChange={(value) => {
          if (!value && !busy) setEdit(null);
        }}
        title="Edit your public sentence"
        description="Edit this public copy. Your saved notebook sentence stays as you saved it."
      >
        {edit && (
          <form
            className="community-publish-form"
            onSubmit={(event) => {
              event.preventDefault();
              void saveEdit();
            }}
          >
            <label>
              Your public sentence
              <textarea
                data-dialog-autofocus
                value={edit.german}
                lang="de"
                dir="auto"
                maxLength={500}
                rows={3}
                disabled={busy}
                onChange={(event) =>
                  setEdit({ ...edit, german: event.target.value })
                }
              />
            </label>
            <SignatureFields
              signature={edit.signature}
              style={edit.signatureStyle}
              drawing={edit.signatureDrawing ?? null}
              onSignature={(value) => setEdit({ ...edit, signature: value })}
              onStyle={(value) => setEdit({ ...edit, signatureStyle: value })}
              onDrawing={(value) =>
                setEdit({ ...edit, signatureDrawing: value })
              }
              disabled={busy}
            />
            <CommunitySentenceCard preview post={edit} />
            {dialogError && <p role="alert">{dialogError}</p>}
            <div className="community-dialog-actions">
              <Button
                variant="ghost"
                type="button"
                disabled={busy}
                onClick={() => setEdit(null)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={busy}>
                {busy ? "Saving…" : "Update public sentence"}
              </Button>
            </div>
          </form>
        )}
      </Dialog>
      <Dialog
        open={!!remove}
        onOpenChange={(value) => {
          if (!value && !busy) setRemove(null);
        }}
        title="Remove this public sentence?"
        description="It will disappear from the public gallery. Your saved notebook sentence stays private and available to you."
      >
        {remove && (
          <div className="community-publish-form">
            <p lang="de" className="community-remove-quote" dir="auto">
              {remove.german}
            </p>
            {dialogError && <p role="alert">{dialogError}</p>}
            <div className="community-dialog-actions">
              <Button
                variant="ghost"
                disabled={busy}
                onClick={() => setRemove(null)}
              >
                Keep public
              </Button>
              <Button disabled={busy} onClick={unpublish}>
                <Trash2 size={16} aria-hidden="true" />{" "}
                {busy ? "Removing…" : "Remove from gallery"}
              </Button>
            </div>
          </div>
        )}
      </Dialog>
    </section>
  );
}
