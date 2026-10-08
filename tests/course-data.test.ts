import { describe, expect, it } from "vitest";
import { COURSES, EXERCISES, getExercise } from "@/content/course-data";
import { MATERIALS_BY_ID } from "@/content/materials";
import { assetId, exerciseCitation, requiredPrintSheets, resolveSheets } from "@/content/sheets";

const PAGE_COUNTS = { aae: 92, sup: 43, ceb: 56, cew: 60, lang: 6, lref: 1 };

describe("course data integrity (mirrors COURSE_AUDIT.md)", () => {
  it("has the audited counts", () => {
    const aae = EXERCISES.filter((e) => e.course === "aae");
    expect(aae.filter((e) => e.type === "core")).toHaveLength(31);
    expect(aae.filter((e) => e.type === "supplemental")).toHaveLength(21);
    expect(aae.filter((e) => e.type === "mini")).toHaveLength(5);
    expect(aae.filter((e) => e.type === "checkpoint")).toHaveLength(2);
    expect(EXERCISES.filter((e) => e.course === "ce")).toHaveLength(31);
    expect(EXERCISES.filter((e) => e.course === "pv")).toHaveLength(4);
  });

  it("keeps the books' numbered order", () => {
    const aaeCores = EXERCISES.filter((e) => e.course === "aae" && e.type === "core").map((e) => Number(e.exerciseNumber));
    expect(aaeCores).toEqual(Array.from({ length: 31 }, (_, i) => i + 1));
    const ce = EXERCISES.filter((e) => e.course === "ce").map((e) => e.exerciseNumber);
    expect(ce).toEqual([
      "1a", "1b", "1c", "2a", "2b", "2c", "2d", "2e", "2f", "3a", "3b", "3c", "3d", "3e", "3f",
      "4a", "4b", "4c", "4d", "5a", "5b", "5c", "5d", "6a", "6b", "7a", "7b",
      "Final 1", "Final 2", "Final 3", "Final 4",
    ].map((n) => n));
  });

  it("has unique ids and valid references", () => {
    const ids = EXERCISES.map((e) => e.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const e of EXERCISES) {
      for (const p of e.prerequisites) expect(getExercise(p), `${e.id} → ${p}`).toBeDefined();
      for (const s of e.supplementalExerciseIds) expect(getExercise(s)?.parentId).toBe(e.id);
      for (const m of e.materialIds) expect(MATERIALS_BY_ID.has(m), `${e.id} material ${m}`).toBe(true);
      const section = COURSES.find((c) => c.id === e.course)!.sections.find((s) => s.id === e.sectionId);
      expect(section, `${e.id} section`).toBeDefined();
    }
  });

  it("prerequisites always point backwards in book order", () => {
    EXERCISES.forEach((e, i) => {
      for (const p of e.prerequisites) {
        expect(EXERCISES.findIndex((x) => x.id === p), `${e.id} requires later ${p}`).toBeLessThan(i);
      }
    });
  });

  it("every page reference is inside its book", () => {
    for (const e of EXERCISES) {
      for (const dir of e.finalPair ? (["constrict", "dilate"] as const) : [undefined]) {
        const s = resolveSheets(e, dir);
        const refs = [...s.display, ...s.printSources, ...s.printTargets, ...s.setupKeys, ...s.checkKeys, ...s.reused.map((r) => r.sheet)];
        for (const r of refs) {
          expect(r.page).toBeGreaterThanOrEqual(1);
          expect(r.page, `${e.id} ${assetId(r)}`).toBeLessThanOrEqual(PAGE_COUNTS[r.book]);
        }
      }
      for (const p of e.instructionPages) expect(p).toBeLessThanOrEqual(PAGE_COUNTS[e.instructionBook]);
    }
  });

  it("spot-checks audited pages", () => {
    expect(exerciseCitation(getExercise("aae-08")!)).toBe("An Accurate Eye — Exercise 8, p.38");
    expect(getExercise("aae-27")!.sheets.printSources[0].page).toBe(80);
    expect(getExercise("sup-3a")!.sheets.printSources[0].page).toBe(13);
    expect(getExercise("sup-3a")!.sheets.printTargets[0].page).toBe(14);
    expect(getExercise("ce-2d")!.sheets.checkKeys[0].page).toBe(15);
    expect(getExercise("ce-3f")!.sheets.checkKeys[0].page).toBe(26);
    expect(getExercise("ce-7b")!.sheets.checkKeys[0].page).toBe(50);
    expect(getExercise("ce-f4")!.finalPair).toMatchObject({ reduced: { page: 57 }, enlarged: { page: 58 } });
  });

  it("supplement pairs are source on the odd page, target on the next", () => {
    for (const e of EXERCISES.filter((x) => x.type === "supplemental" && x.sheets.printTargets.length)) {
      const src = e.sheets.printSources[0].page;
      expect(src % 2, e.id).toBe(1);
      expect(e.sheets.printTargets[0].page).toBe(src + 1);
    }
  });

  it("never shows or prints a check-only key before the attempt", () => {
    for (const e of EXERCISES) {
      for (const dir of e.finalPair ? (["constrict", "dilate"] as const) : [undefined]) {
        const s = resolveSheets(e, dir);
        const keyIds = new Set(s.checkKeys.map(assetId));
        const setupIds = new Set(s.setupKeys.map(assetId));
        for (const d of s.display) expect(keyIds.has(assetId(d)), `${e.id} displays its key`).toBe(false);
        for (const r of requiredPrintSheets(e, dir)) {
          const id = assetId(r);
          if (keyIds.has(id)) expect(setupIds.has(id), `${e.id} prints check-only key ${id}`).toBe(true);
        }
      }
    }
  });

  it("only the exercises whose setup uses the key print it (CE 4c onward)", () => {
    const withSetup = EXERCISES.filter((e) => resolveSheets(e).setupKeys.length > 0).map((e) => e.id);
    expect(withSetup).toEqual(["ce-4c", "ce-4d", "ce-5b", "ce-5c", "ce-5d", "ce-6a", "ce-6b", "ce-7a", "ce-7b", "ce-f1", "ce-f2", "ce-f3", "ce-f4"]);
  });

  it("reused sheets were printed by an earlier exercise", () => {
    for (const e of EXERCISES) {
      for (const r of e.sheets.reused) {
        const from = getExercise(r.fromExerciseId)!;
        expect(from.sheets.printSources.map(assetId)).toContain(assetId(r.sheet));
      }
    }
  });

  it("CE target scales follow the book (verified against keys)", () => {
    const f = (id: string) => getExercise(id)!.scale!.factor;
    expect(f("ce-2a")).toBeCloseTo(1 / 3);
    expect(f("ce-2c")).toBe(0.5);
    expect(f("ce-2d")).toBeCloseTo(2 / 3);
    expect(f("ce-3a")).toBe(2);
    expect(f("ce-3d")).toBeCloseTo(4 / 3);
    expect(f("ce-5a")).toBe(1.5);
    expect(f("ce-6b")).toBeCloseTo(2 / 3);
  });

  it("finals swap source and key by direction", () => {
    const e = getExercise("ce-f1")!;
    expect(resolveSheets(e, "constrict").printSources[0].page).toBe(52);
    expect(resolveSheets(e, "constrict").checkKeys[0].page).toBe(51);
    expect(resolveSheets(e, "dilate").printSources[0].page).toBe(51);
    expect(resolveSheets(e, "dilate").checkKeys[0].page).toBe(52);
  });

  it("minis and supplementals never gate progress", () => {
    for (const e of EXERCISES) if (e.type !== "core") expect(e.gating, e.id).toBe(false);
  });
});
