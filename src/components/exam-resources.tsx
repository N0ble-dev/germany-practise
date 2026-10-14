"use client";
import { useState } from "react";
import Link from "next/link";
import {
  ArrowUpRight,
  BookOpen,
  CalendarDays,
  Headphones,
  Mic,
  PenLine,
  Search,
} from "lucide-react";
import {
  resourceLevels,
  type LearningResource,
} from "@/lib/content-pipeline/resources";
import guide from "../../content/resources/a1-exam-guide.json";
const icons = {
  listening: Headphones,
  reading: BookOpen,
  writing: PenLine,
  speaking: Mic,
};
export function ExamResources({
  resources,
}: {
  resources: LearningResource[];
}) {
  const [level, setLevel] = useState<(typeof resourceLevels)[number]>("A1"),
    [query, setQuery] = useState("");
  const match = (row: LearningResource) =>
    row.levels.includes(level) &&
    `${row.title} ${row.provider} ${row.description}`
      .toLowerCase()
      .includes(query.trim().toLowerCase());
  const models = resources.filter((row) => row.kind === "exam" && match(row));
  const learning = resources.filter(
    (row) =>
      ["course", "open_content", "reference"].includes(row.kind) && match(row),
  );
  return (
    <div className="exam-resources">
      <header className="exam-heading">
        <div>
          <span className="eyebrow">YOUR NEXT CHAPTER · EXAM PREPARATION</span>
          <h1>Go in knowing what to expect.</h1>
          <p>
            Official practice materials, useful study habits, and a clear place
            to begin.
          </p>
        </div>
        <Link href="/lessons">Back to your learning path →</Link>
      </header>
      <section className="exam-selector" aria-label="Choose your exam level">
        <div role="group" aria-label="German exam level">
          {resourceLevels.map((item) => (
            <button
              key={item}
              aria-pressed={level === item}
              onClick={() => setLevel(item)}
            >
              {item}
            </button>
          ))}
        </div>
        <label className="exam-search">
          <Search size={18} aria-hidden="true" />
          <span className="sr-only">Search exam and learning resources</span>
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Find a skill, provider or resource"
          />
        </label>
      </section>
      <section aria-labelledby="official-models">
        <div className="exam-section-heading">
          <h2 id="official-models">Official {level} practice</h2>
          <span>Open on the provider's website</span>
        </div>
        <p className="muted">
          Deutsch Journey is an independent learning companion. These links take
          you to the exam provider.
        </p>
        <div className="exam-model-grid">
          {models.map((row) => (
            <ResourceCard key={row.id} resource={row} featured />
          ))}
          {!models.length && (
            <p role="status">
              No exam resources match this search. Try another word.
            </p>
          )}
        </div>
      </section>
      {level === "A1" && (
        <>
          <section className="exam-format" aria-labelledby="a1-format">
            <div className="exam-section-heading">
              <div>
                <span className="eyebrow">ADULT START DEUTSCH 1</span>
                <h2 id="a1-format">Four skills. One everyday conversation.</h2>
              </div>
              <a
                href={guide.formatSource}
                target="_blank"
                rel="noopener noreferrer"
              >
                Official format ↗
              </a>
            </div>
            <p>
              A1.1 is the beginning of your A1 journey. Use these tasks for
              practice; a full A1 exam calls on the wider A1 course.
            </p>
            <div className="exam-skill-grid">
              {guide.sections.map((section) => {
                const Icon = icons[section.id as keyof typeof icons];
                return (
                  <article key={section.id}>
                    <div className="exam-skill-title">
                      <Icon size={22} aria-hidden="true" />
                      <span>{section.minutes} min</span>
                    </div>
                    <h3 lang="de">{section.title}</h3>
                    <p className="exam-skill-label">{section.label}</p>
                    <p>{section.description}</p>
                    <details>
                      <summary>How to practise</summary>
                      <ol>
                        {section.tips.map((tip) => (
                          <li key={tip}>{tip}</li>
                        ))}
                      </ol>
                    </details>
                  </article>
                );
              })}
            </div>
            <p className="exam-rule">
              {guide.passRule}{" "}
              <a
                href={guide.scoringSource}
                target="_blank"
                rel="noopener noreferrer"
              >
                Check current scoring rules ↗
              </a>
            </p>
          </section>
          <section className="exam-four-weeks">
            <div className="exam-section-heading">
              <div>
                <span className="eyebrow">AFTER COMPLETING YOUR A1 COURSE</span>
                <h2>A gentle four-week preparation plan.</h2>
              </div>
              <Link href="/planner">
                <CalendarDays size={17} aria-hidden="true" />
                Plan your study sessions
              </Link>
            </div>
            <div className="exam-week-grid">
              {guide.schedule.map((week) => (
                <article key={week.week}>
                  <span className="exam-week-number">Week {week.week}</span>
                  <h3>{week.title}</h3>
                  <ul>
                    {week.tasks.map((task) => (
                      <li key={task}>{task}</li>
                    ))}
                  </ul>
                </article>
              ))}
            </div>
            <p className="small muted">
              A suggested study rhythm. Official models and human feedback help
              you assess readiness; completing this plan does not guarantee a
              pass.
            </p>
          </section>
        </>
      )}
      <section aria-labelledby="learning-links">
        <div className="exam-section-heading">
          <h2 id="learning-links">Keep practising between models</h2>
          <Link href="/courses">Reviewed lessons →</Link>
        </div>
        <div className="exam-learning-grid">
          {learning.map((row) => (
            <ResourceCard key={row.id} resource={row} />
          ))}
          {!learning.length && (
            <p role="status">No learning links match this search.</p>
          )}
        </div>
      </section>
      <p className="exam-last-checked small muted">
        Resource links checked 14 October 2026. For exam dates, registration and
        current rules, use the provider's website.
      </p>
    </div>
  );
}
function ResourceCard({
  resource,
  featured = false,
}: {
  resource: LearningResource;
  featured?: boolean;
}) {
  return (
    <article
      className={`exam-resource-card${featured ? " exam-resource-featured" : ""}`}
    >
      <span className="eyebrow">{resource.provider}</span>
      <h3>{resource.title}</h3>
      <p>{resource.description}</p>
      <div className="exam-resource-bottom">
        <span>
          {resource.skills
            .slice(0, 4)
            .map((skill) => skill[0].toUpperCase() + skill.slice(1))
            .join(" · ")}
        </span>
        <a href={resource.url} target="_blank" rel="noopener noreferrer">
          Open resource
          <ArrowUpRight size={16} aria-hidden="true" />
        </a>
      </div>
    </article>
  );
}
