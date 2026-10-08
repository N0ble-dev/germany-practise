"use client";
import { useEffect, useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  BookOpen,
  FileDown,
  Search,
  Star,
  Volume2,
  CalendarDays,
  NotebookPen,
  History,
  Compass,
} from "lucide-react";
import { useApp } from "./learning-app";
import { Button } from "./ui/button";
import { Dialog } from "./ui/dialog";
import { formatWord, streak } from "@/lib/learning";
import {
  buildLearningReport,
  reportSections,
  lessonTitle,
  studyDate,
  addedWords,
  type ReportSectionId,
} from "@/lib/learning-report";
import { destinations } from "@/lib/destinations";
import { speakGerman } from "@/lib/speech";
import { ProfileLanyard } from "./profile-lanyard";

function Collection<T>({
  items,
  render,
  empty,
  label,
  pageSize = 8,
}: {
  items: T[];
  render: (item: T) => ReactNode;
  empty: ReactNode;
  label: string;
  pageSize?: number;
}) {
  const [requestedPage, setPage] = useState(0);
  const pages = Math.ceil(items.length / pageSize);
  const page = Math.max(0, Math.min(requestedPage, pages - 1));
  if (!items.length) return <div className="profile-empty">{empty}</div>;
  return (
    <>
      <ul className="notebook-list" aria-label={label}>
        {items
          .slice(page * pageSize, (page + 1) * pageSize)
          .map((item, index) => (
            <li key={page * pageSize + index}>{render(item)}</li>
          ))}
      </ul>
      {pages > 1 && (
        <div className="collection-pages">
          <Button
            variant="outline"
            size="sm"
            disabled={page === 0}
            onClick={() => setPage(page - 1)}
            aria-label={`Previous ${label} page`}
          >
            Previous
          </Button>
          <span aria-live="polite">
            {page + 1} / {pages}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={page + 1 === pages}
            onClick={() => setPage(page + 1)}
            aria-label={`Next ${label} page`}
          >
            Next
          </Button>
        </div>
      )}
    </>
  );
}

export function ProfilePdfExport() {
  const { state, identity, notify } = useApp();
  const [open, setOpen] = useState(false),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const [selected, setSelected] = useState<ReportSectionId[]>(
    reportSections.map((section) => section.id),
  );
  const request = useRef<AbortController | null>(null);
  useEffect(() => () => request.current?.abort(), []);
  async function download() {
    setBusy(true);
    setError("");
    const controller = new AbortController();
    request.current = controller;
    try {
      const report = buildLearningReport(
        state,
        identity?.name || state.name,
        selected,
      );
      const { downloadProfilePdf } = await import("@/lib/profile-pdf");
      controller.signal.throwIfAborted();
      await downloadProfilePdf(report, controller.signal);
      notify("Your learning notebook PDF is downloaded.");
      setOpen(false);
    } catch (error) {
      if (!controller.signal.aborted)
        setError(
          error instanceof Error
            ? error.message
            : "The PDF could not download. Please try again.",
        );
    } finally {
      if (!controller.signal.aborted) setBusy(false);
    }
  }
  return (
    <>
      <Button
        variant="outline"
        onClick={() => {
          setError("");
          setOpen(true);
        }}
      >
        <FileDown size={17} />
        Export as PDF
      </Button>
      <Dialog
        open={open}
        onOpenChange={(next) => {
          if (!busy) setOpen(next);
        }}
        title="Your learning notebook, as a PDF"
        description="Choose what to include in your notebook, with a cover, clickable contents and study tables. Download it to study, print or keep offline."
      >
        <fieldset className="pdf-sections" disabled={busy}>
          <legend>Include in my PDF</legend>
          {reportSections.map((section) => (
            <label key={section.id}>
              <input
                type="checkbox"
                checked={selected.includes(section.id)}
                onChange={(event) =>
                  setSelected((current) =>
                    event.target.checked
                      ? [...current, section.id]
                      : current.filter((id) => id !== section.id),
                  )
                }
              />
              {section.label}
            </label>
          ))}
        </fieldset>
        <p className="muted small">
          Includes all records in the selected sections, including words not
          currently shown on screen. German and Arabic text are supported. Keep
          the JSON backup to import progress later.
        </p>
        {error && (
          <p role="alert" className="form-error">
            {error}
          </p>
        )}
        <div className="button-row">
          <Button
            disabled={busy || !selected.length}
            onClick={() => void download()}
          >
            <FileDown size={16} />
            {busy ? "Preparing your PDF…" : "Download PDF"}
          </Button>
          <Button
            variant="ghost"
            disabled={busy}
            onClick={() => setOpen(false)}
          >
            Cancel
          </Button>
        </div>
      </Dialog>
    </>
  );
}

function LearnerAvatar({
  name,
  photo,
}: {
  name: string;
  photo?: string | null;
}) {
  const [failed, setFailed] = useState(false);
  return (
    <span className="learner-avatar">
      {photo?.startsWith("https://") && !failed ? (
        <Image
          src={photo}
          alt={`${name}'s profile photo`}
          width={72}
          height={72}
          unoptimized
          referrerPolicy="no-referrer"
          onError={() => setFailed(true)}
        />
      ) : (
        <span aria-hidden="true">
          {Array.from(name)[0]?.toUpperCase() || "G"}
        </span>
      )}
    </span>
  );
}

export function ProfileSummary() {
  const { state, identity } = useApp();
  return (
    <section className="panel learner-summary" aria-label="Profile overview">
      <div className="learner-overview">
        <div className="learner-identity">
          <LearnerAvatar
            key={identity?.image || "initial"}
            name={identity?.name || "Guest"}
            photo={identity?.image}
          />
          <div>
            <span className="eyebrow">
              {identity ? "YOUR GOOGLE ACCOUNT" : "LOCAL LEARNING"}
            </span>
            <h2>{identity?.name || "Guest profile"}</h2>
            <p className="muted">
              {identity?.email ||
                "You are signed out. This is your guest journey on this device."}
            </p>
            {identity && (
              <p className="muted small">
                Learning name: {state.name} · Account learning stays separate
                from guests and other accounts.
              </p>
            )}
          </div>
        </div>
        <dl className="learner-stats">
          {[
            [state.xp, "Total XP"],
            [state.words.length, "Words collected"],
            [state.savedSentences.length, "Saved sentences"],
            [streak(state), "Study streak"],
          ].map(([value, label]) => (
            <div key={label}>
              <dt>{label}</dt>
              <dd>{value}</dd>
            </div>
          ))}
        </dl>
        <div className="learner-card-invitation">
          <span className="eyebrow">ONE SMALL STEP CLOSER</span>
          <h3>Your next chapter starts with today.</h3>
          <p className="muted">
            Keep collecting words, trying sentences, and making space for the
            life you picture in Germany.
          </p>
          <Link href="/lessons">Continue my book journey</Link>
        </div>
      </div>
      <ProfileLanyard />
    </section>
  );
}

function ProfileWords() {
  const { state } = useApp();
  const [query, setQuery] = useState(""),
    [filter, setFilter] = useState("all");
  const terms = query.trim().toLocaleLowerCase();
  const custom = addedWords(state),
    ids = new Set(custom.map((word) => word.id));
  const words = state.words.filter(
    (word) =>
      (filter === "all" ||
        (filter === "added"
          ? ids.has(word.id)
          : filter === "favorites"
            ? word.favorite
            : word.status === filter)) &&
      `${word.german} ${word.english} ${word.arabic} ${word.topic}`
        .toLocaleLowerCase()
        .includes(terms),
  );
  return (
    <section className="panel notebook-collection" id="profile-words">
      <div className="section-heading">
        <div>
          <h2>
            <BookOpen size={20} />
            Your vocabulary
          </h2>
          <p>
            {state.words.length} words · {custom.length} added by you
          </p>
        </div>
        <Link href="/vocabulary">Add or edit words</Link>
      </div>
      <div className="notebook-filters">
        <label className="notebook-search">
          <Search size={16} />
          <span className="visually-hidden">Search profile vocabulary</span>
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search your words…"
          />
        </label>
        <label>
          <span className="visually-hidden">Filter profile vocabulary</span>
          <select
            value={filter}
            onChange={(event) => setFilter(event.target.value)}
          >
            <option value="all">All words</option>
            <option value="added">Added by me</option>
            <option value="favorites">Favorites</option>
            <option value="new">New</option>
            <option value="learning">Learning</option>
            <option value="reviewing">Reviewing</option>
            <option value="mastered">Mastered</option>
          </select>
        </label>
      </div>
      <Collection
        key={query + filter}
        items={words}
        label="vocabulary"
        empty={
          <>
            <p>
              {state.words.length
                ? "No words match this view."
                : "Your first word starts a collection."}
            </p>
            <Link href="/vocabulary">Collect a German word</Link>
          </>
        }
        render={(word) => (
          <>
            <div className="notebook-word-heading">
              <strong lang="de">{formatWord(word)}</strong>
              <span>
                {word.favorite && <Star size={14} aria-label="Favorite" />}
                <Button
                  size="icon"
                  variant="ghost"
                  aria-label={`Listen to ${word.german}`}
                  onClick={() => speakGerman(formatWord(word))}
                >
                  <Volume2 size={16} />
                </Button>
              </span>
            </div>
            <p>{word.english}</p>
            {state.language === "ar" && word.arabic && (
              <p lang="ar" dir="rtl">
                {word.arabic}
              </p>
            )}
            {word.example && (
              <p className="muted small" lang="de">
                {word.example}
              </p>
            )}
            <small className="notebook-meta">
              {word.topic} · Lesson {word.lesson} · {word.status} ·{" "}
              {word.reviews} reviews
            </small>
          </>
        )}
      />
    </section>
  );
}

function ProfileSentences() {
  const { state } = useApp();
  return (
    <section className="panel notebook-collection" id="profile-sentences">
      <div className="section-heading">
        <div>
          <h2>
            <NotebookPen size={20} />
            Your saved sentences
          </h2>
          <p>{state.savedSentences.length} phrases to make your own</p>
        </div>
        <Link href="/sentences">Practice sentences</Link>
      </div>
      <Collection
        items={[...state.savedSentences].reverse()}
        label="sentences"
        empty={
          <>
            <p>A sentence is a word put to work.</p>
            <p className="muted small">
              Save phrases in Sentence lab or your book journey. They will
              appear here.
            </p>
          </>
        }
        render={(sentence) => (
          <div className="saved-profile-sentence">
            <p lang="de" dir="auto">
              {sentence}
            </p>
            <Button
              variant="ghost"
              size="icon"
              aria-label={`Listen to sentence: ${sentence}`}
              onClick={() => speakGerman(sentence)}
            >
              <Volume2 size={17} />
            </Button>
          </div>
        )}
      />
    </section>
  );
}

export function ProfileNotebook() {
  const { state } = useApp();
  const report = buildLearningReport(state, state.name, ["journey"]);
  const sections = Object.fromEntries(
    report.sections.map((section) => [section.id, section]),
  );
  const notes = Object.entries(state.lessonNotes).filter(([, note]) =>
    note.trim(),
  );
  const destination = destinations.find(
    (place) => place.id === state.motivation.destination,
  )!;
  return (
    <div className="profile-notebook">
      <nav className="notebook-navigation" aria-label="My profile collections">
        <a href="#profile-words">Vocabulary</a>
        <a href="#profile-sentences">Sentences</a>
        <a href="#profile-journey">Book journey</a>
        <a href="#profile-notes">Notes</a>
        <a href="#profile-plan">Study plan</a>
        <a href="#profile-history">History</a>
      </nav>
      <div className="notebook-columns">
        <ProfileWords />
        <ProfileSentences />
      </div>
      <details className="panel notebook-details" id="profile-journey">
        <summary>
          <span>
            <BookOpen size={20} />
            My A1.1 book journey
          </span>
          <span>{state.completedLessons.length}/12 completed</span>
        </summary>
        <p className="muted">
          Your chapter scores, saved mission responses, and module challenges.
        </p>
        <Collection
          items={sections.journey.entries}
          label="journey"
          empty={<p>Open your book journey to begin.</p>}
          render={(entry) => (
            <>
              <h3>{entry.title || "Start with chapter one"}</h3>
              {entry.lines.map((line, index) => (
                <p key={index} dir="auto">
                  {line}
                </p>
              ))}
            </>
          )}
        />
        <Link href="/lessons">Continue my book journey</Link>
      </details>
      <details className="panel notebook-details" id="profile-notes">
        <summary>
          <span>
            <NotebookPen size={20} />
            My lesson notes
          </span>
          <span>{notes.length} notes</span>
        </summary>
        <Collection
          items={notes}
          label="notes"
          empty={
            <p className="muted">
              Notes saved in your lessons will appear here.
            </p>
          }
          render={([number, note]) => (
            <>
              <h3>
                <Link href={`/lessons/${number}`}>{lessonTitle(number)}</Link>
              </h3>
              <p className="notebook-preserve" dir="auto">
                {note}
              </p>
            </>
          )}
        />
      </details>
      <details className="panel notebook-details" id="profile-plan">
        <summary>
          <span>
            <CalendarDays size={20} />
            My study plan
          </span>
          <span>{state.planner.sessions.length} sessions</span>
        </summary>
        <Collection
          items={state.planner.sessions
            .slice()
            .sort((a, b) => a.startsAt.localeCompare(b.startsAt))}
          label="study plan"
          empty={<p className="muted">Plan a little German into your week.</p>}
          render={(session) => (
            <>
              <h3>{session.title}</h3>
              <p>
                {studyDate(session.startsAt, session.timeZone)} ·{" "}
                {session.timeZone}
              </p>
              <p className="muted small">
                {session.duration} minutes · {session.status} ·{" "}
                {session.reminder === null
                  ? "No reminder"
                  : `${session.reminder} minute reminder`}
              </p>
              {session.note && <p dir="auto">{session.note}</p>}
            </>
          )}
        />
        <Link href="/planner">Open my study calendar</Link>
      </details>
      <details className="panel notebook-details" id="profile-history">
        <summary>
          <span>
            <History size={20} />
            My practice history
          </span>
          <span>{state.activities.length} moments</span>
        </summary>
        <Collection
          items={state.activities.slice().reverse()}
          label="history"
          empty={
            <p className="muted">Your first practice will be recorded here.</p>
          }
          render={(activity) => (
            <>
              <h3>{activity.label}</h3>
              <p className="muted small">
                {studyDate(activity.at)} · Lesson {activity.lesson} · +
                {activity.xp} XP
              </p>
            </>
          )}
        />
        <Link href="/progress">Explore my progress</Link>
      </details>
      <section className="panel profile-dream">
        <Compass size={23} />
        <div>
          <h2>My Germany dream · {destination.name}</h2>
          <p>
            {state.motivation.why ||
              "A little German today, a little closer to the life you picture."}
          </p>
          <Link href="/inspiration">Keep my reason close</Link>
        </div>
      </section>
    </div>
  );
}
