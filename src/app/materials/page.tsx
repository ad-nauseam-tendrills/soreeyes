import type { Metadata } from "next";
import { EXERCISES } from "@/content/course-data";
import { MATERIALS } from "@/content/materials";
import { MaterialToggle } from "@/components/MaterialToggle";
import { loadContext } from "@/lib/server/context";

export const metadata: Metadata = { title: "Materials" };
export const dynamic = "force-dynamic";

export default async function MaterialsPage() {
  const { state, plan } = await loadContext();
  const neededNow = new Set(plan.current?.materialIds ?? []);
  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-4xl">Materials</h1>
        <p className="mt-2 text-graphite">Only what the books ask for, with where they ask for it.</p>
      </header>
      <ul className="divide-y divide-rule border-y border-rule">
        {MATERIALS.map((m) => {
          const uses = EXERCISES.filter((e) => e.materialIds.includes(m.id)).length;
          return (
            <li key={m.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
              <div>
                <p className="font-serif text-lg">
                  {m.name}
                  {neededNow.has(m.id) && <span className="ml-2 font-sans text-xs uppercase tracking-wider text-sienna">needed now</span>}
                </p>
                <p className="text-xs text-pencil">
                  {m.source} · used by {uses} exercise{uses === 1 ? "" : "s"}
                  {m.optional ? " · optional" : ""}
                </p>
              </div>
              <MaterialToggle id={m.id} owned={Boolean(state.materialsOwned[m.id])} name={m.name} />
            </li>
          );
        })}
      </ul>
    </div>
  );
}
