import { EXERCISES } from "@/content/course-data";
import type { Attempt, ErrorCategory, Rating } from "@/lib/types";

export const T0 = Date.parse("2026-01-01T15:00:00Z");
export const DAY = 86_400_000;

let seq = 0;
export function mk(exerciseId: string, day: number, rating: Rating, errors: ErrorCategory[] = [], notes = ""): Attempt {
  const finished = T0 + day * DAY;
  return {
    id: `a${String(++seq).padStart(5, "0")}`,
    exerciseId,
    startedAt: new Date(finished - 20 * 60_000).toISOString(),
    finishedAt: new Date(finished).toISOString(),
    durationSec: 20 * 60,
    rating,
    errors,
    notes,
  };
}

export const at = (day: number) => new Date(T0 + day * DAY);

/** Two good attempts on every gating AAE exercise → all proficient. */
export function aaeAllProficient(startDay = 0): Attempt[] {
  const out: Attempt[] = [];
  EXERCISES.filter((e) => e.course === "aae" && e.gating).forEach((e, i) => {
    out.push(mk(e.id, startDay + i, "accurate"), mk(e.id, startDay + i + 0.1, "mostly"));
  });
  return out;
}
