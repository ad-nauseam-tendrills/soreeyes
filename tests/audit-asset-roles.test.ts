// Keeps the "Asset roles" section of COURSE_AUDIT.md identical to the course data.
// Regenerate with: npm run audit:roles
import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { expect, test } from "vitest";
import { EXERCISES, getExercise } from "@/content/course-data";
import { BOOKS, formatPages, resolveSheets } from "@/content/sheets";
import { numberLabel } from "@/lib/display";
import type { SheetRef } from "@/lib/types";

const file = path.resolve(__dirname, "../COURSE_AUDIT.md");
const START = "<!-- asset-roles:start -->";
const END = "<!-- asset-roles:end -->";

const fmt = (refs: SheetRef[]) =>
  refs.length === 0
    ? "—"
    : Object.entries(
        refs.reduce<Record<string, number[]>>((acc, r) => ((acc[r.book] ??= []).push(r.page), acc), {}),
      )
        .map(([book, pages]) => `${BOOKS[book as SheetRef["book"]].short} ${formatPages(pages)}`)
        .join("; ");

function render(): string {
  const rows = EXERCISES.map((e) => {
    const dirs = e.finalPair ? (["constrict", "dilate"] as const) : [undefined];
    return dirs.map((d) => {
      const s = resolveSheets(e, d);
      const name = `${e.id}${d ? ` (${d})` : ""}`;
      return `| ${name} | ${numberLabel(e)} | ${BOOKS[e.instructionBook].short} ${formatPages(e.instructionPages)} | ${fmt(s.display)} | ${fmt(s.printSources)} | ${fmt(s.printTargets)} | ${fmt(s.setupKeys)} | ${fmt(s.checkKeys)} | ${s.reused.map((r) => `${fmt([r.sheet])} ← ${numberLabel(getExercise(r.fromExerciseId)!)}`).join("; ") || "—"} |`;
    });
  }).flat();
  return [
    START,
    "",
    "_Generated from `src/content/course-data.ts` — do not edit by hand (`npm run audit:roles`)._",
    "",
    "| ID | Exercise | Instructional pages | Display source (on screen before/during attempt) | Printable source | Printable target | Key needed at setup (printed, never shown early) | Hidden checking/key asset (after Finish → Check My Work) | Reused previously printed sheet |",
    "|---|---|---|---|---|---|---|---|---|",
    ...rows,
    "",
    END,
  ].join("\n");
}

test("COURSE_AUDIT.md asset roles match the course data", () => {
  const doc = readFileSync(file, "utf8");
  const generated = render();
  const i = doc.indexOf(START);
  const j = doc.indexOf(END);
  if (process.env.UPDATE_AUDIT === "1") {
    const next = i >= 0 ? doc.slice(0, i) + generated + doc.slice(j + END.length) : `${doc.trimEnd()}\n\n${generated}\n`;
    writeFileSync(file, next);
    return;
  }
  expect(i, "asset-roles section missing — run npm run audit:roles").toBeGreaterThanOrEqual(0);
  expect(doc.slice(i, j + END.length)).toBe(generated);
});
