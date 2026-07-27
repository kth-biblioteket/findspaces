import { type Space, getSpaceValues, type FilterCategoryRow } from "@/lib/spaces";
import { type Filters } from "@/components/FilterPanel";

export function matchesSpace(s: Space, filters: Filters, categories: FilterCategoryRow[]): boolean {
  const q = filters.query.trim().toLowerCase();
  if (q && !s.name.toLowerCase().includes(q) && !(s.lokaltyp ?? []).some((l) => l.toLowerCase().includes(q)))
    return false;

  if (filters.workMode === "grupprum") {
    if (!(s.lokaltyp ?? []).includes("Grupprum") && !(s.intent ?? []).includes("grupprum")) return false;
    if (filters.groupSize === "5+") {
      const cap = s.capacity ?? 0;
      if (cap < 5) return false;
    }
    // For "2-4": show all group rooms; ranking is handled by sort (seats asc).
  } else if (filters.workMode === "enskilt" || filters.workMode === "tillsammans") {
    if (!(s.intent ?? []).includes(filters.workMode)) return false;
  }

  for (const cat of categories) {
    const selected = filters.byCategory[cat.key] ?? [];
    if (selected.length === 0) continue;
    const values = getSpaceValues(s, cat.key);
    if (cat.match_mode === "all") {
      if (!selected.every((v) => values.includes(v))) return false;
    } else {
      if (!selected.some((v) => values.includes(v))) return false;
    }
  }
  return true;
}
