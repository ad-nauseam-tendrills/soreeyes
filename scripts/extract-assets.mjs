#!/usr/bin/env node
// Extract ONLY the pages Sore Eyes needs from your own copies of the four PDFs.
//
//   npm run extract-assets -- \
//     --aae ~/Books/An_Accurate_Eye.pdf \
//     --sup ~/Books/An_Accurate_Eye-Supplement.pdf \
//     --ceb ~/Books/A_Comparative_Eye-Course_Book.pdf \
//     --cew ~/Books/A_Comparative_Eye-Workbook.pdf \
//     [--out ./private-assets] [--dpi 150]
//
// Writes <out>/png/<id>.png (screen) and <out>/pdf/<id>.pdf (vector, true size for printing).
// <out> must never be inside a public web root or committed to git.
// Requires poppler's `pdftoppm` (macOS: brew install poppler · Ubuntu: apt install poppler-utils).

import { execFileSync } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { PDFDocument } from "pdf-lib";

const here = path.dirname(fileURLToPath(import.meta.url));
const manifest = JSON.parse(readFileSync(path.join(here, "../src/content/asset-manifest.json"), "utf8"));

// Page counts of the editions the course data was audited against (COURSE_AUDIT.md).
const EXPECTED_PAGES = { aae: 92, sup: 43, ceb: 56, cew: 60 };

const args = Object.fromEntries(
  process.argv.slice(2).reduce((acc, a, i, all) => (a.startsWith("--") ? [...acc, [a.slice(2), all[i + 1]]] : acc), []),
);
const out = path.resolve(args.out || process.env.ASSETS_DIR || "./private-assets");
const dpi = Number(args.dpi || 150);

const needed = new Map(); // book -> Set(page)
for (const id of manifest.assets) {
  // Image sets (lang/lref) aren't in the PDFs — they're added separately (see DEPLOY.md).
  const m = /^(aae|sup|ceb|cew)-p(\d{3})$/.exec(id);
  if (!m) continue;
  const [, book, page] = m;
  if (!needed.has(book)) needed.set(book, new Set());
  needed.get(book).add(Number(page));
}

try {
  execFileSync("pdftoppm", ["-v"], { stdio: "ignore" });
} catch {
  console.error("pdftoppm not found. Install poppler (brew install poppler / apt install poppler-utils).");
  process.exit(1);
}

mkdirSync(path.join(out, "png"), { recursive: true });
mkdirSync(path.join(out, "pdf"), { recursive: true });

let count = 0;
for (const [book, pages] of needed) {
  const file = args[book];
  if (!file) {
    console.error(`Missing --${book} <path to PDF>`);
    process.exit(1);
  }
  const src = await PDFDocument.load(readFileSync(file), { ignoreEncryption: true });
  if (src.getPageCount() !== EXPECTED_PAGES[book]) {
    console.error(
      `--${book}: expected ${EXPECTED_PAGES[book]} pages, found ${src.getPageCount()}. Wrong file or a different edition — page references would be off.`,
    );
    process.exit(1);
  }
  for (const page of [...pages].sort((a, b) => a - b)) {
    const id = `${book}-p${String(page).padStart(3, "0")}`;
    const one = await PDFDocument.create();
    const [copied] = await one.copyPages(src, [page - 1]);
    one.addPage(copied);
    writeFileSync(path.join(out, "pdf", `${id}.pdf`), await one.save());
    execFileSync("pdftoppm", [
      "-r", String(dpi), "-f", String(page), "-l", String(page), "-png", "-singlefile",
      file, path.join(out, "png", id),
    ]);
    count++;
  }
  console.log(`${book}: ${pages.size} pages`);
}
console.log(`Done: ${count} pages → ${out}`);
