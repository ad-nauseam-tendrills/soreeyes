import { describe, expect, it } from "vitest";
import { computeProgress, todayPlan } from "@/lib/progress/engine";
import { printPlan } from "@/lib/progress/print";
import { createSessionToken, verifySessionToken } from "@/lib/session";
import { aaeAllProficient, at, mk } from "./helpers";

describe("print center", () => {
  it("lists the current exercise's sheets and the next ones", () => {
    const p = computeProgress([], at(0));
    const pp = printPlan(p, todayPlan(p, at(0)), {});
    expect(pp.needed[0].exercise.id).toBe("aae-01");
    expect(pp.needed[0].required.map((s) => s.page)).toEqual([19]);
    expect(pp.upcoming.map((i) => i.exercise.id)).toEqual(["aae-02", "aae-03", "aae-04"]);
  });

  it("never includes a check-only key; tells you to keep sheets a later exercise reuses", () => {
    const a = [...aaeAllProficient(), mk("ce-1a", 40, "accurate"), mk("ce-1a", 41, "accurate"), mk("ce-1b", 42, "mostly"), mk("ce-1b", 43, "accurate"), mk("ce-1c", 44, "accurate"), mk("ce-1c", 45, "accurate")];
    const p = computeProgress(a, at(46));
    const plan = todayPlan(p, at(46), 0);
    expect(plan.current?.id).toBe("ce-2a");
    const pp = printPlan(p, plan, { "cew-p009": at(46).toISOString() });
    const cur = pp.needed.find((i) => i.exercise.id === "ce-2a")!;
    expect(cur.required.map((s) => s.page)).toEqual([9]); // Key 2a (p.10) withheld
    expect(cur.hasHiddenKey).toBe(true);
    expect(pp.keep.map((k) => k.sheet.page)).toEqual([9]);
    expect(pp.keep[0].reusedBy.map((e) => e.id)).toEqual(["ce-2d"]);
  });
});

describe("session tokens", () => {
  const secret = "x".repeat(40);
  it("verifies its own tokens and rejects tampering, expiry and wrong secrets", async () => {
    const t = await createSessionToken(secret, 1_000);
    expect(await verifySessionToken(t, secret, 2_000)).toBe(true);
    expect(await verifySessionToken(t, "y".repeat(40), 2_000)).toBe(false);
    expect(await verifySessionToken(t.replace(/^\d+/, "9999999999999"), secret, 2_000)).toBe(false);
    expect(await verifySessionToken(t, secret, 1_000 + 31 * 86_400_000)).toBe(false);
    expect(await verifySessionToken(undefined, secret)).toBe(false);
    expect(await verifySessionToken(t, null)).toBe(false);
  });
});
