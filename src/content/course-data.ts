// Structured curriculum for An Accurate Eye (+ Supplemental Content) and
// A Comparative Eye (Course Book + Workbook).
//
// Every page reference here is verified in COURSE_AUDIT.md. PDF page numbers are
// used throughout (they equal the printed page numbers in AAE, SUP and CEB; the
// Workbook has no printed numbers). Instructions are short paraphrased reminders.

import type {
  BookId,
  Course,
  Exercise,
  ExerciseSheets,
  Rotation,
  Section,
  SheetRef,
} from "@/lib/types";

// ───────────────────────────── helpers ─────────────────────────────

const sheet = (book: BookId, page: number, label: string): SheetRef => ({ book, page, label });

const noSheets = (): ExerciseSheets => ({
  display: [],
  printSources: [],
  printTargets: [],
  setupKeys: [],
  checkKeys: [],
  reused: [],
});

const range = (a: number, b: number) => Array.from({ length: b - a + 1 }, (_, i) => a + i);

const TRACE_MATERIALS = ["pencil-h-2b", "erasers", "tracing-paper", "ruler", "printer"];
const CUTOUT_MATERIALS = [...TRACE_MATERIALS, "scissors", "white-paper"];
const VALUE_MATERIALS = ["charcoal", "pencil-h-2b", "erasers", "drawing-paper", "scissors", "printer"];
const CE_MATERIALS = ["pencil-2b", "erasers", "tracing-paper", "ruler", "colored-pencil", "printer"];
const MINI_MATERIALS = ["drawing-paper", "pencil-h-2b", "erasers", "ruler", "hand-mirror", "object"];

const OVERLAY_CHECK = [
  "Lay your tracing directly over the printed source and line it up.",
  "Note each error (direction and amount) without fixing it yet.",
  "Set the tracing back beside the source and correct by eye, then check again.",
];

const AAE_ROTATE_NOTE = "Rotate the whole setup 45° from your previous attempt so memory doesn't do the work.";

interface AaeCoreOpts {
  section: string;
  title: string;
  page: number;
  instructionPages: number[];
  summary: string;
  instructions: string[];
  checking?: string[];
  prerequisites: string[];
  rotation?: Rotation;
  rotationNote?: string;
  materials?: string[];
  mastery: string;
  recommended?: string;
  supps?: string[];
  notes?: string[];
  extraDisplay?: SheetRef[];
  printRecommendedOnly?: boolean;
  minutes?: [number, number];
}

function aaeCore(n: number, o: AaeCoreOpts): Exercise {
  const src = sheet("aae", o.page, `Exercise ${n}`);
  const sheets = noSheets();
  sheets.display = [src, ...(o.extraDisplay ?? [])];
  sheets.printSources = [src];
  return {
    id: `aae-${String(n).padStart(2, "0")}`,
    course: "aae",
    sectionId: o.section,
    title: o.title,
    exerciseNumber: String(n),
    type: "core",
    book: "aae",
    instructionBook: "aae",
    instructionPages: o.instructionPages,
    sheets,
    estimatedMinutes: o.minutes ?? [15, 30],
    materialIds: o.materials ?? TRACE_MATERIALS,
    summary: o.summary,
    instructions: o.instructions,
    checkingInstructions: o.checking ?? OVERLAY_CHECK,
    rotation: o.rotation ?? "45",
    rotationNote: o.rotationNote ?? (o.rotation === undefined || o.rotation === "45" ? AAE_ROTATE_NOTE : undefined),
    prerequisites: o.prerequisites,
    prerequisiteMode: "proficient",
    gating: true,
    recommendedAttempts: o.recommended ?? "Repeat over several days until you are accurate far more often than not.",
    masteryGuidance: o.mastery,
    supplementalExerciseIds: o.supps ?? [],
    notes: [
      ...(o.printRecommendedOnly
        ? ["Printing is recommended but optional — the book allows tracing from the screen."]
        : []),
      ...(o.notes ?? []),
    ],
  };
}

interface SuppOpts {
  code: string; // "3a"
  parent: string; // "aae-03"
  section: string;
  kind: string; // "Positioning"
  pages: number[]; // [source] or [source, target]
  notes?: string[];
}

function supp(o: SuppOpts): Exercise {
  const sheets = noSheets();
  const [srcPage, targetPage] = o.pages;
  const src = sheet("sup", srcPage, `Supplemental ${o.code} · Source`);
  sheets.display = [src];
  sheets.printSources = [src];
  const single = targetPage === undefined;
  if (!single) {
    sheets.printTargets = [sheet("sup", targetPage, `Supplemental ${o.code} · Target`)];
  } else {
    src.label = `Supplemental ${o.code}`;
  }
  const centering = o.kind === "Centering";
  return {
    id: `sup-${o.code}`,
    course: "aae",
    sectionId: o.section,
    title: o.kind,
    exerciseNumber: o.code,
    type: "supplemental",
    book: "sup",
    instructionBook: "sup",
    instructionPages: [4, 6],
    sheets,
    estimatedMinutes: [15, 30],
    materialIds: ["pencil-h-2b", "erasers", "ruler", "printer"],
    summary: centering
      ? "Extra centering practice on deliberately tilted lines and shapes."
      : `Extra ${o.kind.toLowerCase()} practice: copy from the source page onto the blank target page by eye.`,
    instructions: centering
      ? [
          "Print the sheet and work directly on it — no tracing needed.",
          "Find each centre by eye only and mark it.",
          "Follow the main-book directions for the matching exercise.",
        ]
      : [
          "Print both pages: the source (with the answers you copy from) and the blank target.",
          "Set them side by side in Sight-Size (target on your drawing-hand side).",
          "Work on the target by eye only, following the main-book directions for this exercise.",
        ],
    checkingInstructions: centering
      ? ["Measure with a ruler (lines) or cross the corners (rectangles) and mark the true centre."]
      : [
          "Lay the target over the source and hold the pair up to a window (or trace the source) to compare.",
          "Note the direction of each error before your next attempt.",
        ],
    rotation: "45",
    rotationNote: AAE_ROTATE_NOTE,
    prerequisites: [o.parent],
    prerequisiteMode: "proficient",
    gating: false,
    parentId: o.parent,
    recommendedAttempts: "Use alongside the main exercise; stop when errors no longer shrink after 4–5 attempts (SUP p.5).",
    masteryGuidance: "Aim for 100% accuracy; move on once errors stop improving or repeat in the same place (SUP p.5).",
    supplementalExerciseIds: [],
    notes: o.notes ?? [],
  };
}

interface MiniOpts {
  n: number;
  section: string;
  pages: number[];
  photoPage: number;
  anchor: string;
  extraPrereq?: string[];
  summary: string;
  instructions: string[];
  materials?: string[];
  notes?: string[];
}

function mini(o: MiniOpts): Exercise {
  const sheets = noSheets();
  sheets.display = [sheet("aae", o.photoPage, `Mini #${o.n} setup example (reference)`)];
  return {
    id: `mini-${o.n}`,
    course: "aae",
    sectionId: o.section,
    title: `Sight-Size Mini #${o.n}`,
    exerciseNumber: `Mini #${o.n}`,
    type: "mini",
    book: "aae",
    instructionBook: "aae",
    instructionPages: o.pages,
    sheets,
    estimatedMinutes: [15, 30],
    materialIds: o.materials ?? MINI_MATERIALS,
    summary: o.summary,
    instructions: o.instructions,
    checkingInstructions: [
      "Stay in your drawing position; rest a hand mirror's edge on your eyebrows and tilt it until you see the setup reversed.",
      "Mark each error with a small tick — don't fix anything yet.",
      "Put the mirror down and correct, using your marks as guides.",
    ],
    rotation: "none",
    prerequisites: [o.anchor, ...(o.extraPrereq ?? [])],
    prerequisiteMode: "introduced",
    gating: false,
    recommendedAttempts: "Optional. Repeat as often as you like — starts, not finish.",
    masteryGuidance:
      "Minis supplement the exercises and never replace them. If your motivation holds, the author suggests saving them until the numbered exercises are done (AAE p.16).",
    supplementalExerciseIds: [],
    notes: o.notes ?? [],
  };
}

interface CeOpts {
  code: string; // "2a"
  section: string;
  title: string;
  instructionPages: number[];
  sheetPage: number;
  sheetLabel?: string;
  reusedFrom?: string;
  keyPage: number;
  keyLabel?: string;
  setupKey?: boolean;
  scale: { factor: number; label: string };
  prerequisites: string[];
  rotation: Rotation;
  summary: string;
  instructions: string[];
  checking?: string[];
  minutes?: [number, number];
  recommended?: string;
  mastery?: string;
  notes?: string[];
  materials?: string[];
  /** Reference figures from the Course Book shown alongside the sheet. */
  extraDisplay?: SheetRef[];
}

function ce(o: CeOpts): Exercise {
  const sheets = noSheets();
  const src = sheet("cew", o.sheetPage, o.sheetLabel ?? `Exercise ${o.code}`);
  const key = sheet("cew", o.keyPage, o.keyLabel ?? `Key ${o.code}`);
  sheets.display = [src, ...(o.extraDisplay ?? [])];
  if (o.reusedFrom) sheets.reused = [{ sheet: src, fromExerciseId: o.reusedFrom }];
  else sheets.printSources = [src];
  sheets.checkKeys = [key];
  if (o.setupKey) sheets.setupKeys = [{ ...key, label: `${key.label} · for setup marks only` }];
  return {
    id: `ce-${o.code}`,
    course: "ce",
    sectionId: o.section,
    title: o.title,
    exerciseNumber: o.code,
    type: "core",
    book: "cew",
    instructionBook: "ceb",
    instructionPages: o.instructionPages,
    sheets,
    estimatedMinutes: o.minutes ?? [15, 30],
    materialIds: o.materials ?? CE_MATERIALS,
    summary: o.summary,
    instructions: o.instructions,
    checkingInstructions: o.checking ?? [
      `Lay your tracing over Key ${o.code}; shift it as needed so your drawing lines up with the key's shape.`,
      "Mark the errors in colored pencil.",
      "Before your next attempt, look back for errors that repeat in the same direction.",
    ],
    rotation: o.rotation,
    rotationNote:
      o.rotation === "45"
        ? "Rotate the exercise 45° from your previous attempt."
        : o.rotation === "none"
          ? "Do not rotate the bone and figure exercises (CEB p.38)."
          : undefined,
    prerequisites: o.prerequisites,
    prerequisiteMode: "proficient",
    gating: true,
    recommendedAttempts: o.recommended ?? "A few days to a week of practice, until accurate most of the time.",
    masteryGuidance:
      o.mastery ??
      "Proportions within the shape matter more than hitting the exact scale (CEB p.19–20). Aim for the key; settle for correct proportions.",
    supplementalExerciseIds: [],
    scale: o.scale,
    notes: o.notes ?? [],
  };
}

// ───────────────────────────── courses ─────────────────────────────

export const COURSES: Course[] = [
  {
    id: "aae",
    title: "An Accurate Eye",
    author: "Darren R. Rousar",
    sections: [
      { id: "position", course: "aae", title: "Position", instructionBook: "aae", instructionPages: range(18, 27) },
      { id: "mini-1", course: "aae", title: "Sight-Size Mini #1", instructionBook: "aae", instructionPages: range(31, 35), isMini: true },
      { id: "angle", course: "aae", title: "Angle", instructionBook: "aae", instructionPages: [36, 37, 43] },
      { id: "mini-2", course: "aae", title: "Sight-Size Mini #2", instructionBook: "aae", instructionPages: [44, 45], isMini: true },
      { id: "distance", course: "aae", title: "Distance", instructionBook: "aae", instructionPages: [46, ...range(50, 52)] },
      { id: "curvature", course: "aae", title: "Curvature", instructionBook: "aae", instructionPages: [55] },
      { id: "mini-3", course: "aae", title: "Sight-Size Mini #3", instructionBook: "aae", instructionPages: [59, 60], isMini: true },
      { id: "shape", course: "aae", title: "Shape", instructionBook: "aae", instructionPages: [61, 62, ...range(67, 69), 72] },
      { id: "mini-4", course: "aae", title: "Sight-Size Mini #4", instructionBook: "aae", instructionPages: [73, 74], isMini: true },
      { id: "value", course: "aae", title: "Value", instructionBook: "aae", instructionPages: range(75, 79) },
      { id: "value-2", course: "aae", title: "Value 2", instructionBook: "aae", instructionPages: [82, 84] },
      { id: "mini-5", course: "aae", title: "Sight-Size Mini #5", instructionBook: "aae", instructionPages: [87, 88], isMini: true },
    ] satisfies Section[],
  },
  {
    id: "ce",
    title: "A Comparative Eye",
    author: "Darren R. Rousar",
    sections: [
      { id: "first-steps", course: "ce", title: "First Steps", instructionBook: "ceb", instructionPages: range(22, 24) },
      { id: "constriction", course: "ce", title: "Constriction", instructionBook: "ceb", instructionPages: range(25, 29) },
      { id: "dilation", course: "ce", title: "Dilation", instructionBook: "ceb", instructionPages: range(30, 34) },
      { id: "cc1", course: "ce", title: "Complex Constriction I", instructionBook: "ceb", instructionPages: range(35, 39) },
      { id: "cd1", course: "ce", title: "Complex Dilation I", instructionBook: "ceb", instructionPages: range(40, 43) },
      { id: "cc2", course: "ce", title: "Complex Constriction II", instructionBook: "ceb", instructionPages: range(44, 47) },
      { id: "cd2", course: "ce", title: "Complex Dilation II", instructionBook: "ceb", instructionPages: range(48, 51) },
      { id: "final", course: "ce", title: "Final Exercises", instructionBook: "ceb", instructionPages: [52, 53] },
    ] satisfies Section[],
  },  {
    id: "pv",
    title: "Portrait Value",
    author: "Chelsea Lang's method (value module demo)",
    independent: true,
    sections: [
      { id: "pv-value", course: "pv", title: "Value studies", instructionBook: "lang", instructionPages: [] },
    ] satisfies Section[],
  },
];

// ───────────────────────────── An Accurate Eye ─────────────────────────────

const POSITION_MASTERY = "Accurate far more often than not (AAE p.18). Spend as many days as it takes, ~30 min/day (p.27).";
const ANGLE_MASTERY = "15–30 min a day for about a week, or until most examples succeed (AAE p.37).";
const CURVE_MASTERY = "As many days as needed to get them mostly correct (AAE p.55).";
const SHAPE_MASTERY = "As many days as needed to get them mostly correct (AAE p.61).";
const VALUE_MASTERY = "15–30 min a day for about a week per exercise, depending on results (AAE p.79).";

const AAE: Exercise[] = [
  // Position
  aaeCore(1, {
    section: "position",
    title: "Centering · lines",
    page: 19,
    instructionPages: [18, 20, 21],
    printRecommendedOnly: true,
    summary: "Find the midpoint of 20 straight lines by eye.",
    instructions: [
      "Trace the 20 lines onto tracing paper with pencil and ruler.",
      "Using only your eye, mark where you think each centre is.",
      "Only once you're confident in every guess, move on to checking.",
    ],
    checking: [
      "Measure each line with the ruler.",
      "Add a new dot at the true centre so your error stays visible.",
      "Are your misses consistently to one side? Carry that into the next attempt.",
    ],
    prerequisites: [],
    mastery: POSITION_MASTERY,
    supps: ["sup-1a", "sup-1b", "sup-1c"],
    notes: ["Variations: make your own (longer) lines, or mark thirds instead of halves."],
  }),
  aaeCore(2, {
    section: "position",
    title: "Centering · rectangles",
    page: 22,
    instructionPages: [20],
    printRecommendedOnly: true,
    summary: "Find the centre of each rectangle by eye.",
    instructions: ["Trace the rectangles.", "Mark each centre by eye only.", "Check only after every guess is placed."],
    checking: [
      "With a ruler, draw lines between opposite corners — the centre is where they cross (see the example check at the top of the sheet).",
      "Note how far, and which way, each guess missed.",
    ],
    prerequisites: ["aae-01"],
    mastery: POSITION_MASTERY,
    supps: ["sup-2a", "sup-2b", "sup-2c"],
    notes: ["Harder variation: larger boxes of your own."],
  }),
  aaeCore(3, {
    section: "position",
    title: "Positioning · dots on lines",
    page: 23,
    instructionPages: [20],
    summary: "Copy the positions of dots on straight and curved lines by eye.",
    instructions: [
      "Trace every line onto tracing paper — not the dots.",
      "Put the tracing over a white sheet beside the source.",
      "By eye, place each dot on your tracing. Relate it to the line's ends and, on curves, to the apex.",
      "For lines with several dots, triangulate their positions visually.",
    ],
    checking: [
      "Lay the tracing over the source and note each miss, line by line.",
      "Set it beside the source again and correct by eye; then check the corrections.",
    ],
    prerequisites: ["aae-01", "aae-02"],
    materials: [...TRACE_MATERIALS, "white-paper"],
    mastery: POSITION_MASTERY,
    supps: ["sup-3a", "sup-3b"],
    notes: ["The book says to start Exercises 3 and 4 once you're proficient at 1 and 2."],
  }),
  aaeCore(4, {
    section: "position",
    title: "Positioning · dots on lines",
    page: 24,
    instructionPages: [20],
    summary: "Same as Exercise 3 with a new sheet.",
    instructions: [
      "Trace the lines (not the dots) and set the tracing beside the source on white paper.",
      "Place every dot by eye, relating it to the ends of the line and to any curve's apex.",
    ],
    checking: OVERLAY_CHECK,
    prerequisites: ["aae-03"],
    materials: [...TRACE_MATERIALS, "white-paper"],
    mastery: POSITION_MASTERY,
    supps: ["sup-4a", "sup-4b"],
  }),
  ...[
    { n: 5, page: 28, kind: "rectangles", supps: ["sup-5a", "sup-5b"] },
    { n: 6, page: 29, kind: "straight-edged abstract shapes", supps: ["sup-6a", "sup-6b"] },
    { n: 7, page: 30, kind: "curved abstract shapes", supps: ["sup-7a"] },
  ].map(({ n, page, kind, supps }) =>
    aaeCore(n, {
      section: "position",
      title: `Targeting · ${kind}`,
      page,
      instructionPages: range(25, 27),
      summary: `Plot dots inside ${kind} by relating them to the outline.`,
      instructions: [
        "Print the page; trace the shapes (not the dots), using a ruler for straight edges.",
        "Cut out the shapes from both the print and the tracing, keeping the lines.",
        "Put one source shape and its tracing side by side on white paper — tracing on your drawing-hand side. Align them.",
        "Close one eye and, without measuring, place the dot where you see it relative to the whole outline.",
        "Flick your eye quickly between source and tracing; if the dot seems to jump, adjust it.",
      ],
      checking: [
        "Lay the tracing over the source and study the miss — briefly.",
        "Put them back side by side and make a second attempt.",
        "Recheck, and this time mark where the dot should be.",
      ],
      prerequisites: [`aae-${String(n - 1).padStart(2, "0")}`],
      rotationNote: "Rotate source and target 45° from the previous day's setup.",
      materials: CUTOUT_MATERIALS,
      mastery: POSITION_MASTERY,
      recommended: "As many days as possible, ~30 minutes a day (AAE p.27).",
      supps,
      printRecommendedOnly: n === 5,
      notes: n === 5 ? ["Begin with example A."] : [],
    }),
  ),
  supp({ code: "1a", parent: "aae-01", section: "position", kind: "Centering", pages: [7] }),
  supp({ code: "1b", parent: "aae-01", section: "position", kind: "Centering", pages: [8] }),
  supp({ code: "1c", parent: "aae-01", section: "position", kind: "Centering", pages: [9] }),
  supp({ code: "2a", parent: "aae-02", section: "position", kind: "Centering", pages: [10] }),
  supp({ code: "2b", parent: "aae-02", section: "position", kind: "Centering", pages: [11] }),
  supp({ code: "2c", parent: "aae-02", section: "position", kind: "Centering", pages: [12] }),
  supp({ code: "3a", parent: "aae-03", section: "position", kind: "Positioning", pages: [13, 14] }),
  supp({ code: "3b", parent: "aae-03", section: "position", kind: "Positioning", pages: [15, 16] }),
  supp({ code: "4a", parent: "aae-04", section: "position", kind: "Positioning", pages: [17, 18] }),
  supp({ code: "4b", parent: "aae-04", section: "position", kind: "Positioning", pages: [19, 20] }),
  supp({ code: "5a", parent: "aae-05", section: "position", kind: "Targeting", pages: [21, 22] }),
  supp({ code: "5b", parent: "aae-05", section: "position", kind: "Targeting", pages: [23, 24] }),
  supp({ code: "6a", parent: "aae-06", section: "position", kind: "Targeting", pages: [25, 26] }),
  supp({
    code: "6b",
    parent: "aae-06",
    section: "position",
    kind: "Targeting",
    pages: [27, 28],
    notes: ["Some dots sit outside the shape on purpose (SUP p.6)."],
  }),
  supp({ code: "7a", parent: "aae-07", section: "position", kind: "Targeting", pages: [29, 30] }),
  mini({
    n: 1,
    section: "mini-1",
    pages: range(31, 35),
    photoPage: 35,
    anchor: "aae-07",
    summary: "Draw a simple, flat, man-made object at Sight-Size on a tabletop grid.",
    instructions: [
      "Rule a box that fits the object one way and is twice as long the other; split it into subject and drawing halves.",
      "Divide each half into 32 equal rectangles (eighths one way, quarters the other).",
      "Object in its half, paper flat, viewed from above (or on a slightly tilted board); light evenly from the side opposite your drawing hand.",
      "Close one eye and draw the outline, relating it to the whole border and grid while seeing through the grid lines.",
      "Flick between object and drawing; fix any part that jumps. Add shadow shapes only if time remains.",
      "Setup takes time; keep the drawing itself to ~15–30 minutes.",
    ],
  }),

  // Angle
  aaeCore(8, {
    section: "angle",
    title: "Angle · vertical knowns",
    page: 38,
    instructionPages: [36, 37],
    summary: "Draw each angled line against a traced vertical.",
    instructions: [
      "Print the page; trace only the vertical lines.",
      "Align the tracing beside the printout.",
      "Draw each angled line by eye (a ruler for straightness is fine). Length doesn't matter — angle does.",
      "Flick between source and attempt to check as you go.",
    ],
    checking: [
      "Lay the tracing over the source.",
      "If you missed, don't erase — draw a second attempt beside the first; the errant line helps you judge.",
      "If the sheet wasn't fully correct, redo it with the whole setup tilted about 45°.",
    ],
    prerequisites: ["aae-07"],
    mastery: ANGLE_MASTERY,
    recommended: "15–30 minutes a day, for about a week.",
    supps: ["sup-8a", "sup-8b"],
    notes: ["Notice utility poles and sign posts — they're rarely truly vertical."],
  }),
  aaeCore(9, {
    section: "angle",
    title: "Angle · horizontal knowns",
    page: 39,
    instructionPages: [37],
    summary: "As Exercise 8, but against traced horizontals.",
    instructions: ["Print and trace only the horizontal lines.", "Draw each angle by eye against its horizontal.", "Flick to check before overlaying."],
    checking: [
      "Overlay and compare; leave errors in place and redraw beside them.",
      "Repeat at a 45° tilt if the sheet wasn't fully correct.",
    ],
    prerequisites: ["aae-08"],
    mastery: ANGLE_MASTERY,
    supps: ["sup-9a"],
    notes: ["Start once you succeed at Exercise 8 more often than you fail."],
  }),
  aaeCore(10, {
    section: "angle",
    title: "Angle · angled knowns",
    page: 40,
    instructionPages: [37],
    summary: "The known lines are themselves slightly angled.",
    instructions: ["In each pair, trace either line as your known.", "Draw the other line's angle by eye."],
    prerequisites: ["aae-09"],
    mastery: ANGLE_MASTERY,
    supps: ["sup-10a"],
  }),
  aaeCore(11, {
    section: "angle",
    title: "Angle · illusions",
    page: 41,
    instructionPages: [37],
    summary: "Angles set inside mild optical illusions.",
    instructions: ["Trace the lines that end in dots — they are the knowns.", "Draw the remaining line at its correct angle."],
    prerequisites: ["aae-10"],
    mastery: ANGLE_MASTERY,
    supps: ["sup-11a"],
  }),
  aaeCore(12, {
    section: "angle",
    title: "Angle · curved knowns",
    page: 42,
    instructionPages: [37],
    summary: "Illusions with curved knowns; some examples need two lines.",
    instructions: ["Trace the lines that end in dots.", "Draw the remaining line(s) at their correct angles."],
    prerequisites: ["aae-11"],
    mastery: ANGLE_MASTERY,
    supps: ["sup-12a"],
  }),
  supp({
    code: "8a",
    parent: "aae-08",
    section: "angle",
    kind: "Angle",
    pages: [31, 32],
  }),
  supp({
    code: "8b",
    parent: "aae-08",
    section: "angle",
    kind: "Angle",
    pages: [33, 34],
    notes: ["Lines sit farther from the vertical reference on purpose (SUP p.6)."],
  }),
  supp({ code: "9a", parent: "aae-09", section: "angle", kind: "Angle", pages: [35, 36] }),
  supp({ code: "10a", parent: "aae-10", section: "angle", kind: "Angle", pages: [37, 38] }),
  supp({ code: "11a", parent: "aae-11", section: "angle", kind: "Angle", pages: [39, 40] }),
  supp({ code: "12a", parent: "aae-12", section: "angle", kind: "Angle", pages: [41, 42] }),
  {
    id: "check-1",
    course: "aae",
    sectionId: "angle",
    title: "Review and Test · one third of the way",
    exerciseNumber: "Review",
    type: "checkpoint",
    book: "aae",
    instructionBook: "aae",
    instructionPages: [43],
    sheets: noSheets(),
    estimatedMinutes: [15, 30],
    materialIds: TRACE_MATERIALS,
    summary: "Look back over your sheets for repeated errors, then retest yourself on any earlier exercise.",
    instructions: [
      "Go through your saved attempts exercise by exercise. Do the same kinds of errors keep appearing?",
      "Pick any earlier exercise and redo it.",
    ],
    checkingInstructions: [
      "Compare this redo with your first attempts at the same exercise.",
      "Better than the first time → go on to Sight-Size Mini #2 / Distance.",
      "Not as hoped → reread the opening chapters (AAE p.5–17) and consider starting again at Exercise 1.",
    ],
    rotation: "45",
    prerequisites: ["aae-12"],
    prerequisiteMode: "proficient",
    gating: false,
    recommendedAttempts: "Once, at this point in the course.",
    masteryGuidance: "On upcoming exercises, lean slightly against the direction of your habitual errors.",
    supplementalExerciseIds: [],
    notes: ["Your Error Journal is a quick way to do the look-back."],
  },
  mini({
    n: 2,
    section: "mini-2",
    pages: [44, 45],
    photoPage: 45,
    anchor: "aae-12",
    extraPrereq: ["mini-1"],
    summary: "Mini #1 again with a sparser grid: 16 divisions per side plus edge marks.",
    instructions: [
      "First, do a few more Mini #1s with flat objects (cutlery, flat leaves, small flowers) until the outline is accurate within 15 minutes.",
      "Rule the grid with 16 divisions per section; add side marks where further divisions would go.",
      "Use the marks as imagined reference lines.",
      "Draw the outline (and a clear shadow line if there is one). One eye closed; mirror for feedback.",
    ],
  }),

  // Distance
  aaeCore(13, {
    section: "distance",
    title: "Distance · plot both ends",
    page: 47,
    instructionPages: [46],
    summary: "Plot both end points of each line by eye, then connect them.",
    instructions: [
      "Trace the knowns — this time, the lines without end dots.",
      "For each line, place both end dots by eye on the tracing, then draw the line between them.",
      "Compare to the known and flick between attempt and source as you go.",
    ],
    checking: [
      "Overlay the tracing on the source; note each error but keep going down the sheet.",
      "Once all are checked, go back and correct by eye.",
    ],
    prerequisites: ["aae-12"],
    rotation: "vary",
    rotationNote: "Vary the angle of the setup on every new attempt.",
    mastery: "Continue until you succeed (AAE p.46).",
    notes: ["The book says to print all three Distance sheets (p.47–49) now; keep them."],
  }),
  aaeCore(14, {
    section: "distance",
    title: "Distance · plot both ends",
    page: 48,
    instructionPages: [46],
    summary: "Same process as Exercise 13 on a new sheet.",
    instructions: ["Trace the knowns.", "Plot both end dots by eye, then connect."],
    checking: OVERLAY_CHECK,
    prerequisites: ["aae-13"],
    rotation: "vary",
    rotationNote: "Vary the angle of the setup on every new attempt.",
    mastery: "Continue until you succeed (AAE p.46).",
  }),
  aaeCore(15, {
    section: "distance",
    title: "Distance · length in one go",
    page: 49,
    instructionPages: [46],
    summary: "Fix only the start point, then draw each line at its full length in one go.",
    instructions: ["Trace the knowns.", "Place only the starting point by eye.", "Draw the full length in a single go."],
    checking: OVERLAY_CHECK,
    prerequisites: ["aae-14"],
    rotation: "vary",
    rotationNote: "Vary the angle of the setup on every new attempt.",
    mastery: "Continue until you succeed (AAE p.46).",
    notes: ["The author warns this may be the hardest so far — expect to spend real time here."],
  }),
  aaeCore(16, {
    section: "distance",
    title: "Intervals · horizontal",
    page: 53,
    instructionPages: range(50, 52),
    extraDisplay: [sheet("aae", 51, "Interval warm-ups (optional)")],
    summary: "Place points at their correct intervals, seeing the whole line rather than point to point.",
    instructions: [
      "Optional warm-ups (p.51): trace the box plus every other point, plot the rest; then trace only a few points and do it rotated 90°.",
      "For each example, trace the box and the given points (small dots are fine).",
      "Plot the remaining points by eye and visual triangulation, minding the next points too, not just neighbours.",
      "Connect the points. Run your eye along the source line about six times, then along yours, and correct.",
      "Do every example twice: first with more given points, then with fewer.",
    ],
    checking: OVERLAY_CHECK,
    prerequisites: ["aae-15"],
    rotation: "none",
    mastery: "Complete the 4×2 sets accurately, even if each takes a few tries (AAE p.52).",
    notes: [
      "Harder variations: larger boxes of your own filling a sheet; then no traced givens at all.",
      "Keep this sheet — the Review and Test on p.72 sends you back here if needed.",
    ],
  }),
  aaeCore(17, {
    section: "distance",
    title: "Intervals · vertical",
    page: 54,
    instructionPages: range(50, 52),
    summary: "The vertical interval examples.",
    instructions: [
      "Trace the box and the given points.",
      "Plot the rest by eye, connect, and eye-trace source then drawing to correct.",
      "Do each example twice: more givens, then fewer.",
    ],
    checking: OVERLAY_CHECK,
    prerequisites: ["aae-16"],
    rotation: "none",
    mastery: "Complete the 4×2 sets accurately, even if each takes a few tries (AAE p.52).",
  }),

  // Curvature
  aaeCore(18, {
    section: "curvature",
    title: "Curvature · curves against straight lines",
    page: 56,
    instructionPages: [55],
    summary: "Freehand each curve against its straight known.",
    instructions: ["Print; trace each straight line.", "Freehand the curved lines by eye."],
    checking: OVERLAY_CHECK,
    prerequisites: ["aae-17"],
    rotation: "vary",
    rotationNote: "Vary the angle of the setup on each new attempt.",
    mastery: CURVE_MASTERY,
  }),
  aaeCore(19, {
    section: "curvature",
    title: "Curvature · curves in boxes",
    page: 57,
    instructionPages: [55],
    summary: "Freehand the curved shape inside each box.",
    instructions: [
      "Print; trace each box with a ruler.",
      "Cut out each source and its tracing; arrange each pair side by side in Sight-Size.",
      "Freehand the curve, watching how it meets the sides of the box.",
      "Light shading of the shaded side is fine — don't try to match value.",
    ],
    checking: [
      "Overlay the tracing on the source; note each error and move to the next curve.",
      "After checking all of them, go back and correct by eye.",
    ],
    prerequisites: ["aae-18"],
    rotation: "vary",
    rotationNote: "Vary the angle of the setup on each new attempt.",
    materials: CUTOUT_MATERIALS,
    mastery: CURVE_MASTERY,
  }),
  aaeCore(20, {
    section: "curvature",
    title: "Curvature · curves in boxes",
    page: 58,
    instructionPages: [55],
    summary: "Same process as Exercise 19.",
    instructions: ["Trace boxes, cut out source and tracing, Sight-Size, freehand each curve."],
    checking: OVERLAY_CHECK,
    prerequisites: ["aae-19"],
    rotation: "vary",
    rotationNote: "Vary the angle of the setup on each new attempt.",
    materials: CUTOUT_MATERIALS,
    mastery: CURVE_MASTERY,
    notes: ["Keep this sheet — the Review and Test on p.72 may send you back here."],
  }),
  mini({
    n: 3,
    section: "mini-3",
    pages: [59, 60],
    photoPage: 60,
    anchor: "aae-20",
    extraPrereq: ["mini-2"],
    materials: [...MINI_MATERIALS, "pins"],
    summary: "Move the Mini to a wall: a pinned object at eye level, almost a true Sight-Size setup.",
    instructions: [
      "Make the grid: each area has 4 equal divisions plus 6 edge marks.",
      "Pin, tack or tape the paper level at eye height on an evenly lit wall.",
      "Pin a light object in its section (leaf, feather, moth, small flower…).",
      "Stand at arm's length directly in front; one eye closed. Draw the whole contour or section by section, using both drawn and marked divisions.",
      "About 15 minutes of drawing. Do several.",
    ],
  }),

  // Shape
  aaeCore(21, {
    section: "shape",
    title: "Shape · boxes",
    page: 63,
    instructionPages: [61, 62],
    summary: "Draw each box accurately in both shape and size.",
    instructions: [
      "Print and cut out the shapes, leaving a margin (don't cut on the lines).",
      "Arrange source and tracing paper side by side in Sight-Size.",
      "Trace one side of the shape; plot the corners by eye and connect them, minding angle and distance.",
      "Shading the shape in can help. Flick between source and drawing.",
    ],
    checking: [
      "Only after an honest guess: check with triangulation (two known points → third point; AAE p.62).",
      "Then overlay the tracing on the source.",
    ],
    prerequisites: ["aae-20"],
    materials: CUTOUT_MATERIALS,
    mastery: SHAPE_MASTERY,
  }),
  ...[
    { n: 22, page: 64 },
    { n: 23, page: 65 },
    { n: 24, page: 66 },
  ].map(({ n, page }) =>
    aaeCore(n, {
      section: "shape",
      title: "Shape · abstract shapes",
      page,
      instructionPages: [61, 62],
      summary: "Draw each shape accurately in shape and size.",
      instructions: [
        "Cut out the sources with a margin; Sight-Size beside your tracing paper.",
        "Trace one line or section as your given; plot the rest by eye.",
        "Flick between source and drawing as you go.",
      ],
      checking: [
        "After an honest guess, check with triangulation (AAE p.62).",
        "Then overlay the tracing on the source.",
      ],
      prerequisites: [`aae-${n - 1}`],
      materials: CUTOUT_MATERIALS,
      mastery: SHAPE_MASTERY,
      notes: n === 22 ? ["Keep this sheet — the Review and Test on p.72 may send you back here."] : [],
    }),
  ),
  aaeCore(25, {
    section: "shape",
    title: "Interval Curves · horizontal",
    page: 70,
    instructionPages: range(67, 69),
    summary: "Draw flowing compound curves through given points, seeing the whole line.",
    instructions: [
      "Read the interval-curves explanation (p.67–69): salient points → angular block-in → simplified curves → smaller intervals.",
      "Trace the boxes and the points, making the points fainter than printed.",
      "Beside the source, draw the curves you see.",
      "Run your eye along the source line several times, then along yours, and correct.",
    ],
    checking: ["Overlay to check.", "When all examples are done, do them again rotated 180°."],
    prerequisites: ["aae-24"],
    rotation: "180",
    rotationNote: "After finishing all examples, repeat them rotated 180°.",
    mastery: "Accurate more often than not, then make your own from sections of old-master drawings (AAE p.69).",
  }),
  aaeCore(26, {
    section: "shape",
    title: "Interval Curves · vertical",
    page: 71,
    instructionPages: range(67, 69),
    summary: "The vertical interval-curve examples.",
    instructions: [
      "Trace the boxes and faint points; draw the curves beside the source.",
      "Eye-trace source then drawing; correct.",
    ],
    checking: ["Overlay to check.", "Repeat the whole set rotated 180°."],
    prerequisites: ["aae-25"],
    rotation: "180",
    rotationNote: "After finishing all examples, repeat them rotated 180°.",
    mastery: "Accurate more often than not (AAE p.69).",
  }),
  {
    id: "check-2",
    course: "aae",
    sectionId: "shape",
    title: "Review and Test · two thirds of the way",
    exerciseNumber: "Review",
    type: "checkpoint",
    book: "aae",
    instructionBook: "aae",
    instructionPages: [72],
    sheets: {
      ...noSheets(),
      reused: [
        { sheet: sheet("aae", 53, "Exercise 16"), fromExerciseId: "aae-16" },
        { sheet: sheet("aae", 58, "Exercise 20"), fromExerciseId: "aae-20" },
        { sheet: sheet("aae", 64, "Exercise 22"), fromExerciseId: "aae-22" },
      ],
    },
    estimatedMinutes: [15, 30],
    materialIds: TRACE_MATERIALS,
    summary: "Review your attempts for consistent errors, then retest on any earlier exercise.",
    instructions: ["Look back over all previous attempts and note recurring errors.", "Pick any earlier exercise and redo it."],
    checkingInstructions: [
      "Compare with your earlier attempts.",
      "If it didn't go well, redo Exercises 16, 20 and 22 until they're correct more often than not.",
    ],
    rotation: "45",
    prerequisites: ["aae-26"],
    prerequisiteMode: "proficient",
    gating: false,
    recommendedAttempts: "Once, at this point in the course.",
    masteryGuidance: "Optional extension: Sight-Size copies of the isolated-bone plates in Richer's Artistic Anatomy (public domain).",
    supplementalExerciseIds: [],
    notes: [],
  },
  mini({
    n: 4,
    section: "mini-4",
    pages: [73, 74],
    photoPage: 74,
    anchor: "aae-26",
    extraPrereq: ["mini-3"],
    materials: [...MINI_MATERIALS, "pins"],
    summary: "Wall Mini with only 2 divisions per section; focus on the flow of the contour's intervals.",
    instructions: [
      "Set up as for Mini #3 (p.59) with each section halved and 4 edge marks.",
      "Block in the outline (and internal shapes / big shadow shapes if present), flicking for jumps.",
      "When the block-in and intervals look right, ghost it out (erase until barely visible).",
      "Redraw the contour, paying special attention to the intervals of the curves.",
      "Limit drawing time to 30 minutes (setup not included).",
    ],
  }),

  // Value
  aaeCore(27, {
    section: "value",
    title: "Value strips",
    page: 80,
    instructionPages: range(75, 79),
    summary: "Match the relative values of each strip in flat, even shading.",
    instructions: [
      "On low-tooth drawing paper, draw each strip as ~1″ squares with light divisions; cut the strips apart. Cut the printed strips apart too.",
      "Example A on white paper; the rest on mid-gray paper. Source and your strip side by side.",
      "Squint. Lightly shade the darkest square, then the lightest — both deliberately lighter than the source.",
      "Shade the remaining squares equally light, so the whole strip is keyed high.",
      "Squint and flick; then darken all squares together in passes, comparing each to the extremes and to its neighbours.",
      "Shade flat (e.g. parallel 45° strokes). No smudging, no tortillon.",
    ],
    checking: [
      "Lay your strip partly over the source and squint — they should read as one.",
      "Any square that jumps: separate, correct, check again.",
      "Look for a consistent tendency: too dark or too light?",
    ],
    prerequisites: ["aae-26"],
    rotation: "180",
    rotationNote: "For variation, flip source and strips 180°, or place them farther apart.",
    materials: [...VALUE_MATERIALS, "white-paper", "gray-paper"],
    mastery: VALUE_MASTERY,
    notes: [
      "The book asks you to print this page and Exercise 28 (p.81) together.",
      "If your print doesn't show the subtle differences, make your own strips (AAE p.75).",
    ],
  }),
  aaeCore(28, {
    section: "value",
    title: "Value strips",
    page: 81,
    instructionPages: range(75, 79),
    summary: "More value strips, following the 10-step process on p.78–79.",
    instructions: [
      "Source and your strip side by side on mid-gray paper.",
      "Darkest square lightly, then lightest (equally under-shaded), then the rest — all keyed high.",
      "Compare every value to the extremes and to its neighbours; squint and flick.",
      "Darker passes on all squares until the relationships look right.",
    ],
    checking: ["Lay your strip partly over the source; squint and flick.", "Correct as needed and check again."],
    prerequisites: ["aae-27"],
    rotation: "180",
    rotationNote: "For variation, flip 180° or increase the distance between source and strip.",
    materials: [...VALUE_MATERIALS, "gray-paper"],
    mastery: VALUE_MASTERY,
  }),
  aaeCore(29, {
    section: "value-2",
    title: "Value abstracts",
    page: 83,
    instructionPages: [82],
    summary: "Value relationships within abstract shapes.",
    instructions: [
      "Draw two boxes per example on drawing paper and cut them apart.",
      "Draw the boundaries of each value shape (Example A first).",
      "Darkest dark, then lightest light; sneak up on all values together, squinting.",
    ],
    checking: ["Squint and flick between source and drawing as in Exercises 27–28.", "Correct and check again."],
    prerequisites: ["aae-28"],
    materials: VALUE_MATERIALS,
    mastery: "Do every example accurately twice before moving on (AAE p.82).",
    recommended: "Each example twice, accurately.",
  }),
  aaeCore(30, {
    section: "value-2",
    title: "Old Master landscape studies",
    page: 85,
    instructionPages: [84],
    summary: "Simplified value studies of greyscale Old Master landscapes.",
    instructions: [
      "Draw the border boxes on drawing paper.",
      "Look at the author's example study (upper right of the sheet) — note how simplified it is.",
      "Squint to drop detail; outline the main value shapes you see.",
      "Still squinting, shade as in Exercise 29: extremes first, everything moving together.",
      "Keep each study small enough to finish within 30 minutes.",
    ],
    checking: ["Squint and flick between source and study.", "Look for consistent errors in value relationships."],
    prerequisites: ["aae-29"],
    rotation: "none",
    materials: VALUE_MATERIALS,
    mastery: "Watch for consistent errors in value relationships (AAE p.84).",
    notes: ["Exercises 30 and 31 hold twelve examples between them. Extension: your own sources from books or museums."],
  }),
  aaeCore(31, {
    section: "value-2",
    title: "Old Master landscape studies",
    page: 86,
    instructionPages: [84],
    summary: "More simplified value studies of Old Master landscapes.",
    instructions: [
      "Border boxes on drawing paper; squint; outline the main value shapes.",
      "Shade extremes first and bring all values along together. Under 30 minutes each.",
    ],
    checking: ["Squint and flick between source and study.", "Look for consistent errors in value relationships."],
    prerequisites: ["aae-30"],
    rotation: "none",
    materials: VALUE_MATERIALS,
    mastery: "Watch for consistent errors in value relationships (AAE p.84).",
  }),
  mini({
    n: 5,
    section: "mini-5",
    pages: [87, 88],
    photoPage: 88,
    anchor: "aae-31",
    extraPrereq: ["mini-4"],
    materials: [...MINI_MATERIALS, "pins", "charcoal"],
    summary: "Wall Mini with no grid: outline and simplified values in at most five flat tones.",
    instructions: [
      "Set up as Minis #3–4 but without grid divisions (edge marks optional).",
      "Close one eye; outline the subject in charcoal, flicking and using the mirror.",
      "Delineate major shadow shapes and value transitions.",
      "Squint and shade in no more than five values (three for a simple subject), kept flat and distinct.",
      "No more than 30 minutes of drawing.",
    ],
    notes: ["Feedback is three checks: quick flicks, squinting, and the mirror."],
  }),
];

// ───────────────────────────── A Comparative Eye ─────────────────────────────

const CE_SAVE = "Save this printed sheet — a later exercise reuses it.";

const CE: Exercise[] = [
  ce({
    code: "1a",
    section: "first-steps",
    title: "Halves",
    instructionPages: [22],
    sheetPage: 4,
    sheetLabel: "Exercises 1a and 1b",
    keyPage: 5,
    scale: { factor: 0.5, label: "Find the ½ point" },
    prerequisites: [],
    rotation: "45",
    summary: "Find the centre of each of 20 lines by eye.",
    instructions: [
      "Print the exercise sheet. Keep Key 1a out of sight.",
      "Trace the 20 lines with a ruler onto tracing paper.",
      "By eye only, mark each centre. Don't measure.",
    ],
    checking: [
      "Lay your tracing over Key 1a.",
      "Mark the correct dots in colored pencil.",
      "Errors consistently to one side? Keep this attempt — you'll look back at it.",
    ],
    notes: ["Same lines as An Accurate Eye Exercise 1, used a new way.", CE_SAVE],
  }),
  ce({
    code: "1b",
    section: "first-steps",
    title: "Quarters",
    instructionPages: [23],
    sheetPage: 4,
    sheetLabel: "Exercises 1a and 1b",
    reusedFrom: "ce-1a",
    keyPage: 6,
    scale: { factor: 0.25, label: "Find ¼, ½, ¾" },
    prerequisites: ["ce-1a"],
    rotation: "45",
    summary: "Divide each line into quarters by eye.",
    instructions: [
      "Trace the same 20 lines again.",
      "Place a quarter point first — resist finding the half first. Then the half, then the remaining quarter.",
      "Correct any errors you notice along the way.",
    ],
    checking: ["Lay your tracing over Key 1b.", "Mark the correct dots in colored pencil."],
    notes: ["Spare-moment variation: divide the sides of a Post-it into ¼, ⅓ and ½."],
  }),
  ce({
    code: "1c",
    section: "first-steps",
    title: "Doubling lines",
    instructionPages: [24],
    sheetPage: 7,
    keyPage: 8,
    scale: { factor: 2, label: "Double each length" },
    prerequisites: ["ce-1b"],
    rotation: "45",
    summary: "Double each line's length freehand, by eye.",
    instructions: [
      "Print Exercise 1c; keep Key 1c aside.",
      "Trace the lines with a ruler.",
      "Extend each to twice its length freehand — accurate length matters more than a straight line.",
    ],
    checking: ["Check against Key 1c and mark the correct lengths in colored pencil."],
  }),
  // Constriction
  ce({
    code: "2a",
    section: "constriction",
    title: "Constriction · simple polygons",
    instructionPages: [25, 26],
    sheetPage: 9,
    keyPage: 10,
    scale: { factor: 1 / 3, label: "Constrict by ⅔ → draw at ⅓ size" },
    prerequisites: ["ce-1c"],
    rotation: "45",
    summary: "Redraw each rectangle at one third of its size, inside the traced box.",
    instructions: [
      "Print Exercise 2a; keep Key 2a aside.",
      "Trace the shapes. Inside each traced box, draw the reduced shape toward any corner.",
      "Freehand and free-eye — no ruler for the new corner or sides.",
      "Optional hint (CEB p.26): the diagonal split into thirds marks the missing corner. Works for simple polygons only.",
    ],
    notes: [CE_SAVE],
  }),
  ce({
    code: "2b",
    section: "constriction",
    title: "Constriction · complex polygons",
    instructionPages: [27],
    sheetPage: 11,
    keyPage: 12,
    scale: { factor: 1 / 3, label: "Constrict by ⅔ → draw at ⅓ size" },
    prerequisites: ["ce-2a"],
    rotation: "45",
    summary: "More complex polygons at one third size.",
    instructions: ["Print Exercise 2b; keep Key 2b aside.", "Trace the shapes, then constrict each by eye. No ruler."],
    notes: [CE_SAVE],
  }),
  ce({
    code: "2c",
    section: "constriction",
    title: "Constriction · curved shapes",
    instructionPages: [28],
    sheetPage: 13,
    keyPage: 14,
    scale: { factor: 0.5, label: "Constrict by ½ → draw at ½ size" },
    prerequisites: ["ce-2b"],
    rotation: "45",
    summary: "Shapes with curves, reduced to half size.",
    instructions: ["Print Exercise 2c; keep Key 2c aside.", "Trace the shapes, then constrict each to half size by eye. No ruler."],
    notes: [CE_SAVE],
  }),
  ...[
    { code: "2d", from: "2a", sheetPage: 9, keyPage: 15, prev: "ce-2c" },
    { code: "2e", from: "2b", sheetPage: 11, keyPage: 16, prev: "ce-2d" },
    { code: "2f", from: "2c", sheetPage: 13, keyPage: 17, prev: "ce-2e" },
  ].map(({ code, from, sheetPage, keyPage, prev }) =>
    ce({
      code,
      section: "constriction",
      title: `Constriction · Exercise ${from} sheet at ⅔`,
      instructionPages: [29],
      sheetPage,
      sheetLabel: `Exercise ${from}`,
      reusedFrom: `ce-${from}`,
      keyPage,
      scale: { factor: 2 / 3, label: "Constrict by ⅓ → draw at ⅔ size" },
      prerequisites: [prev],
      rotation: "45",
      summary: `The Exercise ${from} shapes again, reduced only by one third.`,
      instructions: [
        `Use your saved Exercise ${from} printout (or reprint it). Keep Key ${code} aside.`,
        "Trace the shapes and constrict each to two thirds of its size, by eye.",
      ],
      checking: [`Check with Key ${code} (it pairs with Exercise ${from}).`, "Mark errors in colored pencil."],
      recommended: "A few days to a week of practice for each of 2d, 2e and 2f.",
    }),
  ),
  // Dilation
  ce({
    code: "3a",
    section: "dilation",
    title: "Dilation · simple polygons",
    instructionPages: [30, 31],
    sheetPage: 18,
    keyPage: 19,
    scale: { factor: 2, label: "Dilate to 2× size" },
    prerequisites: ["ce-2f"],
    rotation: "45",
    summary: "Redraw each rectangle twice as large, freehand and free-eye.",
    instructions: ["Print Exercise 3a; keep Key 3a aside.", "Trace the shapes; draw each at double size around/beyond the traced box. No ruler."],
    notes: [CE_SAVE],
  }),
  ce({
    code: "3b",
    section: "dilation",
    title: "Dilation · complex polygons",
    instructionPages: [32],
    sheetPage: 20,
    keyPage: 21,
    scale: { factor: 2, label: "Dilate to 2× size" },
    prerequisites: ["ce-3a"],
    rotation: "45",
    summary: "Complex polygons at double size.",
    instructions: [
      "Print Exercise 3b; keep Key 3b aside.",
      "Trace the shapes, then dilate each to twice the size, in any direction. No ruler.",
    ],
    notes: [
      "The book allows one brief look at the key just to see which direction its dilations go — the app keeps it hidden; use the citation if you want that peek.",
      CE_SAVE,
    ],
  }),
  ce({
    code: "3c",
    section: "dilation",
    title: "Dilation · curved shapes",
    instructionPages: [33],
    sheetPage: 22,
    keyPage: 23,
    scale: { factor: 2, label: "Dilate to 2× size" },
    prerequisites: ["ce-3b"],
    rotation: "45",
    summary: "Curved shapes at double size.",
    instructions: ["Print Exercise 3c; keep Key 3c aside.", "Trace the shapes, then dilate each to 2× by eye. No ruler for straight lines either."],
    notes: [CE_SAVE],
  }),
  ...[
    { code: "3d", from: "3a", sheetPage: 18, keyPage: 24, prev: "ce-3c" },
    { code: "3e", from: "3b", sheetPage: 20, keyPage: 25, prev: "ce-3d" },
    { code: "3f", from: "3c", sheetPage: 22, keyPage: 26, prev: "ce-3e" },
  ].map(({ code, from, sheetPage, keyPage, prev }) =>
    ce({
      code,
      section: "dilation",
      title: `Dilation · Exercise ${from} sheet at 4⁄3`,
      instructionPages: [34],
      sheetPage,
      sheetLabel: `Exercise ${from}`,
      reusedFrom: `ce-${from}`,
      keyPage,
      scale: { factor: 4 / 3, label: "Dilate by ⅓ → 3″ becomes 4″" },
      prerequisites: [prev],
      rotation: "45",
      summary: `The Exercise ${from} shapes enlarged by only one third.`,
      instructions: [
        `Use your saved Exercise ${from} printout (or reprint it). Keep Key ${code} aside.`,
        "Trace and enlarge each shape by one third of its size, by eye.",
        "Most students make these far too large — they're smaller than you think.",
      ],
      checking: [`Check with Key ${code} (it pairs with Exercise ${from}).`, "Mark errors in colored pencil."],
      recommended: "A few days to a week of practice for each of 3d, 3e and 3f.",
    }),
  ),
  // Complex Constriction I
  ce({
    code: "4a",
    section: "cc1",
    title: "Complex constriction · abstract shapes",
    instructionPages: [35, 36],
    sheetPage: 27,
    keyPage: 28,
    scale: { factor: 0.5, label: "Constrict to ½ size" },
    prerequisites: ["ce-3f"],
    rotation: "45",
    summary: "Complex combined shapes at half size, freehand.",
    instructions: [
      "Print Exercise 4a; keep Key 4a aside.",
      "Trace the images; constrict each to half size within the traced box, toward any corner.",
      "From here a proportional divider may check a guess — only after the guess.",
    ],
    materials: [...CE_MATERIALS, "proportional-divider"],
    recommended: "At least one image a day; repeat until accurate most of the time.",
  }),
  ce({
    code: "4b",
    section: "cc1",
    title: "Complex constriction · abstract shapes",
    instructionPages: [37],
    sheetPage: 29,
    keyPage: 30,
    scale: { factor: 0.5, label: "Constrict to ½ size" },
    prerequisites: ["ce-4a"],
    rotation: "45",
    summary: "More complex shapes at half size.",
    instructions: ["Print Exercise 4b; keep Key 4b aside.", "Constrict each image to half size using your eye alone."],
    materials: [...CE_MATERIALS, "proportional-divider"],
    recommended: "At least one image a day; repeat until accurate most of the time.",
  }),
  ...[
    { code: "4c", sheetPage: 31, keyPage: 32, title: "Humerus and femur", prev: "ce-4b", pages: [38] },
    { code: "4d", sheetPage: 33, keyPage: 34, title: "Radius/ulna and tibia/fibula", prev: "ce-4c", pages: [39] },
  ].map(({ code, sheetPage, keyPage, title, prev, pages }) =>
    ce({
      code,
      section: "cc1",
      title: `Complex constriction · ${title}`,
      instructionPages: pages,
      sheetPage,
      keyPage,
      setupKey: true,
      scale: { factor: 0.5, label: "Constrict to ½ size" },
      prerequisites: [prev],
      rotation: "none",
      summary: `Bone outlines (${title.toLowerCase()}) at half size. Images aren't to scale with each other.`,
      instructions: [
        `Setup: with tracing paper over Key ${code}, mark only the top and bottom of the image. Then put the key away face down.`,
        "Don't trace the exercise image this time.",
        "Constrict the image to half size between your marks.",
      ],
      materials: [...CE_MATERIALS, "proportional-divider"],
      recommended: "One image a day, alternating; repeat until accurate most of the time.",
    }),
  ),
  // Complex Dilation I
  ce({
    code: "5a",
    section: "cd1",
    title: "Complex dilation · abstract shapes",
    instructionPages: [40],
    sheetPage: 35,
    keyPage: 36,
    scale: { factor: 1.5, label: "Dilate by ½ → 2″ becomes 3″" },
    prerequisites: ["ce-4d"],
    rotation: "45",
    summary: "Complex abstract shapes enlarged to 150%.",
    instructions: [
      "Print Exercise 5a; keep Key 5a aside — don't use it for the extremes here.",
      "Trace the images, then enlarge each by one half using your eye alone.",
    ],
    materials: [...CE_MATERIALS, "proportional-divider"],
    recommended: "All images once a day, rotating 45° each day, four days running.",
  }),
  ...[
    { code: "5b", sheetPage: 37, keyPage: 38, title: "Humerus and femur", prev: "ce-5a", pages: [41] },
    { code: "5c", sheetPage: 39, keyPage: 40, title: "Radius/ulna and tibia/fibula", prev: "ce-5b", pages: [42] },
    { code: "5d", sheetPage: 41, keyPage: 42, title: "Scapula and pelvis", prev: "ce-5c", pages: [43] },
  ].map(({ code, sheetPage, keyPage, title, prev, pages }) =>
    ce({
      code,
      section: "cd1",
      title: `Complex dilation · ${title}`,
      instructionPages: pages,
      sheetPage,
      keyPage,
      setupKey: true,
      scale: { factor: 1.5, label: "Dilate by ½ → 150%" },
      prerequisites: [prev],
      rotation: "none",
      summary: `Bone outlines (${title.toLowerCase()}) enlarged to 150%.`,
      instructions: [
        `Setup: with tracing paper over Key ${code}, mark only the top and bottom of the image. Put the key away face down.`,
        `Working from Exercise ${code}, enlarge the image by one half between your marks.`,
        "Extra attempts from memory are suggested.",
      ],
      materials: [...CE_MATERIALS, "proportional-divider"],
      recommended: "At least one image a day; repeat until accurate most of the time.",
    }),
  ),
  // Complex Constriction II
  ce({
    code: "6a",
    section: "cc2",
    title: "Complex constriction II · child figures",
    instructionPages: range(44, 46),
    sheetPage: 43,
    keyPage: 44,
    setupKey: true,
    scale: { factor: 0.5, label: "Constrict to ½ size" },
    prerequisites: ["ce-5d"],
    rotation: "none",
    extraDisplay: [sheet("ceb", 45, "Simplification example (reference)")],
    summary: "Figure drawings at half size: subdivide by head length, block in, then round off.",
    instructions: [
      "Setup: mark the top and bottom from Key 6a on tracing paper; put the key away.",
      "Keep the big look — relate every part to the others and to the whole; avoid piecemeal seeing.",
      "Find the head length, count heads, block the figure in, then round off and add smaller details.",
    ],
    materials: [...CE_MATERIALS, "proportional-divider"],
    recommended: "One image per day, alternating, over four days; repeat if accuracy is doubtful.",
    mastery: "Not every bump needs to be there, but reach at least the simplification shown on CEB p.45.",
  }),
  ce({
    code: "6b",
    section: "cc2",
    title: "Complex constriction II · child figures",
    instructionPages: [47],
    sheetPage: 45,
    keyPage: 46,
    setupKey: true,
    scale: { factor: 2 / 3, label: "Constrict by ⅓ → draw at ⅔ size" },
    prerequisites: ["ce-6a"],
    rotation: "none",
    summary: "Same process, reducing by only one third.",
    instructions: [
      "Setup: mark the top and bottom from Key 6b; put the key away.",
      "Constrict to two thirds size. Block in first if you like.",
    ],
    materials: [...CE_MATERIALS, "proportional-divider"],
    recommended: "One image per day, alternating, over four days.",
  }),
  // Complex Dilation II
  ...[
    { code: "7a", sheetPage: 47, keyPage: 48, prev: "ce-6b", pages: [48, 49, 50] },
    { code: "7b", sheetPage: 49, keyPage: 50, prev: "ce-7a", pages: [51] },
  ].map(({ code, sheetPage, keyPage, prev, pages }) =>
    ce({
      code,
      section: "cd2",
      title: "Complex dilation II · Bargue figures",
      instructionPages: pages,
      sheetPage,
      keyPage,
      setupKey: true,
      scale: { factor: 2, label: "Dilate to 2× size" },
      prerequisites: [prev],
      rotation: "none",
      minutes: [15, 20],
      extraDisplay: [sheet("ceb", 50, "Centreline and head-count example (reference)")],
      summary: "Bargue figure drawings at double size, using a head-length unit.",
      instructions: [
        `Setup: mark the top and bottom from Key ${code}; put the key away.`,
        "Draw a centreline on both source and drawing through parts that line up vertically (example on CEB p.50).",
        "Pick your head size (thumb-on-pencil measure of the source, doubled, is fine) and count heads in the source.",
        "Mark head increments lightly; block in the contour, sizing everything against the head; then interior shapes.",
        "Measured comparisons are OK; rulers aren't. Keep working on tracing paper.",
      ],
      materials: [...CE_MATERIALS, "proportional-divider"],
      recommended: "Two sessions of 15–20 minutes on each of 7a and 7b this week.",
    }),
  ),
];

// Finals: choose constrict or dilate; source and key swap.
const FINAL_PAGES: [number, number][] = [
  [51, 52],
  [53, 54],
  [55, 56],
  [57, 58],
];

FINAL_PAGES.forEach(([reduced, enlarged], i) => {
  const n = i + 1;
  const pair = {
    reduced: sheet("cew", reduced, `Final ${n} Reduced`),
    enlarged: sheet("cew", enlarged, `Final ${n} Enlarged`),
  };
  CE.push({
    id: `ce-f${n}`,
    course: "ce",
    sectionId: "final",
    title: `Final ${n} · Bargue figure`,
    exerciseNumber: `Final ${n}`,
    type: "core",
    book: "cew",
    instructionBook: "ceb",
    instructionPages: [52],
    // Resolved per attempt from finalPair + chosen direction (see resolveSheets).
    sheets: noSheets(),
    finalPair: pair,
    estimatedMinutes: [15, 30],
    materialIds: [...CE_MATERIALS, "proportional-divider"],
    summary: "A harder pose. You choose: constrict (Enlarged → Reduced) or dilate (Reduced → Enlarged).",
    instructions: [
      "Choose a direction before starting. Constrict: draw from Enlarged, check with Reduced. Dilate: the reverse.",
      "Setup: mark top and bottom from the key version on tracing paper; put it away face down.",
      "Centreline, head size, head count, block-in, then interior shapes — as in Unit 7.",
    ],
    checkingInstructions: [
      "Lay your tracing over the other version of the image (the key for your chosen direction).",
      "Mark errors in colored pencil.",
    ],
    rotation: "none",
    prerequisites: [n === 1 ? "ce-7b" : `ce-f${n - 1}`],
    prerequisiteMode: "proficient",
    gating: true,
    recommendedAttempts: "Until accurate most of the time; try both directions over time.",
    masteryGuidance: "Keep practising starts after the course to keep the comparative eye sharp (CEB p.53).",
    supplementalExerciseIds: [],
    notes: ["The Reduced version is exactly half the Enlarged one."],
  });
});


// ───────────────────────────── Portrait Value (Chelsea Lang) ─────────────────────────────
// Paraphrased from the owner's transcript of Chelsea Lang's value-module demo (her paid
// course). Images: her demo stages ("lang") and the demo reference photo ("lref"),
// supplied by the owner and kept private like the book pages. See COURSE_AUDIT.md → Course 3.

const LANG_STAGES = [
  sheet("lang", 1, "Stage 1 · two values: one average dark masked in on white canvas"),
  sheet("lang", 2, "Stage 2 · two values: darks restated, light laid in as paint"),
  sheet("lang", 3, "Stage 3 · a third value and the first softened edges"),
  sheet("lang", 4, "Stage 4 · end of the first sitting"),
  sheet("lang", 5, "Stage 5 · second session: flattening the over-rendered mouth"),
  sheet("lang", 6, "Stage 6 · final"),
];
const DEMO_REFERENCE = sheet("lref", 1, "Demo reference photo");
const PV_MATERIALS = ["oil-black", "oil-white", "canvas", "brushes"];
const PV_KEY_CHECK = [
  "Reveal the value key of your reference below and set it next to your study (or a photo of it).",
  "Squint at both. Do your dark shapes match the key's in shape and placement?",
  "Note the one error you're most confident about — that's where next attempt starts.",
];

function pv(
  n: number,
  o: Pick<Exercise, "title" | "summary" | "instructions" | "checkingInstructions" | "prerequisites" | "recommendedAttempts" | "masteryGuidance" | "notes"> & {
    stages: SheetRef[];
    minutes: [number, number];
    keyLevels: 2 | 3;
    gating?: boolean;
  },
): Exercise {
  const sheets = noSheets();
  sheets.display = o.stages;
  sheets.printSources = [DEMO_REFERENCE];
  return {
    id: `pv-${String(n).padStart(2, "0")}`,
    course: "pv",
    sectionId: "pv-value",
    title: o.title,
    exerciseNumber: String(n),
    type: "core",
    book: "lang",
    instructionBook: "lang",
    instructionPages: [],
    sheets,
    estimatedMinutes: o.minutes,
    materialIds: PV_MATERIALS,
    summary: o.summary,
    instructions: o.instructions,
    checkingInstructions: o.checkingInstructions,
    rotation: "none",
    prerequisites: o.prerequisites,
    prerequisiteMode: "proficient",
    gating: o.gating ?? true,
    recommendedAttempts: o.recommendedAttempts,
    masteryGuidance: o.masteryGuidance,
    supplementalExerciseIds: [],
    reference: { keyLevels: o.keyLevels },
    notes: o.notes,
  };
}

const PV: Exercise[] = [
  pv(1, {
    title: "Two-value statement",
    stages: [LANG_STAGES[0], LANG_STAGES[1]],
    minutes: [20, 30],
    keyLevels: 2,
    prerequisites: [],
    summary: "Get the whole head into two flat values — exposing for the lights — with precise drawing from the first stroke.",
    instructions: [
      "Opaque paint only: black (ivory black or your own mix) and titanium white. No transparent washes.",
      "The white canvas is your light. Mix one average dark — the typical dark, not the very darkest — and mask in every important dark shape, flat.",
      "Be precise about the drawing now: clean up the jaw, eye, nose and mouth shapes as you mask, rather than sneaking up on them later.",
      "Decide where the midtones go: push them into the lights. Small creases beside the nose and mouth stay in the light.",
      "Restate the darks with a truer darkest dark (black plus a touch of white). Lay the light in as paint — white with a little black; nothing on the face is pure white.",
      "Squint and step back often. Stay in two values until the statement is clean — 20–30 minutes is fine.",
    ],
    checkingInstructions: [
      ...PV_KEY_CHECK.slice(0, 2),
      "Did any midtone end up in the shadows that belongs with the lights?",
      "Do the shadow side, eye socket and hair read as one connected dark?",
      PV_KEY_CHECK[2],
    ],
    recommendedAttempts: "Lots of them — short studies, a new reference whenever you can.",
    masteryGuidance: "Her priority: be really happy with the two-value structure before adding any more values.",
    notes: [
      "This replaces her earlier transparent-oil demo; she no longer recommends working transparently for value studies.",
      "Older male faces show the planes more clearly and are easier to start with without aging the subject.",
    ],
  }),
  pv(2, {
    title: "Two values → three, plus edges",
    stages: [LANG_STAGES[2]],
    minutes: [30, 45],
    keyLevels: 3,
    prerequisites: ["pv-01"],
    summary: "Only once the two-value statement is right: add a third value, keep the shadows flat and start choosing edges.",
    instructions: [
      "Start exactly as Drill 1 and get the two-value statement right first.",
      "Add a third value where it matters most — hers was the neck, between light and shadow.",
      "Keep the shadows flat; put the nuance in the lights. A shadow must never get lighter than the darkest light, or a light darker than the lightest shadow.",
      "Choose edges: look for shapes that are hard on one side and soft on the other (like the shadow beside the nose). Ask whether it's a cast shadow or a form shadow.",
      "Progress methodically — 2 → 3 → 5 values, or 2 → 3 → nuance. Either is fine; be intentional.",
    ],
    checkingInstructions: [
      "Reveal the three-value key of your reference and compare it with your study, squinting.",
      "Are the shadows still one flat family, with the variation living in the lights?",
      "Are edges hard where the form turns sharply and soft where it turns gradually?",
      PV_KEY_CHECK[2],
    ],
    recommendedAttempts: "A few days of studies, until the third value goes in without breaking the two-value structure.",
    masteryGuidance: "The extra value adds information without fragmenting the big light and shadow shapes.",
    notes: [],
  }),
  pv(3, {
    title: "One-sitting value study",
    stages: [LANG_STAGES[3], LANG_STAGES[4], LANG_STAGES[5]],
    minutes: [60, 90],
    keyLevels: 3,
    prerequisites: ["pv-02"],
    summary: "The whole process in one sitting of about an hour: two values, a third, then nuance — keeping big shapes whole.",
    instructions: [
      "One sitting, about an hour (up to 90 minutes). It's practice, not a finished painting.",
      "Two values → three → nuance, as in Drills 1–2.",
      "Keep big shapes unified: the eye socket reads as one dark even with the brow, iris and lash line inside it.",
      "Avoid small shapes — the line between the lips, eye glints, fine lines, wrinkles. They age the subject and cost time to undo (stage 5 shows her fixing exactly this).",
      "Find the hierarchy of lights: which light is lightest? Careful with the jaw — painted too light, it looks like it flares out.",
      "Simplify what isn't the focus (neck, hair as a mass). When something looks off, fix the error you're most confident about first.",
    ],
    checkingInstructions: [
      "Reveal the value key (switch to grayscale too) and compare at a small size, squinting.",
      "Do the big shapes read as unified — especially the eye socket and the lips?",
      "Did any small shape creep in that hurts the likeness or ages the subject?",
      "Is the face clearly the focal point, with the neck and hair simpler?",
      PV_KEY_CHECK[2],
    ],
    recommendedAttempts: "Regularly. She'd rather you do many of these than a few long paintings.",
    masteryGuidance: "A clear, unified value structure that reads at thumbnail size, finished in one sitting.",
    notes: ["Stage 5 is her coming back a month later to undo over-rendering — a strong block-in avoids that."],
  }),
  pv(4, {
    title: "25-minute value studies",
    stages: [LANG_STAGES[1]],
    minutes: [20, 30],
    keyLevels: 2,
    gating: false,
    prerequisites: ["pv-01"],
    summary: "Short, repeatable studies on scrap canvas: two values, a third only if time allows.",
    instructions: [
      "About 25 minutes per study, several to a sheet of scrap canvas.",
      "Two values first, opaque black and white, exposing for the lights.",
      "Add a third value only once the two-value statement is clean.",
      "Use a different reference each time when you can.",
    ],
    checkingInstructions: PV_KEY_CHECK,
    recommendedAttempts: "As often as you like — this is the regular-practice drill.",
    masteryGuidance: "Speed comes from repetition; accuracy of the two-value statement is what counts.",
    notes: ["She says every strong painter she knows owes their mastery to targeted value practice."],
  }),
];

// ───────────────────────────── exports ─────────────────────────────

/** All exercises in book order (supplementals after their sections' cores, as audited). */
export const EXERCISES: Exercise[] = orderExercises([...AAE, ...CE, ...PV]);

function orderExercises(list: Exercise[]): Exercise[] {
  // Keep book order but place each supplemental immediately after its parent core.
  const supps = list.filter((e) => e.type === "supplemental");
  const rest = list.filter((e) => e.type !== "supplemental");
  const out: Exercise[] = [];
  for (const e of rest) {
    out.push(e);
    for (const s of supps) if (s.parentId === e.id) out.push(s);
  }
  return out;
}

export const EXERCISES_BY_ID = new Map(EXERCISES.map((e) => [e.id, e]));

export function getExercise(id: string): Exercise | undefined {
  return EXERCISES_BY_ID.get(id);
}

export function getCourse(id: string): Course | undefined {
  return COURSES.find((c) => c.id === id);
}

export function sectionOf(e: Exercise): Section {
  const s = getCourse(e.course)!.sections.find((x) => x.id === e.sectionId);
  if (!s) throw new Error(`Unknown section ${e.sectionId} for ${e.id}`);
  return s;
}

export function coreExercises(course: string): Exercise[] {
  return EXERCISES.filter((e) => e.course === course && e.gating);
}
