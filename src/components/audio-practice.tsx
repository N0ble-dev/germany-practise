"use client";
import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import {
  Headphones,
  Mic,
  Volume2,
  ArrowRight,
  Check,
  Eye,
  Square,
} from "lucide-react";
import { useApp } from "./learning-app";
import { Button } from "./ui/button";
import { lessons } from "@/lib/content";
import { normalizeAnswer, textSimilarity } from "@/lib/learning";
import { recordActivity } from "@/lib/store";
import { getRecognition, speakGerman, type Recognition } from "@/lib/speech";
export function AudioPractice() {
  const mode = usePathname() === "/speaking" ? "speaking" : "listening";
  return <AudioExercise key={mode} mode={mode} />;
}
function AudioExercise({ mode }: { mode: "speaking" | "listening" }) {
  const { state, notify } = useApp();
  const [index, setIndex] = useState(state.currentLesson - 1);
  const [answer, setAnswer] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [showText, setShowText] = useState(false);
  const [recording, setRecording] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [score, setScore] = useState<number | null>(null);
  const [shadow, setShadow] = useState(false);
  const [step, setStep] = useState(0);
  const [shadowDone, setShadowDone] = useState(false);
  const [played, setPlayed] = useState(false);
  const [audioError, setAudioError] = useState("");
  const [speechError, setSpeechError] = useState("");
  const recognition = useRef<Recognition | null>(null);
  const mounted = useRef(true);
  const lesson = lessons[index];
  const target = lesson.example;
  const listening = mode === "listening";
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      recognition.current?.abort();
      if ("speechSynthesis" in window) window.speechSynthesis.cancel();
    };
  }, []);
  function next() {
    recognition.current?.abort();
    setIndex((i) => (i + 1) % lessons.length);
    setAnswer("");
    setSubmitted(false);
    setShowText(false);
    setTranscript("");
    setScore(null);
    setPlayed(false);
    setStep(0);
    setShadowDone(false);
    setAudioError("");
    setSpeechError("");
  }
  async function play(slow = false) {
    setAudioError("");
    try {
      await speakGerman(target, slow);
      if (mounted.current) setPlayed(true);
    } catch (e) {
      if (mounted.current) setAudioError((e as Error).message);
    }
  }
  function check(event: React.FormEvent) {
    event.preventDefault();
    if (submitted || !answer.trim()) return;
    setSubmitted(true);
    recordActivity(
      "listening",
      `Listening: ${target}`,
      normalizeAnswer(answer) === normalizeAnswer(target) ? 3 : 1,
      index + 1,
    );
  }
  function record() {
    if (recording) {
      recognition.current?.stop();
      return;
    }
    const Constructor = getRecognition();
    if (!Constructor) {
      setSpeechError(
        "Speech recognition isn’t available here. Listen and repeat, or use Chrome or Edge to compare recognized words.",
      );
      return;
    }
    const rec = new Constructor();
    recognition.current = rec;
    rec.lang = "de-DE";
    rec.interimResults = false;
    rec.maxAlternatives = 1;
    rec.onresult = (event) => {
      if (!mounted.current) return;
      const heard = event.results[0][0].transcript;
      const match = textSimilarity(target, heard);
      setTranscript(heard);
      setScore(match);
      recordActivity(
        "speaking",
        `Spoke: ${target}`,
        match >= 85 ? 3 : 1,
        index + 1,
      );
    };
    rec.onerror = (event) => {
      if (mounted.current)
        setSpeechError(
          event.error === "not-allowed"
            ? "Microphone access was denied. Allow it in your browser settings, then try again."
            : event.error === "no-speech"
              ? "No words were detected. Try again in a quiet spot."
              : "Speech recognition could not finish. Check your connection and microphone, then try again.",
        );
    };
    rec.onend = () => {
      if (mounted.current) setRecording(false);
    };
    try {
      setSpeechError("");
      setRecording(true);
      rec.start();
    } catch {
      setRecording(false);
      setSpeechError(
        "Your microphone could not start. Check permissions and try again.",
      );
    }
  }
  const shadowSteps = [
    "Listen without reading",
    "Listen while reading",
    "Repeat after the audio",
    "Speak along with the audio",
    "Say it without the text",
  ];
  return (
    <>
      <div className="page-heading">
        <div>
          <h1>
            {listening
              ? "Let German sound a little more familiar."
              : "Find your voice, one sentence at a time."}
          </h1>
          <p>
            {listening
              ? "Listen first. Take your time. It’s okay to play it again."
              : "There’s no need to sound perfect. The first step is saying it."}
          </p>
        </div>
        <span className="soft-badge">A1.1 · Lesson {index + 1}</span>
      </div>
      <div className="practice-tabs">
        <Link
          href="/listening"
          aria-current={listening ? "page" : undefined}
          className={listening ? "active" : ""}
        >
          <Headphones size={17} />
          Listening
        </Link>
        <Link
          href="/speaking"
          aria-current={!listening ? "page" : undefined}
          className={!listening ? "active" : ""}
        >
          <Mic size={17} />
          Speaking
        </Link>
      </div>
      <div className="practice-layout">
        <section className="panel audio-exercise">
          <div className={`large-icon ${listening ? "blue" : "peach"}`}>
            {listening ? <Headphones size={34} /> : <Mic size={34} />}
          </div>
          <h2>
            {shadow
              ? shadowSteps[step]
              : listening
                ? "What do you hear?"
                : "Listen. Breathe. Give it a try."}
          </h2>
          <div className="button-row">
            <Button onClick={() => void play()}>
              <Volume2 size={18} />
              Play German audio
            </Button>
            <Button variant="outline" onClick={() => void play(true)}>
              Play slowly
            </Button>
          </div>
          {audioError && (
            <p className="form-error" role="alert">
              {audioError}
            </p>
          )}
          {((!listening && (!shadow || (step > 0 && step < 4))) ||
            showText ||
            submitted) && (
            <div className="sentence-target" lang="de">
              {target}
            </div>
          )}
          {listening && !shadow && (
            <form className="dictation-form" onSubmit={check}>
              <label>
                Write what you hear
                <textarea
                  lang="de"
                  required
                  rows={3}
                  maxLength={500}
                  disabled={submitted}
                  value={answer}
                  placeholder="Type the German sentence…"
                  onChange={(e) => setAnswer(e.target.value)}
                />
              </label>
              <div className="button-row">
                <Button
                  type="submit"
                  disabled={submitted || !answer.trim() || !played}
                >
                  Check my sentence
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setShowText((s) => !s)}
                >
                  <Eye size={16} />
                  {showText ? "Hide the sentence" : "I’d like a hint"}
                </Button>
              </div>
              {!played && (
                <p className="muted small">
                  Play the audio before checking your answer.
                </p>
              )}
            </form>
          )}
          {submitted && (
            <div
              className={`answer-feedback ${normalizeAnswer(answer) === normalizeAnswer(target) ? "positive" : "gentle"}`}
              role="status"
            >
              <strong>
                {normalizeAnswer(answer) === normalizeAnswer(target)
                  ? "Your ears caught it. Sehr gut! +3 XP"
                  : "A useful sentence to listen to again. +1 XP for practicing."}
              </strong>
              <p lang="de">{target}</p>
              <small>
                Look closely at umlauts (ä, ö, ü), word endings, and word order.
              </small>
            </div>
          )}
          {!listening && !shadow && (
            <>
              <Button
                onClick={record}
                variant={recording ? "destructive" : "secondary"}
              >
                {recording ? <Square size={17} /> : <Mic size={17} />}
                {recording ? "Stop recording" : "Try saying it"}
              </Button>
              {speechError && (
                <p className="form-error" role="alert">
                  {speechError}
                </p>
              )}
              {transcript && (
                <div className="speech-result" role="status">
                  <span className="muted small">Your browser heard</span>
                  <p lang="de">“{transcript}”</p>
                  <div className="progress-track">
                    <span style={{ width: `${score}%` }} />
                  </div>
                  <strong>{score}% text match</strong>
                  <p>
                    {(score ?? 0) >= 85
                      ? "The words came through clearly. Try it once more with confidence."
                      : "Listen slowly, notice the different words, then give it another try."}
                  </p>
                  <small>
                    This compares recognized words with the sentence. It does
                    not measure pronunciation quality.
                  </small>
                </div>
              )}
              <Button
                variant="ghost"
                size="sm"
                disabled={submitted}
                onClick={() => {
                  setSubmitted(true);
                  recordActivity(
                    "speaking",
                    `Self practice: ${target}`,
                    1,
                    index + 1,
                  );
                  notify("You made time to speak. That counts. +1 XP");
                }}
              >
                {submitted
                  ? "Practice saved"
                  : "I practiced out loud without the microphone"}
              </Button>
            </>
          )}
          {shadow && (
            <>
              <p className="muted">
                {step === 0
                  ? "Just listen. Notice the rhythm before looking at the words."
                  : step === 4
                    ? "Hide the sentence and say it from memory. You can replay the audio any time."
                    : "Listen again and let your own voice follow the words."}
              </p>
              <Button
                disabled={!played || shadowDone}
                onClick={() => {
                  if (step < 4) {
                    setStep((s) => s + 1);
                    setPlayed(false);
                  } else {
                    setShadowDone(true);
                    recordActivity(
                      "speaking",
                      `Shadowing: ${target}`,
                      3,
                      index + 1,
                    );
                    notify(
                      "Five small steps toward a familiar sentence. +3 XP",
                    );
                  }
                }}
              >
                {shadowDone ? (
                  <>
                    <Check size={17} />
                    Shadowing complete
                  </>
                ) : step < 4 ? (
                  "Ready for the next step"
                ) : (
                  "I said it from memory"
                )}
              </Button>
            </>
          )}
          <div className="exercise-footer">
            <span className="muted small">
              Sentence {index + 1} of {lessons.length}
            </span>
            <Button variant="outline" onClick={next}>
              Next sentence <ArrowRight size={17} />
            </Button>
          </div>
        </section>
        <aside className="practice-side">
          <section className="panel">
            <h3>Make the sound stick.</h3>
            <ol className="help-steps">
              <li>Listen once at normal speed.</li>
              <li>Listen slowly and notice each word.</li>
              <li>Repeat the sentence out loud.</li>
              <li>Come back to it another day.</li>
            </ol>
            <p className="muted small">
              German audio uses the voices on your device. A German voice gives
              the best result.
            </p>
          </section>
          <section className="shadow-card">
            <span className="tiny-spark">✦</span>
            <h3>Try shadowing</h3>
            <p>Listen, read, repeat, speak along, then say it from memory.</p>
            <Button
              variant="outline"
              onClick={() => {
                recognition.current?.abort();
                setShadow((s) => !s);
                setStep(0);
                setShadowDone(false);
                setShowText(false);
                setSubmitted(false);
                setPlayed(false);
              }}
            >
              {shadow ? "Back to practice" : "Start five-step shadowing"}
            </Button>
          </section>
          <p className="practice-reassurance">
            A pause, a mistake, a second attempt. All part of the journey.
          </p>
        </aside>
      </div>
    </>
  );
}
