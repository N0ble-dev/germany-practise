"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  BookOpen,
  Check,
  Copy,
  Link2,
  PencilLine,
  Plus,
  RefreshCw,
  Users,
} from "lucide-react";
import { Button } from "./ui/button";
import { Dialog } from "./ui/dialog";
import { useApp } from "./learning-app";
import { addWord, updateState } from "@/lib/store";
import {
  copySharedWord,
  sharedWordSchema,
  type SocialAction,
  type SpaceDetail,
  type SpaceItem,
  type StudySpace,
} from "@/lib/social-model";
import { copyShareLink, socialFetch, spaceAction } from "@/lib/social-client";

export function StudySpacePage({ invite }: { invite: string | null }) {
  const { identity, cloudEnabled } = useApp();
  const destination = invite ? `/space?invite=${invite}` : "/space";
  return identity ? (
    <SignedInSpace key={identity.id} accountId={identity.id} invite={invite} />
  ) : (
    <>
      <SpaceHeading />
      <section className="panel space-welcome">
        <Users size={32} aria-hidden="true" />
        <h2>
          {invite
            ? "You’re invited to study together."
            : "A little German. A little company."}
        </h2>
        <p>
          Make a private space for you and up to two study partners. Share words
          and sentences, then keep practicing at your own pace.
        </p>
        {cloudEnabled ? (
          <Button asChild>
            <Link href={`/signin?next=${encodeURIComponent(destination)}`}>
              Continue with Google
            </Link>
          </Button>
        ) : (
          <p className="muted">
            Shared study spaces will be available when accounts are connected.
          </p>
        )}
        <p className="muted small">
          Your personal notebook stays yours. You choose what to share.
        </p>
      </section>
    </>
  );
}
function SpaceHeading() {
  return (
    <div className="page-heading">
      <div>
        <span className="eyebrow" lang="de">
          ZUSAMMEN LERNEN
        </span>
        <h1>Small steps, shared.</h1>
        <p>Your words have more places to go when you learn together.</p>
      </div>
    </div>
  );
}
function SignedInSpace({
  accountId,
  invite,
}: {
  accountId: string;
  invite: string | null;
}) {
  const { state, notify } = useApp();
  const router = useRouter();
  const [spaces, setSpaces] = useState<StudySpace[]>([]),
    [selected, setSelected] = useState("");
  const [detail, setDetail] = useState<SpaceDetail | null>(null);
  const [loading, setLoading] = useState(true),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const [spaceName, setSpaceName] = useState("Our German corner");
  const [inviteLink, setInviteLink] = useState("");
  const [kind, setKind] = useState<"word" | "sentence">("word");
  const [wordId, setWordId] = useState(""),
    [sentence, setSentence] = useState("");
  const [filter, setFilter] = useState<"all" | "word" | "sentence">("all");
  const [confirm, setConfirm] = useState<{
    title: string;
    description: string;
    action: SocialAction;
  } | null>(null);
  const readController = useRef<AbortController | null>(null),
    operation = useRef<AbortController | null>(null);
  const selectedRef = useRef("");
  useEffect(
    () => () => {
      readController.current?.abort();
      operation.current?.abort();
    },
    [],
  );
  const load = useCallback(
    async (preferred?: string) => {
      readController.current?.abort();
      const controller = new AbortController();
      readController.current = controller;
      try {
        const result = await socialFetch<{ spaces: StudySpace[] }>(
          accountId,
          "/api/spaces",
          { signal: controller.signal },
        );
        if (controller.signal.aborted) return;
        const id =
          result.spaces.find((s) => s.id === (preferred ?? selectedRef.current))
            ?.id ??
          result.spaces[0]?.id ??
          "";
        // Clear the old space before requesting another, including after access is revoked.
        setSpaces(result.spaces);
        if (id !== selectedRef.current) setInviteLink("");
        setSelected(id);
        selectedRef.current = id;
        setDetail(null);
        if (id) {
          const next = await socialFetch<SpaceDetail>(
            accountId,
            `/api/spaces?spaceId=${id}`,
            { signal: controller.signal },
          );
          if (!controller.signal.aborted) setDetail(next);
        }
        if (!controller.signal.aborted) setError("");
      } catch (e) {
        if (!controller.signal.aborted) {
          setDetail(null);
          setError((e as Error).message);
        }
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    },
    [accountId],
  );
  useEffect(() => {
    let disposed = false;
    queueMicrotask(() => {
      if (!disposed) void load();
    });
    const refresh = () => {
      if (!operation.current) void load();
    };
    window.addEventListener("focus", refresh);
    return () => {
      disposed = true;
      readController.current?.abort();
      window.removeEventListener("focus", refresh);
    };
  }, [load]);
  async function act(action: SocialAction) {
    const controller = new AbortController();
    operation.current = controller;
    setBusy(true);
    setError("");
    try {
      const result = await spaceAction(accountId, action, controller.signal);
      if (controller.signal.aborted) return;
      if (action.action === "join") router.replace("/space", { scroll: false });
      await load(result.spaceId ?? selectedRef.current);
      if (controller.signal.aborted) return;
      if (result.token)
        setInviteLink(`${window.location.origin}/space?invite=${result.token}`);
      else if (
        action.action === "revoke" ||
        action.action === "remove" ||
        action.action === "leave"
      )
        setInviteLink("");
      if (action.action === "share") {
        setSentence("");
        notify("Added to your shared notebook.");
      } else if (action.action === "join")
        notify("You joined the study space.");
      else if (action.action === "create")
        notify("Your study space is ready. Invite a study partner.");
      else if (action.action === "invite")
        notify("Invitation ready. Send this link to one study partner.");
      else notify("Your study space is updated.");
    } catch (e) {
      if (!controller.signal.aborted) setError((e as Error).message);
    } finally {
      if (!controller.signal.aborted) {
        setBusy(false);
        operation.current = null;
      }
    }
  }
  async function more() {
    if (!detail?.nextCursor) return;
    const controller = new AbortController();
    operation.current = controller;
    setBusy(true);
    setError("");
    try {
      const next = await socialFetch<SpaceDetail>(
        accountId,
        `/api/spaces?spaceId=${selected}&cursor=${detail.nextCursor}`,
        { signal: controller.signal },
      );
      if (!controller.signal.aborted)
        setDetail({ ...next, items: [...detail.items, ...next.items] });
    } catch (e) {
      if (!controller.signal.aborted) {
        setDetail(null);
        setError((e as Error).message);
      }
    } finally {
      if (!controller.signal.aborted) {
        setBusy(false);
        operation.current = null;
      }
    }
  }
  function keep(item: SpaceItem) {
    if (item.content.kind === "word") {
      if (state.words.length >= 5000) {
        setError(
          "Your vocabulary is full. Remove a word before adding another.",
        );
        return;
      }
      notify(
        addWord(copySharedWord(item.content.word))
          ? "Word added to your vocabulary. Your own review journey starts here."
          : "This word is already in your vocabulary.",
      );
    } else {
      const value = item.content.sentence;
      if (state.savedSentences.length >= 1000) {
        setError("Your sentence notebook is full.");
        return;
      }
      if (!state.savedSentences.includes(value))
        updateState((s) => ({
          ...s,
          savedSentences: [...s.savedSentences, value],
        }));
      notify("Sentence saved in your notebook.");
    }
  }
  const owned = spaces.some((s) => s.ownerId === accountId),
    isOwner = detail?.space.ownerId === accountId;
  const chosenWord = state.words.find((w) => w.id === wordId);
  return (
    <div className="study-space-page">
      <SpaceHeading />
      {invite && (
        <section className="panel space-invitation">
          <Link2 aria-hidden="true" />
          <div>
            <h2>A study partner saved you a seat.</h2>
            <p>
              Joining shares your account name with the space. Your words stay
              private until you add them.
            </p>
          </div>
          <Button
            disabled={busy}
            onClick={() => void act({ action: "join", token: invite })}
          >
            Accept invitation
          </Button>
          <Button
            variant="ghost"
            disabled={busy}
            onClick={() => router.replace("/space")}
          >
            Dismiss
          </Button>
        </section>
      )}
      {error && (
        <div className="notice" role="alert">
          <p>{error}</p>
          <Button variant="outline" disabled={busy} onClick={() => void load()}>
            Try again
          </Button>
        </div>
      )}
      {loading && (
        <p role="status" className="muted">
          Opening your study spaces…
        </p>
      )}
      {!owned && !loading && (
        <section className="panel space-create">
          <div>
            <h2>Your own German corner</h2>
            <p className="muted">
              One private space. Three learners. A notebook you build together.
            </p>
          </div>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              void act({ action: "create", name: spaceName.trim() });
            }}
          >
            <label>
              Space name
              <input
                value={spaceName}
                maxLength={60}
                onChange={(e) => setSpaceName(e.target.value)}
              />
            </label>
            <Button disabled={busy || !spaceName.trim()}>
              <Plus size={17} />
              Create my space
            </Button>
          </form>
        </section>
      )}
      {spaces.length > 0 && (
        <div className="space-toolbar">
          <label>
            Study space
            <select
              value={selected}
              disabled={busy || loading}
              onChange={(e) => void load(e.target.value)}
            >
              {spaces.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                  {s.ownerId === accountId ? " · yours" : ""}
                </option>
              ))}
            </select>
          </label>
          <Button
            variant="outline"
            disabled={busy || loading}
            onClick={() => void load()}
          >
            <RefreshCw size={16} />
            Refresh notebook
          </Button>
        </div>
      )}
      {detail && (
        <>
          <section className="panel space-members" aria-label="Study partners">
            <div className="section-heading">
              <div>
                <span className="eyebrow">OUR GERMAN CORNER</span>
                <h2>{detail.space.name}</h2>
              </div>
              <span className="soft-badge">
                <Users size={15} />
                {detail.space.members.length}/3 learners
              </span>
            </div>
            <div className="space-seats">
              {[0, 1, 2].map((seat) => {
                const member = detail.space.members.find(
                    (m) => m.seat === seat,
                  ),
                  pending = detail.invites.find((i) => i.seat === seat);
                return (
                  <div
                    className={`space-seat ${member ? "occupied" : "empty"}`}
                    key={seat}
                  >
                    <span className="space-seat-avatar" aria-hidden="true">
                      {member ? Array.from(member.name)[0]?.toUpperCase() : "+"}
                    </span>
                    <strong>
                      {member?.name ?? "A seat for a study partner"}
                    </strong>
                    <small>
                      {seat === 0
                        ? "Space owner"
                        : member
                          ? "Study partner"
                          : pending
                            ? `Invitation expires ${new Date(pending.expiresAt).toLocaleDateString()}`
                            : "Learn a little together"}
                    </small>
                    {isOwner &&
                      seat > 0 &&
                      (member ? (
                        <Button
                          variant="ghost"
                          disabled={busy}
                          onClick={() =>
                            setConfirm({
                              title: `Remove ${member.name}?`,
                              description:
                                "They will lose access to this space. Their shared entries stay in the notebook.",
                              action: {
                                action: "remove",
                                spaceId: selected,
                                userId: member.userId,
                              },
                            })
                          }
                        >
                          Remove partner
                        </Button>
                      ) : (
                        <div className="space-seat-actions">
                          <Button
                            variant="secondary"
                            disabled={busy}
                            onClick={() =>
                              void act({
                                action: "invite",
                                spaceId: selected,
                                seat: seat as 1 | 2,
                              })
                            }
                          >
                            <Link2 size={15} />
                            {pending ? "New invitation" : "Invite partner"}
                          </Button>
                          {pending && (
                            <Button
                              variant="ghost"
                              disabled={busy}
                              onClick={() =>
                                void act({
                                  action: "revoke",
                                  spaceId: selected,
                                  seat: seat as 1 | 2,
                                })
                              }
                            >
                              Revoke invitation
                            </Button>
                          )}
                        </div>
                      ))}
                  </div>
                );
              })}
            </div>
            {inviteLink && (
              <div className="share-link-box">
                <label>
                  One-person invitation link
                  <input
                    value={inviteLink}
                    readOnly
                    onFocus={(e) => e.target.select()}
                  />
                </label>
                <Button
                  variant="secondary"
                  onClick={() =>
                    void copyShareLink(inviteLink)
                      .then(() => notify("Invitation link copied."))
                      .catch((e: Error) => setError(e.message))
                  }
                >
                  <Copy size={16} />
                  Copy invitation
                </Button>
                <p className="muted small">
                  Send this to one person. It works once and expires in seven
                  days. Creating a new invitation for this seat replaces its old
                  link.
                </p>
              </div>
            )}
            {!isOwner && (
              <Button
                variant="ghost"
                disabled={busy}
                onClick={() =>
                  setConfirm({
                    title: "Leave this study space?",
                    description:
                      "You will lose access. Your shared entries stay in the space, and your personal notebook stays with you.",
                    action: { action: "leave", spaceId: selected },
                  })
                }
              >
                Leave study space
              </Button>
            )}
          </section>
          <div className="space-notebook-layout">
            <section
              className="panel space-composer"
              aria-labelledby="space-composer-title"
            >
              <h2 id="space-composer-title">Bring something to the table.</h2>
              <p className="muted">
                A word you learned. A sentence you want to try. Share one small
                thing.
              </p>
              <div
                className="button-row"
                role="group"
                aria-label="What to share"
              >
                <Button
                  variant={kind === "word" ? "secondary" : "ghost"}
                  aria-pressed={kind === "word"}
                  onClick={() => setKind("word")}
                >
                  <BookOpen size={16} />
                  Word
                </Button>
                <Button
                  variant={kind === "sentence" ? "secondary" : "ghost"}
                  aria-pressed={kind === "sentence"}
                  onClick={() => setKind("sentence")}
                >
                  <PencilLine size={16} />
                  Sentence
                </Button>
              </div>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  const content =
                    kind === "word" && chosenWord
                      ? {
                          kind: "word" as const,
                          word: sharedWordSchema.parse(chosenWord),
                        }
                      : {
                          kind: "sentence" as const,
                          sentence: sentence.trim(),
                        };
                  void act({ action: "share", spaceId: selected, content });
                }}
              >
                {kind === "word" ? (
                  <>
                    <label>
                      From your vocabulary
                      <select
                        value={wordId}
                        onChange={(e) => setWordId(e.target.value)}
                      >
                        <option value="">Choose a word</option>
                        {state.words.map((w) => (
                          <option key={w.id} value={w.id}>
                            {w.article ? `${w.article} ` : ""}
                            {w.german} · {w.english}
                          </option>
                        ))}
                      </select>
                    </label>
                    {chosenWord && (
                      <div className="space-word-preview">
                        <strong lang="de">
                          {chosenWord.article} {chosenWord.german}
                        </strong>
                        <p>{chosenWord.english}</p>
                        {chosenWord.example && (
                          <p lang="de">{chosenWord.example}</p>
                        )}
                      </div>
                    )}
                    <p className="muted small">
                      Only the word and its learning notes are shared. Your
                      review history stays yours.
                    </p>
                  </>
                ) : (
                  <>
                    <label>
                      German sentence
                      <textarea
                        rows={4}
                        value={sentence}
                        maxLength={500}
                        placeholder="Heute lerne ich Deutsch."
                        onChange={(e) => setSentence(e.target.value)}
                      />
                    </label>
                    {state.savedSentences.length > 0 && (
                      <label>
                        Or use a saved sentence
                        <select
                          value=""
                          onChange={(e) => setSentence(e.target.value)}
                        >
                          <option value="">Choose from your notebook</option>
                          {state.savedSentences.map((s, i) => (
                            <option key={i} value={s}>
                              {s}
                            </option>
                          ))}
                        </select>
                      </label>
                    )}
                  </>
                )}
                <Button
                  disabled={
                    busy || (kind === "word" ? !chosenWord : !sentence.trim())
                  }
                >
                  <Plus size={17} />
                  Add to shared notebook
                </Button>
              </form>
            </section>
            <section
              className="panel space-notebook"
              aria-labelledby="space-notebook-title"
            >
              <div className="section-heading">
                <div>
                  <h2 id="space-notebook-title">Our shared notebook</h2>
                  <p className="muted small">
                    Keep what helps. Your progress stays personal.
                  </p>
                </div>
              </div>
              <div
                className="button-row space-filters"
                role="group"
                aria-label="Shared notebook filter"
              >
                {(["all", "word", "sentence"] as const).map((f) => (
                  <Button
                    key={f}
                    size="sm"
                    variant={filter === f ? "secondary" : "ghost"}
                    aria-pressed={filter === f}
                    onClick={() => setFilter(f)}
                  >
                    {f === "all"
                      ? "Everything"
                      : f === "word"
                        ? "Words"
                        : "Sentences"}
                  </Button>
                ))}
              </div>
              {detail.items.length === 0 ? (
                <div className="space-empty-note">
                  <PencilLine aria-hidden="true" />
                  <h3>The first page is yours.</h3>
                  <p>
                    Choose a word or write a sentence to start your shared
                    notebook.
                  </p>
                </div>
              ) : (
                <ul className="shared-items">
                  {detail.items
                    .filter(
                      (i) => filter === "all" || i.content.kind === filter,
                    )
                    .map((item) => {
                      const content = item.content;
                      const saved =
                        content.kind === "word"
                          ? state.words.some(
                              (w) =>
                                w.german.toLocaleLowerCase() ===
                                content.word.german.toLocaleLowerCase(),
                            )
                          : state.savedSentences.includes(content.sentence);
                      return (
                        <li key={item.id} className="shared-item">
                          <div className="shared-item-author">
                            <span>{item.authorName}</span>
                            <span>
                              {content.kind === "word"
                                ? "shared a word"
                                : "shared a sentence"}{" "}
                              · {new Date(item.createdAt).toLocaleDateString()}
                            </span>
                          </div>
                          {content.kind === "word" ? (
                            <>
                              <h3 lang="de">
                                {content.word.article} {content.word.german}
                              </h3>
                              <p>{content.word.english}</p>
                              {content.word.arabic && (
                                <p lang="ar" dir="rtl">
                                  {content.word.arabic}
                                </p>
                              )}
                              {content.word.example && (
                                <blockquote lang="de">
                                  {content.word.example}
                                </blockquote>
                              )}
                              {content.word.hint && (
                                <p className="muted small">
                                  {content.word.hint}
                                </p>
                              )}
                            </>
                          ) : (
                            <p className="shared-sentence" lang="de">
                              {content.sentence}
                            </p>
                          )}
                          <div className="button-row">
                            <Button
                              variant="outline"
                              disabled={saved}
                              onClick={() => keep(item)}
                            >
                              {saved ? <Check size={15} /> : <Plus size={15} />}
                              {saved
                                ? "In my notebook"
                                : content.kind === "word"
                                  ? "Keep this word"
                                  : "Keep this sentence"}
                            </Button>
                            {(isOwner || item.authorId === accountId) && (
                              <Button
                                variant="ghost"
                                disabled={busy}
                                onClick={() =>
                                  setConfirm({
                                    title: "Remove this shared entry?",
                                    description:
                                      "This removes it from the space. Copies already saved in personal notebooks stay there.",
                                    action: {
                                      action: "delete-item",
                                      spaceId: selected,
                                      itemId: item.id,
                                    },
                                  })
                                }
                              >
                                Remove entry
                              </Button>
                            )}
                          </div>
                        </li>
                      );
                    })}
                </ul>
              )}
              {detail.items.length > 0 &&
                !detail.items.some(
                  (i) => filter === "all" || i.content.kind === filter,
                ) && (
                  <p className="muted">
                    No {filter === "word" ? "words" : "sentences"} on this page
                    yet.
                  </p>
                )}
              {detail.nextCursor && (
                <Button
                  variant="outline"
                  disabled={busy}
                  onClick={() => void more()}
                >
                  Load earlier entries
                </Button>
              )}
            </section>
          </div>
        </>
      )}
      <Dialog
        open={!!confirm}
        onOpenChange={(open) => !open && setConfirm(null)}
        title={confirm?.title ?? "Update this space?"}
        description={
          confirm?.description ?? "Confirm this change to your shared space."
        }
      >
        <div className="button-row">
          <Button variant="outline" onClick={() => setConfirm(null)}>
            Cancel
          </Button>
          <Button
            variant="destructive"
            disabled={busy}
            onClick={() => {
              if (confirm) {
                void act(confirm.action);
                setConfirm(null);
              }
            }}
          >
            Confirm
          </Button>
        </div>
      </Dialog>
    </div>
  );
}
