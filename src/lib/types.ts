// Shared domain types. Course content lives in src/content; progress is derived
// from the attempt log in src/lib/progress.

export type CourseId = "aae" | "ce";

/** The four owner-supplied PDFs. */
export type BookId = "aae" | "sup" | "ceb" | "cew";

export type ExerciseType = "core" | "supplemental" | "mini" | "checkpoint";

export type Rotation = "45" | "180" | "vary" | "none";

export type ScaleDirection = "constrict" | "dilate";

/** One rendered page from one of the PDFs, e.g. AAE p.38. */
export interface SheetRef {
  book: BookId;
  page: number;
  /** What this sheet is in the context of the exercise, e.g. "Source", "Target", "Key 2a". */
  label: string;
}

/**
 * Every exercise's relationship to the book pages, split by role.
 * See COURSE_AUDIT.md → "Asset roles".
 */
export interface ExerciseSheets {
  /** Shown on screen before and during the attempt (the thing you look at / copy from). */
  display: SheetRef[];
  /** Printed: the source you work from (often also the overlay check reference). */
  printSources: SheetRef[];
  /** Printed: blank target sheet you draw on (Supplement pairs). */
  printTargets: SheetRef[];
  /**
   * Key the book requires during *setup* (CE 4c+: mark top and bottom, then set aside).
   * Included in "Print Required Sheets"; never displayed on screen before Check My Work.
   */
  setupKeys: SheetRef[];
  /** Hidden checking/key asset. Only rendered after Finish Attempt → Check My Work. */
  checkKeys: SheetRef[];
  /** Sheets printed for an earlier exercise and reused here (keep them!). */
  reused: { sheet: SheetRef; fromExerciseId: string }[];
}

/** Finals let you choose to constrict or dilate; sources and keys swap accordingly. */
export interface FinalPair {
  reduced: SheetRef;
  enlarged: SheetRef;
}

export interface Exercise {
  id: string;
  course: CourseId;
  sectionId: string;
  title: string;
  /** As printed in the book: "8", "3a", "Final 1", "Mini #2". */
  exerciseNumber: string;
  type: ExerciseType;
  /** Book whose pages hold the exercise sheet (citations). */
  book: BookId;
  /** Instruction pages and the book they are in (AAE/SUP/CEB). */
  instructionBook: BookId;
  instructionPages: number[];
  sheets: ExerciseSheets;
  finalPair?: FinalPair;
  estimatedMinutes: [number, number];
  materialIds: string[];
  /** One-line goal. */
  summary: string;
  /** Concise paraphrased steps. */
  instructions: string[];
  /** Hidden until the attempt is finished. */
  checkingInstructions: string[];
  rotation: Rotation;
  rotationNote?: string;
  /** Exercise ids that must have reached Proficient (or "introduced" for minis). */
  prerequisites: string[];
  prerequisiteMode: "proficient" | "introduced";
  /** Whether this exercise must be proficient before the course moves on. */
  gating: boolean;
  recommendedAttempts: string;
  masteryGuidance: string;
  supplementalExerciseIds: string[];
  parentId?: string;
  /** Target scale (CE): drawing size ÷ source size. */
  scale?: { factor: number; label: string };
  notes: string[];
}

export interface Section {
  id: string;
  course: CourseId;
  title: string;
  instructionPages: number[];
  instructionBook: BookId;
  /** Section is a Sight-Size Mini chapter (rendered more quietly in the map). */
  isMini?: boolean;
}

export interface Course {
  id: CourseId;
  title: string;
  author: string;
  sections: Section[];
}

export interface Material {
  id: string;
  name: string;
  source: string;
  optional?: boolean;
}

// ───────────────────────────── Progress ─────────────────────────────

export const RATINGS = ["accurate", "mostly", "rework"] as const;
export type Rating = (typeof RATINGS)[number];

export const ERROR_CATEGORIES = [
  "position",
  "angle",
  "distance",
  "proportion",
  "curvature",
  "shape",
  "value",
  "too-large",
  "too-small",
  "too-high",
  "too-low",
  "too-left",
  "too-right",
  "too-steep",
  "too-shallow",
  "too-dark",
  "too-light",
  "other",
] as const;
export type ErrorCategory = (typeof ERROR_CATEGORIES)[number];

export interface Attempt {
  id: string;
  exerciseId: string;
  /** ISO timestamps. */
  startedAt: string;
  finishedAt: string;
  /** Active drawing time in seconds (pauses excluded). */
  durationSec: number;
  rating: Rating;
  errors: ErrorCategory[];
  notes: string;
  /** Finals only. */
  direction?: ScaleDirection;
  /** Stored photo id (private, owner-only). */
  photoId?: string;
}

export interface AppState {
  schemaVersion: 1;
  attempts: Attempt[];
  /** assetId (e.g. "aae-p038") → ISO date printed. */
  printed: Record<string, string>;
  /** materialId → have it. */
  materialsOwned: Record<string, boolean>;
  settings: {
    showTimer: boolean;
    /** Max review items suggested per day. */
    reviewCap: number;
  };
}

export type ExerciseStatus =
  | "LOCKED"
  | "NOT_STARTED"
  | "PRACTICING"
  | "NEEDS_REWORK"
  | "PROFICIENT"
  | "REVIEW_DUE"
  | "MASTERED";
