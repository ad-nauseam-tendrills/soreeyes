import type { Metadata } from "next";
import { DeleteReference, ReferenceUpload } from "@/components/ReferenceUpload";
import { formatDate } from "@/lib/display";
import { loadContext } from "@/lib/server/context";

export const metadata: Metadata = { title: "References" };
export const dynamic = "force-dynamic";

export default async function ReferencesPage() {
  const { state, timeZone } = await loadContext();
  const refs = [...state.references].reverse();
  const usage = new Map<string, number>();
  for (const a of state.attempts) if (a.referenceId) usage.set(a.referenceId, (usage.get(a.referenceId) ?? 0) + 1);

  return (
    <div className="space-y-10">
      <header>
        <h1 className="text-4xl">References</h1>
        <p className="mt-2 max-w-2xl text-graphite">
          Photos to paint from in the Portrait Value drills. Pick one when you start an attempt; its value key is made
          from it. Stored privately on your server, never in git.
        </p>
      </header>

      <section aria-labelledby="add-h">
        <h2 id="add-h" className="eyebrow">
          Add a reference
        </h2>
        <ReferenceUpload />
        <p className="mt-2 text-xs text-pencil">
          Good value-study references have one clear light source and a simple light and shadow pattern. She suggests
          older male faces for learning the planes.
        </p>
      </section>

      <section aria-labelledby="list-h">
        <h2 id="list-h" className="eyebrow">
          Your references ({refs.length})
        </h2>
        {refs.length === 0 ? (
          <p className="mt-3 text-sm text-pencil">None yet — the drills use the demo reference until you add one.</p>
        ) : (
          <ul className="mt-4 grid grid-cols-2 gap-6 sm:grid-cols-3 lg:grid-cols-4">
            {refs.map((r) => (
              <li key={r.id} className="space-y-2">
                <a href={`/api/reference/${r.id}`} target="_blank" rel="noopener">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={`/api/reference/${r.id}`}
                    alt={r.name}
                    loading="lazy"
                    className="sheet-frame aspect-[4/5] w-full object-cover"
                  />
                </a>
                <p className="font-serif">{r.name}</p>
                <p className="text-xs text-pencil">
                  Added {formatDate(r.addedAt, timeZone)} · used in {usage.get(r.id) ?? 0} attempt
                  {usage.get(r.id) === 1 ? "" : "s"}
                </p>
                <DeleteReference id={r.id} name={r.name} />
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
