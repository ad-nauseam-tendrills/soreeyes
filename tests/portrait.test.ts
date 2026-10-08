import { describe, expect, it } from "vitest";
import { EXERCISES, getExercise } from "@/content/course-data";
import { ALLOWED_ASSETS, exerciseCitation, requiredPrintSheets, resolveSheets } from "@/content/sheets";
import { computeProgress, courseProgress, todayPlan } from "@/lib/progress/engine";
import { emptyState, validateImport } from "@/lib/portability";
import { aaeAllProficient, at, mk } from "./helpers";

describe("Portrait Value course", () => {
  it("has four drills, all reference-based, with the demo stages and reference allow-listed", () => {
    const pv = EXERCISES.filter((e) => e.course === "pv");
    expect(pv.map((e) => e.id)).toEqual(["pv-01", "pv-02", "pv-03", "pv-04"]);
    expect(pv.every((e) => e.reference)).toBe(true);
    for (const id of ["lang-p001", "lang-p002", "lang-p003", "lang-p004", "lang-p005", "lang-p006", "lref-p001"]) {
      expect(ALLOWED_ASSETS.has(id), id).toBe(true);
    }
    expect(getExercise("pv-01")!.reference!.keyLevels).toBe(2);
    expect(getExercise("pv-02")!.reference!.keyLevels).toBe(3);
  });

  it("prints the reference photo, shows the demo stages, and has no pre-made key", () => {
    const e = getExercise("pv-01")!;
    expect(requiredPrintSheets(e).map((s) => `${s.book}-${s.page}`)).toEqual(["lref-1"]);
    expect(resolveSheets(e).display.map((s) => s.page)).toEqual([1, 2]);
    expect(resolveSheets(e).checkKeys).toEqual([]);
    expect(exerciseCitation(e)).toBe("Chelsea Lang, value module demo — Two-value statement");
  });

  it("is open from the start and practised alongside An Accurate Eye", () => {
    const p = computeProgress([], at(0));
    expect(p.get("pv-01")!.status).toBe("NOT_STARTED");
    expect(p.get("pv-02")!.status).toBe("LOCKED");
    const plan = todayPlan(p, at(0));
    expect(plan.current?.id).toBe("aae-01");
    expect(plan.parallel.map((e) => e.id)).toEqual(["pv-01"]);
    expect(courseProgress("pv", p).unlocked).toBe(true);
  });

  it("progresses on its own and doesn't affect A Comparative Eye unlocking", () => {
    const a = [mk("pv-01", 0, "accurate"), mk("pv-01", 0.1, "mostly")];
    const p = computeProgress(a, at(1));
    expect(p.get("pv-02")!.status).toBe("NOT_STARTED");
    expect(p.get("pv-04")!.status).toBe("NOT_STARTED");
    expect(todayPlan(p, at(1)).parallel.map((e) => e.id)).toEqual(["pv-02"]);
    // CE still waits for all of AAE, regardless of portrait work.
    expect(p.get("ce-1a")!.status).toBe("LOCKED");
    expect(computeProgress([...aaeAllProficient(), ...a], at(60)).get("ce-1a")!.status).toBe("NOT_STARTED");
  });

  it("export/import keeps references and per-attempt reference ids; old exports still import", () => {
    const s = emptyState();
    s.references = [{ id: "0b0e4c1e-1111-4a4a-8888-123456789abc", name: "Older man", addedAt: at(0).toISOString() }];
    s.attempts = [{ ...mk("pv-01", 0, "rework", ["small-shapes"]), referenceId: "lref-p001" }];
    const r = validateImport(s);
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.state.references).toHaveLength(1);
      expect(r.state.attempts[0].referenceId).toBe("lref-p001");
    }
    const { references: _drop, ...old } = s;
    const r2 = validateImport({ ...old, attempts: [] });
    expect(r2.ok && r2.state.references).toEqual([]);
  });
});
