import Link from "next/link";
import { contentRepository } from "@/lib/content-pipeline/server";
export const dynamic = "force-dynamic";
export const metadata = { title: "Reviewed German courses · Deutsch Journey" };
export default async function CoursesPage() {
  let lessons;
  try {
    lessons = await contentRepository().published();
  } catch {
    return (
      <section className="panel">
        <h1>Reviewed German courses</h1>
        <p>The course catalog could not load. Try again shortly.</p>
        <Link href="/lessons">Continue your foundation course</Link>
      </section>
    );
  }
  return (
    <div className="content-studio">
      <header className="studio-heading">
        <div>
          <span className="eyebrow">ORIGINAL GERMAN · CAREFULLY REVIEWED</span>
          <h1>A clear next step in German.</h1>
          <p>
            Published lessons have passed language, teaching, Arabic, rights and
            recording reviews.
          </p>
        </div>
        <Link href="/lessons">Your foundation course →</Link>
      </header>
      {!lessons.length ? (
        <section className="panel">
          <h2>The first reviewed lesson is being prepared.</h2>
          <p>
            Keep practising with your A1.1 foundation course while new lessons
            complete their review. The A1–C2 course path is being developed;
            each lesson appears here when it is ready.
          </p>
          <Link href="/lessons">Continue practising</Link>
        </section>
      ) : (
        <div className="studio-vocabulary">
          {lessons.map((lesson) => (
            <article key={lesson.lessonKey}>
              <span className="eyebrow">
                {lesson.pack.courseSubdivision} · Lesson{" "}
                {lesson.pack.lessonNumber}
              </span>
              <h2>{lesson.pack.title.en}</h2>
              <p lang="de">{lesson.pack.title.de}</p>
              <p>
                {lesson.pack.estimatedMinutes} minutes · Version{" "}
                {lesson.version}
              </p>
              <Link href={`/courses/${lesson.lessonKey}`}>
                Start this lesson →
              </Link>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
