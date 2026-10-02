import { STATUS_ICONS, STATUS_LABELS } from "@/lib/labels";
import type { ExerciseStatus } from "@/lib/types";

const TONE: Record<ExerciseStatus, string> = {
  LOCKED: "text-pencil",
  NOT_STARTED: "text-graphite",
  PRACTICING: "text-ink",
  NEEDS_REWORK: "text-ochre",
  PROFICIENT: "text-moss",
  REVIEW_DUE: "text-sienna",
  MASTERED: "text-moss",
};

/** Status is always conveyed by text; icon and tone are secondary cues. */
export function StatusTag({ status, extra }: { status: ExerciseStatus; extra?: string }) {
  return (
    <span className={`inline-flex items-baseline gap-1.5 text-sm ${TONE[status]}`}>
      <span aria-hidden="true" className="inline-block w-4 text-center font-serif">
        {STATUS_ICONS[status]}
      </span>
      <span>
        {STATUS_LABELS[status]}
        {extra ? ` · ${extra}` : ""}
      </span>
    </span>
  );
}
