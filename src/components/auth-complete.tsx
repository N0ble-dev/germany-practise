"use client";
import { useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth-client";
import type { AuthDestination } from "@/lib/auth-navigation";
import { updateState } from "@/lib/store";
import { useApp } from "./learning-app";
import { Button } from "./ui/button";

export function AuthComplete({
  destination,
}: {
  destination: AuthDestination;
}) {
  // Importing the Neon client also completes its supported iframe popup handoff.
  // useSession exchanges the OAuth verifier through the server proxy.
  const { data: session, isPending, error, refetch } = authClient.useSession();
  const { notify } = useApp();
  const router = useRouter();
  const completed = useRef(false);
  const finishing = isPending || (!!session && !error);
  useEffect(() => {
    if (isPending || error || !session?.user || completed.current) return;
    completed.current = true;
    updateState((state) => ({
      ...state,
      name: !state.onboardingComplete
        ? session.user.name.trim().slice(0, 60) || state.name
        : state.name,
      onboardingComplete: true,
    }));
    notify("You're signed in. Your German journey is ready.");
    router.replace(destination);
  }, [session, isPending, error, destination, notify, router]);

  return (
    <section className="panel welcome-loading">
      <h1>
        {finishing ? "Welcome to your journey" : "Let's try Google again"}
      </h1>
      {finishing ? (
        <p className="muted" role="status">
          Finishing your Google sign-in…
        </p>
      ) : (
        <>
          <p className="form-error" role="alert">
            Google sign-in did not finish. Your local progress is safe.
          </p>
          {error && (
            <Button variant="outline" onClick={() => void refetch()}>
              Check my account again
            </Button>
          )}
          <Button asChild>
            <Link href={`/signin?next=${encodeURIComponent(destination)}`}>
              Return to Google sign-in
            </Link>
          </Button>
        </>
      )}
    </section>
  );
}
