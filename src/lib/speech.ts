"use client";
export function speakGerman(text: string, slow = false): Promise<void> {
  return new Promise((resolve, reject) => {
    if (!("speechSynthesis" in window))
      return reject(
        new Error("Audio is unavailable in this browser. Try Chrome or Edge."),
      );
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = "de-DE";
    utterance.rate = slow ? 0.65 : 0.9;
    const voice = window.speechSynthesis
      .getVoices()
      .find((v) => v.lang.startsWith("de"));
    if (voice) utterance.voice = voice;
    utterance.onend = () => resolve();
    utterance.onerror = (event) => {
      if (event.error === "canceled" || event.error === "interrupted")
        resolve();
      else
        reject(
          new Error(
            "German audio could not play. Check your device's speech voices and try again.",
          ),
        );
    };
    window.speechSynthesis.speak(utterance);
  });
}
interface RecognitionResult {
  results: { [index: number]: { [index: number]: { transcript: string } } };
}
export interface Recognition {
  lang: string;
  interimResults: boolean;
  maxAlternatives: number;
  onresult: ((event: RecognitionResult) => void) | null;
  onerror: ((event: { error: string }) => void) | null;
  onend: (() => void) | null;
  start(): void;
  stop(): void;
  abort(): void;
}
export function getRecognition(): (new () => Recognition) | undefined {
  const w = window as unknown as {
    SpeechRecognition?: new () => Recognition;
    webkitSpeechRecognition?: new () => Recognition;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition;
}
