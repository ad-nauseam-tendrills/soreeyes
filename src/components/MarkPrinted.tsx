"use client";

import { useTransition } from "react";
import { setPrinted } from "@/app/actions";

export function MarkPrinted({ ids, printed, label }: { ids: string[]; printed: boolean; label?: string }) {
  const [pending, start] = useTransition();
  return (
    <button
      type="button"
      className="btn btn-quiet"
      disabled={pending || ids.length === 0}
      aria-pressed={printed}
      onClick={() => start(() => setPrinted(ids, !printed))}
    >
      {printed ? "✓ Printed — undo" : (label ?? "Mark as printed")}
    </button>
  );
}
