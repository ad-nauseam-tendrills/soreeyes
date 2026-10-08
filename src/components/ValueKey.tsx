"use client";

import { useEffect, useRef, useState } from "react";
import { defaultThresholds, histogram, LEVEL_GRAYS, lumaOf, posterize } from "@/lib/value-key";

const MAX_SIDE = 900;

/**
 * The hidden answer key for value drills: the reference reduced to two or three flat
 * values (Otsu thresholds, adjustable), or plain grayscale. Rendered only after
 * Check My Work, so it never loads before the attempt.
 */
export function ValueKey({ src, levels }: { src: string; levels: 2 | 3 }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [luma, setLuma] = useState<{ data: Uint8Array; w: number; h: number } | null>(null);
  const [mode, setMode] = useState<"2" | "3" | "gray">(String(levels) as "2" | "3");
  const [thresholds, setThresholds] = useState<Record<"2" | "3", number[]>>({ "2": [128], "3": [85, 170] });
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const img = new Image();
    img.onload = () => {
      const scale = Math.min(1, MAX_SIDE / Math.max(img.naturalWidth, img.naturalHeight));
      const w = Math.round(img.naturalWidth * scale);
      const h = Math.round(img.naturalHeight * scale);
      const c = document.createElement("canvas");
      c.width = w;
      c.height = h;
      const ctx = c.getContext("2d")!;
      ctx.drawImage(img, 0, 0, w, h);
      const data = lumaOf(ctx.getImageData(0, 0, w, h).data);
      const hist = histogram(data);
      setThresholds({ "2": defaultThresholds(hist, 2), "3": defaultThresholds(hist, 3) });
      setLuma({ data, w, h });
    };
    img.onerror = () => setError("Couldn't load the reference image.");
    img.src = src;
  }, [src]);

  useEffect(() => {
    const c = canvasRef.current;
    if (!c || !luma) return;
    c.width = luma.w;
    c.height = luma.h;
    const ctx = c.getContext("2d")!;
    const values = mode === "gray" ? luma.data : posterize(luma.data, thresholds[mode], LEVEL_GRAYS[mode === "2" ? 2 : 3]);
    const out = ctx.createImageData(luma.w, luma.h);
    for (let i = 0; i < values.length; i++) {
      out.data[i * 4] = out.data[i * 4 + 1] = out.data[i * 4 + 2] = values[i];
      out.data[i * 4 + 3] = 255;
    }
    ctx.putImageData(out, 0, 0);
  }, [luma, mode, thresholds]);

  const setT = (i: number, v: number) =>
    setThresholds((prev) => {
      if (mode === "gray") return prev;
      const next = [...prev[mode]];
      next[i] = v;
      if (mode === "3") {
        if (i === 0) next[1] = Math.max(next[1], v + 1);
        else next[0] = Math.min(next[0], v - 1);
      }
      return { ...prev, [mode]: next };
    });

  if (error) return <p className="text-sm text-ochre">{error}</p>;

  return (
    <figure className="m-0">
      <canvas ref={canvasRef} className="sheet-frame mx-auto block h-auto max-h-[62vh] w-auto max-w-full" aria-label="Value key of the reference" />
      <figcaption className="mt-3 space-y-3 text-xs text-pencil">
        <div className="flex flex-wrap gap-2" role="group" aria-label="Key view">
          {(
            [
              ["2", "Two values"],
              ["3", "Three values"],
              ["gray", "Grayscale"],
            ] as const
          ).map(([m, label]) => (
            <button
              key={m}
              type="button"
              aria-pressed={mode === m}
              onClick={() => setMode(m)}
              className={`btn min-h-[36px] px-3 py-1 text-xs ${mode === m ? "btn-primary" : "btn-quiet"}`}
            >
              {label}
            </button>
          ))}
        </div>
        {mode !== "gray" &&
          thresholds[mode].map((t, i) => (
            <label key={i} className="flex items-center gap-3">
              <span className="w-28">{mode === "2" ? "Dark / light split" : i === 0 ? "Dark / middle split" : "Middle / light split"}</span>
              <input
                type="range"
                min={1}
                max={254}
                value={t}
                onChange={(e) => setT(i, Number(e.target.value))}
                className="w-40 accent-[#26241f]"
              />
              <span className="tabular-nums">{t}</span>
            </label>
          ))}
        <p>
          The split starts at the photo&apos;s natural break (Otsu). Slide it toward the darks to &ldquo;expose for the
          lights&rdquo; — more of the midtones join the light.
        </p>
      </figcaption>
    </figure>
  );
}
