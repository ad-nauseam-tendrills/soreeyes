import type { Metadata } from "next";
import Link from "next/link";
import { getCourse, getExercise } from "@/content/course-data";
import { assetId } from "@/content/sheets";
import { MarkPrinted } from "@/components/MarkPrinted";
import { PrintScaleNote } from "@/components/SheetFigure";
import { formatDate, numberLabel, shortLabel } from "@/lib/display";
import { printHref } from "@/lib/print-href";
import { printPlan, type PrintItem } from "@/lib/progress/print";
import { toView } from "@/lib/sheet-view";
import { loadContext } from "@/lib/server/context";

export const metadata: Metadata = { title: "Print Center" };
export const dynamic = "force-dynamic";

const WHY: Record<PrintItem["why"], string> = {
  current: "Current exercise",
  review: "Review",
  rework: "Needs rework",
  revisit: "Revisit",
  upcoming: "Upcoming",
  supplemental: "Supplemental practice",
};

export default async function PrintCenter() {
  const { state, progress, plan, timeZone } = await loadContext();
  const pp = printPlan(progress, plan, state.printed);

  function Item({ it }: { it: PrintItem }) {
    const e = it.exercise;
    const ids = it.required.map(assetId);
    const allPrinted = ids.length > 0 && ids.every((id) => state.printed[id]);
    return (
      <li className="py-5">
        <p className="eyebrow">{WHY[it.why]}</p>
        <h3 className="mt-1 font-serif text-xl">
          <Link href={`/exercise/${e.id}`}>{getCourse(e.course)!.title}</Link>
        </h3>
        <p className="font-serif">{shortLabel(e)}</p>

        {it.required.length === 0 && it.reused.length === 0 && (
          <p className="mt-2 text-sm text-graphite">Nothing to print.</p>
        )}
        {it.required.length > 0 && (
          <ul className="mt-2 space-y-1 text-sm">
            {it.required.map((s) => {
              const v = toView(s);
              const when = state.printed[v.id];
              return (
                <li key={v.id}>
                  <span aria-hidden="true">{when ? "✓ " : "· "}</span>
                  {v.citation}
                  {when && <span className="text-pencil"> · printed {formatDate(when, timeZone)}</span>}
                </li>
              );
            })}
          </ul>
        )}
        {it.reused.map((r) => {
          const v = toView(r.sheet);
          return (
            <p key={v.id} className="mt-2 text-sm">
              Reuse your saved {v.label} from {numberLabel(getExercise(r.fromExerciseId)!)} ({v.citation}).{" "}
              <a className="link" href={printHref([v.id], v.label)} target="_blank" rel="noopener">
                Reprint
              </a>
            </p>
          );
        })}
        {it.hasHiddenKey && (
          <p className="mt-1 text-xs text-pencil">Checking key not included — it&apos;s under Check My Work after the attempt.</p>
        )}
        {e.finalPair && (
          <p className="mt-1 text-xs text-pencil">Shown for constricting; choose “dilate” on the exercise page to swap the sheets.</p>
        )}
        {ids.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-2">
            <a className="btn" href={printHref(ids, `${numberLabel(e)} required sheets`)} target="_blank" rel="noopener">
              {ids.length > 1 ? "Print Required Sheets" : "Print Exercise"}
            </a>
            <MarkPrinted ids={ids} printed={allPrinted} />
          </div>
        )}
      </li>
    );
  }

  return (
    <div className="space-y-12">
      <header>
        <h1 className="text-4xl">Print Center</h1>
        <p className="mt-2 text-graphite">Sheets come from your own copies of the books, cited by page.</p>
        <div className="mt-2">
          <PrintScaleNote />
        </div>
      </header>

      <section aria-labelledby="needed-h">
        <h2 id="needed-h" className="eyebrow">
          Currently needed
        </h2>
        {pp.needed.length === 0 ? (
          <p className="mt-3 text-sm text-pencil">Nothing right now.</p>
        ) : (
          <ul className="divide-y divide-rule border-y border-rule">
            {pp.needed.map((it) => (
              <Item key={it.exercise.id} it={it} />
            ))}
          </ul>
        )}
      </section>

      {pp.keep.length > 0 && (
        <section aria-labelledby="keep-h">
          <h2 id="keep-h" className="eyebrow">
            Keep these printed sheets
          </h2>
          <ul className="mt-3 space-y-2 text-sm">
            {pp.keep.map((k) => {
              const v = toView(k.sheet);
              return (
                <li key={v.id}>
                  <strong>{v.label}</strong> ({v.citation}) — reused by {k.reusedBy.map(numberLabel).join(", ")}.
                </li>
              );
            })}
          </ul>
        </section>
      )}

      <section aria-labelledby="up-h">
        <h2 id="up-h" className="eyebrow">
          Upcoming
        </h2>
        {pp.upcoming.length === 0 ? (
          <p className="mt-3 text-sm text-pencil">Nothing queued.</p>
        ) : (
          <ul className="divide-y divide-rule border-y border-rule">
            {pp.upcoming.map((it) => (
              <Item key={it.exercise.id} it={it} />
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
