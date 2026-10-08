"use client";

import { useState } from "react";
import { SafeImage } from "@/components/MissingImage";

export interface ReferenceOption {
  id: string;
  label: string;
  src: string;
}

/** Reference photo with "squint" (blur) and grayscale controls — plain CSS filters. */
export function ReferenceViewer({ option, size = "normal" }: { option: ReferenceOption; size?: "normal" | "tall" }) {
  const [blur, setBlur] = useState(0);
  const [gray, setGray] = useState(true);
  const maxH = size === "tall" ? "max-h-[80vh]" : "max-h-[62vh]";
  return (
    <figure className="m-0">
      <SafeImage
        src={option.src}
        alt={`Reference: ${option.label}`}
        className={`sheet-frame mx-auto block h-auto w-auto max-w-full ${maxH}`}
        style={{ filter: `blur(${blur}px) grayscale(${gray ? 1 : 0})` }}
      />
      <figcaption className="no-print mt-2 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-pencil">
        <span>{option.label}</span>
        <label className="flex items-center gap-2">
          Squint
          <input
            type="range"
            min={0}
            max={12}
            step={1}
            value={blur}
            onChange={(e) => setBlur(Number(e.target.value))}
            aria-label="Squint (blur) amount"
            className="w-28 accent-[#26241f]"
          />
        </label>
        <label className="flex items-center gap-2">
          <input type="checkbox" checked={gray} onChange={(e) => setGray(e.target.checked)} />
          Grayscale
        </label>
        <a className="link" href={option.src} target="_blank" rel="noopener">
          Full size
        </a>
      </figcaption>
    </figure>
  );
}
