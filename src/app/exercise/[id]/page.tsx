import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getCourse, getExercise, sectionOf } from "@/content/course-data";
import { MATERIALS_BY_ID } from "@/content/materials";
import { exerciseCitation, instructionCitation, resolveSheets } from "@/content/sheets";
import { PracticeFlow, type PracticeProps, type ResolvedSheetViews } from "@/components/PracticeFlow";
import { ERROR_LABELS, RATING_LABELS, STATUS_LABELS, TYPE_LABELS } from "@/lib/labels";
import { formatDate, formatDuration, minutesLabel, numberLabel, relativeDays } from "@/lib/display";
import { lockReason } from "@/lib/progress/locks";
import { toView } from "@/lib/sheet-view";
import { loadContext } from "@/lib/server/context";
import type { Exercise, ScaleDirection } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const e = getExercise((await params).id);
  return { title: e ? numberLabel(e) : "Exercise" };
}

function sheetViews(e: Exercise, direction?: ScaleDirection): ResolvedSheetViews {
  const s = resolveSheets(e, direction);
  return {
    display: s.display.map(toView),
    required: [...s.printSources, ...s.printTargets].map(toView),
    setupKeys: s.setupKeys.map(toView),
    checkKeys: s.checkKeys.map(toView),
    reused: s.reused.map((r) => ({ sheet: toView(r.sheet), from: numberLabel(getExercise(r.fromExerciseId)!) })),
  };
}

export default async function ExercisePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const e = getExercise(id);
  if (!e) notFound();
  const { state, progress, now, timeZone } = await loadContext();
  const p = progress.get(e.id)!;

  const sheets: PracticeProps["sheets"] = e.finalPair
    ? { constrict: sheetViews(e, "constrict"), dilate: sheetViews(e, "dilate") }
    : { default: sheetViews(e) };

  const allIds = new Set<string>();
  for (const v of Object.values(sheets)) {
    for (const s of [...v.required, ...v.setupKeys, ...v.reused.map((r) => r.sheet)]) allIds.add(s.id);
  }
  const printed: Record<string, boolean> = {};
  for (const sid of allIds) printed[sid] = Boolean(state.printed[sid]);

  const recent = p.attempts.slice(-3).reverse().map((a, i) => ({
    id: a.id,
    label: `Attempt #${p.attempts.length - i} · ${formatDate(a.finishedAt, timeZone)}`,
    rating: RATING_LABELS[a.rating],
    errors: a.errors.map((c) => ERROR_LABELS[c]),
    notes: a.notes,
    duration: formatDuration(a.durationSec),
  }));

  const parent = e.parentId ? getExercise(e.parentId) : undefined;
  const supps = e.supplementalExerciseIds.map((sid) => {
    const s = getExercise(sid)!;
    const sp = progress.get(sid)!;
    return { id: sid, label: numberLabel(s), status: STATUS_LABELS[sp.status], locked: sp.status === "LOCKED" };
  });

  const props: PracticeProps = {
    exerciseId: e.id,
    title: e.title,
    numberLabel: numberLabel(e),
    sectionTitle: sectionOf(e).title,
    courseTitle: getCourse(e.course)!.title,
    typeLabel: TYPE_LABELS[e.type],
    type: e.type,
    citation: exerciseCitation(e),
    instructionCitation: instructionCitation(e),
    summary: e.summary,
    instructions: e.instructions,
    checkingInstructions: e.checkingInstructions,
    rotationNote: e.rotationNote,
    minutes: minutesLabel(e),
    recommended: e.recommendedAttempts,
    mastery: e.masteryGuidance,
    notes: e.notes,
    scaleLabel: e.scale?.label,
    materials: e.materialIds.map((m) => ({
      id: m,
      name: MATERIALS_BY_ID.get(m)!.name,
      optional: Boolean(MATERIALS_BY_ID.get(m)!.optional),
      owned: Boolean(state.materialsOwned[m]),
    })),
    sheets,
    printed,
    status: p.status,
    statusLabel: STATUS_LABELS[p.status],
    locked: p.status === "LOCKED",
    lockReason: p.status === "LOCKED" ? lockReason(e, progress) : undefined,
    attemptCount: p.attempts.length,
    nextReview: p.nextReviewAt ? relativeDays(p.nextReviewAt, now) : undefined,
    recent,
    showTimer: state.settings.showTimer,
    parent: parent ? { id: parent.id, label: numberLabel(parent) } : undefined,
    supplementals: supps,
  };

  return (
    <div>
      <nav aria-label="Breadcrumb" className="no-print mb-6 text-sm text-pencil">
        <Link href={`/course/${e.course}`} className="link">
          {props.courseTitle}
        </Link>{" "}
        / {props.sectionTitle}
      </nav>
      <PracticeFlow {...props} />
    </div>
  );
}
