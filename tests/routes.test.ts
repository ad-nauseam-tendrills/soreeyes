// Guards against a page silently missing from the repo (e.g. swallowed by .gitignore):
// every main-nav link must have a page file.
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { expect, test } from "vitest";

const app = path.resolve(__dirname, "../src/app");

test("every nav link has a page", () => {
  const layout = readFileSync(path.join(app, "layout.tsx"), "utf8");
  const hrefs = [...layout.matchAll(/href: "([^"]+)"/g)].map((m) => m[1]);
  expect(hrefs.length).toBeGreaterThan(5);
  for (const href of hrefs) {
    const dir = href === "/" ? app : path.join(app, ...href.split("/").filter(Boolean).map((seg) => (seg === "aae" ? "[id]" : seg)));
    expect(existsSync(path.join(dir, "page.tsx")), `missing page for ${href}`).toBe(true);
  }
});
