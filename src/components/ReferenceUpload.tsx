"use client";

import { useRef, useState, useTransition } from "react";
import { deleteReference, uploadReference } from "@/app/actions";

async function toJpeg(file: File, maxSide = 2000): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext("2d")!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  return new Promise((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("encode failed"))), "image/jpeg", 0.9),
  );
}

export function ReferenceUpload() {
  const [name, setName] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <div className="mt-3 flex flex-wrap items-end gap-3">
      <label className="block min-w-56">
        <span className="text-sm">Name (optional)</span>
        <input className="field mt-1" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Older man, side light" maxLength={120} />
      </label>
      <label className="btn cursor-pointer">
        {pending ? "Uploading…" : "Choose photo…"}
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          className="sr-only"
          disabled={pending}
          onChange={async (e) => {
            const f = e.target.files?.[0];
            if (!f) return;
            setMessage(null);
            try {
              const jpeg = await toJpeg(f);
              const fd = new FormData();
              fd.set("name", name || f.name.replace(/\.[^.]+$/, ""));
              fd.set("file", new File([jpeg], "reference.jpg", { type: "image/jpeg" }));
              start(async () => {
                const r = await uploadReference(fd);
                setMessage(r.ok ? "Added." : r.error);
                if (r.ok) setName("");
                if (inputRef.current) inputRef.current.value = "";
              });
            } catch {
              setMessage("Couldn't read that image.");
            }
          }}
        />
      </label>
      {message && (
        <p role="status" className="text-sm text-graphite">
          {message}
        </p>
      )}
    </div>
  );
}

export function DeleteReference({ id, name }: { id: string; name: string }) {
  const [pending, start] = useTransition();
  return (
    <button
      type="button"
      className="text-xs text-pencil underline"
      disabled={pending}
      onClick={() => {
        if (confirm(`Remove "${name}"? Attempts that used it keep their records.`)) start(() => deleteReference(id));
      }}
    >
      {pending ? "Removing…" : "Remove"}
    </button>
  );
}
