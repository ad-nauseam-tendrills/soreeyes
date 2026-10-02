// Print Center planning: what to print now, what's coming, which sheets to keep.

import { EXERCISES, getExercise } from "@/content/course-data";
import { assetId, requiredPrintSheets, resolveSheets } from "@/content/sheets";
import type { ExerciseProgress, TodayPlan } from "@/lib/progress/engine";
import type { Exercise, SheetRef } from "@/lib/types";

export interface PrintItem {
  exercise: Exercise;
  why: "current" | "review" | "rework" | "revisit" | "upcoming" | "supplemental";
  /** Sources, targets and setup-only keys. Never check-only keys. */
  required: SheetRef[];
  reused: { sheet: SheetRef; fromExerciseId: string }[];
  hasHiddenKey: boolean;
}

function item(e: Exercise, why: PrintItem["why"]): PrintItem {
  const s = resolveSheets(e);
  return {
    exercise: e,
    why,
    required: requiredPrintSheets(e),
    reused: s.reused,
    hasHiddenKey: s.checkKeys.length > 0,
  };
}

export interface PrintPlan {
  needed: PrintItem[];
  upcoming: PrintItem[];
  keep: { sheet: SheetRef; reusedBy: Exercise[] }[];
}

export const UPCOMING_COUNT = 3;

export function printPlan(
  progress: Map<string, ExerciseProgress>,
  plan: TodayPlan,
  printed: Record<string, string>,
): PrintPlan {
  const seen = new Set<string>();
  const needed: PrintItem[] = [];
  const add = (e: Exercise | null | undefined, why: PrintItem["why"], list = needed) => {
    if (!e || seen.has(e.id)) return;
    seen.add(e.id);
    list.push(item(e, why));
  };

  add(plan.current, "current");
  plan.reviews.forEach((e) => add(e, "review"));
  plan.rework.slice(0, 3).forEach((e) => add(e, "rework"));
  add(plan.interleave, "revisit");

  const upcoming: PrintItem[] = [];
  if (plan.current) {
    for (const sid of plan.current.supplementalExerciseIds) {
      if (progress.get(sid)?.unlocked) add(getExercise(sid), "supplemental", upcoming);
    }
    const idx = EXERCISES.indexOf(plan.current);
    const next = EXERCISES.slice(idx + 1).filter(
      (e) => e.course === plan.current!.course && e.gating && !progress.get(e.id)!.everProficient,
    );
    next.slice(0, UPCOMING_COUNT).forEach((e) => add(e, "upcoming", upcoming));
  }

  // Printed sheets that a not-yet-proficient exercise will reuse → keep them.
  const keepMap = new Map<string, { sheet: SheetRef; reusedBy: Exercise[] }>();
  for (const e of EXERCISES) {
    if (progress.get(e.id)!.everProficient) continue;
    for (const r of e.sheets.reused) {
      const id = assetId(r.sheet);
      if (!printed[id]) continue;
      const entry = keepMap.get(id) ?? { sheet: r.sheet, reusedBy: [] };
      entry.reusedBy.push(e);
      keepMap.set(id, entry);
    }
  }

  return { needed, upcoming, keep: [...keepMap.values()] };
}
