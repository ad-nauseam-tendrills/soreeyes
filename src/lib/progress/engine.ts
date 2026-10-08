// Deterministic progress engine. Every exercise state is derived by replaying
// the attempt log — nothing derived is stored, so export/import and edits can
// never leave states inconsistent with history.

import { COURSES, EXERCISES, getCourse, getExercise } from "@/content/course-data";
import type { Attempt, CourseId, Exercise, ExerciseStatus, Rating } from "@/lib/types";

// ── Tunables (one place; documented in README) ──────────────────────────────

/** Days until each successive review after becoming Proficient. */
export const REVIEW_INTERVALS_DAYS = [3, 7, 14, 30] as const;
/** After Mastered, keep an occasional maintenance review (AAE p.89). */
export const MAINTENANCE_INTERVAL_DAYS = 60;
/** Proficient = this many good attempts among the last `window`, latest one good. */
export const PROFICIENCY = { window: 3, required: 2 } as const;
/** A review attempt up to this many days early still counts as the scheduled review. */
export const REVIEW_EARLY_GRACE_DAYS = 1;

const DAY_MS = 86_400_000;

export const isGood = (r: Rating) => r !== "rework";

export interface ExerciseProgress {
  exercise: Exercise;
  status: ExerciseStatus;
  attempts: Attempt[]; // oldest first
  lastAttempt?: Attempt;
  everProficient: boolean;
  proficientAt?: string;
  /** Successful scheduled reviews since last becoming proficient (4 → Mastered). */
  reviewStage: number;
  mastered: boolean;
  nextReviewAt?: string;
  unlocked: boolean;
}

interface Replay {
  phase: "none" | "learning" | "rework" | "proficient";
  window: Rating[];
  everProficient: boolean;
  proficientAt?: string;
  reviewStage: number;
  mastered: boolean;
  dueAt: number | null;
}

export function schedulesReviews(e: Exercise): boolean {
  return e.type === "core" || e.type === "supplemental";
}

export function reviewIntervalDays(stage: number): number {
  return stage < REVIEW_INTERVALS_DAYS.length ? REVIEW_INTERVALS_DAYS[stage] : MAINTENANCE_INTERVAL_DAYS;
}

/** Replay one exercise's attempts (any order) into its learning state. */
export function replayAttempts(e: Exercise, attempts: Attempt[]): Replay {
  const r: Replay = { phase: "none", window: [], everProficient: false, reviewStage: 0, mastered: false, dueAt: null };
  const sorted = sortAttempts(attempts);
  const reviews = schedulesReviews(e);

  for (const a of sorted) {
    const t = Date.parse(a.finishedAt);

    if (r.phase === "proficient") {
      if (a.rating === "rework") {
        // Discovering an error during review sends the exercise back to practice.
        r.phase = "rework";
        r.window = ["rework"];
        r.reviewStage = 0;
        r.mastered = false;
        r.dueAt = null;
        continue;
      }
      if (!reviews || r.dueAt === null) continue;
      const isScheduledReview = t >= r.dueAt - REVIEW_EARLY_GRACE_DAYS * DAY_MS;
      if (!isScheduledReview) continue; // extra practice: welcome, no schedule change
      if (a.rating === "accurate") {
        r.reviewStage += 1;
        if (r.reviewStage >= REVIEW_INTERVALS_DAYS.length) r.mastered = true;
      }
      // "mostly" repeats the same interval; "accurate" extends it.
      r.dueAt = t + reviewIntervalDays(r.reviewStage) * DAY_MS;
      continue;
    }

    r.window = [...r.window, a.rating].slice(-PROFICIENCY.window);
    r.phase = a.rating === "rework" ? "rework" : "learning";
    const goodCount = r.window.filter(isGood).length;
    if (isGood(a.rating) && goodCount >= PROFICIENCY.required) {
      r.phase = "proficient";
      r.everProficient = true;
      r.proficientAt = a.finishedAt;
      r.reviewStage = 0;
      r.window = [];
      r.dueAt = reviews ? t + reviewIntervalDays(0) * DAY_MS : null;
    }
  }
  return r;
}

export function sortAttempts(attempts: Attempt[]): Attempt[] {
  return [...attempts].sort(
    (a, b) => Date.parse(a.finishedAt) - Date.parse(b.finishedAt) || a.id.localeCompare(b.id),
  );
}

/** Whether the course is open. A Comparative Eye needs every AAE core exercise Proficient. */
export function isCourseUnlocked(course: CourseId, replays: Map<string, Replay>): boolean {
  if (course === "aae" || getCourse(course)?.independent) return true;
  return EXERCISES.filter((e) => e.course === "aae" && e.gating).every((e) => replays.get(e.id)?.everProficient);
}

function prerequisitesMet(e: Exercise, replays: Map<string, Replay>, attemptsBy: Map<string, Attempt[]>) {
  if (!isCourseUnlocked(e.course, replays)) return false;
  return e.prerequisites.every((p) =>
    e.prerequisiteMode === "introduced" ? (attemptsBy.get(p)?.length ?? 0) > 0 : replays.get(p)?.everProficient === true,
  );
}

/** Compute every exercise's progress at time `now`. */
export function computeProgress(attempts: Attempt[], now: Date = new Date()): Map<string, ExerciseProgress> {
  const attemptsBy = new Map<string, Attempt[]>();
  for (const a of attempts) {
    if (!getExercise(a.exerciseId)) continue; // ignore attempts for unknown exercises
    const list = attemptsBy.get(a.exerciseId) ?? [];
    list.push(a);
    attemptsBy.set(a.exerciseId, list);
  }

  const replays = new Map<string, Replay>();
  for (const e of EXERCISES) replays.set(e.id, replayAttempts(e, attemptsBy.get(e.id) ?? []));

  const out = new Map<string, ExerciseProgress>();
  const nowMs = now.getTime();
  for (const e of EXERCISES) {
    const list = sortAttempts(attemptsBy.get(e.id) ?? []);
    const r = replays.get(e.id)!;
    const unlocked = list.length > 0 || prerequisitesMet(e, replays, attemptsBy);
    let status: ExerciseStatus;
    if (list.length === 0) status = unlocked ? "NOT_STARTED" : "LOCKED";
    else if (r.phase === "rework") status = "NEEDS_REWORK";
    else if (r.phase === "learning") status = "PRACTICING";
    else if (r.dueAt !== null && nowMs >= r.dueAt) status = "REVIEW_DUE";
    else status = r.mastered ? "MASTERED" : "PROFICIENT";

    out.set(e.id, {
      exercise: e,
      status,
      attempts: list,
      lastAttempt: list[list.length - 1],
      everProficient: r.everProficient,
      proficientAt: r.proficientAt,
      reviewStage: r.reviewStage,
      mastered: r.mastered,
      nextReviewAt: r.dueAt !== null ? new Date(r.dueAt).toISOString() : undefined,
      unlocked,
    });
  }
  return out;
}

export const PROFICIENT_STATUSES: ExerciseStatus[] = ["PROFICIENT", "REVIEW_DUE", "MASTERED"];

// ── Course progress ────────────────────────────────────────────────────────

export interface CourseProgress {
  course: CourseId;
  title: string;
  unlocked: boolean;
  total: number;
  introduced: number;
  proficient: number;
  mastered: number;
  reviewsDue: number;
  needsRework: number;
  /** 0–100, weighted toward proficiency rather than raw completion. */
  weightedPercent: number;
}

/** Weight per status: introduced counts a little, proficiency most, mastery fully. */
export const PROGRESS_WEIGHTS: Record<ExerciseStatus, number> = {
  LOCKED: 0,
  NOT_STARTED: 0,
  PRACTICING: 0.15,
  NEEDS_REWORK: 0.15,
  PROFICIENT: 0.7,
  REVIEW_DUE: 0.7,
  MASTERED: 1,
};

export function courseProgress(course: CourseId, progress: Map<string, ExerciseProgress>): CourseProgress {
  const cores = EXERCISES.filter((e) => e.course === course && e.gating);
  const ps = cores.map((e) => progress.get(e.id)!);
  const unlocked = course === "aae" || Boolean(getCourse(course)?.independent) || ps.some((p) => p.unlocked);
  const weight = ps.reduce((sum, p) => sum + PROGRESS_WEIGHTS[p.status], 0);
  return {
    course,
    title: COURSES.find((c) => c.id === course)!.title,
    unlocked,
    total: cores.length,
    introduced: ps.filter((p) => p.attempts.length > 0).length,
    proficient: ps.filter((p) => PROFICIENT_STATUSES.includes(p.status)).length,
    mastered: ps.filter((p) => p.status === "MASTERED" || (p.status === "REVIEW_DUE" && p.mastered)).length,
    reviewsDue: ps.filter((p) => p.status === "REVIEW_DUE").length,
    needsRework: ps.filter((p) => p.status === "NEEDS_REWORK").length,
    weightedPercent: cores.length ? Math.round((weight / cores.length) * 100) : 0,
  };
}

// ── Today's practice ───────────────────────────────────────────────────────

export interface TodayPlan {
  activeCourse: CourseId | null;
  current: Exercise | null;
  /** Next exercise in each independent course (e.g. Portrait Value), practised alongside. */
  parallel: Exercise[];
  reviews: Exercise[];
  reviewsDueTotal: number;
  rework: Exercise[];
  interleave: Exercise | null;
  allComplete: boolean;
}

/** Interleaving only suggests exercises not touched in this many days. */
export const INTERLEAVE_MIN_GAP_DAYS = 7;

export function todayPlan(
  progress: Map<string, ExerciseProgress>,
  now: Date = new Date(),
  reviewCap = 2,
): TodayPlan {
  let activeCourse: CourseId | null = null;
  let current: Exercise | null = null;
  const nextIn = (course: CourseId) =>
    EXERCISES.find(
      (e) => e.course === course && e.gating && progress.get(e.id)!.unlocked && !progress.get(e.id)!.everProficient,
    );
  const parallel = COURSES.filter((c) => c.independent)
    .map((c) => nextIn(c.id))
    .filter((e): e is Exercise => Boolean(e));
  for (const c of COURSES.filter((x) => !x.independent)) {
    const next = nextIn(c.id);
    if (next) {
      activeCourse = c.id;
      current = next;
      break;
    }
  }

  const isPlanned = (id: string) => id === current?.id || parallel.some((e) => e.id === id);
  const due = EXERCISES.map((e) => progress.get(e.id)!)
    .filter((p) => p.status === "REVIEW_DUE" && !isPlanned(p.exercise.id))
    .sort(
      (a, b) =>
        Number(b.exercise.type === "core") - Number(a.exercise.type === "core") ||
        Date.parse(a.nextReviewAt!) - Date.parse(b.nextReviewAt!),
    );

  const rework = EXERCISES.map((e) => progress.get(e.id)!)
    .filter((p) => p.status === "NEEDS_REWORK" && !isPlanned(p.exercise.id))
    .sort((a, b) => Date.parse(b.lastAttempt!.finishedAt) - Date.parse(a.lastAttempt!.finishedAt))
    .map((p) => p.exercise);

  const reviews = due.slice(0, Math.max(0, reviewCap)).map((p) => p.exercise);

  let interleave: Exercise | null = null;
  if (reviews.length === 0) interleave = pickInterleave(progress, current, now);

  return {
    activeCourse,
    current,
    parallel,
    reviews,
    reviewsDueTotal: due.length,
    rework,
    interleave,
    allComplete: current === null,
  };
}

/**
 * Occasionally suggest an older, already-learned exercise from a different
 * section. Never suggests a skill that hasn't reached Proficient.
 */
export function pickInterleave(
  progress: Map<string, ExerciseProgress>,
  current: Exercise | null,
  now: Date,
): Exercise | null {
  const learned = EXERCISES.filter((e) => e.type === "core" && progress.get(e.id)!.everProficient);
  const learnedSections = new Set(learned.map((e) => `${e.course}:${e.sectionId}`));
  if (learnedSections.size < 2) return null;
  const cutoff = now.getTime() - INTERLEAVE_MIN_GAP_DAYS * DAY_MS;
  const candidates = learned
    .filter((e) => !current || e.sectionId !== current.sectionId || e.course !== current.course)
    .map((e) => progress.get(e.id)!)
    .filter((p) => p.status !== "NEEDS_REWORK" && p.status !== "REVIEW_DUE")
    .filter((p) => p.lastAttempt && Date.parse(p.lastAttempt.finishedAt) < cutoff)
    .sort((a, b) => Date.parse(a.lastAttempt!.finishedAt) - Date.parse(b.lastAttempt!.finishedAt));
  return candidates[0]?.exercise ?? null;
}
