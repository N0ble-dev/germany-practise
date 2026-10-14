"use client";

import { useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  BookOpen,
  CalendarDays,
  Check,
  GraduationCap,
  MapPin,
  NotebookPen,
  Users,
} from "lucide-react";
import { useApp } from "./learning-app";
import { Button } from "./ui/button";
import { updateState } from "@/lib/store";

import {
  journeyLevels,
  type JourneyLevel,
  type JourneyCourse,
} from "@/lib/german-journey";
const levelStories: Record<
  JourneyLevel,
  { title: string; description: string; prompt: string }
> = {
  A1: {
    title: "Your first conversations",
    description: "Names, places, small plans. Start finding your voice.",
    prompt:
      "Write a short introduction for a new classmate. Include your name, where you live, and one thing you enjoy. Read it aloud, then ask a partner the same questions.",
  },
  A2: {
    title: "Make everyday life yours",
    description: "Home, appointments, travel, and the stories of your day.",
    prompt:
      "Write a message to a friend about your last weekend. Say what happened, what you enjoyed, and what you would like to do together next. Ask one question.",
  },
  B1: {
    title: "Find your independence",
    description: "Explain your experiences, make choices, and join in.",
    prompt:
      "You are considering moving to a new city. Write to a friend explaining your reasons, one concern, and your next steps. Ask for advice. Practise answering their follow-up questions.",
  },
  B2: {
    title: "Make your point",
    description:
      "Work, study, and discussions with more detail and confidence.",
    prompt:
      "Should your team offer more flexible working hours? Write a proposal with your position, two reasons, a possible objection, and a practical compromise. Present it aloud and invite questions.",
  },
  C1: {
    title: "Go deeper in German",
    description: "Explore complex ideas and adapt your voice to your audience.",
    prompt:
      "Compare two approaches to a challenge in your work or studies. Explain their assumptions and trade-offs, then recommend one. Rewrite your recommendation for a colleague and for someone new to the subject. Notice what changes.",
  },
  C2: {
    title: "Say exactly what you mean",
    description: "Precision, nuance, style, and demanding conversations.",
    prompt:
      "Choose a statement from your own writing that could be misunderstood. Explain two possible interpretations. Revise it for precision, then write a deliberately more persuasive version. Discuss how tone and word choice change its effect.",
  },
};

export function JourneyTodayCard() {
  return (
    <section className="journey-today" aria-labelledby="journey-today-title">
      <div>
        <span className="eyebrow">YOUR NEXT CHAPTER</span>
        <h2 id="journey-today-title">A German journey that grows with you.</h2>
        <p>
          Explore everyday life, work, and exam goals at the level you want to
          work toward.
        </p>
      </div>
      <nav aria-label="Explore your German level">
        {journeyLevels.map((level) => (
          <Link key={level} href={`/lessons?level=${level}`}>
            {level}
            <ArrowRight size={14} aria-hidden="true" />
          </Link>
        ))}
      </nav>
    </section>
  );
}

export function GermanJourney({
  courses,
  initialLevel,
}: {
  courses: JourneyCourse[];
  initialLevel: JourneyLevel;
}) {
  const { state } = useApp();
  const [level, setLevel] = useState(initialLevel);
  const [answer, setAnswer] = useState("");
  const [saved, setSaved] = useState("");
  const story = levelStories[level];
  const selected = courses.filter((course) => course.level === level);
  const value = answer.trim();
  const alreadySaved = !!value && state.savedSentences.includes(value);
  function save() {
    if (!value || alreadySaved || state.savedSentences.length >= 1000) return;
    updateState((s) => ({
      ...s,
      savedSentences: s.savedSentences.includes(value)
        ? s.savedSentences
        : [...s.savedSentences, value],
    }));
    setSaved(
      "Saved privately to your sentence lab and profile. Ask a teacher or proficient speaker for feedback.",
    );
  }
  return (
    <div className="german-journey">
      <header className="journey-hero">
        <div>
          <span className="eyebrow">GERMAN FOR THE LIFE YOU WANT</span>
          <h1>
            There’s a whole life
            <br />
            ahead of your German.
          </h1>
          <p>
            Your first hello, a new job, a conversation that matters. Choose
            your next chapter and make it your own.
          </p>
          <div className="journey-hero-actions">
            <Button asChild>
              <Link href="/profile#personal-life">
                Make it personal <ArrowRight size={16} />
              </Link>
            </Button>
            <Link href="/planner" className="text-link">
              <CalendarDays size={17} /> Plan your week
            </Link>
          </div>
        </div>
        <div className="journey-passport" aria-hidden="true">
          <span>DEUTSCH JOURNEY</span>
          <MapPin size={36} />
          <strong>
            My German.
            <br />
            My way.
          </strong>
          <small>Everyday life · Work · Study</small>
          <div>
            <i />
            <i />
            <i />
          </div>
        </div>
      </header>
      <section aria-labelledby="journey-level-title">
        <div className="section-heading">
          <div>
            <h2 id="journey-level-title">Where do you want to go next?</h2>
            <p>Choose a practice direction. This is not a placement test.</p>
          </div>
        </div>
        <div
          className="journey-level-grid"
          role="group"
          aria-label="German practice level"
        >
          {journeyLevels.map((item) => (
            <button
              key={item}
              type="button"
              aria-pressed={item === level}
              onClick={() => {
                setLevel(item);
                setSaved("");
              }}
            >
              <span>{item}</span>
              <strong>{levelStories[item].title}</strong>
              <small>{levelStories[item].description}</small>
              <ArrowRight size={18} aria-hidden="true" />
            </button>
          ))}
        </div>
      </section>
      <section
        className="journey-level-detail"
        aria-labelledby="journey-selected-title"
      >
        <div className="journey-section-heading">
          <div>
            <span className="eyebrow">YOUR {level} DIRECTION</span>
            <h2 id="journey-selected-title">{story.title}</h2>
            <p>{story.description}</p>
          </div>
          <Button asChild variant="outline">
            <Link href={`/exams?level=${level}`}>
              <GraduationCap size={17} /> Explore {level} exam preparation
            </Link>
          </Button>
        </div>
        <div className="journey-learning-options">
          {level === "A1" ? (
            <Link href="/lessons/foundation" className="journey-foundation">
              <BookOpen size={24} />
              <div>
                <span className="eyebrow">AVAILABLE NOW · A1.1</span>
                <h3>Your foundation course</h3>
                <p>
                  Twelve guided chapters with words, listening, speaking, and
                  everyday missions. A starting point in your wider journey.
                </p>
                <span className="text-link">
                  Continue lesson {state.currentLesson} <ArrowRight size={15} />
                </span>
              </div>
            </Link>
          ) : (
            <Link href={`/exams?level=${level}`}>
              <GraduationCap size={24} />
              <div>
                <span className="eyebrow">YOUR {level} EXAM GOAL</span>
                <h3>Prepare for your next step</h3>
                <p>
                  Understand the exam format, explore official models, and build
                  a preparation plan for {level}.
                </p>
                <span className="text-link">
                  Open {level} preparation <ArrowRight size={15} />
                </span>
              </div>
            </Link>
          )}
          <Link href="/exams/resources" className="journey-resource-link">
            <GraduationCap size={24} />
            <div>
              <span className="eyebrow">A1–C2 · RESOURCE LIBRARY</span>
              <h3>Learn from trusted sources</h3>
              <p>
                Official exam resources and learning links. Find material for
                your next step.
              </p>
              <span className="text-link">
                Explore resources <ArrowRight size={15} />
              </span>
            </div>
          </Link>
        </div>
        {level !== "A1" && (
          <Link
            href="/lessons/foundation"
            className="text-link journey-foundation journey-foundation-revisit"
          >
            Revisit the A1.1 foundations <ArrowRight size={15} />
          </Link>
        )}
        <div
          className="journey-practice"
          aria-labelledby="journey-practice-title"
        >
          <div>
            <span className="eyebrow">SELF-GUIDED WRITING & SPEAKING</span>
            <h3 id="journey-practice-title">
              Try something that feels like real life.
            </h3>
            <p>{story.prompt}</p>
            <small>
              These are practice ideas, not reviewed lessons or graded CEFR
              assessments. Use your own knowledge and ask for feedback.
            </small>
            <Link href="/space" className="text-link">
              <Users size={16} /> Practise with your study partner
            </Link>
          </div>
          <form
            onSubmit={(event) => {
              event.preventDefault();
              save();
            }}
          >
            <label htmlFor="journey-response">Your draft in German</label>
            <textarea
              id="journey-response"
              lang="de"
              value={answer}
              onChange={(event) => {
                setAnswer(event.target.value);
                setSaved("");
              }}
              rows={6}
              maxLength={500}
              placeholder="Write a sentence or a short response…"
            />
            <small>
              Your draft stays when you explore another level. It is private
              until you choose to share it in Sentence Lab.
            </small>
            <Button
              type="submit"
              disabled={
                !value || alreadySaved || state.savedSentences.length >= 1000
              }
            >
              {alreadySaved ? <Check size={16} /> : <NotebookPen size={16} />}
              {alreadySaved ? "Saved to my notebook" : "Keep in my notebook"}
            </Button>
            {saved && <p role="status">{saved}</p>}
            {state.savedSentences.length >= 1000 && (
              <p role="status">
                Your notebook is full. Manage your sentences in Sentence Lab.
              </p>
            )}
          </form>
        </div>
        <div className="journey-section-heading">
          <div>
            <h3>The {level} course path we’re building</h3>
            <p>
              Original course outlines. Full lessons and recordings appear after
              review.
            </p>
          </div>
          <Link href="/courses" className="text-link">
            See reviewed lessons <ArrowRight size={15} />
          </Link>
        </div>
        <div className="journey-course-outlines">
          {selected.map((course) => (
            <article key={course.id}>
              <span className="soft-badge">In preparation</span>
              <h3>{course.title}</h3>
              {course.modules.map((module) => (
                <details key={module.id}>
                  <summary>
                    {module.title}
                    <small>{module.lessonIds.length} lesson ideas</small>
                  </summary>
                  <ul>
                    {course.lessons
                      .filter((lesson) => module.lessonIds.includes(lesson.id))
                      .map((lesson) => (
                        <li key={lesson.id}>
                          <strong>{lesson.title}</strong>
                          <span>{lesson.mission}</span>
                        </li>
                      ))}
                  </ul>
                </details>
              ))}
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
