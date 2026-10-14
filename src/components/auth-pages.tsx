"use client";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, BookOpen, CalendarDays, Cloud } from "lucide-react";
import { updateState } from "@/lib/store";
import { destinations } from "@/lib/destinations";
import type { AuthDestination } from "@/lib/auth-navigation";
import { useApp } from "./learning-app";
import { CloudAccount } from "./cloud-account";
import { Button } from "./ui/button";

function completeWelcome() {
  updateState((state) => ({ ...state, onboardingComplete: true }));
}

export function AuthPage({
  mode,
  returnTo = "/",
  oauthFailed = false,
}: {
  mode: "signup" | "signin";
  returnTo?: AuthDestination;
  oauthFailed?: boolean;
}) {
  const { cloudEnabled } = useApp();
  const router = useRouter();
  const destination = destinations[0];
  function continueJourney() {
    completeWelcome();
    router.replace(returnTo);
  }
  return (
    <section className="welcome-layout" aria-labelledby="welcome-title">
      <div className="welcome-story">
        <span className="eyebrow">GERMAN FOR THE LIFE YOU WANT</span>
        <h1 id="welcome-title">
          {mode === "signup"
            ? "Your German journey starts here."
            : "Your next small step is waiting."}
        </h1>
        <p>
          {mode === "signup"
            ? "For your work, your everyday life, or your next exam. Start with a little German today and build a journey that feels like you."
            : "Welcome back. Bring your words, your study plan, and your Germany dream with you."}
        </p>
        <figure className="welcome-photo">
          <Image
            src={destination.image}
            alt={destination.alt}
            width={1200}
            height={800}
            priority
            sizes="(max-width: 1000px) 90vw, 45vw"
          />
          <figcaption>
            <span>
              {destination.name} · {destination.landmark}
            </span>
            <strong lang="de">Jeden Tag ein kleiner Schritt.</strong>
            <small>A small step every day.</small>
          </figcaption>
        </figure>
        <div className="welcome-benefits">
          <span>
            <BookOpen size={17} />
            Practise German for your own life
          </span>
          <span>
            <CalendarDays size={17} />
            Make a study rhythm you can keep
          </span>
          <span>
            <Cloud size={17} />
            Save your progress across devices
          </span>
        </div>
        <Link
          href="/inspiration#photo-credits"
          className="welcome-photo-credit"
        >
          Photo credits
        </Link>
      </div>
      <div className="panel welcome-account">
        {cloudEnabled ? (
          <CloudAccount
            standalone
            returnTo={returnTo}
            oauthFailed={oauthFailed}
            onAuthenticated={continueJourney}
          />
        ) : (
          <>
            <h2>Start learning today</h2>
            <p className="muted">
              Accounts are not available here yet. You can keep your German
              journey in this browser.
            </p>
          </>
        )}
        <div className="welcome-guest">
          <Button variant="outline" onClick={continueJourney}>
            Continue without an account
            <ArrowRight size={16} />
          </Button>
          <p className="muted small">
            Guest progress stays in this browser. You can continue with Google
            later in Preferences.
          </p>
        </div>
      </div>
    </section>
  );
}
