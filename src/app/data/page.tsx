import type { Metadata } from "next";
import { updateSettings } from "@/app/actions";
import { ImportForm } from "@/components/ImportForm";
import { missingAssets } from "@/lib/server/assets";
import { loadContext } from "@/lib/server/context";

export const metadata: Metadata = { title: "Data" };
export const dynamic = "force-dynamic";

export default async function DataPage() {
  const { state, timeZone } = await loadContext();
  const missing = await missingAssets();
  return (
    <div className="max-w-2xl space-y-12">
      <header>
        <h1 className="text-4xl">Your data</h1>
        <p className="mt-2 text-graphite">Your training history belongs to you.</p>
      </header>

      <section aria-labelledby="export-h">
        <h2 id="export-h" className="eyebrow">
          Export progress
        </h2>
        <p className="mt-2 text-sm text-graphite">
          Everything as JSON: {state.attempts.length} attempts with notes and errors, printed sheets, settings, plus a
          snapshot of exercise states and review dates. Photos stay on the server (referenced by id).
        </p>
        <a className="btn mt-3" href="/api/export">
          Export Progress
        </a>
      </section>

      <section aria-labelledby="import-h">
        <h2 id="import-h" className="eyebrow">
          Import progress
        </h2>
        <p className="mt-2 text-sm text-graphite">
          The file is checked in full first; nothing changes until you confirm. Your current data is backed up on the
          server before it&apos;s replaced.
        </p>
        <ImportForm />
      </section>

      <section aria-labelledby="settings-h">
        <h2 id="settings-h" className="eyebrow">
          Settings
        </h2>
        <form action={updateSettings} className="mt-3 space-y-4">
          <label className="flex items-center gap-3">
            <input type="checkbox" name="showTimer" defaultChecked={state.settings.showTimer} className="h-5 w-5" />
            Show the timer during attempts (you can always hide it mid-attempt)
          </label>
          <label className="block max-w-xs">
            <span className="text-sm">Reviews suggested per day</span>
            <input
              type="number"
              name="reviewCap"
              min={0}
              max={10}
              defaultValue={state.settings.reviewCap}
              className="field mt-1"
            />
          </label>
          <button className="btn" type="submit">
            Save settings
          </button>
        </form>
        <p className="mt-3 text-xs text-pencil">Time zone for &ldquo;today&rdquo;: {timeZone} (APP_TIMEZONE).</p>
      </section>

      <section aria-labelledby="assets-h">
        <h2 id="assets-h" className="eyebrow">
          Exercise sheets
        </h2>
        {missing.length === 0 ? (
          <p className="mt-2 text-sm text-graphite">All exercise pages are extracted and available.</p>
        ) : (
          <p className="mt-2 text-sm text-ochre">
            {missing.length} page files are missing from ASSETS_DIR — run <code>npm run extract-assets</code> (see
            README).
          </p>
        )}
      </section>

      <section>
        <form method="post" action="/api/logout">
          <button className="btn btn-quiet" type="submit">
            Sign out
          </button>
        </form>
      </section>
    </div>
  );
}
