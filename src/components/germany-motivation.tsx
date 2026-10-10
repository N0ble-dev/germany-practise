"use client";
import { useState } from "react";
import Image from "next/image";
import dynamic from "next/dynamic";
import Link from "next/link";
import {
  ArrowRight,
  Camera,
  Check,
  Compass,
  Heart,
  MapPin,
  Volume2,
  Sunrise,
} from "lucide-react";
import { useApp } from "./learning-app";
import { Button } from "./ui/button";
import {
  destinations,
  getDestination,
  type Destination,
} from "@/lib/destinations";
import { defaultWhy, motivationForToday } from "@/lib/motivation";
import { updateState } from "@/lib/store";
import { speakGerman } from "@/lib/speech";

const GermanyPhotoDeck = dynamic(() => import("./germany-photo-deck"));

function DestinationPhoto({
  destination,
  eager = false,
  sizes,
}: {
  destination: Destination;
  eager?: boolean;
  sizes: string;
}) {
  const [failed, setFailed] = useState(false);
  return (
    <div className="dream-photo">
      {failed ? (
        <div
          className="dream-photo-fallback"
          role="img"
          aria-label={destination.alt}
        >
          <MapPin size={32} />
          <strong>{destination.name}</strong>
          <span>The photo is unavailable. Your next step is still here.</span>
        </div>
      ) : (
        <Image
          src={destination.image}
          alt={destination.alt}
          fill
          sizes={sizes}
          loading={eager ? "eager" : "lazy"}
          fetchPriority={eager ? "high" : "auto"}
          className={`dream-image photo-${destination.id}`}
          onError={() => setFailed(true)}
        />
      )}
    </div>
  );
}
export function GermanyMotivation({ compact = false }: { compact?: boolean }) {
  const { state, notify } = useApp();
  const place = getDestination(state.motivation.destination);
  const today = motivationForToday(state);
  return (
    <section
      className={`germany-reminder ${compact ? "reminder-compact" : ""}`}
      aria-label="My daily Germany reminder"
    >
      {compact ? (
        <figure className="reminder-photo">
          <DestinationPhoto
            key={place.id}
            destination={place}
            eager
            sizes={
              compact
                ? "(max-width: 600px) 100vw, (max-width: 1000px) 45vw, 360px"
                : "(max-width: 760px) 100vw, 60vw"
            }
          />
          <span className="dream-stamp">
            <Compass size={14} />
            Someday, my everyday.
          </span>
          <figcaption>
            <span>
              <MapPin size={14} />
              {place.name} · {place.landmark}
            </span>
            <Link
              href="/inspiration#photo-credits"
              className="photo-credit-link"
            >
              Photo credits
              <Camera size={13} />
            </Link>
          </figcaption>
        </figure>
      ) : (
        <GermanyPhotoDeck key={place.id} destination={place} />
      )}
      <div className="reminder-copy">
        <span className="eyebrow">THE LIFE YOU’RE LEARNING FOR</span>
        <h2>
          A little German today.
          <br />A place in your future.
        </h2>
        <p className="my-dream-reason">{state.motivation.why || defaultWhy}</p>
        <div className="daily-encouragement">
          <strong lang="de">{today.encouragement.german}</strong>
          <span>{today.encouragement.english}</span>
          {state.language === "ar" && (
            <span dir="rtl" lang="ar">
              {today.encouragement.arabic}
            </span>
          )}
          <Button
            variant="ghost"
            size="icon"
            aria-label="Hear today's encouragement in German"
            onClick={() =>
              speakGerman(today.encouragement.german).catch((e) =>
                notify(e.message),
              )
            }
          >
            <Volume2 size={16} />
          </Button>
        </div>
        <p className="gentle-reminder">
          {today.practiced
            ? "You showed up for your German today. That small step counts."
            : today.encouragement.reminder}
        </p>
        <div
          className={`dream-study-status ${today.practiced ? "has-practiced" : ""}`}
        >
          {today.practiced ? <Check size={15} /> : <Sunrise size={15} />}
          <span>
            {today.practiced
              ? "You practiced today"
              : "Your next small step is waiting"}
          </span>
        </div>
        <div className="reminder-actions">
          <Button asChild>
            <Link href={`/lessons/${state.currentLesson}`}>
              {today.practiced
                ? "Keep my German moving"
                : "Take a small step today"}
              <ArrowRight size={16} />
            </Link>
          </Button>
          <Link
            href={compact ? "/inspiration" : "#dream-gallery-title"}
            className="text-link"
          >
            {compact ? "Choose my Germany dream" : "Change my dream place"}
            <ArrowRight size={14} />
          </Link>
        </div>
      </div>
    </section>
  );
}
export function GermanyDream() {
  const { state, notify } = useApp();
  const [why, setWhy] = useState(state.motivation.why);
  const today = motivationForToday(state);
  function saveReason(e: React.FormEvent) {
    e.preventDefault();
    updateState((s) => ({
      ...s,
      motivation: { ...s.motivation, why: why.trim() },
    }));
    setWhy(why.trim());
    notify("Your reason for learning is saved. You’ll see it on Today.");
  }
  return (
    <>
      <div className="page-heading">
        <div>
          <h1>A place to picture. A reason to practice.</h1>
          <p>
            Keep the Germany you want to visit and live in close to your
            everyday learning.
          </p>
        </div>
        <span className="soft-badge">
          <Heart size={15} />
          My Germany dream
        </span>
      </div>
      <GermanyMotivation />
      <div className="dream-personal-row">
        <section className="panel dream-reason-editor">
          <div>
            <span className="eyebrow">MY REASON TO KEEP GOING</span>
            <h2>What are you learning for?</h2>
            <p className="muted">
              A new home, new friends, work, or a place you want to see. Make
              the reminder sound like you.
            </p>
          </div>
          <form onSubmit={saveReason}>
            <label>
              My reason for learning German
              <textarea
                maxLength={280}
                rows={3}
                value={why}
                onChange={(e) => setWhy(e.target.value)}
                placeholder={defaultWhy}
              />
            </label>
            <div className="dream-reason-footer">
              <span className="muted small">
                {why.length}/280 · Saved with your learning progress
              </span>
              <Button type="submit" size="sm">
                Save my reason
              </Button>
            </div>
          </form>
        </section>
        <aside className="panel dream-practice-note">
          <span className="eyebrow">SHOWING UP ADDS UP</span>
          <strong>{today.practiceDays}</strong>
          <span>
            {today.practiceDays === 1
              ? "day with real German practice"
              : "days with real German practice"}
          </span>
          <p className="muted">
            Choosing a picture is your reminder. Practicing words, listening,
            and speaking is how you move forward.
          </p>
          <Link className="text-link" href="/progress">
            See the steps I’ve taken
            <ArrowRight size={14} />
          </Link>
        </aside>
      </div>
      <section
        className="dream-destinations"
        aria-labelledby="dream-gallery-title"
      >
        <div className="section-heading">
          <div>
            <span className="eyebrow">KEEP A LITTLE GERMANY IN VIEW</span>
            <h2 id="dream-gallery-title">
              Which place makes you want to begin?
            </h2>
            <p>
              Choose one for your daily reminder. Practice a phrase for the life
              you picture there.
            </p>
          </div>
        </div>
        <div className="dream-gallery">
          {destinations.map((destination) => {
            const selected = state.motivation.destination === destination.id;
            return (
              <article
                key={destination.id}
                className={`dream-destination ${selected ? "chosen-destination" : ""}`}
              >
                <div className="destination-photo-wrap">
                  <DestinationPhoto
                    destination={destination}
                    sizes="(max-width: 600px) 100vw, (max-width: 1000px) 50vw, 40vw"
                  />
                  <span className="destination-region">
                    {destination.region}
                  </span>
                </div>
                <div className="destination-body">
                  <div className="destination-title">
                    <h3>{destination.name}</h3>
                    {selected && (
                      <span>
                        <Check size={13} />
                        My daily reminder
                      </span>
                    )}
                  </div>
                  <p>{destination.imaginedMoment}</p>
                  <div className="destination-phrase">
                    <div>
                      <strong lang="de">{destination.phrase}</strong>
                      <span>{destination.meaning}</span>
                      {state.language === "ar" && (
                        <span lang="ar" dir="rtl">
                          {destination.arabic}
                        </span>
                      )}
                    </div>
                    <Button
                      size="icon"
                      variant="ghost"
                      aria-label={`Hear the ${destination.name} phrase`}
                      onClick={() =>
                        speakGerman(destination.phrase).catch((e) =>
                          notify(e.message),
                        )
                      }
                    >
                      <Volume2 size={17} />
                    </Button>
                  </div>
                  <div className="destination-actions">
                    <Button
                      variant={selected ? "secondary" : "outline"}
                      aria-pressed={selected}
                      aria-label={`Choose ${destination.name} as my daily reminder`}
                      onClick={() => {
                        if (selected) return;
                        updateState((s) => ({
                          ...s,
                          motivation: {
                            ...s.motivation,
                            destination: destination.id,
                          },
                        }));
                        notify(
                          `${destination.name} is your daily reminder. Take a little German with you.`,
                        );
                      }}
                    >
                      {selected ? (
                        <>
                          <Check size={15} />
                          Chosen for Today
                        </>
                      ) : (
                        <>
                          <Heart size={15} />
                          Make this my reminder
                        </>
                      )}
                    </Button>
                    <Link href={destination.href} className="text-link">
                      {destination.practice}
                      <ArrowRight size={14} />
                    </Link>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      </section>
      <section className="dream-next-step">
        <Compass size={25} />
        <div>
          <h2>Come for the picture. Stay for one small step.</h2>
          <p>
            Review a few words, hear a sentence, or say something out loud.
            Tomorrow, come back and do a little more.
          </p>
        </div>
        <Button asChild>
          <Link href={`/lessons/${state.currentLesson}`}>
            Continue my book journey
            <ArrowRight size={16} />
          </Link>
        </Button>
      </section>
      <details id="photo-credits" className="dream-photo-credits">
        <summary>Photo credits & licenses</summary>
        <p>
          The photographs are hosted with this app. Each was resized and
          converted to WebP, and may be cropped by its display frame. Adapted
          images retain the license listed below.
        </p>
        <ul>
          {destinations.map((d) => (
            <li key={d.id}>
              <strong>{d.name}: </strong>
              {d.photographer} / Wikimedia Commons /{" "}
              <a href={d.source} target="_blank" rel="noreferrer">
                {d.title}
              </a>{" "}
              /{" "}
              <a href={d.licenseUrl} target="_blank" rel="noreferrer">
                {d.license}
              </a>
            </li>
          ))}
        </ul>
      </details>
    </>
  );
}
