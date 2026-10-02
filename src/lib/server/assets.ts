import "server-only";
import { promises as fs } from "node:fs";
import path from "node:path";
import { ALLOWED_ASSETS } from "@/content/sheets";

// Extracted pages live OUTSIDE the app and outside git, in ASSETS_DIR:
//   <ASSETS_DIR>/png/<assetId>.png   on-screen display
//   <ASSETS_DIR>/pdf/<assetId>.pdf   single-page vector PDF for printing at true size
// Produced by `npm run extract-assets` from the owner's own PDFs.

export function assetsDir(): string {
  return path.resolve(process.env.ASSETS_DIR || "./private-assets");
}

export async function readAsset(id: string, kind: "png" | "pdf"): Promise<Buffer | null> {
  if (!ALLOWED_ASSETS.has(id)) return null; // strict allow-list; also blocks path tricks
  try {
    return await fs.readFile(path.join(assetsDir(), kind, `${id}.${kind}`));
  } catch {
    return null;
  }
}

export async function missingAssets(): Promise<string[]> {
  const missing: string[] = [];
  for (const id of ALLOWED_ASSETS) {
    for (const kind of ["png", "pdf"] as const) {
      try {
        await fs.access(path.join(assetsDir(), kind, `${id}.${kind}`));
      } catch {
        missing.push(`${kind}/${id}.${kind}`);
      }
    }
  }
  return missing;
}
