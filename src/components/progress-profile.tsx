"use client";
import { useRef, useState } from "react";
import {
  Flame,
  Sparkles,
  BookOpen,
  Headphones,
  Mic,
  Download,
  Upload,
  Cloud,
  Check,
  ArrowRight,
  Award,
  LogOut,
} from "lucide-react";
import Link from "next/link";
import { useApp } from "./learning-app";
import { Button } from "./ui/button";
import { Dialog } from "./ui/dialog";
import {
  dailyActivities,
  localDay,
  stateSchema,
  streak,
  type LearningState,
} from "@/lib/learning";
import {
  exportState,
  importState,
  migrateLegacy,
  updateState,
} from "@/lib/store";
import { authClient } from "@/lib/auth-client";
import { isAuthError } from "@neondatabase/auth/next";
export function Progress() {
  const { state } = useApp();
  const masteredChapters = Object.values(state.journey.lessons).filter(
    (p) => p.completedAt,
  ).length;
  const days = Array.from({ length: 14 }, (_, i) => {
    const day = new Date();
    day.setDate(day.getDate() - 13 + i);
    const activities = state.activities.filter(
      (a) => localDay(new Date(a.at)) === localDay(day),
    );
    return { date: day, xp: activities.reduce((n, a) => n + a.xp, 0) };
  });
  const maxXp = Math.max(state.goal * 2, ...days.map((d) => d.xp));
  const achievements = [
    {
      title: "A small beginning",
      detail: "Complete your first practice",
      earned: state.activities.length > 0,
      icon: Sparkles,
    },
    {
      title: "Making it a habit",
      detail: "Practice for 7 consecutive days",
      earned: streak(state) >= 7,
      icon: Flame,
    },
    {
      title: "Words of your own",
      detail: "Collect 50 German words",
      earned: state.words.length >= 50,
      icon: BookOpen,
    },
    {
      title: "An ear for German",
      detail: "Complete 10 listening exercises",
      earned:
        state.activities.filter((a) => a.kind === "listening").length >= 10,
      icon: Headphones,
    },
    {
      title: "Finding your voice",
      detail: "Make 10 speaking attempts",
      earned:
        state.activities.filter((a) => a.kind === "speaking").length >= 10,
      icon: Mic,
    },
    {
      title: "A1 explorer",
      detail: "Complete all 12 chapters",
      earned: masteredChapters === 12,
      icon: Award,
    },
  ];
  const tricky = [...state.words]
    .filter((w) => w.mistakes > 0)
    .sort((a, b) => b.mistakes - a.mistakes)
    .slice(0, 5);
  return (
    <>
      <div className="page-heading">
        <div>
          <h1>Every small step leaves a trace.</h1>
          <p>
            Your progress is more than a number. It’s every time you came back.
          </p>
        </div>
        <Button variant="outline" onClick={() => exportState(state)}>
          <Download size={17} />
          Export my progress
        </Button>
      </div>
      <div className="progress-stats">
        <div className="panel">
          <Sparkles size={23} />
          <strong>{state.xp}</strong>
          <span>Total XP</span>
        </div>
        <div className="panel">
          <Flame size={23} />
          <strong>{streak(state)}</strong>
          <span>Consecutive study days</span>
        </div>
        <div className="panel">
          <BookOpen size={23} />
          <strong>{masteredChapters}/12</strong>
          <span>Chapters mastered</span>
        </div>
        <div className="panel">
          <Check size={23} />
          <strong>
            {state.activities.filter((a) => a.kind === "review").length}
          </strong>
          <span>Words revisited</span>
        </div>
      </div>
      <section className="panel activity-chart">
        <div className="section-heading">
          <div>
            <h2>A little German over time</h2>
            <p>Your last two weeks of practice</p>
          </div>
          <span className="soft-badge">
            {dailyActivities(state).reduce((n, a) => n + a.xp, 0)} XP today
          </span>
        </div>
        <div
          className="chart-bars"
          role="img"
          aria-label={days
            .map((d) => `${d.date.toLocaleDateString("en")}: ${d.xp} XP`)
            .join(", ")}
        >
          {days.map((d, i) => (
            <div
              key={i}
              title={`${d.date.toLocaleDateString("en")}: ${d.xp} XP`}
            >
              <span
                className={i === 13 ? "bar-today" : ""}
                style={{ height: `${Math.max(3, (d.xp / maxXp) * 100)}%` }}
              />
              <small>{d.date.getDate()}</small>
            </div>
          ))}
        </div>
        <p className="muted small">
          An empty day is a chance to begin again. Your words will be waiting.
        </p>
      </section>
      <div className="two-column">
        <section className="panel">
          <h2>Little milestones</h2>
          <div className="achievement-list">
            {achievements.map((a) => (
              <div key={a.title} className={a.earned ? "earned" : ""}>
                <span className="achievement-icon">
                  <a.icon size={22} />
                </span>
                <div>
                  <strong>{a.title}</strong>
                  <small>{a.detail}</small>
                </div>
                {a.earned && <Check size={18} />}
              </div>
            ))}
          </div>
        </section>
        <section className="panel">
          <h2>Words that need a little care</h2>
          {tricky.length ? (
            tricky.map((w) => (
              <Link
                className="tricky-word"
                href={`/vocabulary?q=${encodeURIComponent(w.german)}`}
                key={w.id}
              >
                <span lang="de">
                  {w.article} {w.german}
                </span>
                <small>
                  {w.mistakes} tricky {w.mistakes === 1 ? "moment" : "moments"}
                </small>
                <ArrowRight size={16} />
              </Link>
            ))
          ) : (
            <div className="quiet-empty">
              <p>No tricky words yet.</p>
              <small>
                When a review feels difficult, we’ll make space for it here.
              </small>
            </div>
          )}
          <h3 className="recent-title">Your recent steps</h3>
          {state.activities
            .slice(-5)
            .reverse()
            .map((a) => (
              <div className="activity-row" key={a.id}>
                <span>
                  <strong>{a.label}</strong>
                  <small>
                    {new Date(a.at).toLocaleDateString("en", {
                      month: "short",
                      day: "numeric",
                    })}
                  </small>
                </span>
                <span>+{a.xp} XP</span>
              </div>
            ))}
          {!state.activities.length && (
            <p className="muted">Your first practice will appear here.</p>
          )}
        </section>
      </div>
    </>
  );
}
export function Profile() {
  const { state, notify, cloudEnabled } = useApp();
  const [name, setName] = useState(state.name);
  const input = useRef<HTMLInputElement>(null);
  const [pending, setPending] = useState<LearningState | null>(null);
  const [error, setError] = useState("");
  async function readBackup(file?: File) {
    if (!file) return;
    try {
      if (file.size > 2_000_000)
        throw new Error(
          "This file is too large. Choose a Deutsch Journey JSON backup under 2 MB.",
        );
      const raw: unknown = JSON.parse(await file.text());
      const legacy =
        raw && typeof raw === "object" && "dj_words" in raw
          ? migrateLegacy({
              getItem: (key) => {
                const v = (raw as Record<string, unknown>)[key];
                return typeof v === "string" ? v : null;
              },
            })
          : raw;
      const parsed = stateSchema.safeParse(legacy);
      if (!parsed.success)
        throw new Error(
          "This isn’t a valid Deutsch Journey backup. Choose an exported JSON backup.",
        );
      setPending(parsed.data);
      setError("");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      if (input.current) input.current.value = "";
    }
  }
  return (
    <>
      <div className="page-heading">
        <div>
          <h1>Make this journey feel like yours.</h1>
          <p>
            A comfortable pace, helpful translations, and your words kept safe.
          </p>
        </div>
      </div>
      <div className="two-column profile-grid">
        <section className="panel">
          <h2>Your learning preferences</h2>
          <form
            className="profile-form"
            onSubmit={(e) => {
              e.preventDefault();
              const value = name.trim();
              if (value) {
                updateState((s) => ({ ...s, name: value }));
                notify("Your name is saved.");
              }
            }}
          >
            <label>
              What should we call you?
              <input
                required
                maxLength={60}
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </label>
            <Button type="submit" variant="outline">
              Save my name
            </Button>
          </form>
          <fieldset className="goal-options">
            <legend>Your daily intention</legend>
            <p className="muted small">
              An approximate practice time with an XP target to help you keep a
              rhythm.
            </p>
            {([10, 20, 30] as const).map((goal, i) => (
              <label
                className={state.goal === goal ? "selected" : ""}
                key={goal}
              >
                <input
                  type="radio"
                  name="goal"
                  value={goal}
                  checked={state.goal === goal}
                  onChange={() => {
                    updateState((s) => ({ ...s, goal }));
                    notify("A pace that works for you. Goal updated.");
                  }}
                />
                <span>
                  <strong>
                    {["A small step", "A steady rhythm", "A deeper dive"][i]}
                  </strong>
                  <small>
                    {goal} minutes · {goal * 2} XP per day
                  </small>
                </span>
                {state.goal === goal && <Check size={18} />}
              </label>
            ))}
          </fieldset>
          <label className="translation-setting">
            Helpful explanations
            <select
              value={state.language}
              onChange={(e) =>
                updateState((s) => ({
                  ...s,
                  language: e.target.value as "en" | "ar",
                }))
              }
            >
              <option value="en">English</option>
              <option value="ar">English + العربية</option>
            </select>
          </label>
          <p className="muted small">
            German stays at the center. Arabic adds support in grammar,
            vocabulary, and real-life situations.
          </p>
        </section>
        <div className="profile-side">
          <section className="panel">
            <h2>Your words, kept with you.</h2>
            <p className="muted">
              Your vocabulary and practice are saved in this browser. Export a
              backup to move them to another device or keep a spare copy.
            </p>
            <div className="button-row">
              <Button variant="outline" onClick={() => exportState(state)}>
                <Download size={17} />
                Export backup
              </Button>
              <Button variant="outline" onClick={() => input.current?.click()}>
                <Upload size={17} />
                Import backup
              </Button>
            </div>
            <input
              ref={input}
              type="file"
              accept=".json,application/json"
              className="visually-hidden"
              aria-label="Import learning backup"
              onChange={(e) => void readBackup(e.target.files?.[0])}
            />
            {error && (
              <p role="alert" className="form-error">
                {error}
              </p>
            )}
            <p className="muted small">
              If you used the original app on this same browser address, your
              words and XP are imported automatically. Otherwise, see the
              migration instructions in README.md.
            </p>
          </section>
          <section className="panel">
            <Cloud size={25} />
            <h2>Continue on another device</h2>
            {cloudEnabled ? (
              <CloudAccount />
            ) : (
              <>
                <p className="muted">
                  Account sign-in and cloud backups are available when this
                  app’s owner connects the cloud service.
                </p>
                <span className="soft-badge">
                  <span className="status-dot" />
                  Local learning is ready
                </span>
              </>
            )}
          </section>
          <section className="memory-note">
            <span>✦</span>
            <p>
              A goal is an invitation to practice. You can always choose a
              gentler pace.
            </p>
          </section>
        </div>
      </div>
      <Dialog
        open={!!pending}
        onOpenChange={(open) => !open && setPending(null)}
        title="Bring this learning journey onto your device?"
        description="Importing replaces the vocabulary, preferences, and progress currently saved in this browser. Export a backup first if you want to keep both."
      >
        {pending && (
          <p>
            {pending.name} · {pending.words.length} words · {pending.xp} XP
          </p>
        )}
        <div className="button-row">
          <Button variant="outline" onClick={() => exportState(state)}>
            Export current progress
          </Button>
          <Button
            onClick={() => {
              if (pending) {
                importState(pending);
                setName(pending.name);
                setPending(null);
                notify("Your learning journey has been imported.");
              }
            }}
          >
            Import this backup
          </Button>
        </div>
      </Dialog>
    </>
  );
}
function CloudAccount() {
  const { state, notify } = useApp();
  const {
    data: session,
    isPending,
    error: sessionError,
    refetch,
  } = authClient.useSession();
  const [signup, setSignup] = useState(false);
  const [verificationEmail, setVerificationEmail] = useState("");
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [revision, setRevision] = useState<number | null>(null);
  const [revisionUser, setRevisionUser] = useState<string | null>(null);
  const [remote, setRemote] = useState<{
    data: LearningState;
    revision: number;
  } | null>(null);
  async function authenticate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError("");
    setNotice("");
    const form = new FormData(e.currentTarget);
    const email = String(form.get("email")).trim();
    try {
      const result = signup
        ? await authClient.signUp.email({
            name: state.name,
            email,
            password: String(form.get("password")),
          })
        : await authClient.signIn.email({
            email,
            password: String(form.get("password")),
          });
      if (result.error?.code === "email_not_confirmed") {
        setVerificationEmail(email);
        setNotice("Verify your email before signing in. Request a code below.");
        return;
      }
      if (result.error)
        throw new Error(
          result.error.message ??
            "Sign-in could not finish. Check your details and try again.",
        );
      const restored = await authClient.getSession();
      if (restored.error)
        throw new Error(
          "Your account session could not be restored. Try signing in again.",
        );
      if (!restored.data?.user) {
        if (signup) {
          setVerificationEmail(email);
          setNotice(
            "Your account is created. Verify your email, then sign in.",
          );
          return;
        }
        throw new Error("Sign-in did not create a session. Please try again.");
      }
      notify("You’re signed in. Your local progress is ready to save.");
      setSignup(false);
    } catch (e) {
      // The Neon wrapper can throw a normalized AuthError before returning a result.
      if (isAuthError(e) && e.code === "email_not_confirmed") {
        setVerificationEmail(email);
        setNotice("Verify your email before signing in. Request a code below.");
        return;
      }
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function verifyEmail(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const form = new FormData(e.currentTarget);
      const result = await authClient.emailOtp.verifyEmail({
        email: verificationEmail,
        otp: String(form.get("otp")),
      });
      if (result.error)
        throw new Error(
          result.error.code === "validation_failed"
            ? "That code could not be verified. Check the six digits or request a new one."
            : (result.error.message ??
                "That code could not be verified. Request a new one."),
        );
      setVerificationEmail("");
      setSignup(false);
      setNotice("Email verified. Sign in to continue your journey.");
    } catch (e) {
      setError(
        isAuthError(e) && e.code === "validation_failed"
          ? "That code could not be verified. Check the six digits or request a new one."
          : (e as Error).message,
      );
    } finally {
      setBusy(false);
    }
  }
  async function sendVerificationCode() {
    setBusy(true);
    setError("");
    try {
      const result = await authClient.emailOtp.sendVerificationOtp({
        email: verificationEmail,
        type: "email-verification",
      });
      if (result.error)
        throw new Error(
          result.error.message ??
            "The verification code could not be sent. Please try again.",
        );
      setNotice("Check your email for a six-digit verification code.");
    } catch (e) {
      setError((e as Error).message);
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
      setNotice("");
      setSignup(false);
      setVerificationEmail("");
      notify("Signed out. Your local progress stays with you.");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function load() {
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/progress", { cache: "no-store" });
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
    setBusy(true);
    setError("");
    try {
      let currentRevision = revisionUser === session?.user.id ? revision : null;
      if (currentRevision === null) {
        const read = await fetch("/api/progress", { cache: "no-store" });
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
        headers: { "Content-Type": "application/json" },
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
        <>
          <p className="muted">
            Signed in as {session.user.email}. Save after practicing, then load
            on your other device. Cloud backups are manual.
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
      ) : verificationEmail ? (
        <form className="auth-form" onSubmit={verifyEmail}>
          <p className="muted">Verify the email for your account.</p>
          <label>
            Email
            <input
              type="email"
              value={verificationEmail}
              readOnly
              autoComplete="email"
            />
          </label>
          <label>
            Verification code
            <input
              name="otp"
              inputMode="numeric"
              autoComplete="one-time-code"
              pattern="[0-9]{6}"
              minLength={6}
              maxLength={6}
              required
            />
          </label>
          <div className="button-row">
            <Button disabled={busy} type="submit">
              {busy ? "Connecting…" : "Verify email"}
            </Button>
            <Button
              disabled={busy}
              variant="outline"
              type="button"
              onClick={() => void sendVerificationCode()}
            >
              Send verification code
            </Button>
            <Button
              disabled={busy}
              variant="ghost"
              type="button"
              onClick={() => {
                setVerificationEmail("");
                setSignup(false);
                setNotice("");
                setError("");
              }}
            >
              Back to sign in
            </Button>
          </div>
        </form>
      ) : (
        <form onSubmit={authenticate} className="auth-form">
          <label>
            Email
            <input type="email" name="email" autoComplete="email" required />
          </label>
          <label>
            Password
            <input
              type="password"
              name="password"
              minLength={signup ? 12 : 1}
              maxLength={128}
              autoComplete={signup ? "new-password" : "current-password"}
              required
            />
          </label>
          {signup && (
            <small className="muted">Use at least 12 characters.</small>
          )}
          <div className="button-row">
            <Button disabled={busy} type="submit">
              {busy ? "Connecting…" : signup ? "Create account" : "Sign in"}
            </Button>
            <Button
              type="button"
              variant="ghost"
              disabled={busy}
              onClick={() => {
                setSignup((s) => !s);
                setError("");
              }}
            >
              {signup ? "I have an account" : "Create an account"}
            </Button>
          </div>
        </form>
      )}
      {notice && (
        <p role="status" className="muted small">
          {notice}
        </p>
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
