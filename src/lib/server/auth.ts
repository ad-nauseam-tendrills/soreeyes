import "server-only";
import { scrypt as scryptCb, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { SESSION_COOKIE, sessionSecret, verifySessionToken } from "@/lib/session";

const scrypt = promisify(scryptCb) as (pw: string, salt: Buffer, len: number, opts: object) => Promise<Buffer>;

/** Hash format: scrypt:N:r:p:<salt b64>:<hash b64> (see scripts/hash-password.mjs). */
export async function verifyPassword(password: string, stored: string | undefined): Promise<boolean> {
  if (!stored) return false;
  const parts = stored.split(":");
  if (parts.length !== 6 || parts[0] !== "scrypt") return false;
  const [, N, r, p, saltB64, hashB64] = parts;
  const expected = Buffer.from(hashB64, "base64");
  const actual = await scrypt(password, Buffer.from(saltB64, "base64"), expected.length, {
    N: Number(N),
    r: Number(r),
    p: Number(p),
    maxmem: 256 * 1024 * 1024,
  });
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

export function authConfigured(): boolean {
  return Boolean(process.env.OWNER_PASSWORD_HASH && sessionSecret());
}

export async function isOwner(): Promise<boolean> {
  const jar = await cookies();
  return verifySessionToken(jar.get(SESSION_COOKIE)?.value, sessionSecret());
}

/** Defense in depth: middleware already guards every route; actions and handlers re-check. */
export async function requireOwner(): Promise<void> {
  if (!(await isOwner())) redirect("/login");
}

// ── naive login throttle (single process, single user) ──
const failures = new Map<string, { count: number; until: number }>();
const MAX_FAILURES = 5;
const LOCK_MS = 10 * 60_000;

export function loginLockedUntil(key: string, now = Date.now()): number | null {
  const f = failures.get(key);
  return f && f.until > now ? f.until : null;
}

export function recordLoginFailure(key: string, now = Date.now()): void {
  const f = failures.get(key) ?? { count: 0, until: 0 };
  f.count += 1;
  if (f.count >= MAX_FAILURES) {
    f.until = now + LOCK_MS;
    f.count = 0;
  }
  failures.set(key, f);
}

export function clearLoginFailures(key: string): void {
  failures.delete(key);
}
