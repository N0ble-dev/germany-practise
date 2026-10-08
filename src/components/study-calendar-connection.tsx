"use client";
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  Bell,
  CalendarCheck,
  Download,
  ExternalLink,
  Link2,
  RefreshCw,
  Unplug,
} from "lucide-react";
import { authClient } from "@/lib/auth-client";
import { calendarFile, dayInZone } from "@/lib/planner-calendar";
import type { StudySession } from "@/lib/planner-model";
import { updateState } from "@/lib/store";
import { usePlannerClock } from "@/lib/use-planner-clock";
import { useApp } from "./learning-app";
import { Button } from "./ui/button";
import { Dialog } from "./ui/dialog";

type Connection = {
  configured: boolean;
  signedIn: boolean;
  connected: boolean;
  revision: number;
  syncedAt: string | null;
  syncedSessionIds: string[];
};
function GoogleConnection({ sessions }: { sessions: StudySession[] }) {
  const { data: session, isPending, error } = authClient.useSession();
  if (isPending) return <p className="muted">Checking your account…</p>;
  if (error)
    return (
      <p role="alert" className="form-error">
        Your account service could not connect. You can still export your plan
        below.
      </p>
    );
  return (
    <GoogleControls key={session?.user.id ?? "local"} sessions={sessions} />
  );
}
function GoogleControls({ sessions }: { sessions: StudySession[] }) {
  const { notify } = useApp();
  const [connection, setConnection] = useState<Connection | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [disconnect, setDisconnect] = useState(false);
  const load = useCallback(async (signal?: AbortSignal) => {
    const response = await fetch("/api/calendar/google", {
      cache: "no-store",
      signal,
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error);
    return data as Connection;
  }, []);
  useEffect(() => {
    const controller = new AbortController();
    load(controller.signal)
      .then(setConnection)
      .catch((e) => {
        if (!controller.signal.aborted) setError(e.message);
      });
    return () => controller.abort();
  }, [load]);
  async function connect() {
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/calendar/google/connect", {
        method: "POST",
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      window.location.assign(data.url);
    } catch (e) {
      setError((e as Error).message);
      setBusy(false);
    }
  }
  async function sync() {
    if (!connection) return;
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/calendar/google/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessions, revision: connection.revision }),
      });
      const data = await response.json();
      setConnection(await load());
      if (!response.ok) throw new Error(data.error);
      notify("Your study plan and reminders are synced to Google Calendar.");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function removeConnection() {
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/calendar/google", {
        method: "DELETE",
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      setConnection(await load());
      setDisconnect(false);
      notify(
        "Google Calendar disconnected. Existing events remain in your calendar.",
      );
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="google-calendar-controls">
      {connection?.connected ? (
        <>
          <span className="calendar-connected">
            <CalendarCheck size={17} />
            Google Calendar connected
          </span>
          <p className="muted">
            Your sessions go into a separate <strong>Deutsch Journey</strong>{" "}
            calendar. Sync after adding, editing, or removing sessions. Google
            Calendar sends the reminders, even when this app is closed.
          </p>
          <div className="button-row">
            <Button
              disabled={busy || !connection.configured}
              onClick={() => void sync()}
            >
              <RefreshCw size={16} />
              {busy ? "Updating calendar…" : "Sync my study plan"}
            </Button>
            <Button
              disabled={busy}
              variant="ghost"
              onClick={() => setDisconnect(true)}
            >
              <Unplug size={16} />
              Disconnect
            </Button>
            <Button asChild variant="outline">
              <a
                href="https://calendar.google.com/calendar/u/0/r"
                target="_blank"
                rel="noreferrer"
              >
                Open Google Calendar
                <ExternalLink size={14} />
              </a>
            </Button>
          </div>
          {connection.syncedAt && (
            <p className="muted small">
              Last synced {new Date(connection.syncedAt).toLocaleString()} ·{" "}
              {connection.syncedSessionIds.length} sessions
            </p>
          )}
        </>
      ) : (
        <>
          <p className="muted">
            Connect Google Calendar to send this plan to its own study calendar
            with your chosen reminder times. Google sign-in identifies you; this
            separate step asks for calendar permission. Choose the same Google
            account to keep your learning and reminders together.
          </p>
          {!connection ? (
            <p className="muted small">Checking the calendar connection…</p>
          ) : !connection.configured ? (
            <>
              <Button disabled variant="outline">
                <Link2 size={16} />
                Connect Google Calendar
              </Button>
              <p className="muted small">
                Direct Google connection is not available yet. You can download
                and import your plan below.
              </p>
            </>
          ) : !connection.signedIn ? (
            <Button asChild>
              <Link href="/signin?next=%2Fplanner">
                Sign in to connect Google Calendar
              </Link>
            </Button>
          ) : (
            <Button disabled={busy} onClick={() => void connect()}>
              <Link2 size={16} />
              {busy ? "Opening Google…" : "Connect Google Calendar"}
            </Button>
          )}
        </>
      )}
      {error && (
        <div role="alert" className="form-error">
          <p>{error}</p>
          {!connection && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setError("");
                void load()
                  .then(setConnection)
                  .catch((e) => setError(e.message));
              }}
            >
              Check connection again
            </Button>
          )}
        </div>
      )}
      <Dialog
        open={disconnect}
        onOpenChange={setDisconnect}
        title="Disconnect Google Calendar?"
        description="This stops syncing from Deutsch Journey. Events and reminders already in Google Calendar stay there. Remove the study calendar in Google if you want to remove those reminders too."
      >
        <div className="button-row">
          <Button
            variant="outline"
            disabled={busy}
            onClick={() => setDisconnect(false)}
          >
            Keep connected
          </Button>
          <Button
            variant="destructive"
            disabled={busy}
            onClick={() => void removeConnection()}
          >
            Disconnect calendar
          </Button>
        </div>
      </Dialog>
    </div>
  );
}
export function StudyCalendarConnection({
  month,
  timeZone,
}: {
  month: string;
  timeZone: string;
}) {
  const now = usePlannerClock();
  const { state, notify, cloudEnabled } = useApp();
  const [range, setRange] = useState("upcoming");
  const provider = state.planner.calendar;
  const names = {
    google: "Google Calendar",
    apple: "Apple Calendar",
    outlook: "Outlook Calendar",
  };
  const exportSessions = state.planner.sessions.filter(
    (s) =>
      s.status !== "skipped" &&
      (range === "month"
        ? dayInZone(s.startsAt, timeZone).startsWith(month)
        : s.status === "planned" && new Date(s.startsAt).getTime() >= now),
  );
  function download() {
    if (!exportSessions.length) {
      notify("Add an upcoming study session before exporting.");
      return;
    }
    const url = URL.createObjectURL(
      new Blob([calendarFile(exportSessions, window.location.origin)], {
        type: "text/calendar;charset=utf-8",
      }),
    );
    const link = document.createElement("a");
    link.href = url;
    link.download = "deutsch-study-plan.ics";
    document.body.append(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    notify(
      "Study calendar downloaded. Import it and check your calendar’s reminder settings.",
    );
  }
  return (
    <section
      className="panel calendar-reminders"
      id="calendar-reminders"
      aria-labelledby="calendar-reminder-heading"
    >
      <div className="section-heading">
        <div>
          <span className="eyebrow">LET YOUR CALENDAR NUDGE YOU</span>
          <h2 id="calendar-reminder-heading">Take your plan with you.</h2>
          <p>Choose your calendar, then connect or import your sessions.</p>
        </div>
        <span className="plan-header-icon">
          <Bell size={23} />
        </span>
      </div>
      <div
        className="calendar-provider-options"
        role="group"
        aria-label="My calendar app"
      >
        {(Object.keys(names) as Array<keyof typeof names>).map((id) => (
          <Button
            key={id}
            variant={provider === id ? "secondary" : "outline"}
            aria-pressed={provider === id}
            onClick={() =>
              updateState((s) => ({
                ...s,
                planner: { ...s.planner, calendar: id },
              }))
            }
          >
            {names[id]}
          </Button>
        ))}
      </div>
      {provider === "google" &&
        (cloudEnabled ? (
          <GoogleConnection sessions={state.planner.sessions} />
        ) : (
          <p className="muted">
            Direct Google connection needs a signed-in account. Calendar-file
            export works with your local plan.
          </p>
        ))}
      <div className="calendar-export-row">
        <div>
          <h3>Import into {names[provider]}</h3>
          <p className="muted small">
            A calendar file includes your session times and reminder requests.
          </p>
        </div>
        <label>
          Sessions to export
          <select
            aria-label="Sessions to export"
            value={range}
            onChange={(e) => setRange(e.target.value)}
          >
            <option value="upcoming">Upcoming planned sessions</option>
            <option value="month">Sessions in the viewed month</option>
          </select>
        </label>
        <Button
          variant="outline"
          disabled={!exportSessions.length}
          onClick={download}
        >
          <Download size={16} />
          Download calendar file
        </Button>
      </div>
      <p className="calendar-import-help">
        {provider === "google"
          ? "In Google Calendar on a computer, open Settings → Import & export, choose the downloaded file, and select your study calendar."
          : provider === "apple"
            ? "Open the downloaded file in Apple Calendar, or use File → Import on a Mac, and choose a calendar for your study sessions."
            : "In Outlook on the web, open Calendar → Add calendar → Upload from file, choose the downloaded file, and select your study calendar."}
      </p>
      <p className="muted small">
        File export copies this plan; it does not keep calendars in sync. Check
        reminders and notification permissions in your calendar after importing.
        Your calendar controls how alerts appear.
      </p>
    </section>
  );
}
