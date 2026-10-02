import { describe, expect, it } from "vitest";
import { buildExport, emptyState, EXPORT_FORMAT, validateImport } from "@/lib/portability";
import type { AppState } from "@/lib/types";
import { at, mk } from "./helpers";

function sample(): AppState {
  const s = emptyState();
  s.attempts = [
    mk("aae-01", 0, "accurate", ["too-left"], "drifted left"),
    mk("aae-01", 1, "mostly"),
    mk("aae-02", 2, "rework", ["position", "too-high"]),
  ];
  s.printed = { "aae-p019": at(0).toISOString() };
  s.materialsOwned = { ruler: true };
  return s;
}

describe("export / import", () => {
  it("round-trips the full state", () => {
    const original = sample();
    const exp = JSON.parse(JSON.stringify(buildExport(original, at(3))));
    expect(exp.format).toBe(EXPORT_FORMAT);
    const r = validateImport(exp);
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.state).toEqual(original);
      expect(r.summary).toEqual({ attempts: 3, exercises: 2, printed: 1 });
    }
  });

  it("includes exercise states and review dates in the export", () => {
    const exp = buildExport(sample(), at(4));
    const ex1 = exp.exerciseStates.find((x) => x.exerciseId === "aae-01")!;
    expect(ex1.status).toBe("REVIEW_DUE");
    expect(ex1.nextReviewAt).not.toBeNull();
    expect(exp.exerciseStates.find((x) => x.exerciseId === "aae-02")!.status).toBe("NEEDS_REWORK");
  });

  it("accepts a bare state object", () => {
    expect(validateImport(sample()).ok).toBe(true);
  });

  it.each([
    ["not an export", { hello: "world" }],
    ["wrong format tag", { format: "something-else", state: sample() }],
    ["wrong schema version", { ...sample(), schemaVersion: 2 }],
    ["bad rating", { ...sample(), attempts: [{ ...mk("aae-01", 0, "accurate"), rating: "great" }] }],
    ["unknown error category", { ...sample(), attempts: [{ ...mk("aae-01", 0, "accurate"), errors: ["wobbly"] }] }],
    ["unknown exercise", { ...sample(), attempts: [mk("aae-99", 0, "accurate")] }],
    ["extra fields", { ...sample(), sneaky: true }],
    ["bad printed key", { ...sample(), printed: { "../etc/passwd": at(0).toISOString() } }],
  ])("rejects %s", (_name, payload) => {
    expect(validateImport(payload).ok).toBe(false);
  });

  it("rejects duplicate ids and time-travel", () => {
    const a = mk("aae-01", 0, "accurate");
    expect(validateImport({ ...sample(), attempts: [a, a] }).ok).toBe(false);
    const backwards = { ...a, startedAt: at(2).toISOString(), finishedAt: at(1).toISOString() };
    const r = validateImport({ ...sample(), attempts: [backwards] });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.errors.join()).toMatch(/finishes before it starts/);
  });

  it("only Finals may carry a direction", () => {
    expect(validateImport({ ...sample(), attempts: [{ ...mk("aae-01", 0, "accurate"), direction: "dilate" }] }).ok).toBe(false);
    expect(validateImport({ ...sample(), attempts: [{ ...mk("ce-f1", 0, "accurate"), direction: "dilate" }] }).ok).toBe(true);
  });
});
