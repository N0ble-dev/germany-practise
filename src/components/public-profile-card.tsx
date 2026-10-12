"use client";
import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Download, Share2 } from "lucide-react";
import { HugeiconsIcon } from "@hugeicons/react";
import Linkedin01Icon from "@hugeicons/core-free-icons/Linkedin01Icon";
import NewTwitterIcon from "@hugeicons/core-free-icons/NewTwitterIcon";
import { Button } from "./ui/button";
import { copyShareLink } from "@/lib/social-client";
import type { PublicCard } from "@/lib/social-model";

export function PublicProfileCard({
  slug,
  card,
  shareUrl,
}: {
  slug: string;
  card: PublicCard;
  shareUrl: string;
}) {
  const [message, setMessage] = useState("");
  const linkedInUrl = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(shareUrl)}`;
  const xUrl = `https://twitter.com/intent/tweet?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(`${card.name}'s German learning journey. A little German, every day.`)}`;
  async function share() {
    try {
      if (navigator.share)
        await navigator.share({
          title: `${card.name}'s learner card`,
          url: shareUrl,
        });
      else {
        await copyShareLink(shareUrl);
        setMessage("Card link copied.");
      }
    } catch (e) {
      if ((e as Error).name !== "AbortError")
        setMessage("Copy this page's address to share the card.");
    }
  }
  return (
    <section className="public-profile-card">
      <div className="public-card-story">
        <span className="eyebrow">A LITTLE GERMAN, EVERY DAY</span>
        <h1>{card.name}’s learner card.</h1>
        <p>
          Every word is a small step toward the life you picture in Germany.
        </p>
        <p className="muted small">
          A personal learning snapshot shared by {card.name}.
        </p>
        <div className="button-row">
          <Button onClick={() => void share()}>
            <Share2 size={17} />
            Share card
          </Button>
          <Button asChild variant="outline">
            <a
              href={`/share/${slug}/image?download=1`}
              download="deutsch-journey-learner-card.png"
            >
              <Download size={17} />
              Download image
            </a>
          </Button>
        </div>
        <div
          className="public-card-social"
          role="group"
          aria-label="Share on social media"
        >
          <Button asChild variant="outline">
            <a href={linkedInUrl} target="_blank" rel="noopener noreferrer">
              <HugeiconsIcon
                icon={Linkedin01Icon}
                size={19}
                aria-hidden="true"
              />
              Share on LinkedIn
            </a>
          </Button>
          <Button asChild variant="outline">
            <a href={xUrl} target="_blank" rel="noopener noreferrer">
              <HugeiconsIcon
                icon={NewTwitterIcon}
                size={18}
                aria-hidden="true"
              />
              Share on X
            </a>
          </Button>
        </div>
        <p role="status" className="small">
          {message}
        </p>
        <Link className="public-card-invite" href="/signup">
          Start your own German journey →
        </Link>
      </div>
      <div className="public-card-image">
        <Image
          src={`/share/${slug}/image`}
          alt={`Learner card for ${card.name}${card.showStats ? `, ${card.words} words and ${card.xp} XP` : ""}`}
          width={800}
          height={1125}
          unoptimized
          priority
        />
      </div>
    </section>
  );
}
