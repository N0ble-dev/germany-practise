"use client";
import { useState } from "react";
import { Cloud, LogOut } from "lucide-react";
import { useApp } from "./learning-app";
import { Button } from "./ui/button";
import { Dialog } from "./ui/dialog";
import { stateSchema, type LearningState } from "@/lib/learning";
import { exportState, importState, activateLearningAccount } from "@/lib/store";
import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth-client";
import Link from "next/link";
import { GoogleMark } from "./google-mark";
export function CloudAccount({
  standalone = false,
  onAuthenticated,
  returnTo = "/profile",
  oauthFailed = false,
}: {
  standalone?: boolean;
  onAuthenticated?: () => void;
  returnTo?: "/" | "/planner" | "/profile";
  oauthFailed?: boolean;
} = {}) {
  const { state, notify } = useApp();
  const router = useRouter();
  const {
    data: session,
    isPending,
    error: sessionError,
    refetch,
  } = authClient.useSession();
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [revision, setRevision] = useState<number | null>(null);
  const [revisionUser, setRevisionUser] = useState<string | null>(null);
  const [remote, setRemote] = useState<{
    data: LearningState;
    revision: number;
  } | null>(null);
  async function authenticate() {
    setBusy(true);
    setError("");
    try {
      const callback = new URL("/auth/complete", window.location.origin);
      callback.searchParams.set("next", returnTo);
      const failure = new URL("/signin", window.location.origin);
      failure.searchParams.set("oauth", "error");
      failure.searchParams.set("next", returnTo);
      const result = await authClient.signIn.social({
        provider: "google",
        callbackURL: callback.href,
        errorCallbackURL: failure.href,
      });
      if (result.error || !result.data?.url)
        throw new Error("Google sign-in could not start.");
      // The Neon SDK redirects to Google, including its popup flow in previews.
    } catch {
      setError(
        "Google sign-in could not start. Please try again. If you are in a preview, allow popups or open the app in a browser tab.",
      );
    } finally {
      setBusy(false);
    }
  }
  async function signOut() {
    setBusy(true);
    setError("");
    try {
      const result = await authClient.signOut();
      if (result.error)
        throw new Error(
          result.error.message ??
            "Sign-out could not finish. Please try again.",
        );
      setRevision(null);
      setRevisionUser(null);
      setRemote(null);
      activateLearningAccount(null);
      notify("Signed out. Your account's learning is saved on this device.");
      router.replace("/signin");
      router.refresh();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function load() {
    const accountId = session?.user.id;
    if (!accountId) return;
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/progress", {
        cache: "no-store",
        headers: { "X-Learning-Account": accountId },
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error);
      if (body.data) {
        const parsed = stateSchema.parse(body.data);
        setRemote({ data: parsed, revision: body.revision });
      } else {
        setRevision(0);
        setRevisionUser(session?.user.id ?? null);
        notify("No cloud backup yet. Save your current journey to begin.");
      }
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function save() {
    const accountId = session?.user.id;
    if (!accountId) return;
    setBusy(true);
    setError("");
    try {
      let currentRevision = revisionUser === session?.user.id ? revision : null;
      if (currentRevision === null) {
        const read = await fetch("/api/progress", {
          cache: "no-store",
          headers: { "X-Learning-Account": accountId },
        });
        const existing = await read.json();
        if (!read.ok) throw new Error(existing.error);
        if (existing.data)
          throw new Error(
            "This account already has a cloud journey. Export your local progress, then load the cloud backup before saving.",
          );
        currentRevision = 0;
      }
      const response = await fetch("/api/progress", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "X-Learning-Account": accountId,
        },
        body: JSON.stringify({ data: state, revision: currentRevision }),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error);
      setRevision(body.revision);
      setRevisionUser(session?.user.id ?? null);
      notify("Your cloud backup is saved.");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      {isPending ? (
        <p className="muted">Checking your account…</p>
      ) : session ? (
        standalone ? (
          <div className="auth-already-signed-in">
            <p className="muted">Signed in as {session.user.email}.</p>
            <Button onClick={onAuthenticated}>Continue my journey</Button>
          </div>
        ) : (
          <>
            <p className="muted">
              Signed in as {session.user.email}. Save after practicing, then
              load on your other device. Cloud backups are manual.
            </p>
            <p className="muted small">
              Plan your next practice in{" "}
              <Link href="/planner">My study calendar</Link>
              and connect Google Calendar for reminders.
            </p>
            <div className="button-row">
              <Button disabled={busy} onClick={() => void save()}>
                <Cloud size={16} />
                Save to cloud
              </Button>
              <Button
                variant="outline"
                disabled={busy}
                onClick={() => void load()}
              >
                Load cloud backup
              </Button>
              <Button
                size="sm"
                variant="ghost"
                disabled={busy}
                onClick={() => void signOut()}
              >
                <LogOut size={15} />
                Sign out
              </Button>
            </div>
          </>
        )
      ) : (
        <div className="google-auth">
          {standalone && <h2>One account. Your whole journey.</h2>}
          <p className="muted">
            Use your Google account to sign in or get started. We create your
            learning account automatically on your first visit.
          </p>
          <Button
            className="google-signin"
            variant="outline"
            disabled={busy}
            onClick={() => void authenticate()}
          >
            <GoogleMark />
            {busy ? "Opening Google?" : "Continue with Google"}
          </Button>
          <p className="muted small">
            Connect Google Calendar afterward to add study reminders. You choose
            when to give calendar permission.
          </p>
          {oauthFailed && !error && (
            <p role="alert" className="form-error">
              Google sign-in did not finish. Your progress is safe. Try again
              when you are ready.
            </p>
          )}
        </div>
      )}
      {sessionError && !isPending && (
        <div role="alert" className="form-error">
          <p>
            Your account service could not connect. Your local progress is safe.
          </p>
          <Button variant="outline" size="sm" onClick={() => void refetch()}>
            Try the connection again
          </Button>
        </div>
      )}
      {error && (
        <p role="alert" className="form-error">
          {error}
        </p>
      )}
      <Dialog
        open={!!remote}
        onOpenChange={(open) => !open && setRemote(null)}
        title="Load your cloud journey?"
        description="This replaces the progress on this device. Export your local backup first to preserve any different words or practice."
      >
        {remote && (
          <p>
            {remote.data.name} · {remote.data.words.length} words ·{" "}
            {remote.data.xp} XP
          </p>
        )}
        <div className="button-row">
          <Button variant="outline" onClick={() => exportState(state)}>
            Export local backup
          </Button>
          <Button
            onClick={() => {
              if (remote) {
                importState(remote.data);
                setRevision(remote.revision);
                setRevisionUser(session?.user.id ?? null);
                setRemote(null);
                notify("Cloud progress loaded onto this device.");
              }
            }}
          >
            Load this journey
          </Button>
        </div>
      </Dialog>
    </>
  );
}
