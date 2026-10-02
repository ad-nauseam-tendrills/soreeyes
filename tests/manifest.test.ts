// The extraction script reads src/content/asset-manifest.json (page ids only).
// It must match the course data exactly. Regenerate with: npm run manifest
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { expect, test } from "vitest";
import { ALLOWED_ASSETS } from "@/content/sheets";

const file = path.resolve(__dirname, "../src/content/asset-manifest.json");

test("asset manifest matches course data", () => {
  const assets = [...ALLOWED_ASSETS].sort();
  if (process.env.UPDATE_MANIFEST === "1" || !existsSync(file)) {
    writeFileSync(file, JSON.stringify({ assets }, null, 1) + "\n");
  }
  expect(JSON.parse(readFileSync(file, "utf8")).assets).toEqual(assets);
});
