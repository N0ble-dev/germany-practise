"use client";

import { useId, useRef, useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  BookOpen,
  BriefcaseBusiness,
  Check,
  Coffee,
  GraduationCap,
  Heart,
  House,
  MapPin,
  Music,
  PencilLine,
  ShoppingBag,
  Sparkles,
  TrainFront,
  Users,
  Utensils,
  Volume2,
  Dumbbell,
} from "lucide-react";
import { useApp } from "./learning-app";
import { Button } from "./ui/button";
import {
  personalProfileSchema,
  type PersonalProfile,
} from "@/lib/journey-model";
import {
  interests,
  motivations,
  personalIntroduction,
  personalPractice,
  personalProfileReport,
  professions,
  situations,
} from "@/lib/personal-life";
import { updateState } from "@/lib/store";
import { speakGerman } from "@/lib/speech";

const goalIcons = {
  home: House,
  career: BriefcaseBusiness,
  study: GraduationCap,
  people: Heart,
  travel: TrainFront,
};
const interestIcons = {
  coffee: Coffee,
  cooking: Utensils,
  music: Music,
  sport: Dumbbell,
  reading: BookOpen,
  travel: TrainFront,
};
const situationIcons = {
  work: BriefcaseBusiness,
  neighbors: Users,
  cafe: Coffee,
  shopping: ShoppingBag,
  transport: TrainFront,
  friends: Heart,
  family: Users,
  home: House,
};

function Introduction({
  profile,
  name,
  live = false,
}: {
  profile: PersonalProfile;
  name: string;
  live?: boolean;
}) {
  const sentences = personalIntroduction(profile, name);
  return (
    <div className="life-introduction">
      <div className="life-card-caption">
        <span className="life-flag" aria-hidden="true">
          <i />
          <i />
          <i />
        </span>
        <span>{live ? "YOUR LIVE PREVIEW" : "ME, IN GERMAN"}</span>
      </div>
      <div className="life-introduction-lines" lang="de">
        {sentences.length ? (
          sentences.map((sentence, i) => <p key={i}>{sentence}</p>)
        ) : (
          <p className="life-introduction-empty" lang="en">
            A few choices. A little German. A story that sounds like you.
          </p>
        )}
      </div>
      <p className="life-card-note">
        {live
          ? "Your introduction changes as you choose. Save when it feels like you."
          : "Your everyday life is a good place to begin."}
      </p>
    </div>
  );
}

export function PersonalLifeProfile() {
  const { state, identity, notify } = useApp();
  const [editing, setEditing] = useState(false);
  const id = useId();
  const opener = useRef<HTMLButtonElement>(null);
  const profile = state.personalProfile;
  const hasDetails = personalProfileReport(profile).length > 0;
  const sentences = personalIntroduction(profile, state.name);
  const practice = personalPractice(profile);
  const newSentences = sentences.filter(
    (sentence) => !state.savedSentences.includes(sentence),
  );
  function close() {
    setEditing(false);
    opener.current?.focus();
  }
  return (
    <section
      id="personal-life"
      className="personal-life panel"
      aria-labelledby={`${id}-heading`}
    >
      <div className="life-heading">
        <div>
          <span className="eyebrow">
            <Sparkles size={14} aria-hidden="true" /> MAKE IT YOURS
          </span>
          <h2 id={`${id}-heading`}>German for your own life.</h2>
          <p className="muted">
            Your work, your interests, your everyday moments. Start with what
            matters to you.
          </p>
        </div>
        <Button
          ref={opener}
          variant="outline"
          aria-expanded={editing}
          aria-controls={`${id}-editor`}
          onClick={() => (editing ? close() : setEditing(true))}
        >
          <PencilLine size={16} aria-hidden="true" />
          {editing
            ? "Close preferences"
            : hasDetails
              ? "Edit my preferences"
              : "Make it mine"}
        </Button>
      </div>
      {editing ? (
        <PersonalLifeEditor
          key={`${identity?.id ?? "guest"}:${JSON.stringify(profile)}`}
          id={`${id}-editor`}
          initial={profile}
          name={state.name}
          onClose={close}
        />
      ) : (
        <div id={`${id}-editor`} className="life-summary">
          <div>
            <Introduction profile={profile} name={state.name} />
            {!!sentences.length && (
              <div className="life-sentence-actions">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    void speakGerman(sentences.join(" ")).catch(
                      (error: Error) => notify(error.message),
                    );
                  }}
                >
                  <Volume2 size={16} aria-hidden="true" /> Hear my introduction
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={
                    !newSentences.length ||
                    state.savedSentences.length + newSentences.length > 1000
                  }
                  onClick={() => {
                    updateState((s) => ({
                      ...s,
                      savedSentences: [
                        ...new Set([...s.savedSentences, ...sentences]),
                      ],
                    }));
                    notify(
                      "Your introduction is saved in your sentence lab and profile.",
                    );
                  }}
                >
                  <BookOpen size={16} aria-hidden="true" />{" "}
                  {newSentences.length
                    ? "Keep my sentences"
                    : "Sentences saved"}
                </Button>
              </div>
            )}
          </div>
          <div className="life-practice">
            <span className="eyebrow">A LITTLE GERMAN FOR YOUR DAY</span>
            <h3>
              {profile.motivation
                ? motivations.find((goal) => goal.id === profile.motivation)!
                    .label
                : "Where will you use your German?"}
            </h3>
            {!practice.length ? (
              <p className="muted">
                Choose your job, what you enjoy, and the moments you want to
                feel ready for. We’ll point you to lessons you can use.
              </p>
            ) : (
              <div className="life-practice-links">
                {practice.map((item) => {
                  const Icon = situationIcons[item.id];
                  return (
                    <Link
                      key={item.id}
                      href={`/lessons/${item.lesson}?step=patterns`}
                    >
                      <Icon size={19} aria-hidden="true" />
                      <span>
                        <strong>{item.label}</strong>
                        <small>Lesson {item.lesson} · useful sentences</small>
                      </span>
                      <ArrowRight size={16} aria-hidden="true" />
                    </Link>
                  );
                })}
              </div>
            )}
            <p className="life-privacy muted small">
              These preferences stay in your learning notebook. They aren’t
              added to your public profile card.
            </p>
          </div>
        </div>
      )}
    </section>
  );
}

function PersonalLifeEditor({
  initial,
  name,
  id,
  onClose,
}: {
  initial: PersonalProfile;
  name: string;
  id: string;
  onClose: () => void;
}) {
  const { notify } = useApp();
  const [draft, setDraft] = useState(initial);
  const [customJob, setCustomJob] = useState(
    !!initial.profession &&
      !professions.some((job) =>
        job.forms.some((form) => form === initial.profession),
      ),
  );
  const [error, setError] = useState("");
  const changed = JSON.stringify(initial) !== JSON.stringify(draft);
  const practice = personalPractice(draft);
  function field(
    key: "country" | "city" | "profession" | "languages",
    value: string,
  ) {
    setDraft((profile) => ({ ...profile, [key]: value }));
  }
  function toggle<K extends "interests" | "situations">(
    key: K,
    value: PersonalProfile[K][number],
  ) {
    setDraft((profile) => ({
      ...profile,
      [key]: profile[key].some((item) => item === value)
        ? profile[key].filter((item) => item !== value)
        : [...profile[key], value],
    }));
  }
  return (
    <form
      id={id}
      className="life-editor"
      onSubmit={(event) => {
        event.preventDefault();
        const parsed = personalProfileSchema.safeParse({
          ...draft,
          ...Object.fromEntries(
            (["country", "city", "profession", "languages"] as const).map(
              (key) => [key, draft[key].trim()],
            ),
          ),
        });
        if (!parsed.success) {
          setError(
            "Check your details and keep each answer within the field limit.",
          );
          return;
        }
        updateState((s) => ({ ...s, personalProfile: parsed.data }));
        notify(
          "Your preferences are saved. Your book sentences and lesson suggestions now fit your life.",
        );
        onClose();
      }}
    >
      <div className="life-editor-fields">
        <fieldset className="life-fieldset">
          <legend>What brings you to German?</legend>
          <p className="muted small">
            Choose one reason. You can change it whenever life changes.
          </p>
          <div className="life-goal-grid">
            {motivations.map((goal) => {
              const Icon = goalIcons[goal.id];
              const selected = draft.motivation === goal.id;
              return (
                <button
                  type="button"
                  className="life-goal"
                  key={goal.id}
                  aria-pressed={selected}
                  onClick={() =>
                    setDraft((profile) => ({
                      ...profile,
                      motivation: selected ? null : goal.id,
                    }))
                  }
                >
                  <Icon size={21} aria-hidden="true" />
                  <span>
                    <strong>{goal.label}</strong>
                    <small>{goal.detail}</small>
                  </span>
                  {selected && <Check size={16} aria-hidden="true" />}
                </button>
              );
            })}
          </div>
        </fieldset>
        <fieldset className="life-fieldset">
          <legend>A little about you</legend>
          <div className="life-details-grid">
            <label className="life-field-wide">
              My job or studies
              <select
                value={customJob ? "custom" : draft.profession}
                onChange={(event) => {
                  const value = event.target.value;
                  setCustomJob(value === "custom");
                  field("profession", value === "custom" ? "" : value);
                }}
              >
                <option value="">Choose a job or studies (optional)</option>
                {professions.map((job) => (
                  <optgroup key={job.label} label={job.label}>
                    {job.forms.map((form) => (
                      <option key={form} value={form}>
                        {job.label} · {form}
                      </option>
                    ))}
                  </optgroup>
                ))}
                <option value="custom">
                  My job isn’t listed — write my own
                </option>
              </select>
              <span className="life-field-help">
                Choose the German word form that fits you. Or leave this empty.
              </span>
            </label>
            {customJob && (
              <label className="life-field-wide">
                Profession in German
                <input
                  lang="de"
                  maxLength={80}
                  value={draft.profession}
                  placeholder="e.g. Fotografin"
                  onChange={(event) => field("profession", event.target.value)}
                />
              </label>
            )}
            <label>
              Country
              <input
                lang="de"
                autoComplete="country-name"
                list={`${id}-countries`}
                maxLength={80}
                value={draft.country}
                placeholder="e.g. Ägypten"
                onChange={(event) => field("country", event.target.value)}
              />
            </label>
            <label>
              City
              <input
                lang="de"
                autoComplete="address-level2"
                list={`${id}-cities`}
                maxLength={80}
                value={draft.city}
                placeholder="e.g. Alexandria"
                onChange={(event) => field("city", event.target.value)}
              />
            </label>
            <label className="life-field-wide">
              Languages I speak
              <input
                lang="de"
                list={`${id}-languages`}
                maxLength={150}
                value={draft.languages}
                placeholder="e.g. Arabisch und Englisch"
                onChange={(event) => field("languages", event.target.value)}
              />
            </label>
          </div>
          <datalist id={`${id}-countries`}>
            <option value="Ägypten">Egypt</option>
            <option value="Marokko">Morocco</option>
            <option value="Deutschland">Germany</option>
            <option value="Saudi-Arabien">Saudi Arabia</option>
            <option value="Jordanien">Jordan</option>
            <option value="Syrien">Syria</option>
            <option value="der Türkei">Turkey · after “aus”</option>
            <option value="der Schweiz">Switzerland · after “aus”</option>
          </datalist>
          <datalist id={`${id}-cities`}>
            {[
              "Alexandria",
              "Kairo",
              "Berlin",
              "München",
              "Hamburg",
              "Frankfurt",
              "Köln",
            ].map((city) => (
              <option key={city} value={city} />
            ))}
          </datalist>
          <datalist id={`${id}-languages`}>
            {[
              "Arabisch",
              "Englisch",
              "Arabisch und Englisch",
              "Englisch und Deutsch",
              "Arabisch und Deutsch",
              "Französisch und Arabisch",
            ].map((languages) => (
              <option key={languages} value={languages} />
            ))}
          </datalist>
          <p className="muted small">
            Write these details in German. For countries with an article, use
            the form after “aus”, such as “der Türkei”.
          </p>
        </fieldset>
        <fieldset className="life-fieldset">
          <legend>What do you enjoy?</legend>
          <p className="muted small">
            Choose as many as you like. Each adds a sentence to your
            introduction.
          </p>
          <div className="life-chips">
            {interests.map((item) => {
              const Icon = interestIcons[item.id];
              return (
                <button
                  key={item.id}
                  type="button"
                  aria-pressed={draft.interests.includes(item.id)}
                  onClick={() => toggle("interests", item.id)}
                >
                  <Icon size={17} aria-hidden="true" />
                  {item.label}
                  {draft.interests.includes(item.id) && (
                    <Check size={14} aria-hidden="true" />
                  )}
                </button>
              );
            })}
          </div>
        </fieldset>
        <fieldset className="life-fieldset">
          <legend>Where would you like to feel more confident?</legend>
          <p className="muted small">
            Pick everyday moments for your lesson suggestions.
          </p>
          <div className="life-chips">
            {situations.map((item) => {
              const Icon = situationIcons[item.id];
              return (
                <button
                  key={item.id}
                  type="button"
                  aria-pressed={draft.situations.includes(item.id)}
                  onClick={() => toggle("situations", item.id)}
                >
                  <Icon size={17} aria-hidden="true" />
                  {item.label}
                  {draft.situations.includes(item.id) && (
                    <Check size={14} aria-hidden="true" />
                  )}
                </button>
              );
            })}
          </div>
        </fieldset>
      </div>
      <div className="life-preview-column">
        <Introduction profile={draft} name={name} live />
        {!!practice.length && (
          <div className="life-preview-moments">
            <h3>
              <MapPin size={17} aria-hidden="true" /> Words for your world
            </h3>
            {practice.slice(0, 3).map((item) => (
              <div key={item.id}>
                <span>
                  {item.label} · lesson {item.lesson}
                </span>
                <p lang="de">{item.german}</p>
                <small>{item.english}</small>
              </div>
            ))}
          </div>
        )}
      </div>
      <div className="life-save-row">
        <p className="muted small" role="status">
          {changed
            ? "You have unsaved choices."
            : "Everything here is optional. Make it yours at your own pace."}
        </p>
        <div className="button-row">
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit">
            <Check size={17} aria-hidden="true" /> Save my learning details
          </Button>
        </div>
        {error && <p role="alert">{error}</p>}
      </div>
    </form>
  );
}
