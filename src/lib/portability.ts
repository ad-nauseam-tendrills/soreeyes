// Export / import of the complete training history as JSON.
// Import is validated in full before anything is replaced.

import { z } from "zod";
import { getExercise } from "@/content/course-data";
import { computeProgress } from "@/lib/progress/engine";
import { ERROR_CATEGORIES, RATINGS, type AppState } from "@/lib/types";

export const EXPORT_FORMAT = "sore-eyes-export";

const isoDate = z.string().refine((s) => !Number.isNaN(Date.parse(s)), "must be an ISO date");

export const AttemptSchema = z
  .object({
    id: z.string().min(1).max(100),
    exerciseId: z.string().min(1),
    startedAt: isoDate,
    finishedAt: isoDate,
    durationSec: z.number().int().min(0).max(24 * 3600),
    rating: z.enum(RATINGS),
    errors: z.array(z.enum(ERROR_CATEGORIES)).max(ERROR_CATEGORIES.length),
    notes: z.string().max(5000),
    direction: z.enum(["constrict", "dilate"]).optional(),
    photoId: z
      .string()
      .regex(/^[a-z0-9-]{8,64}$/)
      .optional(),
  })
  .strict();

export const AppStateSchema = z
  .object({
    schemaVersion: z.literal(1),
    attempts: z.array(AttemptSchema),
    printed: z.record(z.string().regex(/^(aae|sup|ceb|cew)-p\d{3}$/), isoDate),
    materialsOwned: z.record(z.string(), z.boolean()),
    settings: z
      .object({
        showTimer: z.boolean(),
        reviewCap: z.number().int().min(0).max(10),
      })
      .strict(),
  })
  .strict();

export function emptyState(): AppState {
  return {
    schemaVersion: 1,
    attempts: [],
    printed: {},
    materialsOwned: {},
    settings: { showTimer: true, reviewCap: 2 },
  };
}

/** Full export: the source-of-truth state plus a derived snapshot for human readers. */
export function buildExport(state: AppState, now = new Date()) {
  const progress = computeProgress(state.attempts, now);
  return {
    format: EXPORT_FORMAT,
    exportedAt: now.toISOString(),
    state,
    // Derived, informational only — recomputed from attempts on import.
    exerciseStates: [...progress.values()].map((p) => ({
      exerciseId: p.exercise.id,
      status: p.status,
      attempts: p.attempts.length,
      everProficient: p.everProficient,
      proficientAt: p.proficientAt ?? null,
      reviewStage: p.reviewStage,
      nextReviewAt: p.nextReviewAt ?? null,
    })),
  };
}

export type ImportResult =
  | { ok: true; state: AppState; summary: { attempts: number; exercises: number; printed: number } }
  | { ok: false; errors: string[] };

/** Validate an uploaded export. Accepts either a full export or a bare state object. */
export function validateImport(raw: unknown): ImportResult {
  const candidate =
    raw && typeof raw === "object" && "format" in raw
      ? (raw as { format: unknown; state?: unknown }).format === EXPORT_FORMAT
        ? (raw as { state?: unknown }).state
        : undefined
      : raw;
  if (candidate === undefined) return { ok: false, errors: ["Not a Sore Eyes export file."] };

  const parsed = AppStateSchema.safeParse(candidate);
  if (!parsed.success) {
    return {
      ok: false,
      errors: parsed.error.issues.slice(0, 20).map((i) => `${i.path.join(".") || "(root)"}: ${i.message}`),
    };
  }

  const state = parsed.data as AppState;
  const errors: string[] = [];
  const ids = new Set<string>();
  state.attempts.forEach((a, i) => {
    if (!getExercise(a.exerciseId)) errors.push(`attempts.${i}: unknown exercise "${a.exerciseId}"`);
    if (ids.has(a.id)) errors.push(`attempts.${i}: duplicate attempt id "${a.id}"`);
    ids.add(a.id);
    if (Date.parse(a.finishedAt) < Date.parse(a.startedAt)) errors.push(`attempts.${i}: finishes before it starts`);
    if (a.direction && !getExercise(a.exerciseId)?.finalPair) {
      errors.push(`attempts.${i}: direction is only valid for Final exercises`);
    }
  });
  if (errors.length) return { ok: false, errors: errors.slice(0, 20) };

  return {
    ok: true,
    state,
    summary: {
      attempts: state.attempts.length,
      exercises: new Set(state.attempts.map((a) => a.exerciseId)).size,
      printed: Object.keys(state.printed).length,
    },
  };
}
