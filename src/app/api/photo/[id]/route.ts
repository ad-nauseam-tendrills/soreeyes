import { isOwner } from "@/lib/server/auth";
import { readPhoto } from "@/lib/server/store";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await isOwner())) return new Response("Unauthorized", { status: 401 });
  const { id } = await params;
  const bytes = await readPhoto(id);
  if (!bytes) return new Response("Not found", { status: 404 });
  return new Response(new Uint8Array(bytes), {
    headers: { "Content-Type": "image/jpeg", "Cache-Control": "private, max-age=604800" },
  });
}
