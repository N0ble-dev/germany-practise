"use client";

import dynamic from "next/dynamic";
import Image from "next/image";
import { useEffect, useState, useSyncExternalStore } from "react";
import { useApp } from "./learning-app";
import { Button } from "./ui/button";
import { createLearnerCard } from "@/lib/learner-card";

const Lanyard = dynamic(() => import("./Lanyard"), { ssr: false });
const motionQuery = "(prefers-reduced-motion: reduce)";
const subscribeMotion = (listener: () => void) => {
  const query = window.matchMedia(motionQuery);
  query.addEventListener("change", listener);
  return () => query.removeEventListener("change", listener);
};
const getMotion = () => window.matchMedia(motionQuery).matches;
const getServerMotion = () => true;

export function ProfileLanyard() {
  const { identity, state } = useApp();
  const name = identity?.name || "Guest learner";
  const photo = identity?.image;
  const accountId = identity?.id;
  const words = state.words.length,
    xp = state.xp;
  const reducedMotion = useSyncExternalStore(
    subscribeMotion,
    getMotion,
    getServerMotion,
  );
  const [view, setView] = useState<"3d" | "front" | "back">("3d");
  const [front, setFront] = useState<string | null>(null);
  useEffect(() => {
    const controller = new AbortController();
    async function prepare() {
      const initial = await createLearnerCard(
        { name, words, xp },
        controller.signal,
      );
      if (!controller.signal.aborted) setFront(initial);
      if (accountId) {
        const personalized = await createLearnerCard(
          { name, words, xp, accountId },
          controller.signal,
        );
        if (!controller.signal.aborted) setFront(personalized);
      }
    }
    prepare().catch(() => {
      // Keep the bundled card when the browser cannot prepare a texture.
    });
    return () => controller.abort();
  }, [name, photo, accountId, words, xp]);
  const currentView = view === "3d" && reducedMotion ? "front" : view;
  const frontImage = front || "/card-front.png";
  return (
    <figure
      className="learner-card-showcase"
      aria-label={`${name}'s learner card`}
    >
      <div className="learner-card-stage">
        <div className="learner-card-stage-label" aria-hidden="true">
          <span className="learner-card-dot" />
          DEUTSCH JOURNEY · A1.1
        </div>
        <div
          className={`learner-card-still ${currentView === "3d" ? "card-fallback" : ""}`}
        >
          <Image
            src={currentView === "back" ? "/card-back.png" : frontImage}
            alt={
              currentView === "back"
                ? "A small step every day. Build the life you picture in Germany."
                : `Learner card for ${name}, with ${words} words and ${xp} XP`
            }
            width={800}
            height={1125}
            unoptimized
          />
        </div>
        {currentView === "3d" && (
          <div
            className="learner-card-3d"
            aria-hidden="true"
            style={{ width: "100%", height: "600px" }}
          >
            <Lanyard
              frontImage={frontImage}
              backImage="/card-back.png"
              strapImage="/band.png"
              cardColor="#FFF9EB"
              metal="gold"
              breeze={0}
              intro={false}
            />
          </div>
        )}
      </div>
      <figcaption>
        <div
          className="learner-card-views"
          role="group"
          aria-label="Learner card view"
        >
          {(["3d", "front", "back"] as const).map((option) => (
            <Button
              key={option}
              variant={currentView === option ? "secondary" : "ghost"}
              size="sm"
              aria-pressed={currentView === option}
              disabled={option === "3d" && reducedMotion}
              onClick={() => setView(option)}
            >
              {option === "3d"
                ? "3D card"
                : option === "front"
                  ? "Front"
                  : "Back"}
            </Button>
          ))}
        </div>
        <p className="muted small">
          {reducedMotion
            ? "Motion reduced. Your learner card stays still."
            : "Drag to move. Tap to turn. Or choose a still view."}
        </p>
      </figcaption>
    </figure>
  );
}
