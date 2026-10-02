import { describe, expect, it } from "vitest";
import { getExercise } from "@/content/course-data";
import {
  computeProgress,
  courseProgress,
  pickInterleave,
  replayAttempts,
  REVIEW_INTERVALS_DAYS,
  todayPlan,
} from "@/lib/progress/engine";
import { aaeAllProficient, at, DAY, mk, T0 } from "./helpers";

const status = (attempts: Parameters<typeof computeProgress>[0], id: string, day: number) =>
  computeProgress(attempts, at(day)).get(id)!.status;

describe("exercise prerequisites", () => {
  it("only Exercise 1 is open at the start", () => {
    const p = computeProgress([], at(0));
    expect(p.get("aae-01")!.status).toBe("NOT_STARTED");
    expect(p.get("aae-02")!.status).toBe("LOCKED");
    expect(p.get("sup-1a")!.status).toBe("LOCKED");
    expect(p.get("mini-1")!.status).toBe("LOCKED");
  });

  it("one attempt does not unlock the next exercise", () => {
    expect(status([mk("aae-01", 0, "accurate")], "aae-02", 0)).toBe("LOCKED");
  });

  it("proficiency at Ex 1 unlocks Ex 2 and its supplementals", () => {
    const a = [mk("aae-01", 0, "accurate"), mk("aae-01", 1, "accurate")];
    expect(status(a, "aae-02", 1)).toBe("NOT_STARTED");
    expect(status(a, "sup-1a", 1)).toBe("NOT_STARTED");
    expect(status(a, "aae-03", 1)).toBe("LOCKED");
  });

  it("Ex 3 needs both Ex 1 and Ex 2 (AAE p.20)", () => {
    const a = [mk("aae-02", 0, "accurate"), mk("aae-02", 1, "accurate")];
    // Ex 2 has history (so it shows), but Ex 1 was never proficient.
    expect(status(a, "aae-03", 1)).toBe("LOCKED");
  });

  it("a later rework on a prerequisite does not re-lock what was already opened", () => {
    const a = [mk("aae-01", 0, "accurate"), mk("aae-01", 1, "accurate"), mk("aae-01", 5, "rework")];
    expect(status(a, "aae-01", 5)).toBe("NEEDS_REWORK");
    expect(status(a, "aae-02", 5)).toBe("NOT_STARTED");
  });

  it("minis open once their anchor exercise has been started", () => {
    const a = aaeAllProficient().filter((x) => ["aae-01", "aae-02", "aae-03", "aae-04", "aae-05", "aae-06"].includes(x.exerciseId));
    expect(status(a, "mini-1", 30)).toBe("LOCKED");
    expect(status([...a, mk("aae-07", 31, "rework")], "mini-1", 31)).toBe("NOT_STARTED");
  });
});

describe("course unlocking", () => {
  it("A Comparative Eye stays locked until every AAE core exercise is proficient", () => {
    const all = aaeAllProficient();
    const missingOne = all.filter((a) => a.exerciseId !== "aae-31");
    expect(status(missingOne, "ce-1a", 60)).toBe("LOCKED");
    expect(status(all, "ce-1a", 60)).toBe("NOT_STARTED");
  });

  it("minis, supplementals and checkpoints are not required", () => {
    const p = computeProgress(aaeAllProficient(), at(60));
    expect(p.get("mini-1")!.attempts).toHaveLength(0);
    expect(p.get("ce-1a")!.unlocked).toBe(true);
  });

  it("today's plan moves to A Comparative Eye when AAE is done", () => {
    const plan = todayPlan(computeProgress(aaeAllProficient(), at(60)), at(60));
    expect(plan.activeCourse).toBe("ce");
    expect(plan.current?.id).toBe("ce-1a");
  });
});

describe("mastery & proficiency transitions", () => {
  const e = getExercise("aae-01")!;
  it("never proficient, let alone mastered, after one attempt", () => {
    const r = replayAttempts(e, [mk("aae-01", 0, "accurate")]);
    expect(r.phase).toBe("learning");
    expect(r.everProficient).toBe(false);
    expect(r.mastered).toBe(false);
  });

  it("proficient after 2 good of the last 3 with the latest good", () => {
    expect(replayAttempts(e, [mk("aae-01", 0, "accurate"), mk("aae-01", 1, "mostly")]).phase).toBe("proficient");
    expect(replayAttempts(e, [mk("aae-01", 0, "accurate"), mk("aae-01", 1, "rework")]).phase).toBe("rework");
    expect(
      replayAttempts(e, [mk("aae-01", 0, "accurate"), mk("aae-01", 1, "rework"), mk("aae-01", 2, "accurate")]).phase,
    ).toBe("proficient");
    expect(
      replayAttempts(e, [mk("aae-01", 0, "rework"), mk("aae-01", 1, "rework"), mk("aae-01", 2, "accurate")]).phase,
    ).toBe("learning");
  });

  it("mastered only after passing the 3/7/14/30-day reviews", () => {
    const a = [mk("aae-01", 0, "accurate"), mk("aae-01", 0.1, "accurate")];
    let day = 0.1;
    for (let i = 0; i < REVIEW_INTERVALS_DAYS.length; i++) {
      expect(replayAttempts(e, a).mastered).toBe(false);
      day += REVIEW_INTERVALS_DAYS[i];
      a.push(mk("aae-01", day, "accurate"));
    }
    const r = replayAttempts(e, a);
    expect(r.mastered).toBe(true);
    expect(status(a, "aae-01", day + 1)).toBe("MASTERED");
  });

  it("'mostly accurate' on a review repeats the interval instead of extending it", () => {
    const a = [mk("aae-01", 0, "accurate"), mk("aae-01", 0, "accurate"), mk("aae-01", 3, "mostly")];
    const r = replayAttempts(e, a);
    expect(r.reviewStage).toBe(0);
    expect(r.dueAt).toBe(T0 + 6 * DAY);
  });
});

describe("review scheduling", () => {
  const base = [mk("aae-01", 0, "accurate"), mk("aae-01", 0, "accurate")];

  it("first review ~3 days after becoming proficient", () => {
    expect(status(base, "aae-01", 2.9)).toBe("PROFICIENT");
    expect(status(base, "aae-01", 3)).toBe("REVIEW_DUE");
  });

  it("a successful review extends the interval: 3 → 7 → 14 → 30 days", () => {
    const a = [...base, mk("aae-01", 3, "accurate")];
    const p = computeProgress(a, at(3)).get("aae-01")!;
    expect(Date.parse(p.nextReviewAt!)).toBe(T0 + 10 * DAY);
    a.push(mk("aae-01", 10, "accurate"));
    expect(Date.parse(computeProgress(a, at(10)).get("aae-01")!.nextReviewAt!)).toBe(T0 + 24 * DAY);
  });

  it("extra practice before the review is due doesn't change the schedule", () => {
    const a = [...base, mk("aae-01", 1, "accurate")];
    expect(Date.parse(computeProgress(a, at(1)).get("aae-01")!.nextReviewAt!)).toBe(T0 + 3 * DAY);
  });

  it("caps suggested reviews per day", () => {
    const ids = ["aae-01", "aae-02", "aae-03", "aae-04"];
    const a = ids.flatMap((id) => [mk(id, 0, "accurate"), mk(id, 0, "accurate")]);
    const p = computeProgress(a, at(5));
    const plan = todayPlan(p, at(5), 2);
    expect(plan.reviewsDueTotal).toBe(4);
    expect(plan.reviews).toHaveLength(2);
  });
});

describe("rework transitions", () => {
  it("a failed review returns the exercise to the rework queue", () => {
    const a = [mk("aae-01", 0, "accurate"), mk("aae-01", 0, "accurate"), mk("aae-01", 3, "rework", ["too-right"])];
    const p = computeProgress(a, at(3));
    expect(p.get("aae-01")!.status).toBe("NEEDS_REWORK");
    expect(p.get("aae-01")!.nextReviewAt).toBeUndefined();
    const plan = todayPlan(p, at(3));
    expect(plan.rework.map((e) => e.id)).toContain("aae-01");
  });

  it("mastered is lost on a failed review and must be re-earned", () => {
    const e = getExercise("aae-01")!;
    const a = [mk("aae-01", 0, "accurate"), mk("aae-01", 0, "accurate")];
    let d = 0;
    for (const iv of REVIEW_INTERVALS_DAYS) a.push(mk("aae-01", (d += iv), "accurate"));
    expect(replayAttempts(e, a).mastered).toBe(true);
    a.push(mk("aae-01", d + 60, "rework"));
    const r = replayAttempts(e, a);
    expect(r.mastered).toBe(false);
    expect(r.phase).toBe("rework");
    a.push(mk("aae-01", d + 61, "accurate"), mk("aae-01", d + 62, "accurate"));
    expect(replayAttempts(e, a).phase).toBe("proficient");
    expect(replayAttempts(e, a).mastered).toBe(false);
  });

  it("rework → practicing after a good attempt", () => {
    const a = [mk("aae-01", 0, "rework"), mk("aae-01", 1, "mostly")];
    expect(status(a, "aae-01", 1)).toBe("PRACTICING");
  });
});

describe("progress calculation", () => {
  it("counts introduced / proficient / mastered and weights proficiency", () => {
    const a = [
      mk("aae-01", 0, "accurate"),
      mk("aae-01", 0, "accurate"),
      mk("aae-02", 1, "rework"),
    ];
    const cp = courseProgress("aae", computeProgress(a, at(1)));
    expect(cp).toMatchObject({ total: 31, introduced: 2, proficient: 1, mastered: 0, needsRework: 1, reviewsDue: 0 });
    // 0.7 (proficient) + 0.15 (rework) over 31 exercises
    expect(cp.weightedPercent).toBe(Math.round(((0.7 + 0.15) / 31) * 100));
  });

  it("finishing raw attempts without proficiency barely moves the bar", () => {
    const a = Array.from({ length: 5 }, (_, i) => mk("aae-01", i, "rework"));
    expect(courseProgress("aae", computeProgress(a, at(5))).weightedPercent).toBe(0);
  });

  it("CE is reported locked while AAE is in progress", () => {
    expect(courseProgress("ce", computeProgress([], at(0))).unlocked).toBe(false);
  });
});

describe("interleaving", () => {
  it("never suggests a skill that hasn't been learned", () => {
    const a = [mk("aae-01", 0, "accurate"), mk("aae-01", 0, "accurate")];
    expect(pickInterleave(computeProgress(a, at(30)), getExercise("aae-02")!, at(30))).toBeNull();
  });

  it("suggests the longest-untouched exercise from another learned section", () => {
    const a = aaeAllProficient().filter((x) => Number(x.exerciseId.slice(4)) <= 9);
    // Pass all due reviews so nothing is REVIEW_DUE; keep the attempt dates old.
    const p = computeProgress(a, at(40));
    const current = getExercise("aae-10")!; // Angle section
    const pick = pickInterleave(
      new Map([...p].map(([k, v]) => [k, v.status === "REVIEW_DUE" ? { ...v, status: "PROFICIENT" as const } : v])),
      current,
      at(40),
    );
    expect(pick?.sectionId).toBe("position");
    expect(pick?.id).toBe("aae-01");
  });
});
