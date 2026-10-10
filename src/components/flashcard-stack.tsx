"use client";

import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import { BookOpen } from "lucide-react";
import CardSwap, { Card, type CardSwapHandle } from "./CardSwap";

function subscribeMotion(onChange: () => void) {
  const media = window.matchMedia("(prefers-reduced-motion: reduce)");
  media.addEventListener("change", onChange);
  return () => media.removeEventListener("change", onChange);
}

export interface FlashcardStackHandle {
  next: () => void;
}

export const FlashcardStack = forwardRef<
  FlashcardStackHandle,
  { children: ReactNode; theme: "light" | "dark" }
>(function FlashcardStack({ children, theme }, ref) {
  const stageRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const swapRef = useRef<CardSwapHandle>(null);
  const [front, setFront] = useState(0);
  const [width, setWidth] = useState(240);
  const [height, setHeight] = useState(365);
  const reducedMotion = useSyncExternalStore(
    subscribeMotion,
    () => window.matchMedia("(prefers-reduced-motion: reduce)").matches,
    () => false,
  );

  useImperativeHandle(
    ref,
    () => ({
      next: () => {
        if (!reducedMotion) swapRef.current?.next();
      },
    }),
    [reducedMotion],
  );

  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;
    const observer = new ResizeObserver(([entry]) =>
      setWidth(Math.max(180, Math.floor(entry.contentRect.width) - 44)),
    );
    observer.observe(stage);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const content = contentRef.current;
    if (!content) return;
    const observer = new ResizeObserver(([entry]) =>
      setHeight(Math.max(365, Math.ceil(entry.contentRect.height))),
    );
    observer.observe(content);
    return () => observer.disconnect();
  }, [front]);

  return (
    <div
      className="review-swap-stage"
      ref={stageRef}
      style={{ height: height + 70 }}
    >
      <CardSwap
        ref={swapRef}
        width={width}
        height={height}
        cardDistance={12}
        verticalDistance={20}
        depth={35}
        skewAmount={0}
        visibleCards={3}
        padding={8}
        autoplay={false}
        draggable={false}
        navigation={false}
        parallax={0}
        hoverSpread={0}
        bounce={0.15}
        intro={false}
        theme={theme}
        onChange={setFront}
      >
        {[0, 1, 2].map((slot) => (
          <Card
            key={slot}
            aria-hidden={slot !== front}
            inert={slot !== front || undefined}
            customClass={
              slot === front ? "review-current-card" : "review-card-back"
            }
            style={{
              background: slot === front ? "var(--surface)" : "var(--lavender)",
            }}
          >
            {slot === front ? (
              <div className="review-swap-content" ref={contentRef}>
                {children}
              </div>
            ) : (
              <div className="review-card-back-design">
                <BookOpen size={38} />
                <span>Deutsch Journey</span>
                <small>A little German, every day.</small>
              </div>
            )}
          </Card>
        ))}
      </CardSwap>
    </div>
  );
});
