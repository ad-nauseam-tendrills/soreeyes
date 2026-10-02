import "server-only";
import { randomUUID } from "node:crypto";
import { promises as fs } from "node:fs";
import path from "node:path";
import { AppStateSchema, emptyState } from "@/lib/portability";
import type { AppState } from "@/lib/types";

// Single-user JSON store: one state file, atomic writes, rolling backups.
// Small data (hundreds of attempts) — a database would add moving parts for nothing.

const BACKUPS_KEPT = 30;

export function dataDir(): string {
  return path.resolve(process.env.DATA_DIR || "./data");
}

const statePath = () => path.join(dataDir(), "state.json");
const backupDir = () => path.join(dataDir(), "backups");
export const photoDir = () => path.join(dataDir(), "photos");

export async function readState(): Promise<AppState> {
  let raw: string;
  try {
    raw = await fs.readFile(statePath(), "utf8");
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === "ENOENT") return emptyState();
    throw err;
  }
  const parsed = AppStateSchema.safeParse(JSON.parse(raw));
  if (!parsed.success) {
    throw new Error(`state.json failed validation: ${parsed.error.issues[0]?.message}. Restore from ${backupDir()}.`);
  }
  return parsed.data as AppState;
}

let queue: Promise<unknown> = Promise.resolve();

/** Serialised read-modify-write. The mutator may return a new state or mutate in place. */
export function mutateState(fn: (s: AppState) => AppState | void): Promise<AppState> {
  const run = queue.then(async () => {
    const current = await readState();
    const next = fn(structuredClone(current)) ?? current;
    await writeState(next, current);
    return next;
  });
  queue = run.catch(() => undefined);
  return run as Promise<AppState>;
}

/** Replace everything (import). Previous state is kept as a backup. */
export function replaceState(next: AppState): Promise<AppState> {
  return mutateState(() => next);
}

async function writeState(next: AppState, previous: AppState): Promise<void> {
  const valid = AppStateSchema.parse(next); // never persist an invalid state
  await fs.mkdir(backupDir(), { recursive: true });
  if (previous.attempts.length || Object.keys(previous.printed).length) {
    const stamp = new Date().toISOString().replace(/[:.]/g, "-");
    await fs.writeFile(path.join(backupDir(), `state-${stamp}.json`), JSON.stringify(previous));
    await pruneBackups();
  }
  const tmp = `${statePath()}.${randomUUID()}.tmp`;
  await fs.writeFile(tmp, JSON.stringify(valid, null, 1));
  await fs.rename(tmp, statePath());
}

async function pruneBackups(): Promise<void> {
  const files = (await fs.readdir(backupDir())).filter((f) => f.startsWith("state-")).sort();
  await Promise.all(files.slice(0, -BACKUPS_KEPT).map((f) => fs.rm(path.join(backupDir(), f))));
}

// ── private attempt photos ──

const PHOTO_ID_RE = /^[a-z0-9-]{8,64}$/;

export async function savePhoto(bytes: Buffer): Promise<string> {
  const id = randomUUID();
  await fs.mkdir(photoDir(), { recursive: true });
  await fs.writeFile(path.join(photoDir(), `${id}.jpg`), bytes);
  return id;
}

export async function readPhoto(id: string): Promise<Buffer | null> {
  if (!PHOTO_ID_RE.test(id)) return null;
  try {
    return await fs.readFile(path.join(photoDir(), `${id}.jpg`));
  } catch {
    return null;
  }
}

export async function deletePhoto(id: string): Promise<void> {
  if (!PHOTO_ID_RE.test(id)) return;
  await fs.rm(path.join(photoDir(), `${id}.jpg`), { force: true });
}
