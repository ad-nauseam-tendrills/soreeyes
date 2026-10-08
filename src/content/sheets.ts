// Page/asset helpers: stable asset ids, citations, and per-role sheet resolution.

import { EXERCISES, sectionOf } from "@/content/course-data";
import type { BookId, Exercise, ExerciseSheets, ScaleDirection, SheetRef } from "@/lib/types";

export const BOOKS: Record<BookId, { title: string; short: string; paged: boolean }> = {
  aae: { title: "An Accurate Eye", short: "AAE", paged: true },
  sup: { title: "An Accurate Eye Supplement", short: "Supplement", paged: true },
  ceb: { title: "A Comparative Eye Course Book", short: "Course Book", paged: true },
  cew: { title: "A Comparative Eye Workbook", short: "Workbook", paged: true },
  // Image sets (no page numbers): numbered images, cited by label.
  lang: { title: "Chelsea Lang, value module demo", short: "Lang demo", paged: false },
  lref: { title: "Reference photo", short: "Reference", paged: false },
};

/** Stable id for one rendered page, e.g. "aae-p038". Also the asset file stem. */
export function assetId(s: Pick<SheetRef, "book" | "page">): string {
  return `${s.book}-p${String(s.page).padStart(3, "0")}`;
}

const ASSET_ID_RE = /^(aae|sup|ceb|cew|lang|lref)-p(\d{3})$/;

export function parseAssetId(id: string): { book: BookId; page: number } | null {
  const m = ASSET_ID_RE.exec(id);
  return m ? { book: m[1] as BookId, page: Number(m[2]) } : null;
}

export function formatPages(pages: number[]): string {
  if (pages.length === 0) return "";
  const sorted = [...new Set(pages)].sort((a, b) => a - b);
  const parts: string[] = [];
  let start = sorted[0];
  let prev = start;
  for (const p of sorted.slice(1).concat(Number.NaN)) {
    if (p === prev + 1) {
      prev = p;
      continue;
    }
    parts.push(start === prev ? `${start}` : `${start}–${prev}`);
    start = p;
    prev = p;
  }
  return (sorted.length > 1 ? "pp." : "p.") + parts.join(", ");
}

/** "An Accurate Eye — Exercise 8, p.38" */
export function sheetCitation(s: SheetRef): string {
  const b = BOOKS[s.book];
  return b.paged ? `${b.title}, ${s.label}, ${formatPages([s.page])}` : `${b.title} — ${s.label}`;
}

/** Headline attribution for an exercise, e.g. "An Accurate Eye — Exercise 8, p.38". */
export function exerciseCitation(e: Exercise): string {
  if (!BOOKS[e.instructionBook].paged) return `${BOOKS[e.instructionBook].title} — ${e.title}`;
  const pages = materialPages(e);
  const label =
    e.type === "supplemental"
      ? `Supplemental Exercise ${e.exerciseNumber}`
      : e.type === "mini"
        ? `Sight-Size ${e.exerciseNumber}`
        : e.type === "checkpoint"
          ? "Review and Test"
          : /^Final/.test(e.exerciseNumber)
            ? e.exerciseNumber
            : `Exercise ${e.exerciseNumber}`;
  const where = pages.length ? pages : e.instructionPages;
  const book = pages.length ? e.book : e.instructionBook;
  return `${BOOKS[book].title} — ${label}, ${formatPages(where)}`;
}

/** Instruction-page citation, e.g. "Instructions: A Comparative Eye — Course Book pp.25–26". */
export function instructionCitation(e: Exercise): string {
  if (!BOOKS[e.instructionBook].paged) return `${BOOKS[e.instructionBook].title} (course video)`;
  return `${BOOKS[e.instructionBook].title} ${formatPages(e.instructionPages)}`;
}

function materialPages(e: Exercise): number[] {
  if (e.finalPair) return [e.finalPair.reduced.page, e.finalPair.enlarged.page];
  const s = e.sheets;
  const own = [...s.printSources, ...s.printTargets, ...s.reused.map((r) => r.sheet)];
  const pages = own.filter((x) => x.book === e.book).map((x) => x.page);
  if (pages.length) return pages;
  return e.type === "mini" ? [] : s.display.filter((x) => x.book === e.book).map((x) => x.page);
}

/** Sheets for an exercise; Finals resolve from the chosen direction (default: constrict). */
export function resolveSheets(e: Exercise, direction?: ScaleDirection): ExerciseSheets {
  if (!e.finalPair) return e.sheets;
  const dir = direction ?? "constrict";
  const source = dir === "constrict" ? e.finalPair.enlarged : e.finalPair.reduced;
  const key = dir === "constrict" ? e.finalPair.reduced : e.finalPair.enlarged;
  return {
    display: [{ ...source, label: `${source.label} · Source` }],
    printSources: [{ ...source, label: `${source.label} · Source` }],
    printTargets: [],
    // Book: mark top and bottom using the key version, then set it aside (CEB p.52).
    setupKeys: [{ ...key, label: `${key.label} · Key, for setup marks only` }],
    checkKeys: [{ ...key, label: `${key.label} · Key` }],
    reused: [],
  };
}

/** What "Print Required Sheets" prints: sources, targets, and setup-only keys. Never check-only keys. */
export function requiredPrintSheets(e: Exercise, direction?: ScaleDirection): SheetRef[] {
  const s = resolveSheets(e, direction);
  return [...s.printSources, ...s.printTargets, ...s.setupKeys];
}

/** Every page the app may ever serve, by asset id. Anything else is refused. */
export const ALLOWED_ASSETS: Set<string> = (() => {
  const ids = new Set<string>();
  for (const e of EXERCISES) {
    const groups = e.finalPair
      ? [resolveSheets(e, "constrict"), resolveSheets(e, "dilate")]
      : [e.sheets];
    for (const s of groups) {
      for (const ref of [...s.display, ...s.printSources, ...s.printTargets, ...s.setupKeys, ...s.checkKeys]) {
        ids.add(assetId(ref));
      }
      for (const r of s.reused) ids.add(assetId(r.sheet));
    }
  }
  return ids;
})();

export function sectionTitle(e: Exercise): string {
  return sectionOf(e).title;
}
