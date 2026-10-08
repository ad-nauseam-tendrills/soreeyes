"use client";

import { useEffect, useRef, useState, type ImgHTMLAttributes } from "react";

/**
 * <img> that shows a clear note instead of a broken image when the file isn't installed
 * on the server yet. Also catches failures that happen before hydration.
 */
export function SafeImage(props: ImgHTMLAttributes<HTMLImageElement> & { src: string; alt: string }) {
  const ref = useRef<HTMLImageElement>(null);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    const img = ref.current;
    if (img && img.complete && img.naturalWidth === 0) setFailed(true);
  }, [props.src]);
  if (failed) {
    return (
      <div role="img" aria-label={props.alt} className="sheet-frame mx-auto flex min-h-40 max-w-md items-center justify-center p-6 text-center text-sm text-graphite">
        This image isn&apos;t installed on the server yet. Check that its file is in the assets folder (DEPLOY.md
        §3), then reload.
      </div>
    );
  }
  // eslint-disable-next-line @next/next/no-img-element
  return <img ref={ref} {...props} onError={() => setFailed(true)} />;
}
