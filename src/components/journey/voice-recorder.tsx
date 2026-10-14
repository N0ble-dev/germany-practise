"use client";
import { useEffect, useRef, useState } from "react";
import { Mic, Square, Download, Trash2 } from "lucide-react";
import { Button } from "../ui/button";
export function VoiceRecorder({ seconds = 30 }: { seconds?: number }) {
  const [recording, setRecording] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [url, setUrl] = useState("");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const [extension, setExtension] = useState("webm");
  const recorder = useRef<MediaRecorder | null>(null);
  const stream = useRef<MediaStream | null>(null);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);
  const audioUrl = useRef("");
  const alive = useRef(true);
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
      if (timer.current) clearInterval(timer.current);
      if (recorder.current?.state === "recording") recorder.current.stop();
      stream.current?.getTracks().forEach((t) => t.stop());
      if (audioUrl.current) URL.revokeObjectURL(audioUrl.current);
    };
  }, []);
  async function start() {
    setError("");
    setPending(true);
    try {
      if (
        !navigator.mediaDevices?.getUserMedia ||
        typeof MediaRecorder === "undefined"
      )
        throw new Error(
          "Voice recording needs a supported browser on HTTPS or localhost. You can still practice aloud and use the self-check.",
        );
      const media = await navigator.mediaDevices.getUserMedia({ audio: true });
      if (!alive.current) {
        media.getTracks().forEach((t) => t.stop());
        return;
      }
      stream.current = media;
      const rec = new MediaRecorder(media);
      recorder.current = rec;
      const chunks: Blob[] = [];
      setExtension(rec.mimeType.includes("mp4") ? "m4a" : "webm");
      rec.ondataavailable = (e) => {
        if (e.data.size) chunks.push(e.data);
      };
      rec.onstop = () => {
        if (timer.current) clearInterval(timer.current);
        media.getTracks().forEach((t) => t.stop());
        if (!alive.current) return;
        setRecording(false);
        if (audioUrl.current) URL.revokeObjectURL(audioUrl.current);
        const blob = new Blob(chunks, { type: rec.mimeType || "audio/webm" });
        audioUrl.current = URL.createObjectURL(blob);
        setUrl(audioUrl.current);
      };
      rec.onerror = () => {
        if (alive.current) {
          setError(
            "The recording stopped unexpectedly. Check your microphone and try again.",
          );
          setRecording(false);
        }
        media.getTracks().forEach((t) => t.stop());
        if (timer.current) clearInterval(timer.current);
      };
      rec.start();
      setElapsed(0);
      setRecording(true);
      const began = Date.now();
      timer.current = setInterval(() => {
        const count = Math.floor((Date.now() - began) / 1000);
        setElapsed(count);
        if (count >= seconds && rec.state === "recording") rec.stop();
      }, 250);
    } catch (e) {
      stream.current?.getTracks().forEach((t) => t.stop());
      if (alive.current)
        setError(
          e instanceof DOMException && e.name === "NotAllowedError"
            ? "Microphone permission was denied. Allow it in your browser settings, or practice aloud without recording."
            : (e as Error).message,
        );
    } finally {
      if (alive.current) setPending(false);
    }
  }
  return (
    <div className="voice-recorder">
      <div className="button-row">
        <Button
          variant="outline"
          disabled={pending}
          onClick={() => (recording ? recorder.current?.stop() : void start())}
        >
          {recording ? <Square size={16} /> : <Mic size={16} />}{" "}
          {pending
            ? "Waiting for microphone…"
            : recording
              ? `Stop recording · ${elapsed}s`
              : `Record up to ${seconds} seconds`}
        </Button>
        {url && (
          <Button variant="ghost" asChild>
            <a href={url} download={`deutsch-practice.${extension}`}>
              <Download size={16} />
              Keep this recording
            </a>
          </Button>
        )}
        {url && !recording && (
          <Button
            variant="ghost"
            onClick={() => {
              if (audioUrl.current) URL.revokeObjectURL(audioUrl.current);
              audioUrl.current = "";
              setUrl("");
            }}
          >
            <Trash2 size={16} aria-hidden="true" /> Discard recording
          </Button>
        )}
      </div>
      {url && (
        <audio controls src={url} aria-label="Play your German recording" />
      )}
      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}
      <p className="muted small">
        Your recording stays in this tab. Download it to keep a copy; it is not
        uploaded.
      </p>
    </div>
  );
}
