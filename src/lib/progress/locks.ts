import { getExercise } from "@/content/course-data";
import { numberLabel } from "@/lib/display";
import type { ExerciseProgress } from "@/lib/progress/engine";
import type { Exercise } from "@/lib/types";

/** Human explanation of why an exercise is locked, e.g. "opens after Exercise 7". */
export function lockReason(e: Exercise, progress: Map<string, ExerciseProgress>): string | undefined {
  const missing = e.prerequisites.filter((id) =>
    e.prerequisiteMode === "introduced" ? progress.get(id)!.attempts.length === 0 : !progress.get(id)!.everProficient,
  );
  if (missing.length === 0) {
    return e.course === "ce" ? "opens when An Accurate Eye is proficient throughout" : undefined;
  }
  const verb = e.prerequisiteMode === "introduced" ? "after starting" : "once Proficient at";
  return `opens ${verb} ${missing.map((id) => numberLabel(getExercise(id)!)).join(" and ")}`;
}
