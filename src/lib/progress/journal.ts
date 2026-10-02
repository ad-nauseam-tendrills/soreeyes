// Error Journal: plain counting over recorded attempts. No inference, no
// psychology — every sentence is a restatement of numbers the owner entered.

import { getExercise, sectionOf } from "@/content/course-data";
import { ERROR_LABELS, OPPOSITE_PAIRS } from "@/lib/labels";
import { dayKey } from "@/lib/progress/stats";
import { isGood, sortAttempts } from "@/lib/progress/engine";
import type { Attempt, CourseId, ErrorCategory } from "@/lib/types";

export interface JournalFilter {
  course?: CourseId;
  section?: string;
  skill?: ErrorCategory;
  from?: string; // YYYY-MM-DD inclusive
  to?: string; // YYYY-MM-DD inclusive
}

export function filterAttempts(attempts: Attempt[], f: JournalFilter, timeZone: string): Attempt[] {
  return attempts.filter((a) => {
    const e = getExercise(a.exerciseId);
    if (!e) return false;
    if (f.course && e.course !== f.course) return false;
    if (f.section && e.sectionId !== f.section) return false;
    if (f.skill && !a.errors.includes(f.skill)) return false;
    const day = dayKey(a.finishedAt, timeZone);
    if (f.from && day < f.from) return false;
    if (f.to && day > f.to) return false;
    return true;
  });
}

export interface CategoryCount {
  category: ErrorCategory;
  /** Attempts (in the given set) that recorded this error. */
  count: number;
}

export function categoryCounts(attempts: Attempt[]): CategoryCount[] {
  const map = new Map<ErrorCategory, number>();
  for (const a of attempts) for (const c of new Set(a.errors)) map.set(c, (map.get(c) ?? 0) + 1);
  return [...map.entries()]
    .map(([category, count]) => ({ category, count }))
    .sort((a, b) => b.count - a.count || a.category.localeCompare(b.category));
}

/** Size of the "recent attempts" window used for observations. */
export const RECENT_WINDOW = 6;

/**
 * Factual observations, e.g.
 *  "Angle errors have appeared in 4 of your last 6 attempts."
 *  "Your drawings have tended to be too large during Dilation exercises."
 */
export function observations(attempts: Attempt[]): string[] {
  const out: string[] = [];
  const sorted = sortAttempts(attempts);
  const recent = sorted.slice(-RECENT_WINDOW);

  if (recent.length >= 3) {
    for (const { category, count } of categoryCounts(recent)) {
      if (count >= 2 && category !== "other") {
        out.push(`${ERROR_LABELS[category]} errors have appeared in ${count} of your last ${recent.length} attempts.`);
      }
    }
  }

  // Directional tendencies, per section.
  const bySection = new Map<string, Attempt[]>();
  for (const a of sorted) {
    const e = getExercise(a.exerciseId)!;
    const key = `${e.course}:${e.sectionId}`;
    bySection.set(key, [...(bySection.get(key) ?? []), a]);
  }
  for (const [, list] of bySection) {
    const section = sectionOf(getExercise(list[0].exerciseId)!);
    for (const [x, y] of OPPOSITE_PAIRS) {
      const cx = list.filter((a) => a.errors.includes(x)).length;
      const cy = list.filter((a) => a.errors.includes(y)).length;
      const [hi, lo, nHi, nLo] = cx >= cy ? [x, y, cx, cy] : [y, x, cy, cx];
      if (nHi >= 3 && nHi >= 2 * nLo) {
        out.push(
          `Your drawings have tended to be ${ERROR_LABELS[hi].toLowerCase()} during ${section.title} exercises ` +
            `(${nHi}× ${ERROR_LABELS[hi].toLowerCase()}, ${nLo}× ${ERROR_LABELS[lo].toLowerCase()}).`,
        );
      }
    }
  }

  // Simple before/after comparison of the share of good attempts.
  if (sorted.length >= 10) {
    const last = sorted.slice(-5);
    const prev = sorted.slice(-10, -5);
    const g = (l: Attempt[]) => l.filter((a) => isGood(a.rating)).length;
    out.push(
      `Accurate or mostly accurate in ${g(last)} of your last 5 attempts (${g(prev)} of the 5 before that).`,
    );
  }
  return out;
}
