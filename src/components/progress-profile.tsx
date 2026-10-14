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
import { CloudAccount } from "./cloud-account";
import {
  ProfileSummary,
  ProfileNotebook,
  ProfilePdfExport,
} from "./profile-notebook";
import { PersonalLifeProfile } from "./personal-life-profile";
import { ProfileShareControls } from "./profile-share";
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
      title: "Foundation explorer",
      detail: "Complete the 12 A1.1 chapters",
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
          <h1>Your learning, all in one place.</h1>
          <p>
            Your words, sentences, notes, and the small steps that bring Germany
            closer.
          </p>
        </div>
        <ProfilePdfExport />
      </div>
      <ProfileSummary />
      <ProfileShareControls />
      <PersonalLifeProfile />
      <ProfileNotebook />
      <div className="two-column profile-grid">
        <section className="panel">
          <h2>Your learning preferences</h2>
          <form
            className="profile-form"
            onSubmit={(e) => {
              e.preventDefault();
              const value = String(
                new FormData(e.currentTarget).get("name") ?? "",
              ).trim();
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
                name="name"
                key={state.name}
                defaultValue={state.name}
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
            <h2>Account and cloud backup</h2>
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
