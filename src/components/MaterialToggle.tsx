"use client";

import { useTransition } from "react";
import { setMaterialOwned } from "@/app/actions";

export function MaterialToggle({ id, owned, name }: { id: string; owned: boolean; name: string }) {
  const [pending, start] = useTransition();
  return (
    <label className="inline-flex min-h-[44px] cursor-pointer items-center gap-2 text-sm">
      <input
        type="checkbox"
        className="h-5 w-5 accent-[#26241f]"
        checked={owned}
        disabled={pending}
        onChange={(e) => start(() => setMaterialOwned(id, e.target.checked))}
        aria-label={`I have: ${name}`}
      />
      {owned ? "Have it" : "Need it"}
    </label>
  );
}
