import { readState } from "@/lib/server/store";
import { buildExport } from "@/lib/portability";

export async function GET() {
  const body = buildExport(await readState());
  const date = body.exportedAt.slice(0, 10);
  return new Response(JSON.stringify(body, null, 2), {
    headers: {
      "Content-Type": "application/json",
      "Content-Disposition": `attachment; filename="sore-eyes-progress-${date}.json"`,
      "Cache-Control": "private, no-store",
    },
  });
}
