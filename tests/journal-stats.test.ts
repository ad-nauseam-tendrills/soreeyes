import { describe, expect, it } from "vitest";
import { categoryCounts, filterAttempts, observations } from "@/lib/progress/journal";
import { countSessions, currentStreak, dayKey, minutesPracticed } from "@/lib/progress/stats";
import { at, mk } from "./helpers";

describe("error journal", () => {
  it("reports recurring categories in recent attempts", () => {
    const a = [
      mk("aae-08", 0, "rework", ["angle", "too-steep"]),
      mk("aae-08", 1, "mostly", ["angle"]),
      mk("aae-08", 2, "accurate"),
      mk("aae-08", 3, "rework", ["angle", "too-steep"]),
      mk("aae-09", 4, "mostly", ["angle", "too-steep"]),
      mk("aae-09", 5, "accurate"),
    ];
    const obs = observations(a);
    expect(obs).toContain("Angle errors have appeared in 4 of your last 6 attempts.");
    expect(obs.some((o) => o.startsWith("Your drawings have tended to be too steep during Angle exercises"))).toBe(true);
  });

  it("describes size tendencies per section", () => {
    const a = ["ce-3a", "ce-3a", "ce-3b", "ce-3b"].map((id, i) => mk(id, i, "rework", ["too-large"]));
    expect(observations(a).join(" ")).toMatch(/too large during Dilation exercises/);
  });

  it("stays quiet without enough data", () => {
    expect(observations([mk("aae-01", 0, "rework", ["position"])])).toEqual([]);
  });

  it("filters by course, section, skill and date", () => {
    const a = [
      mk("aae-01", 0, "rework", ["position"]),
      mk("aae-08", 5, "rework", ["angle"]),
      mk("ce-1a", 10, "rework", ["proportion"]),
    ];
    const tz = "UTC";
    expect(filterAttempts(a, { course: "ce" }, tz)).toHaveLength(1);
    expect(filterAttempts(a, { section: "angle" }, tz)).toHaveLength(1);
    expect(filterAttempts(a, { skill: "position" }, tz)).toHaveLength(1);
    expect(filterAttempts(a, { from: dayKey(at(4), tz), to: dayKey(at(6), tz) }, tz).map((x) => x.exerciseId)).toEqual([
      "aae-08",
    ]);
    expect(categoryCounts(a).map((c) => c.count)).toEqual([1, 1, 1]);
  });
});

describe("stats", () => {
  const tz = "America/Los_Angeles";
  it("streak counts consecutive days and isn't 'lost' until a full day is missed", () => {
    const a = [mk("aae-01", 0, "accurate"), mk("aae-01", 1, "accurate"), mk("aae-01", 2, "accurate")];
    expect(currentStreak(a, at(2), tz)).toBe(3);
    expect(currentStreak(a, at(3), tz)).toBe(3); // nothing yet today — still shown
    expect(currentStreak(a, at(4.5), tz)).toBe(0);
  });

  it("groups attempts into sessions and sums minutes", () => {
    const a = [mk("aae-01", 0, "accurate"), mk("aae-01", 0.01, "accurate"), mk("aae-01", 1, "accurate")];
    expect(countSessions(a)).toBe(2);
    expect(minutesPracticed(a)).toBe(60);
  });
});
