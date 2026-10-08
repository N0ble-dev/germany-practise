"use client";
import { useEffect, useRef, useState } from "react";
import { Check, Volume2, Mic, ArrowRight, RotateCcw, Eye } from "lucide-react";
import { Button } from "../ui/button";
import { useApp } from "../learning-app";
import { addWordEvidence, saveJourneyScore, saveMission } from "@/lib/store";
import { formatWord, normalizeAnswer, textSimilarity } from "@/lib/learning";
import {
  checkMission,
  personalize,
  type BookLesson,
  type QuizQuestion,
} from "@/lib/journey-content";
import { getRecognition, speakGerman, type Recognition } from "@/lib/speech";
import { VoiceRecorder } from "./voice-recorder";
import { germanNumber } from "@/lib/numbers";

export function NumbersPractice() {
  const { notify } = useApp();
  const targets = [0, 7, 12, 16, 21, 28, 63, 100];
  const [index, setIndex] = useState(0);
  const [answer, setAnswer] = useState("");
  const [checked, setChecked] = useState(false);
  const [correct, setCorrect] = useState(0);
  const [done, setDone] = useState(false);
  const target = targets[index];
  const match =
    normalizeAnswer(answer) === normalizeAnswer(germanNumber(target)) ||
    (target === 100 && normalizeAnswer(answer) === "einhundert");
  return (
    <details className="journey-details number-practice">
      <summary>Numbers 0–100: age, phone numbers, and prices</summary>
      <p className="muted">
        After twenty, say the unit before the ten: 21 = ein-und-zwanzig. In
        phone numbers, say each digit separately.
      </p>
      <details className="journey-details">
        <summary>Explore the number patterns</summary>
        <div className="number-patterns">
          {[
            ...Array.from({ length: 20 }, (_, i) => i),
            20,
            21,
            28,
            30,
            40,
            50,
            60,
            70,
            80,
            90,
            100,
          ].map((n) => (
            <button
              key={n}
              onClick={() =>
                speakGerman(germanNumber(n)).catch((e) => notify(e.message))
              }
            >
              <strong>{n}</strong>
              <span lang="de">{germanNumber(n)}</span>
              <Volume2 size={13} />
            </button>
          ))}
        </div>
      </details>
      {done ? (
        <div className="answer-feedback" role="status">
          <strong>
            {correct} of {targets.length} numbers recalled.
          </strong>
          <p>Try saying your age and a phone number aloud.</p>
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              setIndex(0);
              setAnswer("");
              setChecked(false);
              setCorrect(0);
              setDone(false);
            }}
          >
            Practice the numbers again
          </Button>
        </div>
      ) : (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (checked) return;
            setChecked(true);
            if (match) setCorrect((n) => n + 1);
          }}
        >
          <h3>Say {target} in German</h3>
          <label>
            Your number in German
            <input
              lang="de"
              required
              maxLength={80}
              autoComplete="off"
              value={answer}
              disabled={checked}
              onChange={(e) => setAnswer(e.target.value)}
            />
          </label>
          {checked ? (
            <div className="answer-feedback" role="status">
              <p>
                {match
                  ? "You recalled it."
                  : "Notice the spelling and the order."}
              </p>
              <strong lang="de">{germanNumber(target)}</strong>
              <Button
                type="button"
                size="sm"
                onClick={() => {
                  if (index === targets.length - 1) setDone(true);
                  else {
                    setIndex((i) => i + 1);
                    setAnswer("");
                    setChecked(false);
                  }
                }}
              >
                {index === targets.length - 1
                  ? "See my number result"
                  : "Next number"}
              </Button>
            </div>
          ) : (
            <Button type="submit" size="sm">
              Check this number
            </Button>
          )}
        </form>
      )}
    </details>
  );
}

export function Quiz({
  questions,
  onFinish,
}: {
  questions: QuizQuestion[];
  onFinish: (score: number) => void;
}) {
  const [index, setIndex] = useState(0);
  const [picked, setPicked] = useState<number | null>(null);
  const [correct, setCorrect] = useState(0);
  const [finished, setFinished] = useState(false);
  const question = questions[index];
  function choose(answer: number) {
    if (picked !== null) return;
    setPicked(answer);
    if (answer === question.answer) setCorrect((n) => n + 1);
  }
  function next() {
    if (index + 1 < questions.length) {
      setIndex((i) => i + 1);
      setPicked(null);
    } else {
      setFinished(true);
      onFinish(Math.round((correct / questions.length) * 100));
    }
  }
  return (
    <div className="journey-quiz">
      {finished ? (
        <div className="answer-feedback" role="status">
          <strong>
            {Math.round((correct / questions.length) * 100)}% · {correct} of{" "}
            {questions.length} correct
          </strong>
          <p>
            Notice the examples that felt difficult, then try a fresh round.
          </p>
          <Button
            variant="outline"
            onClick={() => {
              setIndex(0);
              setPicked(null);
              setCorrect(0);
              setFinished(false);
            }}
          >
            Practice again
          </Button>
        </div>
      ) : (
        <>
          <p className="muted small">
            Question {index + 1} of {questions.length}
          </p>
          <h3 className="exercise-prompt" lang="de">
            {question.prompt}
          </h3>
          <div className="choice-list">
            {question.options.map((option, i) => (
              <button
                key={option}
                disabled={picked !== null}
                className={
                  picked !== null && i === question.answer
                    ? "correct"
                    : picked === i
                      ? "incorrect"
                      : ""
                }
                onClick={() => choose(i)}
              >
                {option}
                {picked !== null && i === question.answer && (
                  <Check size={17} />
                )}
              </button>
            ))}
          </div>
          {picked !== null && (
            <div className="answer-feedback" role="status">
              <p>{question.explanation}</p>
              <Button size="sm" onClick={next}>
                {index + 1 === questions.length
                  ? "See my result"
                  : "Next question"}
                <ArrowRight size={15} />
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
export function Recall({
  lesson,
  onReady,
}: {
  lesson: BookLesson;
  onReady: () => void;
}) {
  const { state } = useApp();
  const words = lesson.words.slice(0, 10);
  const [index, setIndex] = useState(0);
  const [answer, setAnswer] = useState("");
  const [checked, setChecked] = useState(false);
  const [correct, setCorrect] = useState(0);
  const [done, setDone] = useState(false);
  const word = words[index];
  const match = normalizeAnswer(answer) === normalizeAnswer(formatWord(word));
  function check(e: React.FormEvent) {
    e.preventDefault();
    if (checked) return;
    setChecked(true);
    if (match) {
      setCorrect((n) => n + 1);
      addWordEvidence(
        [word.german],
        { article: word.type === "noun" ? true : word.evidence.article },
        true,
      );
    }
  }
  function next() {
    if (index + 1 < words.length) {
      setIndex((i) => i + 1);
      setAnswer("");
      setChecked(false);
    } else {
      setDone(true);
      const score = Math.round((correct / words.length) * 100);
      saveJourneyScore(lesson.number, "vocabulary", score);
      if (score >= 80) onReady();
    }
  }
  return (
    <>
      {done ? (
        <div className="answer-feedback" role="status">
          <h3>
            {Math.round((correct / words.length) * 100)}% vocabulary recalled
          </h3>
          <p>
            Mastery needs at least 80%. Articles count: remember der, die, or
            das with the noun.
          </p>
          <Button
            variant="outline"
            onClick={() => {
              setIndex(0);
              setCorrect(0);
              setDone(false);
              setChecked(false);
              setAnswer("");
            }}
          >
            Recall again
          </Button>
        </div>
      ) : (
        <form onSubmit={check} className="recall-exercise">
          <span className="muted small">
            Word {index + 1} of {words.length} · English to German
          </span>
          <h3>{word.english}</h3>
          {state.language === "ar" && (
            <p dir="rtl" lang="ar">
              {word.arabic}
            </p>
          )}
          <label>
            Recall the German
            {word.type === "noun" ? ", including the article" : ""}
            <input
              lang="de"
              autoComplete="off"
              spellCheck={false}
              required
              value={answer}
              disabled={checked}
              onChange={(e) => setAnswer(e.target.value)}
              maxLength={150}
            />
          </label>
          {!checked ? (
            <Button type="submit">Check my recall</Button>
          ) : (
            <div
              className={`answer-feedback ${match ? "positive" : "gentle"}`}
              role="status"
            >
              <strong>
                {match ? "You recalled it." : "A word to revisit."}
              </strong>
              <p lang="de">{formatWord(word)}</p>
              <small lang="de">{word.example}</small>
              <Button type="button" size="sm" onClick={next}>
                {index + 1 === words.length
                  ? "See my recall result"
                  : "Next word"}
                <ArrowRight size={15} />
              </Button>
            </div>
          )}
        </form>
      )}
    </>
  );
}
export function Listening({
  lesson,
  onReady,
}: {
  lesson: BookLesson;
  onReady: () => void;
}) {
  const { notify } = useApp();
  const [transcript, setTranscript] = useState(false);
  const [heard, setHeard] = useState(false);
  const [selfPlayed, setSelfPlayed] = useState(false);
  const [dictation, setDictation] = useState("");
  const [dictationFeedback, setDictationFeedback] = useState("");
  const text = lesson.dialogue.map((d) => d.german).join(" ");
  async function play(slow = false) {
    try {
      await speakGerman(text, slow);
      setHeard(true);
    } catch (e) {
      notify((e as Error).message);
    }
  }
  return (
    <>
      <p className="muted">
        Listen to the conversation before showing the text. Choose what you
        understood, then try one sentence as dictation.
      </p>
      <div className="button-row">
        <Button onClick={() => void play()}>
          <Volume2 size={17} />
          Listen to the conversation
        </Button>
        <Button variant="outline" onClick={() => void play(true)}>
          Listen slowly
        </Button>
        <Button variant="ghost" onClick={() => setTranscript((s) => !s)}>
          <Eye size={16} />
          {transcript ? "Hide transcript" : "Show transcript"}
        </Button>
      </div>
      <label className="journey-check">
        <input
          type="checkbox"
          checked={selfPlayed}
          onChange={(e) => {
            setSelfPlayed(e.target.checked);
            if (e.target.checked) setHeard(true);
          }}
        />
        I listened using my textbook audio or a study partner.
      </label>
      {transcript && (
        <div className="journey-dialogue">
          {lesson.dialogue.map((line, i) => (
            <div key={i}>
              <span>{line.speaker}</span>
              <p lang="de">
                {line.german}
                <small>{line.english}</small>
              </p>
            </div>
          ))}
        </div>
      )}
      {heard ? (
        <Quiz
          questions={lesson.listening}
          onFinish={(score) => {
            saveJourneyScore(lesson.number, "listening", score);
            if (score >= 70) {
              const mentioned = lesson.words
                .filter((w) =>
                  text
                    .toLocaleLowerCase("de-DE")
                    .includes(w.german.toLocaleLowerCase("de-DE")),
                )
                .map((w) => w.german);
              addWordEvidence(mentioned, { audio: true });
              onReady();
            }
          }}
        />
      ) : (
        <p className="journey-instruction">
          Play the audio, or listen with your book or partner, to start the
          comprehension questions.
        </p>
      )}
      <details className="journey-details">
        <summary>Try a little dictation</summary>
        <Button
          variant="outline"
          size="sm"
          onClick={() =>
            speakGerman(lesson.dialogue[0].german).catch((e) =>
              notify(e.message),
            )
          }
        >
          <Volume2 size={16} />
          Hear one sentence
        </Button>
        <label>
          Type the sentence you hear
          <input
            lang="de"
            maxLength={500}
            value={dictation}
            onChange={(e) => setDictation(e.target.value)}
          />
        </label>
        <Button
          size="sm"
          onClick={() =>
            setDictationFeedback(
              normalizeAnswer(dictation) ===
                normalizeAnswer(lesson.dialogue[0].german)
                ? "You heard it clearly."
                : `Compare the words and umlauts: ${lesson.dialogue[0].german}`,
            )
          }
        >
          Check dictation
        </Button>
        {dictationFeedback && <p role="status">{dictationFeedback}</p>}
      </details>
    </>
  );
}
export function Builder({
  lesson,
  onReady,
}: {
  lesson: BookLesson;
  onReady: () => void;
}) {
  const { state } = useApp();
  const sentences = lesson.patterns
    .slice(0, 3)
    .map((s) => personalize(s, state.name, state.personalProfile));
  const [index, setIndex] = useState(0);
  const [picked, setPicked] = useState<number[]>([]);
  const [checked, setChecked] = useState(false);
  const [completed, setCompleted] = useState(false);
  const sentence = sentences[index];
  const tokens = sentence
    .replace(/[.!?]$/u, "")
    .split(/\s+/)
    .map((text, id) => ({ text, id }))
    .reverse();
  const built = picked
    .map((id) => tokens.find((t) => t.id === id)?.text)
    .join(" ");
  const correct = normalizeAnswer(built) === normalizeAnswer(sentence);
  function check() {
    setChecked(true);
    if (correct) {
      addWordEvidence(
        lesson.words
          .filter((w) =>
            sentence.toLowerCase().includes(w.german.toLowerCase()),
          )
          .map((w) => w.german),
        { sentence: true },
      );
      if (index === sentences.length - 1) {
        setCompleted(true);
        onReady();
      }
    }
  }
  return (
    <>
      <p className="muted">
        Build three useful sentences. Choose the words in order; tap a chosen
        word to move it back.
      </p>
      <p className="muted small">
        Sentence {index + 1} of {sentences.length}
      </p>
      <div className="built-sentence">
        {picked.length ? (
          picked.map((id) => (
            <button
              key={id}
              disabled={checked}
              onClick={() => setPicked((p) => p.filter((x) => x !== id))}
            >
              {tokens.find((t) => t.id === id)?.text}
            </button>
          ))
        ) : (
          <span className="muted">Start your sentence here…</span>
        )}
      </div>
      <div className="word-chips token-bank">
        {tokens
          .filter((t) => !picked.includes(t.id))
          .map((t) => (
            <button
              disabled={checked}
              key={t.id}
              onClick={() => setPicked((p) => [...p, t.id])}
            >
              {t.text}
            </button>
          ))}
      </div>
      <div className="button-row">
        <Button
          disabled={checked || picked.length !== tokens.length}
          onClick={check}
        >
          Check the word order
        </Button>
        <Button
          variant="outline"
          onClick={() => {
            setPicked([]);
            setChecked(false);
          }}
        >
          <RotateCcw size={16} />
          Start this sentence again
        </Button>
      </div>
      {checked && (
        <div
          className={`answer-feedback ${correct ? "positive" : "gentle"}`}
          role="status"
        >
          <p>
            {correct
              ? completed
                ? "Three sentences you can use. Nicely done."
                : "That’s a useful sentence."
              : "Look at where the verb goes, then try rebuilding it."}
          </p>
          <p lang="de">{sentence}</p>
          {correct && !completed && (
            <Button
              size="sm"
              onClick={() => {
                setIndex((i) => i + 1);
                setPicked([]);
                setChecked(false);
              }}
            >
              Build the next sentence
            </Button>
          )}
        </div>
      )}
    </>
  );
}
export function Speaking({
  lesson,
  onReady,
}: {
  lesson: BookLesson;
  onReady: () => void;
}) {
  const { state, notify } = useApp();
  const target = personalize(
    lesson.patterns[0],
    state.name,
    state.personalProfile,
  );
  const [stage, setStage] = useState(0);
  const [checks, setChecks] = useState<boolean[]>([false, false, false]);
  const [recognized, setRecognized] = useState("");
  const [listening, setListening] = useState(false);
  const recognition = useRef<Recognition | null>(null);
  useEffect(() => () => recognition.current?.abort(), []);
  function compare() {
    const Constructor = getRecognition();
    if (!Constructor) {
      notify(
        "Word recognition is unavailable. Record your voice or practice aloud, then use the self-check.",
      );
      return;
    }
    const rec = new Constructor();
    recognition.current = rec;
    rec.lang = "de-DE";
    rec.interimResults = false;
    rec.maxAlternatives = 1;
    rec.onresult = (e) => {
      const text = e.results[0][0].transcript;
      setRecognized(text);
      const score = textSimilarity(target, text);
      saveJourneyScore(lesson.number, "speaking", score, "recognized-text");
      if (score >= 70) {
        addWordEvidence(
          lesson.words
            .filter((w) =>
              target.toLowerCase().includes(w.german.toLowerCase()),
            )
            .map((w) => w.german),
          { speech: true },
        );
        onReady();
      }
    };
    rec.onerror = () =>
      notify(
        "Your words could not be captured. Check microphone access, or use the self-check.",
      );
    rec.onend = () => setListening(false);
    try {
      setListening(true);
      rec.start();
    } catch {
      setListening(false);
      notify(
        "The microphone could not start. Try the recorder or practice aloud.",
      );
    }
  }
  return (
    <>
      <div className="journey-stage-tabs">
        {[
          "Listen",
          "Repeat with text",
          "Repeat from memory",
          "Use it in conversation",
        ].map((s, i) => (
          <button
            key={s}
            className={i === stage ? "active" : ""}
            onClick={() => setStage(i)}
          >
            {i + 1}. {s}
          </button>
        ))}
      </div>
      {stage < 2 ? (
        <div className="sentence-target" lang="de">
          {target}
        </div>
      ) : (
        <div className="journey-instruction">
          {stage === 2
            ? "Say the sentence from memory. The German text is hidden."
            : `Imagine you are in ${lesson.place}. Give a short answer using this lesson's patterns.`}
        </div>
      )}
      <Button
        variant="outline"
        onClick={() => speakGerman(target).catch((e) => notify(e.message))}
      >
        <Volume2 size={17} />
        Hear the model sentence
      </Button>
      <VoiceRecorder
        seconds={lesson.number === 1 ? 20 : lesson.number === 3 ? 45 : 30}
      />
      <Button variant="outline" disabled={listening} onClick={compare}>
        <Mic size={16} />
        {listening ? "Listening…" : "Compare recognized words"}
      </Button>
      {recognized && (
        <div className="answer-feedback" role="status">
          <p lang="de">Your browser heard: “{recognized}”</p>
          <p>
            {textSimilarity(target, recognized)}% text match with the model
            sentence.
          </p>
          <small>
            This checks recognized words, not pronunciation or fluency.
          </small>
        </div>
      )}
      <fieldset className="speaking-self-check">
        <legend>Or check your own spoken recall</legend>
        {[
          "I said the complete German sentence aloud.",
          "I could say it without reading the German text.",
          "I understand the sentence and can use it in this situation.",
        ].map((label, i) => (
          <label className="journey-check" key={label}>
            <input
              type="checkbox"
              checked={checks[i]}
              onChange={(e) =>
                setChecks((values) =>
                  values.map((v, j) => (j === i ? e.target.checked : v)),
                )
              }
            />
            {label}
          </label>
        ))}
        <Button
          disabled={!checks.every(Boolean)}
          onClick={() => {
            saveJourneyScore(lesson.number, "speaking", 100, "self-check");
            addWordEvidence(
              lesson.words
                .filter((w) =>
                  target.toLowerCase().includes(w.german.toLowerCase()),
                )
                .map((w) => w.german),
              { speech: true },
            );
            onReady();
            notify(
              "Your speaking self-check is saved. Keep your recording to compare later.",
            );
          }}
        >
          Save my speaking self-check
        </Button>
        <p className="muted small">
          Self-check progress measures the three practice tasks. It is not an
          automatic pronunciation grade.
        </p>
      </fieldset>
    </>
  );
}
export function Conversation({
  lesson,
  onReady,
}: {
  lesson: BookLesson;
  onReady: () => void;
}) {
  const { state, notify } = useApp();
  const [mode, setMode] = useState<"guided" | "supported" | "free">("guided");
  const [response, setResponse] = useState("");
  const [feedback, setFeedback] = useState("");
  const [turn, setTurn] = useState(0);
  const pairs = lesson.dialogue
    .filter((_, i) => i % 2 === 0)
    .map((prompt, i) => ({ prompt, reply: lesson.dialogue[i * 2 + 1] }))
    .filter((p) => p.reply);
  const pair = pairs[turn % pairs.length];
  const suggestions = [
    pair.reply.german,
    personalize(lesson.patterns[0], state.name, state.personalProfile),
    "Noch einmal, bitte.",
  ];
  function send(text: string) {
    if (!text.trim()) return;
    setResponse(text);
    const matched = textSimilarity(pair.reply.german, text) >= 60;
    setFeedback(
      matched
        ? "You connected with the model reply. Listen and say your version again."
        : "Compare your reply with one useful model. Other personal answers may also be valid.",
    );
    onReady();
  }
  return (
    <>
      <p className="muted">
        An authored practice dialogue with three levels of support. This is a
        local conversation exercise; the feedback compares examples.
      </p>
      <div className="practice-tabs">
        {(["guided", "supported", "free"] as const).map((m) => (
          <button
            key={m}
            className={mode === m ? "active" : ""}
            onClick={() => {
              setMode(m);
              setFeedback("");
              setResponse("");
            }}
          >
            {m === "guided"
              ? "Guided choices"
              : m === "supported"
                ? "With a hint"
                : "Free response"}
          </button>
        ))}
      </div>
      <div className="conversation-bubble">
        <p lang="de">{pair.prompt.german}</p>
        <Button
          size="icon"
          variant="ghost"
          aria-label="Hear the conversation prompt"
          onClick={() =>
            speakGerman(pair.prompt.german).catch((e) => notify(e.message))
          }
        >
          <Volume2 size={16} />
        </Button>
      </div>
      {mode === "guided" ? (
        <div className="choice-list">
          {[...new Set(suggestions)].map((s) => (
            <button key={s} onClick={() => send(s)} lang="de">
              {s}
            </button>
          ))}
        </div>
      ) : (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            send(response);
          }}
        >
          {mode === "supported" && (
            <p className="muted">
              Start like this:{" "}
              <span lang="de">
                {pair.reply.german.split(" ").slice(0, 3).join(" ")} …
              </span>
            </p>
          )}
          <label>
            Your reply in German
            <textarea
              lang="de"
              maxLength={1000}
              required
              value={response}
              onChange={(e) => setResponse(e.target.value)}
              rows={3}
            />
          </label>
          <Button type="submit">Try my reply</Button>
        </form>
      )}
      {feedback && (
        <div className="answer-feedback" role="status">
          <p>{feedback}</p>
          <p lang="de">One model: {pair.reply.german}</p>
          <small>{pair.reply.english}</small>
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              setTurn((t) => t + 1);
              setResponse("");
              setFeedback("");
            }}
          >
            Another turn
          </Button>
        </div>
      )}
    </>
  );
}
export function Mission({
  lesson,
  onReady,
  situation = false,
}: {
  lesson: BookLesson;
  onReady: () => void;
  situation?: boolean;
}) {
  const { state, notify } = useApp();
  const [response, setResponse] = useState(
    state.journey.lessons[lesson.number]?.missionResponse ?? "",
  );
  const [checked, setChecked] = useState(false);
  const [hint, setHint] = useState(false);
  const rec = useRef<Recognition | null>(null);
  const [recording, setRecording] = useState(false);
  const [finalized, setFinalized] = useState(false);
  useEffect(() => () => rec.current?.abort(), []);
  const passed = checkMission(response, lesson.mission.criteria);
  function dictate() {
    const Constructor = getRecognition();
    if (!Constructor) {
      notify(
        "Dictation is unavailable. Type your response or use the voice recorder.",
      );
      return;
    }
    const recognition = new Constructor();
    rec.current = recognition;
    recognition.lang = "de-DE";
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;
    recognition.onresult = (e) =>
      setResponse((r) =>
        `${r} ${e.results[0][0].transcript}`.trim().slice(0, 3000),
      );
    recognition.onerror = () =>
      notify(
        "Dictation could not finish. Check microphone access or type your response.",
      );
    recognition.onend = () => setRecording(false);
    try {
      setRecording(true);
      recognition.start();
    } catch {
      setRecording(false);
      notify("The microphone could not start.");
    }
  }
  function check(e: React.FormEvent) {
    e.preventDefault();
    setChecked(true);
    if (situation) {
      onReady();
      return;
    }
    const complete = passed.length === lesson.mission.criteria.length;
    saveMission(lesson.number, response, complete);
    if (complete) {
      setFinalized(true);
      addWordEvidence(
        lesson.words
          .filter((w) =>
            response.toLowerCase().includes(w.german.toLowerCase()),
          )
          .map((w) => w.german),
        { situation: true },
      );
      onReady();
    }
  }
  return (
    <>
      <span className="soft-badge">{lesson.place}</span>
      <h3 className="journey-mission-title">{lesson.mission.title}</h3>
      <p className="muted">{lesson.mission.prompt}</p>
      <form onSubmit={check}>
        <label>
          Your own German
          <textarea
            lang="de"
            required
            maxLength={3000}
            rows={6}
            value={response}
            onChange={(e) => {
              setResponse(e.target.value);
              setChecked(false);
            }}
            placeholder="Use your own words. A simple sentence is a good beginning."
          />
        </label>
        <div className="button-row">
          <Button type="submit" disabled={finalized}>
            {finalized
              ? "Life mission passed"
              : situation
                ? "Practice this situation"
                : "Check my life task"}
          </Button>
          <Button
            variant="outline"
            type="button"
            disabled={recording}
            onClick={dictate}
          >
            <Mic size={16} />
            {recording ? "Listening…" : "Dictate my response"}
          </Button>
          <Button
            variant="ghost"
            type="button"
            onClick={() => setHint((h) => !h)}
          >
            {hint ? "Hide the model" : "I’d like a little support"}
          </Button>
        </div>
      </form>
      {hint && (
        <div className="journey-instruction" lang="de">
          {lesson.mission.hint}
        </div>
      )}
      {checked && (
        <>
          <div className="mission-checklist" role="status">
            {lesson.mission.criteria.map((rule) => (
              <div key={rule.id}>
                <span
                  className={passed.includes(rule.id) ? "criterion-passed" : ""}
                >
                  {passed.includes(rule.id) ? <Check size={15} /> : "○"}
                </span>
                {rule.label}
              </div>
            ))}
          </div>
          <p className="muted small">
            This checks whether your response covers the communication tasks
            using familiar phrases. It does not certify grammar, fluency, or
            pronunciation.
          </p>
          {passed.length !== lesson.mission.criteria.length && (
            <p className="answer-feedback">
              You covered {passed.length} of {lesson.mission.criteria.length}{" "}
              parts. Add the missing ideas and try again.
            </p>
          )}
        </>
      )}
      {!situation && (
        <VoiceRecorder
          seconds={lesson.number === 1 ? 20 : lesson.number === 3 ? 45 : 30}
        />
      )}
    </>
  );
}
