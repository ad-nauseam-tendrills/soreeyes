import { sectionOf } from "@/content/course-data";
import type { Exercise } from "@/lib/types";

/** "Exercise 8", "Supplemental 3a", "Sight-Size Mini #2", "Final 1". */
export function numberLabel(e: Exercise): string {
  switch (e.type) {
    case "supplemental":
      return `Supplemental ${e.exerciseNumber}`;
    case "mini":
      return `Sight-Size ${e.exerciseNumber}`;
    case "checkpoint":
      return "Review and Test";
    default:
      return /^Final/.test(e.exerciseNumber) ? e.exerciseNumber : `Exercise ${e.exerciseNumber}`;
  }
}

/** "Exercise 8 — Angle" */
export function shortLabel(e: Exercise): string {
  return `${numberLabel(e)} — ${sectionOf(e).title}`;
}

export function minutesLabel(e: Exercise): string {
  const [a, b] = e.estimatedMinutes;
  return a === b ? `${a} min` : `${a}–${b} min`;
}

export function formatDate(iso: string, timeZone: string, opts: Intl.DateTimeFormatOptions = {}): string {
  return new Intl.DateTimeFormat("en-US", { timeZone, month: "short", day: "numeric", ...opts }).format(new Date(iso));
}

export function formatDuration(sec: number): string {
  const m = Math.round(sec / 60);
  return m < 1 ? "under a minute" : `${m} min`;
}

export function relativeDays(iso: string, now: Date): string {
  const d = Math.round((Date.parse(iso) - now.getTime()) / 86_400_000);
  if (d === 0) return "today";
  if (d === 1) return "tomorrow";
  if (d === -1) return "yesterday";
  return d > 0 ? `in ${d} days` : `${-d} days ago`;
}
