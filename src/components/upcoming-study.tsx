"use client";
import Link from "next/link";
import { CalendarDays, ChevronRight, Clock3 } from "lucide-react";
import { useApp } from "./learning-app";
import { studyHref } from "@/lib/planner-model";
import { dayInZone, timeInZone } from "@/lib/planner-calendar";
import { usePlannerClock } from "@/lib/use-planner-clock";
function calendarDate(day: string, options: Intl.DateTimeFormatOptions) {
  return new Date(`${day}T12:00:00Z`).toLocaleDateString("en", {
    ...options,
    timeZone: "UTC",
  });
}
export function UpcomingStudy() {
  const now = usePlannerClock();
  const { state } = useApp();
  const zone =
    state.planner.timeZone || Intl.DateTimeFormat().resolvedOptions().timeZone;
  const next = state.planner.sessions
    .filter(
      (s) => s.status === "planned" && new Date(s.startsAt).getTime() >= now,
    )
    .sort((a, b) => a.startsAt.localeCompare(b.startsAt))
    .slice(0, 2);
  return (
    <section className="panel upcoming-study">
      <div className="section-heading">
        <h2>Next on your study calendar</h2>
        <Link href="/planner" className="text-link">
          Open my planner
          <ChevronRight size={14} />
        </Link>
      </div>
      {next.length ? (
        <div>
          {next.map((s) => (
            <Link
              className="upcoming-study-session"
              key={s.id}
              href={studyHref(s)}
            >
              <span className="plan-header-icon">
                <CalendarDays size={19} />
              </span>
              <span>
                <strong>{s.title}</strong>
                <small>
                  {calendarDate(dayInZone(s.startsAt, zone), {
                    weekday: "short",
                    month: "short",
                    day: "numeric",
                  })}{" "}
                  · {timeInZone(s.startsAt, zone)} · {s.duration} min
                </small>
              </span>
              <ChevronRight size={16} />
            </Link>
          ))}
        </div>
      ) : (
        <p className="muted">
          Give your next small step a time.{" "}
          <Link href="/planner">Plan a study session.</Link>
        </p>
      )}
      <p className="muted small">
        <Clock3 size={12} /> Times shown in {zone}
      </p>
    </section>
  );
}
