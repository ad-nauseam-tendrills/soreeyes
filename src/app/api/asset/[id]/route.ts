import { readAsset } from "@/lib/server/assets";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const png = await readAsset(id, "png");
  if (!png) return new Response("Not found", { status: 404 });
  return new Response(new Uint8Array(png), {
    headers: {
      "Content-Type": "image/png",
      // Browser-private cache only; never a shared/CDN cache.
      "Cache-Control": "private, max-age=86400",
    },
  });
}
