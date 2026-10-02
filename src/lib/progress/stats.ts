// Practice statistics. Quiet by design: streaks are reported, never "lost".

import type { Attempt } from "@/lib/types";

/** YYYY-MM-DD for an instant in the given IANA time zone. */
export function dayKey(d: Date | string, timeZone: string): string {
  const date = typeof d === "string" ? new Date(d) : d;
  return new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" }).format(date);
}

function previousDay(key: string): string {
  const [y, m, d] = key.split("-").map(Number);
  const t = new Date(Date.UTC(y, m - 1, d) - 86_400_000);
  return t.toISOString().slice(0, 10);
}

/**
 * Consecutive practice days ending today — or yesterday, so a streak isn't
 * shown as broken before the day is over.
 */
export function currentStreak(attempts: Attempt[], now: Date, timeZone: string): number {
  const days = new Set(attempts.map((a) => dayKey(a.finishedAt, timeZone)));
  let key = dayKey(now, timeZone);
  if (!days.has(key)) key = previousDay(key);
  let n = 0;
  while (days.has(key)) {
    n += 1;
    key = previousDay(key);
  }
  return n;
}

/** A new session starts when there's more than this gap between attempts. */
export const SESSION_GAP_MINUTES = 90;

export function countSessions(attempts: Attempt[]): number {
  const sorted = [...attempts].sort((a, b) => Date.parse(a.startedAt) - Date.parse(b.startedAt));
  let sessions = 0;
  let lastEnd = -Infinity;
  for (const a of sorted) {
    if (Date.parse(a.startedAt) - lastEnd > SESSION_GAP_MINUTES * 60_000) sessions += 1;
    lastEnd = Math.max(lastEnd, Date.parse(a.finishedAt));
  }
  return sessions;
}

export function minutesPracticed(attempts: Attempt[]): number {
  return Math.round(attempts.reduce((s, a) => s + Math.max(0, a.durationSec), 0) / 60);
}

export function practiceDays(attempts: Attempt[], timeZone: string): number {
  return new Set(attempts.map((a) => dayKey(a.finishedAt, timeZone))).size;
}
