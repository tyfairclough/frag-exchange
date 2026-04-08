"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { MARKETING_LINK_BLUE, MARKETING_NAVY } from "@/components/marketing/marketing-chrome";

const MS_MIN = 60 * 1000;
const MS_HOUR = 60 * MS_MIN;
const MS_DAY = 24 * MS_HOUR;

function sameLocalCalendarDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function deskButtonClass() {
  return "inline-flex min-h-10 items-center justify-center rounded-full px-5 text-sm font-semibold text-white transition hover:opacity-95";
}

export function EventDateHighlight({
  eventAtIso,
  formattedDate,
  eventDeskHref,
  showEventDeskLink,
  eventPickupHref,
}: {
  eventAtIso: string;
  /** Server-rendered label so the date line is stable before hydration. */
  formattedDate: string;
  eventDeskHref: string;
  showEventDeskLink: boolean;
  eventPickupHref?: string;
}) {
  const [nowMs, setNowMs] = useState(0);

  useEffect(() => {
    const id = window.setInterval(() => setNowMs(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, []);

  const eventAt = useMemo(() => new Date(eventAtIso), [eventAtIso]);
  const T = eventAt.getTime();
  const after24h = T + MS_DAY;

  const phase = useMemo(() => {
    if (nowMs === 0 || Number.isNaN(T)) {
      return "hydrating" as const;
    }
    if (nowMs >= after24h) {
      return "finished" as const;
    }
    const nowDate = new Date(nowMs);
    if (sameLocalCalendarDay(nowDate, eventAt)) {
      return "eventDay" as const;
    }
    if (nowMs < T) {
      return "countdown" as const;
    }
    return "wrapUp" as const;
  }, [nowMs, T, after24h, eventAt]);

  const countdownParts = useMemo(() => {
    if (phase !== "countdown") {
      return null;
    }
    const diff = Math.max(0, T - nowMs);
    const days = Math.floor(diff / MS_DAY);
    const hours = Math.floor((diff % MS_DAY) / MS_HOUR);
    const minutes = Math.floor((diff % MS_HOUR) / MS_MIN);
    return { days, hours, minutes };
  }, [phase, T, nowMs]);

  return (
    <div
      className="rounded-2xl border-2 bg-gradient-to-br from-sky-50 via-white to-indigo-50/80 px-4 py-4 shadow-sm sm:px-5 sm:py-5"
      style={{ borderColor: `${MARKETING_NAVY}40` }}
    >
      <p className="text-xs font-bold uppercase tracking-wider text-sky-800/90">Event date</p>
      <p className="mt-1 text-lg font-bold tracking-tight sm:text-xl" style={{ color: MARKETING_NAVY }}>
        <time dateTime={eventAtIso}>{formattedDate}</time>
      </p>

      {phase === "hydrating" ? (
        <p className="mt-3 text-sm text-slate-600">Preparing countdown…</p>
      ) : null}

      {phase === "countdown" && countdownParts ? (
        <div className="mt-4 space-y-2" aria-live="polite">
          <p className="text-sm font-semibold text-slate-700">Time until go-time</p>
          <div className="flex flex-wrap gap-2 sm:gap-3">
            {[
              { label: "Days", value: countdownParts.days },
              { label: "Hours", value: countdownParts.hours },
              { label: "Minutes", value: countdownParts.minutes },
            ].map(({ label, value }) => (
              <div
                key={label}
                className="flex min-w-[4.5rem] flex-col rounded-xl border border-slate-200/80 bg-white/90 px-3 py-2 text-center shadow-sm"
              >
                <span className="text-2xl font-bold tabular-nums leading-none" style={{ color: MARKETING_NAVY }}>
                  {value}
                </span>
                <span className="mt-1 text-[0.65rem] font-semibold uppercase tracking-wide text-slate-500">
                  {label}
                </span>
              </div>
            ))}
            {eventPickupHref ? (
              <Link
                href={eventPickupHref}
                className="ml-auto inline-flex min-h-10 items-center rounded-full border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:border-slate-400 hover:bg-slate-100"
              >
                Event pickup
              </Link>
            ) : null}
          </div>
        </div>
      ) : null}

      {phase === "eventDay" ? (
        <div className="mt-4 space-y-3">
          <p className="text-base font-semibold text-emerald-900">The big day is finally here</p>
          {showEventDeskLink ? (
            <Link href={eventDeskHref} className={deskButtonClass()} style={{ backgroundColor: MARKETING_LINK_BLUE }}>
              Event desk
            </Link>
          ) : null}
        </div>
      ) : null}

      {phase === "wrapUp" ? (
        <div className="mt-4 space-y-3">
          <p className="text-sm font-medium text-slate-700">The swap day has ended — desk stays open for handoffs.</p>
          {showEventDeskLink ? (
            <Link href={eventDeskHref} className={deskButtonClass()} style={{ backgroundColor: MARKETING_LINK_BLUE }}>
              Event desk
            </Link>
          ) : null}
        </div>
      ) : null}

      {phase === "finished" ? (
        <div className="mt-4 space-y-3">
          <p className="text-base font-semibold text-slate-800">This event is finished</p>
          {showEventDeskLink ? (
            <Link href={eventDeskHref} className={deskButtonClass()} style={{ backgroundColor: MARKETING_LINK_BLUE }}>
              Reconciliation — follow up
            </Link>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
