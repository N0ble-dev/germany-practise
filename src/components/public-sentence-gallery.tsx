"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ArrowRight, Globe2, RefreshCw, Search, Sparkles } from "lucide-react";
import { Button } from "./ui/button";
import { CommunitySentenceCard } from "./community-sentence-card";
import { communityFetch } from "@/lib/community-client";
import type { SentenceFeed } from "@/lib/community-model";

export function PublicSentenceGallery() {
  const [feed, setFeed] = useState<SentenceFeed>({
      posts: [],
      nextCursor: null,
    }),
    [search, setSearch] = useState(""),
    [query, setQuery] = useState(""),
    [refresh, setRefresh] = useState(0),
    [loading, setLoading] = useState(true),
    [more, setMore] = useState(false),
    [error, setError] = useState(""),
    [message, setMessage] = useState("");
  const generation = useRef(0),
    alive = useRef(true),
    moreAbort = useRef<AbortController | null>(null);
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
      moreAbort.current?.abort();
    };
  }, []);
  useEffect(() => {
    const controller = new AbortController(),
      current = ++generation.current;
    moreAbort.current?.abort();
    communityFetch<SentenceFeed>(
      `/api/community/sentences?q=${encodeURIComponent(query)}`,
      { credentials: "omit", signal: controller.signal },
    )
      .then((data) => {
        if (current === generation.current && !controller.signal.aborted)
          setFeed(data);
      })
      .catch((error) => {
        if (!controller.signal.aborted && current === generation.current)
          setError(error.message);
      })
      .finally(() => {
        if (!controller.signal.aborted && current === generation.current)
          setLoading(false);
      });
    return () => controller.abort();
  }, [query, refresh]);
  function startQuery(value: string) {
    ++generation.current;
    moreAbort.current?.abort();
    setLoading(true);
    setFeed({ posts: [], nextCursor: null });
    setMore(false);
    setError("");
    setMessage("");
    if (value === query) setRefresh((previous) => previous + 1);
    else setQuery(value);
  }
  async function loadMore() {
    if (!feed.nextCursor || more) return;
    const current = generation.current,
      controller = new AbortController();
    moreAbort.current = controller;
    setMore(true);
    setError("");
    try {
      const next = await communityFetch<SentenceFeed>(
        `/api/community/sentences?q=${encodeURIComponent(query)}&cursor=${encodeURIComponent(feed.nextCursor)}`,
        { credentials: "omit", signal: controller.signal },
      );
      if (alive.current && current === generation.current)
        setFeed((previous) => ({
          posts: [
            ...previous.posts,
            ...next.posts.filter(
              (item) => !previous.posts.some((post) => post.id === item.id),
            ),
          ],
          nextCursor: next.nextCursor,
        }));
    } catch (error) {
      if (!controller.signal.aborted && alive.current)
        setError(
          error instanceof Error
            ? error.message
            : "More sentences could not load.",
        );
    } finally {
      if (alive.current && current === generation.current) setMore(false);
    }
  }
  return (
    <div className="community-gallery">
      <nav className="community-nav" aria-label="Community navigation">
        <Link href="/">← My learning journey</Link>
        <Link href="/sentences">
          My Sentence Lab <ArrowRight size={15} aria-hidden="true" />
        </Link>
      </nav>
      <header className="community-hero">
        <div>
          <span className="eyebrow">
            <Globe2 size={15} aria-hidden="true" /> THE SENTENCE GALLERY
          </span>
          <h1>
            A little German.
            <br />
            <span>A little of you.</span>
          </h1>
          <p>
            Useful phrases, everyday thoughts, small victories. Discover what
            other learners chose to share, signed in their own way.
          </p>
          <Button asChild>
            <Link href="/sentences">
              Share from my Sentence Lab{" "}
              <ArrowRight size={16} aria-hidden="true" />
            </Link>
          </Button>
          <span className="community-open">
            <Globe2 size={14} aria-hidden="true" /> Open to everyone. Read
            without an account.
          </span>
        </div>
        <div className="community-hero-note" aria-hidden="true">
          <QuoteMark />
          <p>
            Dein Deutsch.
            <br />
            Deine Geschichte.
          </p>
          <span className="community-signature community-signature-written">
            Your German. Your story.
          </span>
          <span className="community-example-label">
            A little encouragement from Deutsch Journey
          </span>
        </div>
      </header>
      <section
        className="community-feed"
        aria-labelledby="community-feed-title"
      >
        <div className="community-feed-heading">
          <div>
            <span className="eyebrow">FROM THE COMMUNITY</span>
            <h2 id="community-feed-title">Sentences worth sharing.</h2>
            <p className="muted">
              Learner-written practice. A sentence may still need a correction.
            </p>
          </div>
          <Button
            variant="ghost"
            onClick={() => startQuery(query)}
            disabled={loading || more}
          >
            <RefreshCw size={16} aria-hidden="true" /> Refresh
          </Button>
        </div>
        <form
          className="community-search"
          onSubmit={(event) => {
            event.preventDefault();
            startQuery(search.trim());
          }}
        >
          <label className="search-field">
            <Search size={17} aria-hidden="true" />
            <input
              aria-label="Search public sentences or signatures"
              placeholder="Search a sentence or a signature"
              maxLength={80}
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </label>
          <Button type="submit" variant="outline" disabled={more}>
            Search
          </Button>
          {query && (
            <Button
              variant="ghost"
              type="button"
              onClick={() => {
                setSearch("");
                startQuery("");
              }}
            >
              Clear search
            </Button>
          )}
        </form>
        <p role="status" className="community-status">
          {loading ? "Opening the latest shared sentences…" : message}
        </p>
        {error && (
          <div className="community-error" role="alert">
            <p>{error}</p>
            <Button variant="outline" onClick={() => startQuery(query)}>
              Try again
            </Button>
          </div>
        )}
        {!loading && !error && !feed.posts.length && (
          <div className="community-empty">
            <Sparkles size={28} aria-hidden="true" />
            <h3>
              {query
                ? "No sentences match this search yet."
                : "The first sentence could be yours."}
            </h3>
            <p>
              {query
                ? "Try another word, or clear your search to see the latest posts."
                : "Save a sentence in your Sentence Lab, choose to make it public, and add your signature."}
            </p>
            {!query && (
              <Button asChild variant="outline">
                <Link href="/sentences">
                  Open my Sentence Lab{" "}
                  <ArrowRight size={16} aria-hidden="true" />
                </Link>
              </Button>
            )}
          </div>
        )}
        {!loading && (
          <div className="community-note-grid">
            {feed.posts.map((post) => (
              <CommunitySentenceCard
                key={post.id}
                post={post}
                onMessage={setMessage}
              />
            ))}
          </div>
        )}
        {!loading && feed.nextCursor && (
          <div className="community-more">
            <Button variant="outline" onClick={loadMore} disabled={more}>
              {more ? "Opening more sentences…" : "Show more sentences"}
            </Button>
          </div>
        )}
      </section>
    </div>
  );
}
function QuoteMark() {
  return <span className="community-quote-mark">“</span>;
}
