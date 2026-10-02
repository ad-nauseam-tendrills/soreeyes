import type { Metadata } from "next";
import Link from "next/link";
import { EXERCISES } from "@/content/course-data";
import { ERROR_LABELS, RATING_LABELS } from "@/lib/labels";
import { formatDate, relativeDays, shortLabel } from "@/lib/display";
import { loadContext } from "@/lib/server/context";

export const metadata: Metadata = { title: "Queue" };
export const dynamic = "force-dynamic";

export default async function QueuePage() {
  const { progress, plan, now, timeZone } = await loadContext();
  const rework = EXERCISES.map((e) => progress.get(e.id)!)
    .filter((p) => p.status === "NEEDS_REWORK")
    .sort((a, b) => Date.parse(b.lastAttempt!.finishedAt) - Date.parse(a.lastAttempt!.finishedAt));
  const due = EXERCISES.map((e) => progress.get(e.id)!)
    .filter((p) => p.status === "REVIEW_DUE")
    .sort((a, b) => Date.parse(a.nextReviewAt!) - Date.parse(b.nextReviewAt!));
  const upcoming = EXERCISES.map((e) => progress.get(e.id)!)
    .filter((p) => (p.status === "PROFICIENT" || p.status === "MASTERED") && p.nextReviewAt)
    .sort((a, b) => Date.parse(a.nextReviewAt!) - Date.parse(b.nextReviewAt!))
    .slice(0, 8);

  return (
    <div className="space-y-12">
      <header>
        <h1 className="text-4xl">Queue</h1>
        <p className="mt-2 text-graphite">
          Finding an error is the feedback the exercises exist to give. Nothing here is a penalty — it&apos;s simply what
          to look at next.
        </p>
      </header>

      <section aria-labelledby="rework-h">
        <h2 id="rework-h" className="eyebrow">
          Needs attention ({rework.length})
        </h2>
        {rework.length === 0 ? (
          <p className="mt-3 text-sm text-pencil">Nothing waiting.</p>
        ) : (
          <ul className="mt-3 divide-y divide-rule border-y border-rule">
            {rework.map((p) => {
              const a = p.lastAttempt!;
              return (
                <li key={p.exercise.id} className="flex flex-wrap items-center justify-between gap-4 py-4">
                  <div>
                    <p className="font-serif text-lg">
                      <span aria-hidden="true">! </span>
                      {shortLabel(p.exercise)}
                    </p>
                    <p className="text-sm text-graphite">
                      Last attempt ({formatDate(a.finishedAt, timeZone)}): {RATING_LABELS[a.rating]}
                      {a.errors.length > 0 && ` — ${a.errors.map((c) => ERROR_LABELS[c]).join(", ")}`}
                    </p>
                    {a.notes && <p className="text-sm italic text-graphite">“{a.notes}”</p>}
                  </div>
                  <Link className="btn" href={`/exercise/${p.exercise.id}`}>
                    Practice Again
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section aria-labelledby="due-h">
        <h2 id="due-h" className="eyebrow">
          Reviews due ({due.length})
        </h2>
        <p className="mt-1 text-xs text-pencil">
          Today suggests up to {plan.reviews.length || "a couple"} at a time; the rest keep. Reviews: about 3, 7, 14 and 30
          days after reaching Proficient.
        </p>
        {due.length === 0 ? (
          <p className="mt-3 text-sm text-pencil">Nothing due.</p>
        ) : (
          <ul className="mt-3 divide-y divide-rule border-y border-rule">
            {due.map((p) => (
              <li key={p.exercise.id} className="flex flex-wrap items-center justify-between gap-4 py-3">
                <span className="font-serif">
                  <span aria-hidden="true">↻ </span>
                  {shortLabel(p.exercise)}
                  <span className="ml-2 font-sans text-xs text-pencil">due {relativeDays(p.nextReviewAt!, now)}</span>
                </span>
                <Link className="btn btn-quiet" href={`/exercise/${p.exercise.id}`}>
                  Review
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      {upcoming.length > 0 && (
        <section aria-labelledby="up-h">
          <h2 id="up-h" className="eyebrow">
            Coming up
          </h2>
          <ul className="mt-3 space-y-1 text-sm text-graphite">
            {upcoming.map((p) => (
              <li key={p.exercise.id}>
                {shortLabel(p.exercise)} — review {relativeDays(p.nextReviewAt!, now)}
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
