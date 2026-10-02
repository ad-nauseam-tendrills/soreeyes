"use client";

import { useState, useTransition } from "react";
import { applyImport, previewImport, type ImportPreview } from "@/app/actions";

export function ImportForm() {
  const [text, setText] = useState<string | null>(null);
  const [fileName, setFileName] = useState("");
  const [preview, setPreview] = useState<ImportPreview | null>(null);
  const [done, setDone] = useState<string | null>(null);
  const [pending, start] = useTransition();

  return (
    <div className="mt-3 space-y-4">
      <label className="btn btn-quiet cursor-pointer">
        Choose export file…
        <input
          type="file"
          accept="application/json,.json"
          className="sr-only"
          onChange={async (e) => {
            const f = e.target.files?.[0];
            setDone(null);
            setPreview(null);
            if (!f) return;
            setFileName(f.name);
            const t = await f.text();
            setText(t);
            start(async () => setPreview(await previewImport(t)));
          }}
        />
      </label>
      {fileName && <p className="text-sm text-pencil">{fileName}</p>}

      {preview && !preview.ok && (
        <div role="alert" className="border border-rule bg-card p-4 text-sm">
          <p className="font-medium text-ochre">This file can&apos;t be imported:</p>
          <ul className="mt-2 list-disc pl-5">
            {preview.errors.map((e) => (
              <li key={e}>{e}</li>
            ))}
          </ul>
        </div>
      )}

      {preview?.ok && !done && (
        <div className="border border-rule bg-card p-4 text-sm">
          <p>
            Valid. It contains {preview.summary.attempts} attempts across {preview.summary.exercises} exercises and{" "}
            {preview.summary.printed} printed-sheet records.
          </p>
          <p className="mt-1 text-ochre">This replaces your current {preview.current} attempts.</p>
          <button
            type="button"
            className="btn btn-primary mt-3"
            disabled={pending || !text}
            onClick={() =>
              start(async () => {
                const r = await applyImport(text!);
                setDone(r.ok ? `Imported ${r.summary.attempts} attempts.` : "Import failed — nothing was changed.");
              })
            }
          >
            Replace my data with this file
          </button>
        </div>
      )}
      {done && (
        <p role="status" className="text-sm">
          {done}
        </p>
      )}
    </div>
  );
}
