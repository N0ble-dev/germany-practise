"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  ArrowUpRight,
  BookOpen,
  CalendarDays,
  Check,
  Clock3,
  GraduationCap,
  Headphones,
  Mic,
  PenLine,
  ShieldCheck,
} from "lucide-react";
import { Button } from "../ui/button";
import { useApp } from "../learning-app";
import { examFetch } from "./exam-studio";
import type { ExamGoal } from "@/lib/exams/model";
import {
  examDefinitions,
  examDisclaimer,
  examSkills,
  officialPassRule,
  skillLabels,
  type ExamDefinition,
} from "@/lib/exams/definitions";
const icons = {
  listening: Headphones,
  reading: BookOpen,
  writing: PenLine,
  speaking: Mic,
};
const strategies = {
  listening: [
    "Read the question before the audio starts.",
    "Notice corrections, negatives, times and numbers.",
    "After practice, use the transcript to find the exact clue you missed.",
  ],
  reading: [
    "Scan for the information the question asks for.",
    "Check who, where, when and any conditions or negatives.",
    "Use evidence in the text rather than a familiar-looking word.",
  ],
  writing: [
    "Turn the requested content points into a short checklist.",
    "Match the tone to the person receiving your message.",
    "Leave time to check verb position, noun capitals and missing points.",
  ],
  speaking: [
    "Practise taking turns, asking questions and responding.",
    "Use clear sentences you can say without memorising a whole script.",
    "Rehearse with a partner and ask a proficient speaker for feedback.",
  ],
};
export function ExamArena() {
  const { identity } = useApp();
  const [level, setLevel] = useState("A1");
  const [goal, setGoal] = useState<ExamGoal | null>(null);
  const [goalError, setGoalError] = useState("");
  const chosen = useRef(false);
  const accountId = identity?.id;
  useEffect(() => {
    if (!accountId) return;
    const controller = new AbortController();
    examFetch<{ goal: ExamGoal | null }>("/api/exams/goal", {
      headers: { "X-Learning-Account": accountId },
      signal: controller.signal,
    })
      .then(({ goal }) => {
        setGoal(goal);
        if (goal && !chosen.current)
          setLevel(
            examDefinitions.find((item) => item.code === goal.examCode)!.level,
          );
      })
      .catch((error) => {
        if (!controller.signal.aborted) setGoalError((error as Error).message);
      });
    return () => controller.abort();
  }, [accountId]);
  const definition = examDefinitions.find((item) => item.level === level)!;
  return (
    <div className="exam-arena">
      <nav className="arena-top-links" aria-label="Exam preparation navigation">
        <Link href="/exams/plan">
          <CalendarDays size={16} aria-hidden="true" /> My exam plan
        </Link>
        <Link href="/exams/mistakes">Results & mistake lab</Link>
        <Link href="/exams/resources">
          Resources library <ArrowUpRight size={15} aria-hidden="true" />
        </Link>
      </nav>
      <section className="arena-hero">
        <div>
          <span className="eyebrow">
            <GraduationCap size={16} aria-hidden="true" /> EXAM ARENA
          </span>
          <h1>
            Walk in with a plan.
            <br />
            <em>Find your German confidence.</em>
          </h1>
          <p>
            Understand your exam. Practise the four skills. Turn every difficult
            moment into your next small step.
          </p>
          <div className="button-row">
            <Button asChild>
              <Link href={`/exams/${definition.code}/guide`}>
                Explore my exam <ArrowRight size={17} aria-hidden="true" />
              </Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/exams/plan">Set my target & study rhythm</Link>
            </Button>
          </div>
          <p className="arena-independence">
            Independent Goethe-Zertifikat preparation · adult exams
          </p>
        </div>
        <div className="arena-ticket">
          <div className="arena-ticket-top">
            <span>YOUR NEXT MILESTONE</span>
            <span className="arena-ticket-flag" aria-hidden="true">
              <i />
              <i />
              <i />
            </span>
          </div>
          <strong>{level}</strong>
          <span>{definition.title}</span>
          <div className="arena-ticket-skills">
            {examSkills.map((skill) => (
              <span key={skill}>
                <i aria-hidden="true" />
                {skillLabels[skill].de}
              </span>
            ))}
          </div>
          <p>{definition.speakingSetup}</p>
        </div>
      </section>
      <section
        className="arena-level-selector"
        aria-label="Choose your target Goethe exam"
      >
        <div>
          <span className="eyebrow">START WITH YOUR TARGET</span>
          <h2>Which exam are you working towards?</h2>
        </div>
        <div role="group" aria-label="Target exam level">
          {examDefinitions.map((item) => (
            <button
              key={item.level}
              aria-pressed={level === item.level}
              onClick={() => {
                chosen.current = true;
                setLevel(item.level);
              }}
            >
              {item.level}
            </button>
          ))}
        </div>
      </section>
      {goal && (
        <div className="arena-target-summary">
          <CalendarDays size={19} aria-hidden="true" />
          <span>
            <strong>
              My saved target:{" "}
              {
                examDefinitions.find((item) => item.code === goal.examCode)!
                  .level
              }
            </strong>{" "}
            ·{" "}
            {goal.date
              ? `${goal.bookingConfirmed ? "Booked by you" : "Planned"}: ${goal.date}`
              : "Exam date not set"}{" "}
            · {goal.dailyMinutes} min/day
          </span>
          <Link href="/exams/plan">
            Edit my plan <ArrowRight size={15} aria-hidden="true" />
          </Link>
        </div>
      )}
      {goalError && (
        <p className="muted small">
          Your saved target could not load. You can still explore the exam
          guides.
        </p>
      )}
      <div className="arena-course-note">
        <BookOpen size={19} aria-hidden="true" />
        <p>
          {level === "A1"
            ? "Your Menschen A1.1 journey builds the foundation. A full A1 exam expects the wider A1 level, so keep learning beyond A1.1 alongside exam practice."
            : `Your current companion course is A1.1. This guide explains ${level}; it does not mean the course covers the full ${level} syllabus.`}
        </p>
      </div>
      <section aria-labelledby="arena-skills-heading">
        <div className="arena-section-title">
          <div>
            <span className="eyebrow">
              FOUR SKILLS, ONE PREPARATION JOURNEY
            </span>
            <h2 id="arena-skills-heading">
              Give each skill a place in your week.
            </h2>
          </div>
          <span>
            {level === "A1"
              ? "A1 format walkthroughs available"
              : `${level} guide & official models available`}
          </span>
        </div>
        <div className="arena-skill-cards">
          {examSkills.map((skill) => {
            const Icon = icons[skill];
            return (
              <article
                className={`arena-skill arena-skill-${skill}`}
                key={skill}
              >
                <div className="arena-skill-top">
                  <span>
                    <Icon size={24} aria-hidden="true" />
                  </span>
                  <small>
                    <Clock3 size={13} aria-hidden="true" />{" "}
                    {definition.minutes[skill]} min
                  </small>
                </div>
                <h3 lang="de">{skillLabels[skill].de}</h3>
                <span className="arena-skill-english">
                  {skillLabels[skill].en}
                </span>
                <p>{definition.sections[skill]}</p>
                <Link
                  href={
                    level === "A1"
                      ? `/exams/${definition.code}/practice/${skill}`
                      : `/exams/${definition.code}/guide#${skill}`
                  }
                >
                  {level === "A1"
                    ? "Explore this skill"
                    : "See the preparation guide"}
                  <ArrowRight size={16} aria-hidden="true" />
                </Link>
              </article>
            );
          })}
        </div>
      </section>
      <section className="arena-next-grid">
        <article className="arena-next-card">
          <span className="eyebrow">LEARN THE FORMAT</span>
          <h2>Know what happens before exam day.</h2>
          <p>
            Section timings, speaking setup, pass rules and a practical strategy
            for your level.
          </p>
          <Link href={`/exams/${definition.code}/guide`}>
            Understand {level} <ArrowRight size={16} aria-hidden="true" />
          </Link>
        </article>
        <article className="arena-next-card">
          <span className="eyebrow">BUILD YOUR RHYTHM</span>
          <h2>A realistic plan beats a rushed week.</h2>
          <p>
            Choose your target, a planned or booked date, and a daily pace.
            Preview sessions before adding them to your calendar.
          </p>
          <Link href="/exams/plan">
            Make my exam plan <ArrowRight size={16} aria-hidden="true" />
          </Link>
        </article>
        <article className="arena-next-card arena-mock-note">
          <span className="eyebrow">TIMED PRACTICE</span>
          <h2>A full mock should earn your trust.</h2>
          <p>
            Full scored mocks will open after a complete paper, owned audio and
            its grading approach pass qualified review.{" "}
            {level === "A1"
              ? "Start with the format walkthroughs and official models today."
              : "Use your level guide and official models today."}
          </p>
          <Link href="/exams/resources">
            Find official model tests{" "}
            <ArrowRight size={16} aria-hidden="true" />
          </Link>
        </article>
      </section>
      <section className="arena-rules-summary">
        <ShieldCheck size={23} aria-hidden="true" />
        <div>
          <h2>{level} scoring: know the actual rule.</h2>
          <p>{officialPassRule(definition)}</p>
          <a
            href={definition.scoringUrl}
            target="_blank"
            rel="noopener noreferrer"
          >
            Official scoring reference{" "}
            <ArrowUpRight size={15} aria-hidden="true" />
          </a>
        </div>
      </section>
      <section className="arena-exam-day">
        <div className="arena-section-title">
          <div>
            <span className="eyebrow">THE WEEK BEFORE YOUR EXAM</span>
            <h2>Arrive knowing your next step.</h2>
          </div>
        </div>
        <div className="arena-day-grid">
          {[
            [
              "Confirm the booking",
              "Check your exam centre, date, arrival instructions and the identity document requested by the centre.",
            ],
            [
              "Check your exam format",
              "Ask whether your booking is paper-based or digital, and check the centre's rules for belongings and permitted materials.",
            ],
            [
              "Ask about access needs",
              "Contact the centre early about accommodations and its documentation or application deadlines.",
            ],
            [
              "Keep the final day gentle",
              "Review familiar patterns, plan your journey, and give yourself time to rest. Avoid trying to learn a whole new level overnight.",
            ],
          ].map(([title, body]) => (
            <article key={title}>
              <Check size={18} aria-hidden="true" />
              <div>
                <h3>{title}</h3>
                <p>{body}</p>
              </div>
            </article>
          ))}
        </div>
        <div className="arena-reference-links">
          <a
            href={definition.formatUrl}
            target="_blank"
            rel="noopener noreferrer"
          >
            Official exam information ↗
          </a>
          <a
            href="https://www.goethe.de/en/spr/prf/ueb/bpf.html"
            target="_blank"
            rel="noopener noreferrer"
          >
            Accessible exam preparation ↗
          </a>
          <a
            href="https://www.goethe.de/ins/eg/de/sta/alx/prf.html"
            target="_blank"
            rel="noopener noreferrer"
          >
            Goethe Alexandria exams ↗
          </a>
        </div>
      </section>
      <footer className="arena-source-note">
        <p>{examDisclaimer}</p>
        <p>
          Format and scoring sources checked 14 October 2026. Section durations
          do not include every appointment, break or preparation arrangement;
          confirm these with your exam centre.
        </p>
      </footer>
    </div>
  );
}

export function ExamGuide({ definition }: { definition: ExamDefinition }) {
  return (
    <div className="exam-arena arena-guide">
      <nav className="arena-top-links" aria-label="Exam guide navigation">
        <Link href="/exams">← Exam Arena</Link>
        <Link href="/exams/resources">Resources library ↗</Link>
        <Link href="/exams/plan">My exam plan</Link>
      </nav>
      <header className="arena-guide-heading">
        <span className="eyebrow">
          UNDERSTAND YOUR EXAM · ADULT {definition.level}
        </span>
        <h1>{definition.title}</h1>
        <p>
          Learn the format, the time available, and what each skill asks you to
          communicate.
        </p>
        <span className="soft-badge">{definition.speakingSetup}</span>
      </header>
      <section className="arena-rules-summary">
        <ShieldCheck size={23} aria-hidden="true" />
        <div>
          <h2>The official passing rule</h2>
          <p>{officialPassRule(definition)}</p>
          <a
            href={definition.scoringUrl}
            target="_blank"
            rel="noopener noreferrer"
          >
            Goethe scoring information ↗
          </a>
        </div>
      </section>
      <div className="arena-guide-sections">
        {examSkills.map((skill) => {
          const Icon = icons[skill];
          return (
            <section
              key={skill}
              id={skill}
              className={`arena-guide-skill arena-skill-${skill}`}
            >
              <header>
                <span>
                  <Icon size={25} aria-hidden="true" />
                </span>
                <div>
                  <span className="eyebrow">{skillLabels[skill].en}</span>
                  <h2 lang="de">{skillLabels[skill].de}</h2>
                </div>
                <span className="soft-badge">
                  {definition.minutes[skill]} minutes
                </span>
              </header>
              <p>{definition.sections[skill]}</p>
              <h3>A practice habit for this skill</h3>
              <ul>
                {strategies[skill].map((tip) => (
                  <li key={tip}>{tip}</li>
                ))}
              </ul>
              {definition.level === "A1" && skill === "speaking" && (
                <div className="arena-oral-parts">
                  <article>
                    <strong>Part 1 · Introduce yourself</strong>
                    <p>Personal information, spelling and numbers.</p>
                  </article>
                  <article>
                    <strong>Part 2 · Exchange information</strong>
                    <p>Ask and answer questions about familiar subjects.</p>
                  </article>
                  <article>
                    <strong>Part 3 · Make a request</strong>
                    <p>Ask politely and respond to another person.</p>
                  </article>
                  <p className="small muted">
                    The real A1 adult exam uses group interaction. Solo
                    rehearsal helps you prepare but does not reproduce the group
                    assessment.
                  </p>
                </div>
              )}
              <div className="button-row">
                {definition.level === "A1" && (
                  <Button asChild>
                    <Link href={`/exams/${definition.code}/practice/${skill}`}>
                      Try the {skillLabels[skill].en.toLowerCase()} walkthrough{" "}
                      <ArrowRight size={16} aria-hidden="true" />
                    </Link>
                  </Button>
                )}
                <a
                  href={definition.formatUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="arena-inline-source"
                >
                  Official section information ↗
                </a>
              </div>
            </section>
          );
        })}
      </div>
      <section className="arena-next-card">
        <span className="eyebrow">YOUR PREPARATION PRIORITIES</span>
        <h2>Make the format part of your routine.</h2>
        <ul>
          {definition.preparation.map((tip) => (
            <li key={tip}>{tip}</li>
          ))}
        </ul>
        <Button asChild variant="outline">
          <Link href="/exams/plan">
            Plan my preparation <CalendarDays size={16} aria-hidden="true" />
          </Link>
        </Button>
      </section>
      <footer className="arena-source-note">
        <p>{examDisclaimer}</p>
        <p>
          Source check: {definition.checkedAt}.{" "}
          <a
            href={definition.formatUrl}
            target="_blank"
            rel="noopener noreferrer"
          >
            Official exam format ↗
          </a>{" "}
          ·{" "}
          <a
            href={definition.scoringUrl}
            target="_blank"
            rel="noopener noreferrer"
          >
            Official results rules ↗
          </a>
        </p>
      </footer>
    </div>
  );
}
