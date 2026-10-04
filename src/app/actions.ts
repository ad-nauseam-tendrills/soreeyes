"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { getExercise } from "@/content/course-data";
import { ALLOWED_ASSETS } from "@/content/sheets";
import { MATERIALS_BY_ID } from "@/content/materials";
import { STATUS_LABELS } from "@/lib/labels";
import { AttemptSchema, validateImport } from "@/lib/portability";
import { computeProgress } from "@/lib/progress/engine";
import { deletePhoto, mutateState, readState, replaceState, savePhoto } from "@/lib/server/store";
import type { Attempt, ExerciseStatus } from "@/lib/types";

const MAX_PHOTO_BYTES = 6 * 1024 * 1024;

export type SaveAttemptResult =
  | { ok: true; attemptNumber: number; status: ExerciseStatus; statusLabel: string }
  | { ok: false; error: string };

export async function saveAttempt(form: FormData): Promise<SaveAttemptResult> {
  const exerciseId = String(form.get("exerciseId") ?? "");
  const exercise = getExercise(exerciseId);
  if (!exercise) return { ok: false, error: "Unknown exercise." };

  const current = await readState();
  const progressBefore = computeProgress(current.attempts).get(exerciseId)!;
  if (!progressBefore.unlocked) return { ok: false, error: "This exercise is still locked." };

  const direction = form.get("direction");
  const candidate = {
    id: randomUUID(),
    exerciseId,
    startedAt: String(form.get("startedAt") ?? ""),
    finishedAt: String(form.get("finishedAt") ?? ""),
    durationSec: Math.round(Number(form.get("durationSec") ?? 0)),
    rating: String(form.get("rating") ?? ""),
    errors: [...new Set(form.getAll("errors").map(String))],
    notes: String(form.get("notes") ?? "").trim(),
    ...(exercise.finalPair && (direction === "constrict" || direction === "dilate") ? { direction } : {}),
  };
  const parsed = AttemptSchema.safeParse(candidate);
  if (!parsed.success) return { ok: false, error: "Please choose how it went before saving." };
  const attempt: Attempt = parsed.data;

  const photo = form.get("photo");
  if (photo instanceof File && photo.size > 0) {
    if (photo.type !== "image/jpeg") return { ok: false, error: "Photo must be a JPEG." };
    if (photo.size > MAX_PHOTO_BYTES) return { ok: false, error: "Photo is too large." };
    attempt.photoId = await savePhoto(Buffer.from(await photo.arrayBuffer()));
  }

  const next = await mutateState((s) => {
    s.attempts.push(attempt);
  });
  const p = computeProgress(next.attempts).get(exerciseId)!;
  revalidatePath("/", "layout");
  return { ok: true, attemptNumber: p.attempts.length, status: p.status, statusLabel: STATUS_LABELS[p.status] };
}

export async function deleteAttempt(id: string): Promise<void> {
  let photoId: string | undefined;
  await mutateState((s) => {
    photoId = s.attempts.find((a) => a.id === id)?.photoId;
    s.attempts = s.attempts.filter((a) => a.id !== id);
  });
  if (photoId) await deletePhoto(photoId);
  revalidatePath("/", "layout");
}

export async function setPrinted(ids: string[], printed: boolean): Promise<void> {
  const valid = ids.filter((id) => ALLOWED_ASSETS.has(id));
  const today = new Date().toISOString();
  await mutateState((s) => {
    for (const id of valid) {
      if (printed) s.printed[id] = today;
      else delete s.printed[id];
    }
  });
  revalidatePath("/", "layout");
}

export async function setMaterialOwned(id: string, owned: boolean): Promise<void> {
  if (!MATERIALS_BY_ID.has(id)) return;
  await mutateState((s) => {
    s.materialsOwned[id] = owned;
  });
  revalidatePath("/", "layout");
}

export async function updateSettings(form: FormData): Promise<void> {
  const reviewCap = Math.min(10, Math.max(0, Math.round(Number(form.get("reviewCap") ?? 2))));
  const showTimer = form.get("showTimer") === "on";
  await mutateState((s) => {
    s.settings = { showTimer, reviewCap: Number.isFinite(reviewCap) ? reviewCap : 2 };
  });
  revalidatePath("/", "layout");
}

export type ImportPreview =
  | { ok: true; summary: { attempts: number; exercises: number; printed: number }; current: number }
  | { ok: false; errors: string[] };

function parseJson(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return undefined;
  }
}

export async function previewImport(text: string): Promise<ImportPreview> {
  const raw = parseJson(text);
  if (raw === undefined) return { ok: false, errors: ["The file isn't valid JSON."] };
  const result = validateImport(raw);
  if (!result.ok) return result;
  const current = (await readState()).attempts.length;
  return { ok: true, summary: result.summary, current };
}

export async function applyImport(text: string): Promise<ImportPreview> {
  const raw = parseJson(text);
  if (raw === undefined) return { ok: false, errors: ["The file isn't valid JSON."] };
  const result = validateImport(raw);
  if (!result.ok) return result;
  const before = (await readState()).attempts.length;
  await replaceState(result.state); // previous state is kept in data/backups
  revalidatePath("/", "layout");
  return { ok: true, summary: result.summary, current: before };
}
