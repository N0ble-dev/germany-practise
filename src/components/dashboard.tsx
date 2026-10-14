"use client";
import Link from "next/link";
import {
  ArrowUpRight,
  ArrowRight,
  BookOpen,
  Layers,
  Headphones,
  Mic,
  Check,
  Plus,
  Volume2,
  Sparkles,
  Flame,
  ChevronRight,
  MapPin,
} from "lucide-react";
import { useApp } from "./learning-app";
import { GermanyMotivation } from "./germany-motivation";
import { UpcomingStudy } from "./upcoming-study";
import { StudyShortcuts } from "./study-shortcuts";
import { PersonalLifeTodayCard } from "./personal-life-support";
import { JourneyTodayCard } from "./german-journey";
import { Button } from "./ui/button";
import {
  dailyActivities,
  dueWords,
  formatWord,
  localDay,
  streak,
} from "@/lib/learning";
import { lessons } from "@/lib/content";
import { emptyLessonProgress, journeyPercent } from "@/lib/journey-model";
import { speakGerman } from "@/lib/speech";
export function Dashboard() {
  const { state, notify, displayName } = useApp();
  const today = dailyActivities(state);
  const due = dueWords(state);
  const dailyXp = today.reduce((sum, a) => sum + a.xp, 0);
  const target = state.goal * 2;
  const percent = Math.min(100, Math.round((dailyXp / target) * 100));
  const lesson = lessons[state.currentLesson - 1];
  const word =
    state.words.find((w) => w.favorite) ??
    state.words.find((w) => w.german === "Bahnhof") ??
    state.words[0];
  const hour = new Date().getHours();
  const greeting =
    hour < 12 ? "Guten Morgen" : hour < 18 ? "Guten Tag" : "Guten Abend";
  const tasks = [
    {
      title: "Give your words another look",
      detail: `${due.length} words ready for review`,
      href: "/review",
      icon: Layers,
      color: "purple",
      done:
        today.filter((a) => a.kind === "review").length >=
          Math.min(5, state.words.length) && state.words.length > 0,
      time: "4 min",
    },
    {
      title: "Let your ears do the learning",
      detail: "Listen to a short German sentence",
      href: "/listening",
      icon: Headphones,
      color: "blue",
      done: today.some((a) => a.kind === "listening"),
      time: "3 min",
    },
    {
      title: "Say it out loud",
      detail: "One sentence. A little more confidence.",
      href: "/speaking",
      icon: Mic,
      color: "peach",
      done: today.some((a) => a.kind === "speaking"),
      time: "2 min",
    },
  ];
  const activeDays = new Set(
    state.activities.map((a) => localDay(new Date(a.at))),
  );
  return (
    <>
      <div className="page-heading">
        <div>
          <h1>
            {greeting}, {displayName} <span className="wave">☀</span>
          </h1>
          <p>
            You don’t need to learn it all today. Just a little more than
            yesterday.
          </p>
        </div>
        <span className="date-label">
          {new Date().toLocaleDateString("en", {
            weekday: "long",
            month: "short",
            day: "numeric",
          })}
        </span>
      </div>
      <StudyShortcuts />
      <div className="dashboard-grid">
        <div className="dashboard-primary">
          <GermanyMotivation compact />
          <UpcomingStudy />
          <section className="stats-strip" aria-label="Learning summary">
            <div>
              <span className="stat-icon purple">
                <LibraryIcon />
              </span>
              <div>
                <strong>{state.words.length}</strong>
                <span>Words in your collection</span>
              </div>
            </div>
            <div>
              <span className="stat-icon mint">
                <Check size={20} />
              </span>
              <div>
                <strong>
                  {state.words.filter((w) => w.status === "mastered").length}
                </strong>
                <span>Words feeling familiar</span>
              </div>
            </div>
            <div>
              <span className="stat-icon peach">
                <Sparkles size={20} />
              </span>
              <div>
                <strong>{state.xp}</strong>
                <span>XP earned along the way</span>
              </div>
            </div>
          </section>
          <section className="daily-plan">
            <div className="section-heading">
              <div>
                <h2>Your little plan for today</h2>
                <p>A balanced mix to help the words stick.</p>
              </div>
              <span className="muted small">
                {tasks.filter((t) => t.done).length} of 3 complete
              </span>
            </div>
            <div className="task-list">
              {tasks.map((t) => (
                <Link
                  href={t.href}
                  className={`task-row ${t.done ? "task-done" : ""}`}
                  key={t.href}
                >
                  <span className={`task-icon ${t.color}`}>
                    {t.done ? <Check size={21} /> : <t.icon size={21} />}
                  </span>
                  <span className="task-copy">
                    <strong>{t.title}</strong>
                    <small>{t.detail}</small>
                  </span>
                  <span className="task-time">{t.done ? "Done" : t.time}</span>
                  <ArrowUpRight size={19} />
                </Link>
              ))}
            </div>
          </section>
          <PersonalLifeTodayCard />
          <JourneyTodayCard />
          <section className="explore-banner">
            <span className="explore-icon">
              <BookOpen size={24} />
            </span>
            <div>
              <h3>Your content is ready to explore.</h3>
              <p>
                Open the books, discover words, and practise German–English
                sentences.
              </p>
            </div>
            <Button variant="outline" asChild>
              <Link href="/library">
                Open content library <ArrowRight size={16} />
              </Link>
            </Button>
          </section>
          <section className="continue-section">
            <div className="section-heading">
              <h2>Pick up where you are</h2>
              <Link href="/lessons" className="text-link">
                View learning path <ArrowRight size={15} />
              </Link>
            </div>
            <Link
              href={`/lessons/${state.currentLesson}`}
              className="lesson-preview"
            >
              <div className="lesson-cover">
                <BookOpen size={30} />
                <span>A1.1</span>
              </div>
              <div className="lesson-preview-copy">
                <span className="muted small">
                  Foundation course · Lesson {state.currentLesson}
                </span>
                <h3 lang="de">{lesson.title}</h3>
                <p>{lesson.translation}</p>
                <div className="progress-track">
                  <span
                    style={{
                      width: `${journeyPercent(state.journey.lessons[state.currentLesson] ?? emptyLessonProgress())}%`,
                    }}
                  />
                </div>
              </div>
              <span className="round-arrow">
                <ArrowRight size={19} />
              </span>
            </Link>
          </section>
          <section className="explore-banner">
            <span className="explore-icon">
              <MapPin size={24} />
            </span>
            <div>
              <h3>A little German, out in the world.</h3>
              <p>Order a coffee. Find your train. Make a new friend.</p>
            </div>
            <Button variant="outline" asChild>
              <Link href="/germany">
                Try a situation <ArrowUpRight size={16} />
              </Link>
            </Button>
          </section>
        </div>
        <aside className="dashboard-rail" aria-label="Daily learning support">
          <section className="goal-card">
            <div className="section-heading">
              <h2>Today’s intention</h2>
              <Link href="/profile" className="muted small">
                Edit
              </Link>
            </div>
            <div
              className="goal-ring"
              style={{ "--progress": `${percent}%` } as React.CSSProperties}
            >
              <div>
                <strong>{percent}%</strong>
                <span>of your daily goal</span>
              </div>
            </div>
            <p className="goal-caption">
              <strong>{dailyXp}</strong> / {target} XP <span>·</span>{" "}
              {state.goal}-minute goal
            </p>
            <div className="goal-message">
              {percent >= 100
                ? "You made time for German. Schön gemacht!"
                : dailyXp > 0
                  ? "You’re making room for progress. Keep going."
                  : "A fresh start. Your first small step counts."}
            </div>
            <div className="week-dots">
              {Array.from({ length: 7 }, (_, i) => {
                const day = new Date();
                day.setDate(day.getDate() - 6 + i);
                const done = activeDays.has(localDay(day));
                return (
                  <div key={i}>
                    <span
                      className={
                        done ? "day-active" : i === 6 ? "day-today" : ""
                      }
                    >
                      {done ? <Check size={13} /> : day.getDate()}
                    </span>
                    <small>
                      {day.toLocaleDateString("en", { weekday: "narrow" })}
                    </small>
                  </div>
                );
              })}
            </div>
            <p className="streak-caption">
              <Flame size={15} />
              {streak(state)
                ? `${streak(state)} days of showing up. Keep it gentle.`
                : "Your next habit starts with today."}
            </p>
          </section>
          {word && (
            <section className="word-spotlight">
              <div className="section-heading">
                <span className="spotlight-label">A word to take with you</span>
                <Button
                  size="icon"
                  variant="ghost"
                  aria-label={`Listen to ${formatWord(word)}`}
                  onClick={() =>
                    speakGerman(formatWord(word)).catch((e) =>
                      notify(e.message),
                    )
                  }
                >
                  <Volume2 size={18} />
                </Button>
              </div>
              <h3 lang="de">
                <span className={`article-${word.article}`}>
                  {word.article}
                </span>{" "}
                {word.german}
              </h3>
              <p>{word.english}</p>
              {state.language === "ar" && (
                <p lang="ar" dir="rtl">
                  {word.arabic}
                </p>
              )}
              <blockquote lang="de">
                “{word.example || formatWord(word)}”
              </blockquote>
              <Link
                href={`/vocabulary?q=${encodeURIComponent(word.german)}`}
                className="text-link"
              >
                Make it memorable <ChevronRight size={15} />
              </Link>
            </section>
          )}
          <section className="memory-note">
            <span>✦</span>
            <p>“Every word you revisit is a word you’re making your own.”</p>
            <small>Repetition is a kindness to your memory.</small>
          </section>
          <Button variant="outline" asChild className="add-word-link">
            <Link href="/vocabulary?add=1">
              <Plus size={17} /> Add a word from your lesson
            </Link>
          </Button>
        </aside>
      </div>
    </>
  );
}
function LibraryIcon() {
  return <BookOpen size={20} />;
}
