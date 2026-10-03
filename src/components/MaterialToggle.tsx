"use client";

import { useOptimistic, useTransition } from "react";
import { setMaterialOwned } from "@/app/actions";

export function MaterialToggle({ id, owned, name }: { id: string; owned: boolean; name: string }) {
  const [, start] = useTransition();
  // Flip immediately; the server confirms in the background.
  const [shown, setShown] = useOptimistic(owned);
  return (
    <label className="inline-flex min-h-[44px] cursor-pointer items-center gap-2 text-sm">
      <input
        type="checkbox"
        className="h-5 w-5 accent-[#26241f]"
        checked={shown}
        onChange={(e) => {
          const next = e.target.checked;
          start(async () => {
            setShown(next);
            await setMaterialOwned(id, next);
          });
        }}
        aria-label={`I have: ${name}`}
      />
      {shown ? "Have it" : "Need it"}
    </label>
  );
}
