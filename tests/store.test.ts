// The real file store, against a throwaway DATA_DIR.
import { mkdtempSync, readdirSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { beforeEach, describe, expect, it } from "vitest";
import { emptyState } from "@/lib/portability";
import { mutateState, readState, replaceState } from "@/lib/server/store";
import { mk } from "./helpers";

beforeEach(() => {
  process.env.DATA_DIR = mkdtempSync(path.join(tmpdir(), "soreeyes-store-"));
});

describe("file store", () => {
  it("starts empty", async () => {
    expect(await readState()).toEqual(emptyState());
  });

  it("persists in-place edits (attempts, printed, materials, settings)", async () => {
    await mutateState((s) => {
      s.attempts.push(mk("aae-01", 0, "accurate"));
    });
    await mutateState((s) => {
      s.printed["aae-p019"] = new Date().toISOString();
      s.materialsOwned.ruler = true;
      s.settings = { showTimer: false, reviewCap: 1 };
    });
    const s = await readState();
    expect(s.attempts).toHaveLength(1);
    expect(s.printed["aae-p019"]).toBeDefined();
    expect(s.materialsOwned.ruler).toBe(true);
    expect(s.settings).toEqual({ showTimer: false, reviewCap: 1 });
    const onDisk = JSON.parse(readFileSync(path.join(process.env.DATA_DIR!, "state.json"), "utf8"));
    expect(onDisk.attempts).toHaveLength(1);
  });

  it("serialises concurrent writes without losing any", async () => {
    await Promise.all(
      Array.from({ length: 10 }, (_, i) =>
        mutateState((s) => {
          s.attempts.push(mk("aae-01", i, "mostly"));
        }),
      ),
    );
    expect((await readState()).attempts).toHaveLength(10);
  });

  it("keeps a backup of the previous state on every change", async () => {
    await mutateState((s) => {
      s.attempts.push(mk("aae-01", 0, "accurate"));
    });
    await replaceState(emptyState());
    expect((await readState()).attempts).toHaveLength(0);
    const backups = readdirSync(path.join(process.env.DATA_DIR!, "backups"));
    expect(backups.length).toBeGreaterThanOrEqual(1);
  });

  it("refuses to persist an invalid state", async () => {
    await expect(
      mutateState((s) => {
        (s.attempts as unknown[]).push({ nope: true });
      }),
    ).rejects.toThrow();
    expect((await readState()).attempts).toHaveLength(0);
  });
});
