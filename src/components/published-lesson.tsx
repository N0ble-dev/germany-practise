"use client";
import { useState } from "react";
import Link from "next/link";
import type { LessonPack } from "@/lib/content-pipeline/model";
import { Button } from "./ui/button";
import { ContentSourceCredits } from "./content-source-credits";
export function PublishedLesson({ pack }: { pack: LessonPack }) {
  const [answers, setAnswers] = useState<Record<string, string>>({});
  return (
    <div className="content-studio">
      <header className="studio-heading">
        <div>
          <span className="eyebrow">
            {pack.courseSubdivision} · REVIEWED VERSION {pack.version}
          </span>
          <h1>{pack.title.en}</h1>
          <p lang="de">{pack.title.de}</p>
          <p lang="ar" dir="rtl">
            {pack.title.ar}
          </p>
        </div>
        <Link href="/courses">All reviewed lessons →</Link>
      </header>
      <div className="studio-main">
        <section className="panel">
          <h2>Your goal today</h2>
          <ul>
            {pack.canDo.map((goal) => (
              <li key={goal}>{goal}</li>
            ))}
          </ul>
          <p>{pack.scene.en}</p>
        </section>
        <section className="panel">
          <h2>Useful words</h2>
          <div className="studio-vocabulary">
            {pack.vocabulary.map((word) => (
              <article key={word.id}>
                <strong lang="de">
                  {word.article ? `${word.article} ` : ""}
                  {word.de}
                </strong>
                <span>{word.en}</span>
                <span lang="ar" dir="rtl">
                  {word.ar}
                </span>
                <p lang="de">{word.example}</p>
              </article>
            ))}
          </div>
        </section>
        <section className="panel">
          <h2>Listen and follow</h2>
          {pack.dialogues.map((dialogue) => (
            <div className="studio-dialogue" key={dialogue.id}>
              <h3>{dialogue.context.en}</h3>
              {dialogue.lines.map((line) => (
                <article key={line.id}>
                  <strong>{line.speaker}</strong>
                  <p lang="de">{line.text.de}</p>
                  <p>{line.text.en}</p>
                  <p lang="ar" dir="rtl">
                    {line.text.ar}
                  </p>
                  <audio
                    controls
                    preload="none"
                    src={`/api/catalog/audio?lesson=${pack.id}&line=${line.id}`}
                    aria-label={`German recording: ${line.text.de}`}
                  />
                </article>
              ))}
            </div>
          ))}
        </section>
        <section className="panel">
          <h2>Try it yourself</h2>
          <h3>Patterns to use</h3>
          {pack.grammar.map((point) => (
            <article key={point.id}>
              <h4>{point.title.en}</h4>
              <p lang="de">{point.explanation.de}</p>
              <p>{point.explanation.en}</p>
              <p lang="ar" dir="rtl">
                {point.explanation.ar}
              </p>
              <ul>
                {point.examples.map((example) => (
                  <li key={example} lang="de">
                    {example}
                  </li>
                ))}
              </ul>
            </article>
          ))}
          {pack.exercises.map((item) => (
            <article className="studio-exercise" key={item.id}>
              <h3>{item.prompt.en}</h3>
              <p lang="de">{item.prompt.de}</p>
              <p lang="ar" dir="rtl">
                {item.prompt.ar}
              </p>
              {item.audioLineIds.map((lineId) => (
                <audio
                  key={lineId}
                  controls
                  preload="none"
                  src={`/api/catalog/audio?lesson=${pack.id}&line=${lineId}`}
                  aria-label="Exercise recording"
                />
              ))}
              {item.type === "multiple_choice" ? (
                <>
                  <div className="button-row">
                    {item.options.map((option) => (
                      <Button
                        key={option.id}
                        variant={
                          answers[item.id] === option.id
                            ? "secondary"
                            : "outline"
                        }
                        aria-pressed={answers[item.id] === option.id}
                        onClick={() =>
                          setAnswers((previous) => ({
                            ...previous,
                            [item.id]: option.id,
                          }))
                        }
                      >
                        {option.text.de}
                      </Button>
                    ))}
                  </div>
                  {answers[item.id] && (
                    <p role="status">
                      {answers[item.id] === item.correctOptionId
                        ? "That's right. "
                        : "Try again. "}
                      {item.explanation.en}
                    </p>
                  )}
                </>
              ) : (
                <>
                  <p>{item.explanation.en}</p>
                  <details>
                    <summary>See an example answer</summary>
                    <p lang="de">{item.acceptableAnswers.join(" / ")}</p>
                  </details>
                </>
              )}
            </article>
          ))}
        </section>
        <section className="panel">
          <h2>Use it in real life</h2>
          <p>{pack.mission.prompt.en}</p>
          <p lang="ar" dir="rtl">
            {pack.mission.prompt.ar}
          </p>
          <ul>
            {pack.mission.criteria.map((criterion, i) => (
              <li key={i}>{criterion.en}</li>
            ))}
          </ul>
          <p className="muted small">
            This new catalog is a practice preview. Answers are kept in this
            tab; these checks do not yet update your book journey or certify a
            language level.
          </p>
        </section>
      </div>
      <ContentSourceCredits references={pack.references} />
    </div>
  );
}
