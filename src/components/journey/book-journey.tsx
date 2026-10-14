"use client";
import { useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ArrowRight,
  ArrowLeft,
  BookOpen,
  Check,
  Clock3,
  MapPin,
  Volume2,
  Bookmark,
  Flag,
} from "lucide-react";
import { useApp } from "../learning-app";
import { Button } from "../ui/button";
import {
  bookLessons,
  bookModules,
  dailyRoutine,
  personalize,
  checkMission,
  type BookLesson,
} from "@/lib/journey-content";
import {
  emptyLessonProgress,
  journeySteps,
  stepLabels,
  journeyPercent,
  masteryReady,
  masteryRequirements,
  type JourneyStep,
  type LessonProgress,
} from "@/lib/journey-model";
import {
  addLessonWords,
  addWordEvidence,
  markJourneyStep,
  saveJourneyScore,
  completeLesson,
  updateState,
  saveCheckpoint,
} from "@/lib/store";
import { formatWord } from "@/lib/learning";
import { lessons } from "@/lib/content";
import { speakGerman } from "@/lib/speech";
import {
  Quiz,
  Recall,
  Listening,
  Builder,
  Speaking,
  Conversation,
  Mission,
  NumbersPractice,
} from "./exercises";
import { VoiceRecorder } from "./voice-recorder";
import { PersonalLifeProfile } from "../personal-life-profile";
import { interests } from "@/lib/personal-life";

export function BookJourney() {
  const { state } = useApp();
  const current = bookLessons[state.currentLesson - 1];
  const completed = Object.values(state.journey.lessons).filter(
    (p) => p.completedAt,
  ).length;
  const places = [1, 4, 5, 6, 7, 8, 9, 10, 11, 12];
  return (
    <>
      <div className="page-heading">
        <div>
          <h1>Your book. Your everyday German.</h1>
          <p>
            Menschen A1.1 · Four modules, twelve lessons, and a life beyond the
            page.
          </p>
        </div>
        <span className="soft-badge">{completed}/12 lessons mastered</span>
      </div>
      <section className="book-banner">
        <div>
          <span className="eyebrow">THE BOOK JOURNEY</span>
          <h2>
            From a first hello
            <br />
            to a story of your own.
          </h2>
          <p>See it. Hear it. Say it. Use it. Come back and remember it.</p>
          <Button asChild>
            <Link href={`/lessons/${current.number}`}>
              Continue lesson {current.number}
              <ArrowRight size={17} />
            </Link>
          </Button>
          <p className="small muted">
            Explore any lesson freely. Your steps and best practice results are
            saved.
          </p>
        </div>
        <div className="book-cover" aria-hidden="true">
          <span>
            MENSCHEN
            <br />
            COMPANION
          </span>
          <strong>A1.1</strong>
          <div className="cover-lines">
            <i />
            <i />
            <i />
          </div>
          <small>
            12 small beginnings.
            <br />A world of conversations.
          </small>
        </div>
      </section>
      <PersonalLifeProfile />
      <div className="book-overview-grid">
        <div className="book-modules">
          {bookModules.map((module) => {
            const done = module.lessons.filter(
              (n) => state.journey.lessons[n]?.completedAt,
            ).length;
            return (
              <section
                className={`book-module module-${module.number}`}
                key={module.number}
              >
                <div className="module-heading">
                  <span className="module-number">0{module.number}</span>
                  <div>
                    <span className="eyebrow">
                      MODULE {module.number} · LESSONS {module.lessons[0]}–
                      {module.lessons[2]}
                    </span>
                    <h2>{module.title}</h2>
                    <p className="muted">{module.description}</p>
                  </div>
                  <span className="small muted">{done}/3</span>
                </div>
                <div className="book-chapters">
                  {module.lessons.map((n) => {
                    const lesson = bookLessons[n - 1];
                    const p = state.journey.lessons[n] ?? emptyLessonProgress();
                    return (
                      <Link
                        className="book-chapter"
                        key={n}
                        href={`/lessons/${n}`}
                      >
                        <span
                          className={`chapter-number ${p.completedAt ? "is-done" : ""}`}
                        >
                          {p.completedAt ? (
                            <Check size={18} />
                          ) : (
                            String(n).padStart(2, "0")
                          )}
                        </span>
                        <div>
                          <h3 lang="de">{lesson.title}</h3>
                          <p>{lesson.goal}</p>
                          <div className="chapter-meta">
                            <span>
                              <MapPin size={13} />
                              {lesson.place}
                            </span>
                            <span>
                              {p.completedAt
                                ? "Mastery checked"
                                : `${p.steps.length}/12 steps practiced`}
                            </span>
                          </div>
                          <div className="progress-bar">
                            <span style={{ width: `${journeyPercent(p)}%` }} />
                          </div>
                        </div>
                        <ArrowRight size={17} />
                      </Link>
                    );
                  })}
                </div>
                <Link
                  className="module-checkpoint"
                  href={`/lessons/checkpoint/${module.number}`}
                >
                  <Flag size={17} />
                  <div>
                    <strong>
                      {module.number === 4
                        ? "Final challenge"
                        : "Mixed module challenge"}
                      : {module.review}
                    </strong>
                    <small>
                      {state.journey.checkpoints[module.number]?.completedAt
                        ? "Communication tasks covered · revisit anytime"
                        : "Bring the skills together without lesson labels"}
                    </small>
                  </div>
                  <ArrowRight size={16} />
                </Link>
              </section>
            );
          })}
        </div>
        <aside className="book-side">
          <section className="panel daily-book-routine">
            <span className="eyebrow">YOUR DAILY RHYTHM</span>
            <h2>
              <Clock3 size={19} />
              30–35 gentle minutes
            </h2>
            <p className="muted">A small piece of the book, made active.</p>
            <ol>
              {dailyRoutine.map((item, i) => (
                <li key={item.title}>
                  <span>{i + 1}</span>
                  <div>
                    <Link href={`/lessons/${current.number}?step=${item.step}`}>
                      <strong>{item.title}</strong>
                      <small>{item.time}</small>
                    </Link>
                    <p>{item.detail}</p>
                  </div>
                </li>
              ))}
            </ol>
            <div className="weekly-rhythm">
              <strong>A week with room to remember</strong>
              <p>
                Days 1–5: learn a little.
                <br />
                Day 6: mix and review.
                <br />
                Day 7: try a life challenge.
              </p>
            </div>
          </section>
          <section className="panel">
            <span className="eyebrow">LEARNING THAT STICKS</span>
            <h2>Understanding comes first.</h2>
            <p className="muted">
              Chapter mastery needs 80% vocabulary recall, 70% listening,
              speaking practice and grammar, plus the life task. Your
              pronunciation practice can use an honest self-check.
            </p>
            <p className="muted">
              A word stays in learning until you recall it, use it, hear it,
              speak it, and remember it days later.
            </p>
            <Link className="text-link" href="/review">
              Visit my spaced reviews
              <ArrowRight size={15} />
            </Link>
          </section>
        </aside>
      </div>
      <section className="panel memory-map">
        <div>
          <span className="eyebrow">YOUR GERMANY MEMORY MAP</span>
          <h2>Give each word a place to live.</h2>
          <p className="muted">
            Revisit the words, conversation, and mission for a familiar place.
          </p>
        </div>
        <div className="place-links">
          {places.map((n) => (
            <Link key={n} href={`/lessons/${n}?step=germany`}>
              <MapPin size={16} />
              {bookLessons[n - 1].place}
              <ArrowRight size={14} />
            </Link>
          ))}
        </div>
      </section>
      <p className="muted small">
        Original companion exercises based on your learning strategy. Use your
        Menschen textbook and its recordings alongside this journey.
      </p>
    </>
  );
}
export function LessonJourney({ number }: { number: number }) {
  const { state, notify } = useApp();
  const router = useRouter();
  const params = useSearchParams();
  const lesson = bookLessons[number - 1];
  const progress = state.journey.lessons[number] ?? emptyLessonProgress();
  const requested = params.get("step");
  const step = journeySteps.includes(requested as JourneyStep)
    ? (requested as JourneyStep)
    : (journeySteps.find((s) => !progress.steps.includes(s)) ?? "mission");
  const module = bookModules[Math.floor((number - 1) / 3)];
  function go(s: JourneyStep) {
    router.replace(`/lessons/${number}?step=${s}`, { scroll: false });
  }
  function next() {
    markJourneyStep(number, step);
    const index = journeySteps.indexOf(step);
    if (index < journeySteps.length - 1) go(journeySteps[index + 1]);
    else
      notify(
        "Life task saved. Check your skill results below to finish this lesson.",
      );
  }
  return (
    <>
      <Link className="text-link back-to-book" href="/lessons/foundation">
        <ArrowLeft size={15} />
        Back to the book journey
      </Link>
      <div className="page-heading">
        <div>
          <span className="eyebrow">
            MODULE {module.number} · LESSON {number}
          </span>
          <h1 lang="de">{lesson.title}</h1>
          <p>{lesson.goal}</p>
        </div>
        <span className="soft-badge">
          {progress.completedAt ? (
            <>
              <Check size={15} />
              Mastery checked
            </>
          ) : (
            `${progress.steps.length}/12 steps practiced`
          )}
        </span>
      </div>
      <div className="chapter-layout">
        <nav className="chapter-stepper" aria-label="Lesson learning steps">
          <div className="chapter-stepper-header">
            <BookOpen size={18} />
            <strong>Your learning loop</strong>
          </div>
          {journeySteps.map((s, i) => (
            <button
              key={s}
              aria-current={s === step ? "step" : undefined}
              className={`${s === step ? "active" : ""} ${progress.steps.includes(s) ? "practiced" : ""}`}
              onClick={() => go(s)}
            >
              <span>
                {progress.steps.includes(s) ? <Check size={15} /> : i + 1}
              </span>
              {stepLabels[s]}
            </button>
          ))}
          <div className="stepper-note">
            A step at a time.
            <br />
            Repeat whenever you need.
          </div>
        </nav>
        <div className="chapter-main">
          <section className="panel chapter-exercise">
            <div className="exercise-heading">
              <span className="eyebrow">
                STEP {journeySteps.indexOf(step) + 1} / 12
              </span>
              <span className="small muted">
                <MapPin size={13} />
                {lesson.place}
              </span>
            </div>
            <h2>{stepLabels[step]}</h2>
            <LessonStep
              key={`${number}:${step}`}
              lesson={lesson}
              step={step}
              progress={progress}
              onNext={next}
            />
          </section>
          <MasteryPanel number={number} progress={progress} />
          <details className="panel journey-details lesson-notes">
            <summary>My lesson notes</summary>
            <label>
              A phrase to keep, or something to revisit
              <textarea
                maxLength={2000}
                rows={4}
                defaultValue={state.lessonNotes[number] ?? ""}
                key={number}
                onBlur={(e) => {
                  const note = e.target.value;
                  updateState((s) => ({
                    ...s,
                    lessonNotes: { ...s.lessonNotes, [number]: note },
                  }));
                }}
              />
            </label>
            <p className="muted small">Saved when you leave the field.</p>
          </details>
          <div className="chapter-links">
            {number > 1 && (
              <Link href={`/lessons/${number - 1}`} className="text-link">
                <ArrowLeft size={15} />
                Lesson {number - 1}
              </Link>
            )}
            {number % 3 === 0 ? (
              <Link
                href={`/lessons/checkpoint/${module.number}`}
                className="text-link"
              >
                Module {module.number} challenge
                <Flag size={15} />
              </Link>
            ) : (
              <Link href={`/lessons/${number + 1}`} className="text-link">
                Explore lesson {number + 1}
                <ArrowRight size={15} />
              </Link>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
function LessonStep({
  lesson,
  step,
  progress,
  onNext,
}: {
  lesson: BookLesson;
  step: JourneyStep;
  progress: LessonProgress;
  onNext: () => void;
}) {
  const { state, notify } = useApp();
  const [ready, setReady] = useState(progress.steps.includes(step));
  const [compared, setCompared] = useState(false);
  const done = () => setReady(true);
  const hasWords = lesson.words.every((w) =>
    state.words.some(
      (saved) =>
        saved.german.toLocaleLowerCase("de-DE") ===
        w.german.toLocaleLowerCase("de-DE"),
    ),
  );
  const persistent =
    step === "words"
      ? hasWords
      : step === "grammar"
        ? (progress.grammar ?? 0) >= 70
        : step === "listen"
          ? (progress.listening ?? 0) >= 70
          : step === "speak"
            ? (progress.speaking ?? 0) >= 70
            : step === "review"
              ? (progress.vocabulary ?? 0) >= 80
              : step === "mission"
                ? progress.missionPassed
                : false;
  const canContinue =
    ready || persistent || step === "story" || step === "patterns";
  function audio(text: string, slow = false) {
    void speakGerman(text, slow).catch((e) => notify(e.message));
  }
  let content: React.ReactNode;
  switch (step) {
    case "story":
      content = (
        <>
          <div className="chapter-story">
            <MapPin size={23} />
            <span>{lesson.place}</span>
            <p>{lesson.story}</p>
          </div>
          <h3>By the end, you can…</h3>
          <ul className="outcome-list">
            {lesson.outcomes.map((o) => (
              <li key={o}>
                <Check size={17} />
                {o}
              </li>
            ))}
          </ul>
          <p className="muted">
            Open lesson {lesson.number} in your textbook. See the situation
            before translating every word. Choose one small thing you want to be
            able to say.
          </p>
        </>
      );
      break;
    case "words":
      content = (
        <>
          <p className="muted">
            Twelve useful words and chunks. Keep noun + article together, hear
            an example, and picture where you would use it.
          </p>
          <Button
            variant="outline"
            onClick={() => {
              const added = addLessonWords(lesson.number);
              notify(
                added
                  ? `${added} words added to your collection.`
                  : "These words are already in your collection.",
              );
              done();
            }}
          >
            {hasWords ? <Check size={16} /> : <Bookmark size={16} />}{" "}
            {hasWords
              ? "All core words are in my collection"
              : "Add lesson words to my collection"}
          </Button>
          <div className="journey-word-grid">
            {lesson.words.map((w) => (
              <article key={w.id}>
                <div>
                  <strong lang="de">{formatWord(w)}</strong>
                  <Button
                    size="icon"
                    variant="ghost"
                    aria-label={`Hear ${formatWord(w)}`}
                    onClick={() =>
                      speakGerman(`${formatWord(w)}. ${w.example}`)
                        .then(() =>
                          addWordEvidence([w.german], { audio: true }),
                        )
                        .catch((e) => notify(e.message))
                    }
                  >
                    <Volume2 size={16} />
                  </Button>
                </div>
                <p>{w.english}</p>
                {state.language === "ar" && (
                  <p dir="rtl" lang="ar">
                    {w.arabic}
                  </p>
                )}
                {w.plural && <small lang="de">Plural: {w.plural}</small>}
                <p className="word-context" lang="de">
                  {w.example}
                </p>
              </article>
            ))}
          </div>
          {(lesson.number === 2 || lesson.number === 4) && <NumbersPractice />}
        </>
      );
      break;
    case "sound":
      content = (
        <>
          <h3>{lesson.sound.title}</h3>
          <p className="muted">{lesson.sound.tip}</p>
          <div className="sound-examples">
            {lesson.sound.examples.map((text) => (
              <div key={text}>
                <strong lang="de">{text}</strong>
                <div className="button-row">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => audio(text)}
                  >
                    <Volume2 size={15} />
                    Hear
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => audio(text, true)}
                  >
                    Slowly
                  </Button>
                </div>
              </div>
            ))}
          </div>
          <p className="muted">
            Say each example aloud. Tap the rhythm, notice the stressed word,
            and compare with the model or textbook recording.
          </p>
          <label className="journey-check">
            <input
              type="checkbox"
              checked={compared}
              onChange={(e) => {
                setCompared(e.target.checked);
                setReady(e.target.checked);
              }}
            />
            I listened, said the examples aloud, and compared the rhythm.
          </label>
          <VoiceRecorder seconds={20} />
        </>
      );
      break;
    case "patterns":
      content = (
        <>
          <p className="muted">
            Useful sentences come before isolated rules. Listen, change one
            detail, and say a version that belongs to you.
          </p>
          <p className="muted small">
            Unsaved personal details use sample places and professions. Update
            them on the book journey page.
          </p>
          <div className="pattern-list">
            {[
              ...new Set([
                ...lesson.patterns,
                ...(lesson.number === 7
                  ? state.personalProfile.interests.map(
                      (id) => interests.find((item) => item.id === id)!.german,
                    )
                  : []),
              ]),
            ].map((pattern) => {
              const text = personalize(
                pattern,
                state.name,
                state.personalProfile,
              );
              const saved = state.savedSentences.includes(text);
              return (
                <div key={pattern}>
                  <p lang="de">{text}</p>
                  <div className="button-row">
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label={`Hear ${text}`}
                      onClick={() => audio(text)}
                    >
                      <Volume2 size={16} />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={saved || state.savedSentences.length >= 1000}
                      onClick={() => {
                        updateState((s) => ({
                          ...s,
                          savedSentences: [...s.savedSentences, text],
                        }));
                        notify("Sentence saved to your sentence lab.");
                      }}
                    >
                      {saved ? "Saved" : "Keep this sentence"}
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      );
      break;
    case "grammar":
      content = (
        <>
          <div className="journey-instruction">
            <strong>{lessons[lesson.number - 1].grammar}</strong>
            <p>{lessons[lesson.number - 1].explanation}</p>
            <p lang="de">{lessons[lesson.number - 1].example}</p>
          </div>
          <Quiz
            questions={lesson.grammar}
            onFinish={(score) => {
              saveJourneyScore(lesson.number, "grammar", score);
              if (score >= 70) done();
            }}
          />
        </>
      );
      break;
    case "listen":
      content = <Listening lesson={lesson} onReady={done} />;
      break;
    case "build":
      content = <Builder lesson={lesson} onReady={done} />;
      break;
    case "speak":
      content = <Speaking lesson={lesson} onReady={done} />;
      break;
    case "chat":
      content = <Conversation lesson={lesson} onReady={done} />;
      break;
    case "germany":
      content = (
        <>
          <div className="word-chips">
            {lesson.words.slice(0, 6).map((w) => (
              <span key={w.id} lang="de">
                {formatWord(w)}
              </span>
            ))}
          </div>
          <Mission lesson={lesson} situation onReady={done} />
          <div className="journey-instruction">
            <strong>Your words to revisit here</strong>
            <p>
              {state.words
                .filter((w) => w.lesson === lesson.number && w.mistakes > 0)
                .map(formatWord)
                .join(" · ") ||
                "Your tricky words will appear here after spaced reviews."}
            </p>
          </div>
        </>
      );
      break;
    case "review":
      content = (
        <>
          <p className="muted">
            Recall ten words without looking at the German. Include the article
            for nouns. You need eight correct to meet the chapter recall goal.
          </p>
          {!hasWords && (
            <Button
              variant="outline"
              onClick={() => addLessonWords(lesson.number)}
            >
              Add the core words before recall
            </Button>
          )}
          <Recall lesson={lesson} onReady={done} />
        </>
      );
      break;
    case "mission":
      content = <Mission lesson={lesson} onReady={done} />;
      break;
  }
  return (
    <>
      <div className="step-content">{content}</div>
      <div className="step-footer">
        <p className="muted small">
          {canContinue
            ? "Your progress is saved. Continue, or practice a little longer."
            : "Try the practice above to make this step count."}
        </p>
        <Button disabled={!canContinue} onClick={onNext}>
          {step === "mission"
            ? "Save this last step"
            : `Continue to ${stepLabels[journeySteps[journeySteps.indexOf(step) + 1]]}`}
          <ArrowRight size={16} />
        </Button>
      </div>
    </>
  );
}
function MasteryPanel({
  number,
  progress,
}: {
  number: number;
  progress: LessonProgress;
}) {
  const { notify } = useApp();
  const ready = masteryReady(progress);
  return (
    <section className="panel chapter-mastery">
      <div className="section-heading">
        <h2>A lesson you can use.</h2>
        <span className="soft-badge">
          {progress.completedAt ? "Completed" : "Your mastery checks"}
        </span>
      </div>
      <p className="muted">
        Opening a screen is a beginning. Recall and real use are what make the
        chapter yours.
      </p>
      <div className="mastery-skills">
        {masteryRequirements.map((r) => (
          <Link
            href={`/lessons/${number}?step=${r.key === "vocabulary" ? "review" : r.key === "listening" ? "listen" : r.key === "speaking" ? "speak" : "grammar"}`}
            key={r.key}
          >
            <span>{r.label}</span>
            <strong>
              {progress[r.key] === null
                ? "Not tried"
                : `${Math.round(progress[r.key]!)}%`}
            </strong>
            <small>
              {(progress[r.key] ?? 0) >= r.threshold ? (
                <>
                  <Check size={13} />
                  Goal reached
                </>
              ) : (
                `Goal: ${r.threshold}%`
              )}
            </small>
          </Link>
        ))}
      </div>
      <p className="small muted">
        Speaking:{" "}
        {progress.speakingMethod === "self-check"
          ? "your three-task self-check"
          : progress.speakingMethod === "recognized-text"
            ? "browser-recognized word comparison"
            : "practice aloud, record, or compare recognized words"}
        . This is practice evidence, not an automatic pronunciation grade.
      </p>
      <div className="mastery-bottom">
        <span>
          <Flag size={17} />
          {progress.missionPassed
            ? "Life mission passed"
            : "Life mission still to try"}
        </span>
        <Button
          disabled={!ready || !!progress.completedAt}
          onClick={() => {
            completeLesson(number);
            notify(
              "You can use this chapter in life. Lesson completed · +20 XP",
            );
          }}
        >
          {progress.completedAt ? (
            <>
              <Check size={16} />
              Lesson completed
            </>
          ) : (
            "Complete this chapter"
          )}
        </Button>
      </div>
      {!ready && (
        <p className="muted small">
          Meet all four skill goals and pass the life mission to complete the
          chapter.
        </p>
      )}
    </section>
  );
}
export function ModuleCheckpoint({ number }: { number: number }) {
  const { state, notify } = useApp();
  const module = bookModules[number - 1];
  const old = state.journey.checkpoints[number];
  const [response, setResponse] = useState(old?.responses.response ?? "");
  const [checked, setChecked] = useState(false);
  const [support, setSupport] = useState(false);
  const passed = checkMission(response, module.criteria);
  const questions = module.lessons
    .flatMap((n) => [bookLessons[n - 1].grammar[(n - 1) % 3]])
    .reverse();
  return (
    <>
      <Link href="/lessons" className="text-link back-to-book">
        <ArrowLeft size={15} />
        Back to the book journey
      </Link>
      <div className="page-heading">
        <div>
          <span className="eyebrow">
            {number === 4
              ? "FINAL A1.1 CHALLENGE"
              : `MODULE ${number} · MIXED REVIEW`}
          </span>
          <h1>{module.review}</h1>
          <p>
            {number === 4
              ? "One day, all twelve lessons. Bring your German together."
              : "Use the skills together, with the lesson labels put away."}
          </p>
        </div>
        {old?.completedAt && (
          <span className="soft-badge">
            <Check size={16} />
            Tasks covered
          </span>
        )}
      </div>
      <div className="checkpoint-layout">
        <section className="panel checkpoint-mission">
          <span className="soft-badge">
            <MapPin size={15} />
            {module.place}
          </span>
          <h2>Your life challenge</h2>
          <p className="muted">
            Imagine this situation in Germany. Write a connected conversation or
            story, then speak it aloud. You can use your own details.
          </p>
          <ul className="outcome-list">
            {module.criteria.map((rule) => (
              <li key={rule.id}>
                <Flag size={15} />
                {rule.label}
              </li>
            ))}
          </ul>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              setChecked(true);
              saveCheckpoint(
                number,
                { response },
                passed,
                module.criteria.length,
              );
              notify(
                passed.length === module.criteria.length
                  ? "Every communication task is covered. Come back and try it aloud again."
                  : "Your draft is saved. Try the missing tasks next.",
              );
            }}
          >
            <label>
              Your German, in your own words
              <textarea
                lang="de"
                rows={10}
                maxLength={2000}
                value={response}
                required
                onChange={(e) => {
                  setResponse(e.target.value);
                  setChecked(false);
                }}
              />
            </label>
            <Button type="submit">
              Check my module challenge
              <ArrowRight size={16} />
            </Button>
          </form>
          {checked && (
            <>
              <div className="mission-checklist" role="status">
                {module.criteria.map((rule) => (
                  <div key={rule.id}>
                    <span
                      className={
                        passed.includes(rule.id) ? "criterion-passed" : ""
                      }
                    >
                      {passed.includes(rule.id) ? <Check size={15} /> : "○"}
                    </span>
                    {rule.label}
                  </div>
                ))}
              </div>
              <p className="muted">
                {passed.length} of {module.criteria.length} communication tasks
                covered. This phrase coverage check helps you notice missing
                ideas; it does not grade fluency or certify your German level.
              </p>
            </>
          )}
          <VoiceRecorder seconds={60} />
        </section>
        <aside className="book-side">
          <section className="panel">
            <h2>A little mixed recall</h2>
            <p className="muted">
              Three questions from different lessons. Look for the meaning
              before the rule.
            </p>
            <Quiz
              questions={questions}
              onFinish={(score) =>
                notify(
                  `${score}% in this mixed round. Revisit any example you want to understand better.`,
                )
              }
            />
          </section>
          <section className="panel">
            <h2>Try before asking for help.</h2>
            <p className="muted">
              First, use what you remember. Then revisit useful patterns and try
              again with less support.
            </p>
            <Button variant="outline" onClick={() => setSupport((s) => !s)}>
              {support ? "Hide the patterns" : "Show a little support"}
            </Button>
            {support && (
              <div className="checkpoint-support">
                {(number === 4
                  ? bookLessons
                  : bookLessons.filter((l) => module.lessons.includes(l.number))
                ).map((l) => (
                  <p key={l.number} lang="de">
                    {personalize(
                      l.patterns[0],
                      state.name,
                      state.personalProfile,
                    )}
                  </p>
                ))}
              </div>
            )}
          </section>
        </aside>
      </div>
    </>
  );
}
