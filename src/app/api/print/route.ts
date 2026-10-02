import { PDFDocument } from "pdf-lib";
import { isOwner } from "@/lib/server/auth";
import { readAsset } from "@/lib/server/assets";
import { ALLOWED_ASSETS } from "@/content/sheets";

/**
 * GET /api/print?ids=aae-p038,sup-p031&name=Exercise-8
 * Concatenates the requested single-page PDFs (vector, original page size) so
 * the browser's PDF viewer can print them at 100% / Actual Size.
 */
export async function GET(req: Request) {
  if (!(await isOwner())) return new Response("Unauthorized", { status: 401 });
  const url = new URL(req.url);
  const ids = (url.searchParams.get("ids") ?? "").split(",").filter(Boolean);
  if (ids.length === 0 || ids.length > 12 || ids.some((id) => !ALLOWED_ASSETS.has(id))) {
    return new Response("Bad request", { status: 400 });
  }

  const out = await PDFDocument.create();
  out.setTitle(url.searchParams.get("name")?.slice(0, 80) || "Sore Eyes print");
  for (const id of ids) {
    const bytes = await readAsset(id, "pdf");
    if (!bytes) return new Response(`Sheet ${id} has not been extracted yet — see README.`, { status: 404 });
    const src = await PDFDocument.load(bytes);
    const [page] = await out.copyPages(src, [0]);
    out.addPage(page);
  }
  const pdf = await out.save();
  const filename = (url.searchParams.get("name") || "sore-eyes-print").replace(/[^A-Za-z0-9._-]+/g, "-");
  return new Response(new Uint8Array(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${filename}.pdf"`,
      "Cache-Control": "private, no-store",
    },
  });
}
