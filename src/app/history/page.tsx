import type { Metadata } from "next";
import Link from "next/link";
import { getExercise } from "@/content/course-data";
import { DeleteAttempt } from "@/components/DeleteAttempt";
import { ERROR_LABELS, RATING_LABELS } from "@/lib/labels";
import { formatDate, formatDuration, shortLabel } from "@/lib/display";
import { sortAttempts } from "@/lib/progress/engine";
import { dayKey } from "@/lib/progress/stats";
import { loadContext } from "@/lib/server/context";

export const metadata: Metadata = { title: "History" };
export const dynamic = "force-dynamic";

export default async function HistoryPage({ searchParams }: { searchParams: Promise<{ exercise?: string }> }) {
  const sp = await searchParams;
  const { state, timeZone } = await loadContext();
  const exFilter = sp.exercise && getExercise(sp.exercise) ? sp.exercise : undefined;

  // Attempt numbers are per exercise, counted in chronological order.
  const numbers = new Map<string, number>();
  const counter = new Map<string, number>();
  for (const a of sortAttempts(state.attempts)) {
    const n = (counter.get(a.exerciseId) ?? 0) + 1;
    counter.set(a.exerciseId, n);
    numbers.set(a.id, n);
  }

  const list = sortAttempts(state.attempts)
    .reverse()
    .filter((a) => !exFilter || a.exerciseId === exFilter);
  const groups = new Map<string, typeof list>();
  for (const a of list) {
    const k = dayKey(a.finishedAt, timeZone);
    groups.set(k, [...(groups.get(k) ?? []), a]);
  }

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-4xl">History</h1>
        <p className="mt-2 text-graphite">
          {exFilter ? (
            <>
              Showing {shortLabel(getExercise(exFilter)!)} ·{" "}
              <Link href="/history" className="link">
                show all
              </Link>
            </>
          ) : (
            `${state.attempts.length} attempts recorded.`
          )}
        </p>
      </header>

      {list.length === 0 && <p className="text-pencil">No attempts yet. The first one is the hardest to start.</p>}

      {[...groups.entries()].map(([day, items]) => (
        <section key={day} aria-label={day}>
          <h2 className="eyebrow">{formatDate(items[0].finishedAt, timeZone, { weekday: "short", year: "numeric" })}</h2>
          <ul className="mt-2 divide-y divide-rule border-t border-rule">
            {items.map((a) => {
              const e = getExercise(a.exerciseId);
              if (!e) return null;
              return (
                <li key={a.id} className="flex flex-wrap justify-between gap-4 py-4">
                  <div className="min-w-0">
                    <Link href={`/history?exercise=${e.id}`} className="font-serif text-lg">
                      {shortLabel(e)}
                    </Link>
                    <p className="text-sm text-graphite">
                      Attempt #{numbers.get(a.id)} · {RATING_LABELS[a.rating]} · {formatDuration(a.durationSec)}
                      {a.direction && ` · ${a.direction === "constrict" ? "constricted" : "dilated"}`}
                    </p>
                    {a.errors.length > 0 && (
                      <p className="text-sm">Error: {a.errors.map((c) => ERROR_LABELS[c]).join(", ")}</p>
                    )}
                    {a.notes && <p className="text-sm italic text-graphite">“{a.notes}”</p>}
                    <DeleteAttempt id={a.id} />
                  </div>
                  {a.photoId && (
                    <a href={`/api/photo/${a.photoId}`} target="_blank" rel="noopener">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={`/api/photo/${a.photoId}`}
                        alt={`Photo of attempt #${numbers.get(a.id)}`}
                        loading="lazy"
                        className="h-24 w-auto border border-rule"
                      />
                    </a>
                  )}
                </li>
              );
            })}
          </ul>
        </section>
      ))}
    </div>
  );
}
