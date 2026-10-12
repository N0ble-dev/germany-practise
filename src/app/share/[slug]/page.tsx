import { cache } from "react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { SocialRepository } from "@/lib/social-repository";
import { PublicProfileCard } from "@/components/public-profile-card";
export const dynamic = "force-dynamic";
export const runtime = "nodejs";
const read = cache(async (slug: string) =>
  /^[a-f0-9]{48}$/.test(slug) ? new SocialRepository().publicCard(slug) : null,
);
const cardUrl = (slug: string) =>
  new URL(
    `/share/${slug}`,
    process.env.APP_URL || "https://germany-practise.vercel.app",
  ).href;
export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  let card = null;
  try {
    card = await read(slug);
  } catch {
    /* Show the recoverable connection state in the page. */
  }
  const title = card
    ? `${card.card.name}'s learner card · Deutsch Journey`
    : "Shared learner card · Deutsch Journey";
  const imageUrl = `${cardUrl(slug)}/image`;
  return {
    title,
    robots: { index: false, follow: false },
    referrer: "no-referrer",
    openGraph: {
      title,
      ...(card ? { url: cardUrl(slug) } : {}),
      description: "A little German, every day.",
      ...(card
        ? {
            images: [
              {
                url: imageUrl,
                width: 800,
                height: 1125,
              },
            ],
          }
        : {}),
    },
    ...(card
      ? {
          twitter: {
            card: "summary_large_image",
            title,
            description: "A little German, every day.",
            images: [imageUrl],
          },
        }
      : {}),
  };
}
export default async function SharedCardPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  let share;
  try {
    share = await read(slug);
  } catch {
    return (
      <section className="panel">
        <h1>This card could not load yet.</h1>
        <p>Try this link again shortly.</p>
        <Link href={`/share/${slug}`}>Try again</Link>
      </section>
    );
  }
  if (!share) notFound();
  return (
    <PublicProfileCard slug={slug} card={share.card} shareUrl={cardUrl(slug)} />
  );
}
