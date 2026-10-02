import { NextResponse, type NextRequest } from "next/server";
import {
  clearLoginFailures,
  loginLockedUntil,
  recordLoginFailure,
  verifyPassword,
} from "@/lib/server/auth";
import { SESSION_COOKIE, SESSION_DAYS, createSessionToken, sessionSecret } from "@/lib/session";

function redirectTo(path: string) {
  // Relative Location + 303 (follow with GET): correct behind a reverse proxy,
  // where req.url would carry the internal host.
  return new NextResponse(null, { status: 303, headers: { Location: path } });
}

export async function POST(req: NextRequest) {
  const form = await req.formData();
  const password = String(form.get("password") ?? "");
  const nextRaw = String(form.get("next") ?? "/");
  const next = nextRaw.startsWith("/") && !nextRaw.startsWith("//") ? nextRaw : "/";
  const key = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";

  if (loginLockedUntil(key)) return redirectTo("/login?error=locked");

  const secret = sessionSecret();
  const ok = secret !== null && (await verifyPassword(password, process.env.OWNER_PASSWORD_HASH));
  if (!ok) {
    recordLoginFailure(key);
    await new Promise((r) => setTimeout(r, 400));
    return redirectTo(`/login?error=bad&next=${encodeURIComponent(next)}`);
  }

  clearLoginFailures(key);
  const res = redirectTo(next);
  res.cookies.set(SESSION_COOKIE, await createSessionToken(secret), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_DAYS * 86_400,
  });
  return res;
}
