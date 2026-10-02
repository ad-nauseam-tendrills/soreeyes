import type { Metadata } from "next";
import Link from "next/link";
import { COURSES, getExercise } from "@/content/course-data";
import { ERROR_LABELS, RATING_LABELS } from "@/lib/labels";
import { formatDate, shortLabel } from "@/lib/display";
import { categoryCounts, filterAttempts, observations, type JournalFilter } from "@/lib/progress/journal";
import { sortAttempts } from "@/lib/progress/engine";
import { loadContext } from "@/lib/server/context";
import { ERROR_CATEGORIES, type CourseId, type ErrorCategory } from "@/lib/types";

export const metadata: Metadata = { title: "Error Journal" };
export const dynamic = "force-dynamic";

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export default async function JournalPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const sp = await searchParams;
  const { state, timeZone } = await loadContext();

  const filter: JournalFilter = {
    course: sp.course === "aae" || sp.course === "ce" ? (sp.course as CourseId) : undefined,
    section: sp.section || undefined,
    skill: ERROR_CATEGORIES.includes(sp.skill as ErrorCategory) ? (sp.skill as ErrorCategory) : undefined,
    from: sp.from && DATE_RE.test(sp.from) ? sp.from : undefined,
    to: sp.to && DATE_RE.test(sp.to) ? sp.to : undefined,
  };
  const attempts = filterAttempts(state.attempts, filter, timeZone);
  const counts = categoryCounts(attempts);
  const notes = observations(attempts);
  const maxCount = Math.max(1, ...counts.map((c) => c.count));
  const withErrors = sortAttempts(attempts)
    .filter((a) => a.errors.length > 0 || a.notes)
    .reverse()
    .slice(0, 25);

  return (
    <div className="space-y-10">
      <header>
        <h1 className="text-4xl">Error Journal</h1>
        <p className="mt-2 text-graphite">
          A plain summary of the errors you&apos;ve recorded. It counts; it doesn&apos;t interpret.
        </p>
      </header>

      <form method="get" className="grid gap-3 border-y border-rule py-4 sm:grid-cols-5" aria-label="Filter">
        <label className="text-sm">
          <span className="eyebrow">Course</span>
          <select name="course" defaultValue={filter.course ?? ""} className="field mt-1">
            <option value="">All</option>
            {COURSES.map((c) => (
              <option key={c.id} value={c.id}>
                {c.title}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm">
          <span className="eyebrow">Section</span>
          <select name="section" defaultValue={filter.section ?? ""} className="field mt-1">
            <option value="">All</option>
            {COURSES.map((c) => (
              <optgroup key={c.id} label={c.title}>
                {c.sections.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.title}
                  </option>
                ))}
              </optgroup>
            ))}
          </select>
        </label>
        <label className="text-sm">
          <span className="eyebrow">Skill / error</span>
          <select name="skill" defaultValue={filter.skill ?? ""} className="field mt-1">
            <option value="">All</option>
            {ERROR_CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {ERROR_LABELS[c]}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm">
          <span className="eyebrow">From</span>
          <input type="date" name="from" defaultValue={filter.from} className="field mt-1" />
        </label>
        <label className="text-sm">
          <span className="eyebrow">To</span>
          <input type="date" name="to" defaultValue={filter.to} className="field mt-1" />
        </label>
        <div className="flex gap-2 sm:col-span-5">
          <button className="btn" type="submit">
            Apply filters
          </button>
          <Link className="btn btn-quiet" href="/journal">
            Clear
          </Link>
          <span className="self-center text-sm text-pencil">{attempts.length} attempts match</span>
        </div>
      </form>

      <section aria-labelledby="obs-h">
        <h2 id="obs-h" className="eyebrow">
          Observations
        </h2>
        {notes.length === 0 ? (
          <p className="mt-3 text-sm text-pencil">Not enough recorded errors yet to see a pattern.</p>
        ) : (
          <ul className="mt-3 space-y-2 font-serif text-lg">
            {notes.map((n) => (
              <li key={n}>{n}</li>
            ))}
          </ul>
        )}
      </section>

      <section aria-labelledby="counts-h">
        <h2 id="counts-h" className="eyebrow">
          Recorded errors
        </h2>
        {counts.length === 0 ? (
          <p className="mt-3 text-sm text-pencil">No errors recorded in this view.</p>
        ) : (
          <table className="mt-3 w-full max-w-xl text-sm">
            <thead className="sr-only">
              <tr>
                <th>Error</th>
                <th>Attempts</th>
                <th>Share</th>
              </tr>
            </thead>
            <tbody>
              {counts.map((c) => (
                <tr key={c.category} className="border-b border-rule/60">
                  <td className="py-2 pr-4">{ERROR_LABELS[c.category]}</td>
                  <td className="w-full py-2 pr-4" aria-hidden="true">
                    <div className="h-[6px] bg-graphite" style={{ width: `${(c.count / maxCount) * 100}%` }} />
                  </td>
                  <td className="whitespace-nowrap py-2 text-right tabular-nums">
                    {c.count} of {attempts.length}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      <section aria-labelledby="entries-h">
        <h2 id="entries-h" className="eyebrow">
          Entries
        </h2>
        <ul className="mt-3 divide-y divide-rule">
          {withErrors.map((a) => (
            <li key={a.id} className="py-3 text-sm">
              <span className="text-pencil">{formatDate(a.finishedAt, timeZone)} · </span>
              <Link href={`/exercise/${a.exerciseId}`} className="font-serif">
                {shortLabel(getExercise(a.exerciseId)!)}
              </Link>
              <span className="text-graphite"> · {RATING_LABELS[a.rating]}</span>
              {a.errors.length > 0 && <span> — {a.errors.map((c) => ERROR_LABELS[c]).join(", ")}</span>}
              {a.notes && <span className="block italic text-graphite">“{a.notes}”</span>}
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
