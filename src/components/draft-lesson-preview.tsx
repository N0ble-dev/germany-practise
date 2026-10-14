"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { authClient } from "@/lib/auth-client";
import type { LessonPack } from "@/lib/content-pipeline/model";
import { PublishedLesson } from "./published-lesson";
import { Button } from "./ui/button";
export function DraftLessonPreview({
  lessonKey,
  version,
}: {
  lessonKey: string;
  version: string;
}) {
  const { data: session, isPending } = authClient.useSession();
  const userId = session?.user.id;
  const [result, setResult] = useState<{
    userId: string;
    key: string;
    pack: LessonPack;
  } | null>(null);
  const [error, setError] = useState<{
    userId: string;
    key: string;
    message: string;
  } | null>(null);
  const [retry, setRetry] = useState(0);
  const key = `${lessonKey}@${version}`;
  useEffect(() => {
    if (!userId) return;
    const controller = new AbortController();
    void (async () => {
      try {
        const response = await fetch(
          `/api/admin/content/draft?lesson=${encodeURIComponent(lessonKey)}&version=${encodeURIComponent(version)}`,
          {
            cache: "no-store",
            signal: controller.signal,
            headers: { "X-Learning-Account": userId },
          },
        );
        const body = await response.json();
        if (!response.ok)
          throw new Error(body.error ?? "This preview could not load.");
        if (!controller.signal.aborted)
          setResult({ userId, key, pack: body.pack });
      } catch (failure) {
        if (!controller.signal.aborted)
          setError({
            userId,
            key,
            message:
              failure instanceof Error
                ? failure.message
                : "This preview could not load.",
          });
      }
    })();
    return () => controller.abort();
  }, [userId, lessonKey, version, key, retry]);
  if (isPending) return <p role="status">Checking your content account…</p>;
  if (!userId)
    return (
      <section className="panel">
        <h1>Editorial preview</h1>
        <p>Sign in with your content-team account, then reopen this preview.</p>
        <Link href="/signin?next=/admin/content/coverage">
          Continue with Google
        </Link>
      </section>
    );
  if (result?.userId === userId && result.key === key)
    return <PublishedLesson key={key} pack={result.pack} preview />;
  if (error?.userId === userId && error.key === key)
    return (
      <section className="panel">
        <p role="alert">{error.message}</p>
        <Button
          onClick={() => {
            setError(null);
            setRetry((n) => n + 1);
          }}
        >
          Try again
        </Button>
        <Link href="/admin/content/coverage">Back to coverage</Link>
      </section>
    );
  return <p role="status">Loading the draft preview…</p>;
}
