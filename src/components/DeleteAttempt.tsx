"use client";

import { useTransition } from "react";
import { deleteAttempt } from "@/app/actions";

/** For fixing mis-entries. Confirms first; previous state remains in data/backups. */
export function DeleteAttempt({ id }: { id: string }) {
  const [pending, start] = useTransition();
  return (
    <button
      type="button"
      className="mt-1 text-xs text-pencil underline"
      disabled={pending}
      onClick={() => {
        if (confirm("Delete this attempt record? (A backup of the previous state is kept on the server.)")) {
          start(() => deleteAttempt(id));
        }
      }}
    >
      {pending ? "Deleting…" : "Delete record"}
    </button>
  );
}
