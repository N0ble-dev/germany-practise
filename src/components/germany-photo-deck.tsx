"use client";

import { useMemo, useRef, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import {
  Camera,
  ChevronLeft,
  ChevronRight,
  Compass,
  MapPin,
  Pause,
  Play,
} from "lucide-react";
import CardSwap, { type CardSwapHandle } from "./CardSwap";
import { Button } from "./ui/button";
import { useApp } from "./learning-app";
import { destinations, type Destination } from "@/lib/destinations";

function subscribeReducedMotion(onChange: () => void) {
  const query = window.matchMedia("(prefers-reduced-motion: reduce)");
  query.addEventListener("change", onChange);
  return () => query.removeEventListener("change", onChange);
}

export default function GermanyPhotoDeck({
  destination,
}: {
  destination: Destination;
}) {
  const { state } = useApp();
  const deckRef = useRef<CardSwapHandle>(null);
  const [active, setActive] = useState(0);
  const [paused, setPaused] = useState(false);
  const [focused, setFocused] = useState(false);
  const reducedMotion = useSyncExternalStore(
    subscribeReducedMotion,
    () => window.matchMedia("(prefers-reduced-motion: reduce)").matches,
    () => false,
  );
  const places = useMemo(
    () => [
      destination,
      ...destinations.filter((place) => place.id !== destination.id),
    ],
    [destination],
  );
  const items = useMemo(
    () =>
      places.map((place) => ({
        title: place.name,
        image: place.image,
        alt: place.alt,
      })),
    [places],
  );
  const place = places[active];
  const autoplay = !paused && !focused && !reducedMotion;

  return (
    <figure
      className="reminder-photo dream-card-reminder"
      aria-label="Germany destination photos"
      onFocusCapture={() => setFocused(true)}
      onBlurCapture={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget))
          setFocused(false);
      }}
    >
      <span className="dream-stamp">
        <Compass size={14} />
        Someday, my everyday.
      </span>
      <div className="dream-card-stage">
        <CardSwap
          ref={deckRef}
          items={items}
          width={420}
          height={300}
          cardDistance={24}
          verticalDistance={28}
          visibleCards={3}
          delay={4000}
          autoplay={autoplay}
          pauseOnHover={true}
          parallax={reducedMotion ? 0 : 0.35}
          bounce={reducedMotion ? 0 : 0.25}
          intro={!reducedMotion}
          theme={state.theme}
          onChange={setActive}
        />
      </div>
      <div
        className="dream-deck-controls"
        role="group"
        aria-label="Germany photo controls"
      >
        <Button
          variant="outline"
          size="icon"
          aria-label="Previous Germany photo"
          onClick={() => deckRef.current?.prev()}
        >
          <ChevronLeft size={19} />
        </Button>
        <span className="dream-deck-counter">
          {active + 1} of {places.length}
        </span>
        <Button
          variant="outline"
          size="icon"
          aria-label="Next Germany photo"
          onClick={() => deckRef.current?.next()}
        >
          <ChevronRight size={19} />
        </Button>
        {!reducedMotion && (
          <Button
            variant="outline"
            size="icon"
            aria-label={
              paused ? "Play Germany slideshow" : "Pause Germany slideshow"
            }
            aria-pressed={paused}
            onClick={() => setPaused((value) => !value)}
          >
            {paused ? <Play size={17} /> : <Pause size={17} />}
          </Button>
        )}
      </div>
      <figcaption aria-live={autoplay ? "off" : "polite"} aria-atomic="true">
        <span>
          <MapPin size={14} />
          {place.name} · {place.landmark}
        </span>
        <Link href="#photo-credits" className="photo-credit-link">
          Photo credits
          <Camera size={13} />
        </Link>
      </figcaption>
    </figure>
  );
}
