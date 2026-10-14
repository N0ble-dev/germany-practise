"use client";

import { useId } from "react";
import Link from "next/link";
import {
  ArrowRight,
  Bookmark,
  BriefcaseBusiness,
  Check,
  Heart,
  Lightbulb,
  PencilLine,
  Sparkles,
  Volume2,
} from "lucide-react";
import { useApp } from "./learning-app";
import { Button } from "./ui/button";
import {
  interests,
  personalFocus,
  personalPractice,
} from "@/lib/personal-life";
import { speakGerman } from "@/lib/speech";
import { updateState } from "@/lib/store";

function HearPhrase({ german }: { german: string }) {
  const { notify } = useApp();
  return (
    <Button
      variant="ghost"
      size="icon"
      aria-label={`Hear ${german}`}
      onClick={() => {
        void speakGerman(german).catch((error: Error) => notify(error.message));
      }}
    >
      <Volume2 size={18} aria-hidden="true" />
    </Button>
  );
}

function KeepPhrase({ german }: { german: string }) {
  const { state, notify } = useApp();
  const saved = state.savedSentences.includes(german);
  return (
    <Button
      size="sm"
      variant="ghost"
      disabled={saved || state.savedSentences.length >= 1000}
      onClick={() => {
        updateState((s) => ({
          ...s,
          savedSentences:
            s.savedSentences.includes(german) || s.savedSentences.length >= 1000
              ? s.savedSentences
              : [...s.savedSentences, german],
        }));
        notify("Sentence saved to your sentence lab and profile.");
      }}
    >
      {saved ? (
        <Check size={15} aria-hidden="true" />
      ) : (
        <Bookmark size={15} aria-hidden="true" />
      )}
      {saved ? "Sentence saved" : "Keep this sentence"}
    </Button>
  );
}

export function PersonalLifeTodayCard() {
  const { state } = useApp();
  const id = useId();
  const focus = personalFocus(state.personalProfile, state.name);
  const practice = personalPractice(state.personalProfile);
  const tags = [
    ...(state.personalProfile.profession
      ? [
          {
            id: "profession",
            label: state.personalProfile.profession,
            icon: BriefcaseBusiness,
          },
        ]
      : []),
    ...state.personalProfile.interests.slice(0, 2).map((value) => ({
      id: `interest-${value}`,
      label: interests.find((item) => item.id === value)!.label,
      icon: Heart,
    })),
  ];
  return (
    <section className="life-today" aria-labelledby={`${id}-title`}>
      <div className="life-today-copy">
        <span className="eyebrow">
          <Sparkles size={14} aria-hidden="true" />{" "}
          {focus.reason || "A LITTLE MORE YOU"}
        </span>
        <h2 id={`${id}-title`}>German for your own life.</h2>
        <p>
          {focus.configured
            ? "Bring a little of your own story into today’s practice."
            : "Your work. Your favorite things. The moments you want to feel ready for."}
        </p>
        {!!tags.length && (
          <div className="life-today-tags">
            {tags.map((tag) => (
              <span key={tag.id}>
                <tag.icon size={13} aria-hidden="true" />
                <span lang={tag.icon === BriefcaseBusiness ? "de" : undefined}>
                  {tag.label}
                </span>
              </span>
            ))}
          </div>
        )}
        <Link className="life-preferences-link" href="/lessons#personal-life">
          <PencilLine size={14} aria-hidden="true" />
          {focus.configured
            ? "Change what matters to me"
            : "Choose my job, interests & moments"}
          <ArrowRight size={14} aria-hidden="true" />
        </Link>
      </div>
      <div className="life-today-phrase">
        <div className="life-today-phrase-label">
          <span className="life-flag" aria-hidden="true">
            <i />
            <i />
            <i />
          </span>
          <span>
            {focus.configured
              ? "A SENTENCE OF YOUR OWN"
              : "YOUR STORY STARTS HERE"}
          </span>
        </div>
        <div className="life-today-german">
          <p lang="de">
            {focus.configured && focus.german
              ? focus.german
              : "Hallo, neues Leben."}
          </p>
          {focus.configured && focus.german && (
            <HearPhrase german={focus.german} />
          )}
        </div>
        <p className="life-today-context">
          {focus.configured
            ? state.personalProfile.profession
              ? "Meet someone new. Tell them a little about yourself."
              : practice[0] && !state.personalProfile.interests.length
                ? `A little practice for ${practice[0].label.toLowerCase()}.`
                : "Say it once. Then say it from memory."
            : "Hello, new life. Let’s give your German a purpose."}
        </p>
        <Button asChild>
          <Link
            href={
              focus.configured
                ? `/lessons/${focus.lesson}?step=patterns`
                : "/lessons#personal-life"
            }
          >
            {focus.configured ? "Use it in a lesson" : "Make it mine"}
            <ArrowRight size={16} aria-hidden="true" />
          </Link>
        </Button>
      </div>
    </section>
  );
}

export function PersonalLifeHint({
  kind,
}: {
  kind: "vocabulary" | "sentences" | "speaking" | "listening";
}) {
  const { state } = useApp();
  const id = useId();
  const focus = personalFocus(state.personalProfile, state.name);
  const lesson =
    kind === "vocabulary"
      ? (focus.moment?.lesson ?? focus.lesson)
      : focus.lesson;
  const copy = {
    vocabulary: {
      title: "Collect words you’ll actually use.",
      body: focus.moment
        ? `Think of “${focus.moment.label}”. Keep one useful word, its article, and a sentence you could say there.`
        : "Think of your work, a favorite meal, or the people you meet. Keep a word with a sentence you could use today.",
    },
    sentences: {
      title: "A sentence that belongs to you.",
      body: focus.configured
        ? "Start with a detail from your own life. Change it, say it, and keep a version you’ll want to use."
        : "Try a sentence about your job, your city, or something you enjoy. Familiar details make the words easier to remember.",
    },
    speaking: {
      title: "Take your own story out loud.",
      body: "After this exercise, try a sentence about your own life. Imagine saying it to someone you’ve just met.",
    },
    listening: {
      title: "Give the sound a place in your day.",
      body: "After this exercise, listen to a familiar detail from your own life. Hear it again, then repeat it without the text.",
    },
  }[kind];
  const showPhrase =
    kind !== "vocabulary" && focus.configured && !!focus.german;
  return (
    <aside
      className={`life-hint life-hint-${kind}`}
      aria-labelledby={`${id}-hint`}
    >
      <span className="life-hint-icon">
        <Lightbulb size={19} aria-hidden="true" />
      </span>
      <div className="life-hint-content">
        <h3 id={`${id}-hint`}>{copy.title}</h3>
        <p>{copy.body}</p>
        {showPhrase && (
          <div className="life-hint-phrase">
            <p lang="de">{focus.german}</p>
            <HearPhrase german={focus.german} />
          </div>
        )}
        <div className="life-hint-actions">
          {kind === "sentences" && showPhrase && (
            <KeepPhrase german={focus.german} />
          )}
          <Link
            href={
              focus.configured
                ? `/lessons/${lesson}?step=${kind === "vocabulary" ? "words" : "patterns"}`
                : "/lessons#personal-life"
            }
          >
            {focus.configured
              ? kind === "vocabulary"
                ? `Find words in lesson ${lesson}`
                : "Practice personal sentences"
              : "Make my practice personal"}
            <ArrowRight size={14} aria-hidden="true" />
          </Link>
        </div>
      </div>
    </aside>
  );
}
