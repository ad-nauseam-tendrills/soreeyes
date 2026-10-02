import type { Metadata } from "next";
import { authConfigured } from "@/lib/server/auth";

export const metadata: Metadata = { title: "Sign in" };

const MESSAGES: Record<string, string> = {
  bad: "That password didn't match.",
  locked: "Too many attempts. Try again in a few minutes.",
};

export default async function LoginPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const sp = await searchParams;
  const next = sp.next && sp.next.startsWith("/") && !sp.next.startsWith("//") ? sp.next : "/";
  const configured = authConfigured();
  return (
    <div className="mx-auto mt-16 max-w-sm">
      <h1 className="text-center text-3xl tracking-[0.2em]">SORE EYES</h1>
      <p className="mt-2 text-center font-serif italic text-graphite">Train the eye. The hand will follow.</p>
      {!configured ? (
        <p className="mt-10 border border-rule bg-card p-4 text-sm" role="alert">
          The server isn&apos;t configured yet: set <code>OWNER_PASSWORD_HASH</code> and <code>SESSION_SECRET</code> (see
          DEPLOY.md).
        </p>
      ) : (
        <form method="post" action="/api/login" className="mt-10 space-y-4">
          <input type="hidden" name="next" value={next} />
          <label className="block">
            <span className="eyebrow">Password</span>
            <input
              className="field mt-1"
              type="password"
              name="password"
              autoComplete="current-password"
              required
              autoFocus
            />
          </label>
          {sp.error && MESSAGES[sp.error] && (
            <p role="alert" className="text-sm text-ochre">
              {MESSAGES[sp.error]}
            </p>
          )}
          <button className="btn btn-primary w-full" type="submit">
            Sign in
          </button>
        </form>
      )}
    </div>
  );
}
