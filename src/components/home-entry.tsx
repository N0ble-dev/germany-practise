"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth-client";
import { updateState } from "@/lib/store";
import { useApp } from "./learning-app";
import { Dashboard } from "./dashboard";
import { Button } from "./ui/button";
function completeWelcome() {
  updateState((state) => ({ ...state, onboardingComplete: true }));
}
export function HomeEntry() {
  const { state, cloudEnabled } = useApp();
  const hasJourney =
    state.onboardingComplete ||
    state.xp > 0 ||
    state.activities.length > 0 ||
    state.planner.sessions.length > 0 ||
    state.savedSentences.length > 0 ||
    Object.keys(state.lessonNotes).length > 0 ||
    state.words.some((word) => word.id.startsWith("legacy-"));
  if (!cloudEnabled || hasJourney) return <Dashboard />;
  return <NewLearnerEntry />;
}

function NewLearnerEntry() {
  const { data: session, isPending } = authClient.useSession();
  const router = useRouter();
  useEffect(() => {
    if (!isPending && !session) router.replace("/signup");
  }, [session, isPending, router]);
  if (session) return <Dashboard />;
  return (
    <section className="panel welcome-loading">
      <h1>Your German journey starts here.</h1>
      <p className="muted" role="status">
        {isPending ? "Checking your account…" : "Opening your signup page…"}
      </p>
      <Button variant="outline" onClick={completeWelcome}>
        Continue without an account
      </Button>
    </section>
  );
}
