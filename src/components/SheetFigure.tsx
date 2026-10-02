import { printHref, type SheetView } from "@/lib/print-href";

/** One page rendered from the owner's own PDF, with its citation and actions. */
export function SheetFigure({ view, size = "normal" }: { view: SheetView; size?: "normal" | "tall" | "thumb" }) {
  const src = `/api/asset/${view.id}`;
  const maxH = size === "tall" ? "max-h-[80vh]" : size === "thumb" ? "max-h-56" : "max-h-[62vh]";
  return (
    <figure className="m-0">
      <a href={src} target="_blank" rel="noopener" className="block" aria-label={`Open ${view.label} full size`}>
        {/* Plain <img>: owner-only asset route, never the public image optimizer. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={src}
          alt={`${view.label} — page from the book`}
          loading="lazy"
          className={`sheet-frame mx-auto block h-auto w-auto max-w-full ${maxH}`}
        />
      </a>
      <figcaption className="mt-2 flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1 text-xs text-pencil">
        <span>{view.citation}</span>
        <span className="no-print flex gap-3">
          <a className="link" href={src} target="_blank" rel="noopener">
            Full size
          </a>
          <a className="link" href={printHref([view.id], view.label)} target="_blank" rel="noopener">
            Print this sheet
          </a>
        </span>
      </figcaption>
    </figure>
  );
}

export function PrintScaleNote() {
  return (
    <p className="text-xs text-pencil">
      Opens a PDF of the original pages. Print at <strong>100% / Actual Size</strong> — sizes matter in these exercises.
    </p>
  );
}
