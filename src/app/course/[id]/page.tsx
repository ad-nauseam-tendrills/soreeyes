import Link from "next/link";
import { notFound } from "next/navigation";
import { COURSES, EXERCISES, getCourse, getExercise } from "@/content/course-data";
import { formatPages, BOOKS } from "@/content/sheets";
import { CourseProgressBlock } from "@/components/CourseProgressBlock";
import { StatusTag } from "@/components/StatusTag";
import { formatDate, numberLabel, relativeDays } from "@/lib/display";
import { courseProgress } from "@/lib/progress/engine";
import { lockReason } from "@/lib/progress/locks";
import { loadContext } from "@/lib/server/context";
import type { Exercise } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function CourseMap({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const course = getCourse(id);
  if (!course) notFound();
  const { progress, plan, now, timeZone } = await loadContext();
  const cp = courseProgress(course.id, progress);

  function Row({ e, nested = false }: { e: Exercise; nested?: boolean }) {
    const p = progress.get(e.id)!;
    const isCurrent = plan.current?.id === e.id;
    const extra = isCurrent
      ? "Current"
      : p.status === "PROFICIENT" || p.status === "MASTERED"
        ? p.nextReviewAt
          ? `next review ${relativeDays(p.nextReviewAt, now)}`
          : undefined
        : p.status === "LOCKED"
          ? lockReason(e, progress)
          : undefined;
    const tag =
      e.type === "supplemental" ? "Supplemental" : e.type === "mini" ? "Optional" : e.type === "checkpoint" ? "Checkpoint" : null;
    return (
      <li className={`flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 py-2.5 ${nested ? "pl-6" : ""}`}>
        <span className="min-w-0">
          {isCurrent && <span aria-hidden="true" className="mr-1.5 text-sienna">●</span>}
          {p.status === "LOCKED" ? (
            <span className="text-pencil">
              {numberLabel(e)} · {e.title}
            </span>
          ) : (
            <Link href={`/exercise/${e.id}`} className={isCurrent ? "font-serif text-lg" : "font-serif"}>
              {numberLabel(e)} · {e.title}
            </Link>
          )}
          {tag && <span className="ml-2 text-xs uppercase tracking-wider text-pencil">{tag}</span>}
          {p.lastAttempt && (
            <span className="ml-2 text-xs text-pencil">
              {p.attempts.length} attempt{p.attempts.length === 1 ? "" : "s"} · last {formatDate(p.lastAttempt.finishedAt, timeZone)}
            </span>
          )}
        </span>
        <StatusTag status={p.status} extra={extra} />
      </li>
    );
  }

  return (
    <div className="space-y-10">
      <nav aria-label="Courses" className="flex gap-4 text-sm">
        {COURSES.map((c) => (
          <Link key={c.id} href={`/course/${c.id}`} aria-current={c.id === course.id ? "page" : undefined}
            className={c.id === course.id ? "font-medium text-ink" : "link"}>
            {c.title}
          </Link>
        ))}
      </nav>

      <header>
        <p className="eyebrow">Course map · {course.author}</p>
        <h1 className="mt-1 text-4xl">{course.title}</h1>
        <div className="mt-4 border-y border-rule">
          <CourseProgressBlock p={cp} />
        </div>
        <p className="mt-3 text-xs text-pencil">
          Legend: ○ Not started · ◐ Practicing · ! Needs rework · ✓ Proficient · ↻ Review due · ★ Mastered · 🔒︎ Locked.
          Sight-Size Minis, supplemental sheets and checkpoints never block progress.
        </p>
      </header>

      {course.sections.map((s) => {
        const items = EXERCISES.filter((e) => e.course === course.id && e.sectionId === s.id && e.type !== "supplemental");
        const all = items.flatMap((e) => [e, ...e.supplementalExerciseIds.map((sid) => getExercise(sid)!)]);
        const locked = all.every((e) => progress.get(e.id)!.status === "LOCKED");
        return (
          <section key={s.id} aria-labelledby={`sec-${s.id}`}>
            <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-rule pb-1">
              <h2 id={`sec-${s.id}`} className={s.isMini ? "text-lg italic text-graphite" : "text-2xl"}>
                {s.title}
              </h2>
              <span className="text-xs text-pencil">
                {BOOKS[s.instructionBook].title} {formatPages(s.instructionPages)}
              </span>
            </div>
            {locked ? (
              <p className="py-3 text-sm text-pencil">
                <span aria-hidden="true">🔒︎ </span>Locked — {lockReason(items[0], progress) ?? "opens later in the course"}.
              </p>
            ) : (
              <ul className="divide-y divide-rule/60">
                {items.map((e) => (
                  <ExerciseGroup key={e.id} e={e} Row={Row} />
                ))}
              </ul>
            )}
          </section>
        );
      })}
    </div>
  );
}

function ExerciseGroup({ e, Row }: { e: Exercise; Row: (p: { e: Exercise; nested?: boolean }) => React.ReactNode }) {
  return (
    <>
      <Row e={e} />
      {e.supplementalExerciseIds.map((sid) => (
        <Row key={sid} e={getExercise(sid)!} nested />
      ))}
    </>
  );
}
