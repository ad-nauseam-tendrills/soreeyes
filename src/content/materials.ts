import type { Material } from "@/lib/types";

// Only materials the books actually list (see COURSE_AUDIT.md → Materials).
export const MATERIALS: Material[] = [
  { id: "pencil-h-2b", name: "Pencils (H and 2B)", source: "AAE p.17" },
  { id: "pencil-2b", name: "Pencil (2B preferred)", source: "CEB p.20" },
  { id: "charcoal", name: "Charcoal", source: "AAE p.17, p.76" },
  { id: "erasers", name: "Erasers (kneaded and hard)", source: "AAE p.17; CEB p.20" },
  { id: "drawing-paper", name: "Drawing paper (low tooth for value work)", source: "AAE p.17, p.75" },
  { id: "tracing-paper", name: "Tracing paper", source: "AAE p.17; CEB p.20" },
  { id: "scissors", name: "Scissors", source: "AAE p.17" },
  { id: "ruler", name: "Ruler", source: "AAE p.17; CEB p.20" },
  { id: "white-paper", name: "Plain white backing sheet", source: "AAE p.20, p.25, p.76" },
  { id: "gray-paper", name: "Mid-toned gray paper", source: "AAE p.78" },
  { id: "hand-mirror", name: "Hand mirror", source: "AAE p.31, p.33" },
  { id: "object", name: "A small real object to draw", source: "AAE p.32, p.44, p.59" },
  { id: "pins", name: "Pins, tacks or tape (wall setup)", source: "AAE p.59" },
  { id: "printer", name: "Printer and copy paper", source: "AAE p.25; CEB p.20" },
  { id: "colored-pencil", name: "Colored pencil (red) for marking errors", source: "CEB p.20" },
  { id: "oil-black", name: "Black oil paint (ivory black or your own mix)", source: "Chelsea Lang value demo" },
  { id: "oil-white", name: "Titanium white oil paint", source: "Chelsea Lang value demo" },
  { id: "canvas", name: "Canvas or scrap canvas", source: "Chelsea Lang value demo" },
  { id: "brushes", name: "Brushes", source: "Chelsea Lang value demo" },
  {
    id: "proportional-divider",
    name: "Proportional divider — only to check a guess",
    source: "CEB p.20, p.35",
    optional: true,
  },
];

export const MATERIALS_BY_ID = new Map(MATERIALS.map((m) => [m.id, m]));
