"use client";
import { useEffect, useId, useRef, useState, type PointerEvent } from "react";
import { RotateCcw, Trash2 } from "lucide-react";
import { Button } from "./ui/button";
import type { SignatureDrawing } from "@/lib/community-model";
type Point = SignatureDrawing["strokes"][number][number];
export function signaturePath(points: Point[], aspectRatio: number) {
  return points
    .map(
      (point, i) =>
        `${i ? "L" : "M"}${(point.x * aspectRatio * 180).toFixed(2)},${(point.y * 180).toFixed(2)}`,
    )
    .join(" ");
}
export function SignatureInk({ drawing }: { drawing: SignatureDrawing }) {
  return (
    <svg
      className="signature-ink"
      viewBox={`0 0 ${drawing.aspectRatio * 180} 180`}
      role="img"
      aria-label="Drawn signature"
    >
      {drawing.strokes.map((stroke, index) => (
        <path key={index} d={signaturePath(stroke, drawing.aspectRatio)} />
      ))}
    </svg>
  );
}
export function SignaturePad({
  value,
  onChange,
  disabled = false,
}: {
  value: SignatureDrawing | null;
  onChange: (value: SignatureDrawing | null) => void;
  disabled?: boolean;
}) {
  const helpId = useId(),
    active = useRef<number | null>(null),
    points = useRef<Point[]>([]),
    frame = useRef<number | null>(null),
    bounds = useRef<DOMRect | null>(null),
    ratio = useRef(3);
  const [stroke, setStroke] = useState<Point[]>([]),
    [notice, setNotice] = useState("");
  useEffect(
    () => () => {
      if (frame.current !== null) cancelAnimationFrame(frame.current);
    },
    [],
  );
  const aspectRatio = value?.aspectRatio || 3;
  const total =
    value?.strokes.reduce((count, line) => count + line.length, 0) || 0;
  function pointAt(event: PointerEvent<SVGSVGElement>): Point {
    const box = bounds.current!;
    const clamp = (value: number) =>
      Math.round(Math.min(1, Math.max(0, value)) * 10000) / 10000;
    return {
      x: clamp((event.clientX - box.left) / box.width),
      y: clamp((event.clientY - box.top) / box.height),
    };
  }
  function finish(event: PointerEvent<SVGSVGElement>) {
    if (active.current !== event.pointerId) return;
    if (frame.current !== null) {
      cancelAnimationFrame(frame.current);
      frame.current = null;
    }
    if (points.current.length >= 2)
      onChange({
        aspectRatio: ratio.current,
        strokes: [...(value?.strokes || []), points.current],
      });
    active.current = null;
    points.current = [];
    setStroke([]);
    if (event.currentTarget.hasPointerCapture(event.pointerId))
      event.currentTarget.releasePointerCapture(event.pointerId);
  }
  return (
    <div className="signature-pad-group">
      <div className="signature-pad-heading">
        <strong>Signature</strong>
        <div>
          <Button
            type="button"
            variant="ghost"
            disabled={disabled || !value}
            onClick={() => {
              const lines = value?.strokes.slice(0, -1) || [];
              onChange(lines.length ? { ...value!, strokes: lines } : null);
              setNotice("");
            }}
          >
            <RotateCcw size={15} aria-hidden="true" /> Undo
          </Button>
          <Button
            type="button"
            variant="ghost"
            disabled={disabled || !value}
            onClick={() => {
              onChange(null);
              setNotice("");
            }}
          >
            <Trash2 size={15} aria-hidden="true" /> Clear
          </Button>
        </div>
      </div>
      <div className={`signature-pad ${disabled ? "is-disabled" : ""}`}>
        {!value && !stroke.length && (
          <span className="signature-pad-placeholder" aria-hidden="true">
            Draw your signature here
          </span>
        )}
        <svg
          viewBox={`0 0 ${aspectRatio * 180} 180`}
          preserveAspectRatio="none"
          role="img"
          aria-label="Signature drawing pad"
          aria-describedby={helpId}
          onPointerDown={(event) => {
            if (disabled || active.current !== null || event.button !== 0)
              return;
            if ((value?.strokes.length || 0) >= 40 || total >= 2000) {
              setNotice(
                "Your signature is full. Undo a stroke or clear it to draw again.",
              );
              return;
            }
            event.preventDefault();
            bounds.current = event.currentTarget.getBoundingClientRect();
            ratio.current =
              value?.aspectRatio ||
              Math.min(
                8,
                Math.max(0.8, bounds.current.width / bounds.current.height),
              );
            active.current = event.pointerId;
            event.currentTarget.setPointerCapture(event.pointerId);
            points.current = [pointAt(event)];
            setStroke(points.current);
            setNotice("");
          }}
          onPointerMove={(event) => {
            if (active.current !== event.pointerId || disabled) return;
            if (
              points.current.length >= 1000 ||
              total + points.current.length >= 2000
            ) {
              setNotice(
                "Lift your pointer to finish this stroke. Undo or clear if you need more room.",
              );
              return;
            }
            const next = pointAt(event),
              previous = points.current.at(-1)!;
            if (Math.hypot(next.x - previous.x, next.y - previous.y) < 0.002)
              return;
            points.current.push(next);
            if (frame.current === null)
              frame.current = requestAnimationFrame(() => {
                setStroke([...points.current]);
                frame.current = null;
              });
          }}
          onPointerUp={finish}
          onPointerCancel={finish}
          onLostPointerCapture={(event) => {
            if (active.current === event.pointerId) finish(event);
          }}
        >
          {value?.strokes.map((line, index) => (
            <path key={index} d={signaturePath(line, aspectRatio)} />
          ))}
          {stroke.length > 0 && <path d={signaturePath(stroke, aspectRatio)} />}
        </svg>
      </div>
      <p id={helpId} className="muted small">
        Draw with your mouse, finger or pen. You can also choose a name style.
      </p>
      {notice && (
        <p role="status" className="muted small">
          {notice}
        </p>
      )}
    </div>
  );
}
