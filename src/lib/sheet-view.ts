import { assetId, sheetCitation } from "@/content/sheets";
import type { SheetView } from "@/lib/print-href";
import type { SheetRef } from "@/lib/types";

export type { SheetView } from "@/lib/print-href";
export { printHref } from "@/lib/print-href";

export function toView(s: SheetRef): SheetView {
  return { id: assetId(s), label: s.label, citation: sheetCitation(s) };
}
