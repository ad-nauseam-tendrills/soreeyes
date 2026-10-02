import Link from "next/link";
import type { CourseProgress } from "@/lib/progress/engine";

export function CourseProgressBlock({ p }: { p: CourseProgress }) {
  return (
    <Link href={`/course/${p.course}`} className="block py-5 no-underline hover:bg-paper-deep/50">
      <div className="flex items-baseline justify-between gap-4">
        <h3 className="font-serif text-xl">{p.title}</h3>
        <span className="text-sm text-graphite">{p.unlocked ? `${p.weightedPercent}%` : "Locked"}</span>
      </div>
      {p.unlocked ? (
        <>
          <div aria-hidden="true" className="mt-2 h-[3px] w-full bg-rule">
            <div className="h-full bg-ink" style={{ width: `${p.weightedPercent}%` }} />
          </div>
          <p className="mt-2 text-sm text-graphite">
            {p.introduced} / {p.total} introduced · {p.proficient} proficient · {p.mastered} mastered
            {p.reviewsDue > 0 && ` · ${p.reviewsDue} review${p.reviewsDue === 1 ? "" : "s"} due`}
            {p.needsRework > 0 && ` · ${p.needsRework} need${p.needsRework === 1 ? "s" : ""} rework`}
          </p>
          <p className="sr-only">Progress weighted by proficiency: {p.weightedPercent} percent.</p>
        </>
      ) : (
        <p className="mt-1 text-sm text-pencil">Opens when every An Accurate Eye exercise has reached Proficient.</p>
      )}
    </Link>
  );
}
