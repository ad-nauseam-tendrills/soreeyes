// Import-free so client components don't pull course data into public JS bundles.

/** Serializable view of one sheet for client components. */
export interface SheetView {
  id: string;
  label: string;
  citation: string;
}

export function printHref(ids: string[], name: string): string {
  return `/api/print?ids=${ids.join(",")}&name=${encodeURIComponent(name)}`;
}
