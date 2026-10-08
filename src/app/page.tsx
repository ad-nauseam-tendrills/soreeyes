import Link from "next/link";
import { getCourse, sectionOf } from "@/content/course-data";
import { StatusTag } from "@/components/StatusTag";
import { ERROR_LABELS } from "@/lib/labels";
import { minutesLabel, numberLabel, shortLabel } from "@/lib/display";
import { courseProgress, PROFICIENT_STATUSES } from "@/lib/progress/engine";
import { countSessions, currentStreak, minutesPracticed } from "@/lib/progress/stats";
import { loadContext } from "@/lib/server/context";
import { CourseProgressBlock } from "@/components/CourseProgressBlock";

export const dynamic = "force-dynamic";

export default async function Dashboard() {
  const { state, progress, plan, now, timeZone } = await loadContext();
  const { current } = plan;
  const reworkShown = plan.rework.slice(0, 3);
  const courses = (["aae", "ce", "pv"] as const).map((c) => courseProgress(c, progress));
  const proficientCount = [...progress.values()].filter(
    (p) => p.exercise.gating && PROFICIENT_STATUSES.includes(p.status),
  ).length;

  return (
    <div className="space-y-14">
      <header className="text-center">
        <h1 className="text-4xl tracking-[0.22em] sm:text-5xl">SORE EYES</h1>
        <p className="mt-3 font-serif text-lg italic text-graphite">Train the eye. The hand will follow.</p>
      </header>

      <section aria-labelledby="today" className="mx-auto max-w-2xl">
        <h2 id="today" className="eyebrow text-center">
          Today&apos;s practice
        </h2>

        {current ? (
          <div className="mt-6 text-center">
            <Link href={`/exercise/${current.id}`} className="btn btn-primary px-8 text-base">
              Continue Training
            </Link>
            <dl className="mt-6 space-y-1 font-serif text-lg">
              <dt className="sr-only">Current</dt>
              <dd>{getCourse(current.course)!.title}</dd>
              <dd className="text-graphite">{sectionOf(current).title}</dd>
              <dd>
                {numberLabel(current)} · {current.title}
              </dd>
              <dd className="pt-1 font-sans text-sm text-pencil">{minutesLabel(current)}</dd>
            </dl>
            <div className="mt-2">
              <StatusTag status={progress.get(current.id)!.status} />
            </div>
            {plan.parallel.map((e) => (
              <p key={e.id} className="mt-6 text-sm">
                <span className="eyebrow">Alongside</span>
                <br />
                <Link href={`/exercise/${e.id}`} className="font-serif text-lg">
                  {getCourse(e.course)!.title} · {numberLabel(e)} — {e.title}
                </Link>
                <span className="text-pencil"> · {minutesLabel(e)}</span>
              </p>
            ))}
          </div>
        ) : (
          <div className="mt-6 text-center font-serif text-lg">
            <p>Both courses are complete. Keep the eye in practice with reviews and old favourites.</p>
            <p className="mt-2 font-sans text-sm text-pencil">
              The author&apos;s routine: ~15 minutes a day of your best exercises; twice a week, one you struggled with
              (AAE p.89).
            </p>
          </div>
        )}

        {(plan.reviews.length > 0 || plan.interleave || reworkShown.length > 0) && (
          <div className="mt-10 grid gap-8 sm:grid-cols-2">
            <div>
              <h3 className="eyebrow">Review due</h3>
              {plan.reviews.length === 0 && !plan.interleave && <p className="mt-2 text-sm text-pencil">Nothing due.</p>}
              <ul className="mt-2 space-y-2">
                {plan.reviews.map((e) => (
                  <li key={e.id}>
                    <Link href={`/exercise/${e.id}`} className="font-serif">
                      ↻ Review: {shortLabel(e)}
                    </Link>
                  </li>
                ))}
                {plan.interleave && (
                  <li>
                    <Link href={`/exercise/${plan.interleave.id}`} className="font-serif">
                      ↻ Revisit: {shortLabel(plan.interleave)}
                    </Link>
                    <p className="text-xs text-pencil">An older skill, mixed in so it stays sharp.</p>
                  </li>
                )}
              </ul>
              {plan.reviewsDueTotal > plan.reviews.length && (
                <p className="mt-2 text-xs text-pencil">
                  {plan.reviewsDueTotal - plan.reviews.length} more can wait for another day —{" "}
                  <Link href="/queue" className="link">
                    see all
                  </Link>
                  .
                </p>
              )}
            </div>
            <div>
              <h3 className="eyebrow">Needs attention</h3>
              {reworkShown.length === 0 && <p className="mt-2 text-sm text-pencil">Nothing waiting.</p>}
              <ul className="mt-2 space-y-3">
                {reworkShown.map((e) => {
                  const last = progress.get(e.id)!.lastAttempt!;
                  return (
                    <li key={e.id}>
                      <Link href={`/exercise/${e.id}`} className="font-serif">
                        {shortLabel(e)}
                      </Link>
                      {last.errors.length > 0 && (
                        <p className="text-sm text-graphite">
                          Last attempt: {last.errors.map((c) => ERROR_LABELS[c]).join(", ")}
                        </p>
                      )}
                    </li>
                  );
                })}
              </ul>
              {plan.rework.length > reworkShown.length && (
                <Link href="/queue" className="link mt-2 inline-block text-xs">
                  {plan.rework.length - reworkShown.length} more in the queue
                </Link>
              )}
            </div>
          </div>
        )}
      </section>

      <section aria-labelledby="courses" className="mx-auto max-w-2xl">
        <h2 id="courses" className="eyebrow">
          Courses
        </h2>
        <div className="mt-4 divide-y divide-rule border-y border-rule">
          {courses.map((c) => (
            <CourseProgressBlock key={c.course} p={c} />
          ))}
        </div>
      </section>

      <section aria-labelledby="stats" className="mx-auto max-w-2xl">
        <h2 id="stats" className="sr-only">
          Statistics
        </h2>
        <dl className="grid grid-cols-2 gap-y-3 text-sm text-graphite sm:grid-cols-4">
          {[
            ["Current streak", ((n) => `${n} ${n === 1 ? "day" : "days"}`)(currentStreak(state.attempts, now, timeZone))],
            ["Practice sessions", String(countSessions(state.attempts))],
            ["Minutes practiced", String(minutesPracticed(state.attempts))],
            ["Exercises proficient", String(proficientCount)],
          ].map(([k, v]) => (
            <div key={k}>
              <dt className="text-xs text-pencil">{k}</dt>
              <dd className="font-serif text-lg text-ink">{v}</dd>
            </div>
          ))}
        </dl>
      </section>
    </div>
  );
}
