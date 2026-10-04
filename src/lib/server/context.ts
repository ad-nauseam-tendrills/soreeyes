import "server-only";
import { computeProgress, todayPlan } from "@/lib/progress/engine";
import { readState } from "@/lib/server/store";

export function appTimeZone(): string {
  const tz = process.env.APP_TIMEZONE || "UTC";
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: tz });
    return tz;
  } catch {
    return "UTC";
  }
}

/** Everything a page needs: state, derived progress and today's plan. */
export async function loadContext() {
  const now = new Date();
  const state = await readState();
  const progress = computeProgress(state.attempts, now);
  const plan = todayPlan(progress, now, state.settings.reviewCap);
  return { now, state, progress, plan, timeZone: appTimeZone() };
}
