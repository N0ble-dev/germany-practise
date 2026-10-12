"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Download, Link2, Share2 } from "lucide-react";
import { useApp } from "./learning-app";
import { Button } from "./ui/button";
import { createLearnerCard } from "@/lib/learner-card";
import { copyShareLink, socialFetch } from "@/lib/social-client";
import type { ProfileShare } from "@/lib/social-model";

export function ProfileShareControls() {
  const { identity } = useApp();
  return identity ? (
    <SignedInProfileShare key={identity.id} accountId={identity.id} />
  ) : (
    <section className="panel profile-sharing">
      <Share2 aria-hidden="true" />
      <h2>Share your learner card</h2>
      <p className="muted">
        Continue with Google to create your own public card link.
      </p>
      <Button asChild>
        <Link href="/signin?next=%2Fprofile">Continue with Google</Link>
      </Button>
    </section>
  );
}
function SignedInProfileShare({ accountId }: { accountId: string }) {
  const { state, identity, notify } = useApp();
  const [name, setName] = useState(identity?.name || state.name);
  const [showPhoto, setShowPhoto] = useState(true),
    [showStats, setShowStats] = useState(true);
  const [share, setShare] = useState<ProfileShare | null>(null);
  const [busy, setBusy] = useState(false),
    [loading, setLoading] = useState(true),
    [error, setError] = useState("");
  const [origin, setOrigin] = useState("");
  const operation = useRef<AbortController | null>(null);
  useEffect(() => {
    const controller = new AbortController();
    socialFetch<{ share: ProfileShare | null }>(
      accountId,
      "/api/profile/share",
      { signal: controller.signal },
    )
      .then(({ share }) => {
        setShare(share);
        setOrigin(window.location.origin);
        if (share) {
          setName(share.card.name);
          setShowPhoto(share.card.showPhoto);
          setShowStats(share.card.showStats);
        }
      })
      .catch((e: Error) => {
        if (!controller.signal.aborted) setError(e.message);
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => {
      controller.abort();
      operation.current?.abort();
    };
  }, [accountId]);
  async function prepare(publish: boolean) {
    const controller = new AbortController();
    operation.current = controller;
    setBusy(true);
    setError("");
    try {
      const card = {
        name: name.trim(),
        showPhoto,
        showStats,
        words: state.words.length,
        xp: state.xp,
      };
      const image = await createLearnerCard(
        { ...card, accountId: showPhoto ? accountId : undefined },
        controller.signal,
      );
      if (publish) {
        const result = await socialFetch<{ share: ProfileShare }>(
          accountId,
          "/api/profile/share",
          {
            method: "POST",
            body: JSON.stringify({ card, image }),
            signal: controller.signal,
          },
        );
        if (controller.signal.aborted) return;
        setShare(result.share);
        setOrigin(window.location.origin);
        notify("Your learner card is shared. Copy the link to send it.");
      } else {
        const anchor = document.createElement("a");
        anchor.href = image;
        anchor.download = "deutsch-journey-learner-card.png";
        anchor.click();
        notify("Your learner card image is downloaded.");
      }
    } catch (e) {
      if (!controller.signal.aborted) setError((e as Error).message);
    } finally {
      if (!controller.signal.aborted) setBusy(false);
    }
  }
  async function unpublish() {
    const controller = new AbortController();
    operation.current = controller;
    setBusy(true);
    setError("");
    try {
      await socialFetch(accountId, "/api/profile/share", {
        method: "DELETE",
        signal: controller.signal,
      });
      if (!controller.signal.aborted) {
        setShare(null);
        notify("Profile card sharing is off. The old link no longer works.");
      }
    } catch (e) {
      if (!controller.signal.aborted) setError((e as Error).message);
    } finally {
      if (!controller.signal.aborted) setBusy(false);
    }
  }
  const url = share && origin ? `${origin}/share/${share.slug}` : "";
  return (
    <section
      className="panel profile-sharing"
      aria-labelledby="profile-sharing-title"
    >
      <div className="section-heading">
        <div>
          <span className="eyebrow">YOUR LEARNER CARD</span>
          <h2 id="profile-sharing-title">A little progress, worth sharing.</h2>
        </div>
        <Share2 aria-hidden="true" />
      </div>
      <p className="muted">
        Choose what appears on your public card. Your email, notebook and
        calendar stay private.
      </p>
      <div className="share-settings">
        <label>
          Card name
          <input
            value={name}
            maxLength={60}
            onChange={(e) => setName(e.target.value)}
          />
        </label>
        <label className="share-checkbox">
          <input
            type="checkbox"
            checked={showPhoto}
            onChange={(e) => setShowPhoto(e.target.checked)}
          />
          Google account photo
        </label>
        <label className="share-checkbox">
          <input
            type="checkbox"
            checked={showStats}
            onChange={(e) => setShowStats(e.target.checked)}
          />
          Word count and XP
        </label>
      </div>
      <div className="button-row">
        <Button
          disabled={busy || loading || !name.trim()}
          onClick={() => void prepare(true)}
        >
          <Share2 size={17} />
          {busy
            ? "Preparing…"
            : share
              ? "Update shared card"
              : "Create card link"}
        </Button>
        <Button
          variant="outline"
          disabled={busy || !name.trim()}
          onClick={() => void prepare(false)}
        >
          <Download size={17} />
          Download card image
        </Button>
      </div>
      {loading && (
        <p role="status" className="muted">
          Checking your shared card…
        </p>
      )}
      {url && (
        <div className="share-link-box">
          <label>
            Public card link
            <input readOnly value={url} onFocus={(e) => e.target.select()} />
          </label>
          <div className="button-row">
            <Button
              variant="secondary"
              disabled={busy}
              onClick={() =>
                void copyShareLink(url)
                  .then(() => notify("Card link copied."))
                  .catch((e: Error) => setError(e.message))
              }
            >
              <Link2 size={16} />
              Copy card link
            </Button>
            <Button asChild variant="outline">
              <a href={url} target="_blank" rel="noopener noreferrer">
                View shared card
              </a>
            </Button>
            <Button
              variant="ghost"
              disabled={busy}
              onClick={() => void unpublish()}
            >
              Turn sharing off
            </Button>
          </div>
          <p className="muted small">
            Anyone with this link can view and download the card. It shows a
            snapshot until you update it. Turning sharing off cannot remove
            images someone already saved.
          </p>
        </div>
      )}
      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}
    </section>
  );
}
