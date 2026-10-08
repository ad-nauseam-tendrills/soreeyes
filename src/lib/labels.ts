import type { ErrorCategory, ExerciseStatus, ExerciseType, Rating } from "@/lib/types";

export const RATING_LABELS: Record<Rating, string> = {
  accurate: "Accurate",
  mostly: "Mostly Accurate",
  rework: "Needs Rework",
};

export const ERROR_LABELS: Record<ErrorCategory, string> = {
  position: "Position",
  angle: "Angle",
  distance: "Distance",
  proportion: "Proportion",
  curvature: "Curvature",
  shape: "Shape",
  value: "Value",
  "too-large": "Too large",
  "too-small": "Too small",
  "too-high": "Too high",
  "too-low": "Too low",
  "too-left": "Too far left",
  "too-right": "Too far right",
  "too-steep": "Too steep",
  "too-shallow": "Too shallow",
  "too-dark": "Too dark",
  "too-light": "Too light",
  "small-shapes": "Small shapes too early",
  "broken-shapes": "Big shapes broken up",
  edges: "Edges",
  other: "Other",
};

/** Grouping for the "What kind of error?" picker. */
export const ERROR_GROUPS: { title: string; items: ErrorCategory[] }[] = [
  { title: "Skill", items: ["position", "angle", "distance", "proportion", "curvature", "shape", "value"] },
  { title: "Size", items: ["too-large", "too-small"] },
  { title: "Placement", items: ["too-high", "too-low", "too-left", "too-right"] },
  { title: "Angle", items: ["too-steep", "too-shallow"] },
  { title: "Value", items: ["too-dark", "too-light", "small-shapes", "broken-shapes", "edges"] },
  { title: "", items: ["other"] },
];

/** Opposite pairs used to spot directional tendencies. */
export const OPPOSITE_PAIRS: [ErrorCategory, ErrorCategory][] = [
  ["too-large", "too-small"],
  ["too-high", "too-low"],
  ["too-left", "too-right"],
  ["too-steep", "too-shallow"],
  ["too-dark", "too-light"],
];

export const STATUS_LABELS: Record<ExerciseStatus, string> = {
  LOCKED: "Locked",
  NOT_STARTED: "Not started",
  PRACTICING: "Practicing",
  NEEDS_REWORK: "Needs rework",
  PROFICIENT: "Proficient",
  REVIEW_DUE: "Review due",
  MASTERED: "Mastered",
};

/** Text glyphs — always paired with the text label, never used alone. */
export const STATUS_ICONS: Record<ExerciseStatus, string> = {
  LOCKED: "🔒︎",
  NOT_STARTED: "○",
  PRACTICING: "◐",
  NEEDS_REWORK: "!",
  PROFICIENT: "✓",
  REVIEW_DUE: "↻",
  MASTERED: "★",
};

export const TYPE_LABELS: Record<ExerciseType, string> = {
  core: "Core exercise",
  supplemental: "Supplemental practice",
  mini: "Sight-Size Mini",
  checkpoint: "Review and test",
};
