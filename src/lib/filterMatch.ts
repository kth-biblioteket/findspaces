import { type Space, getSpaceValues, type FilterCategoryRow } from "@/lib/spaces";
import { type Filters } from "@/components/FilterPanel";

export type MatchOptions = {
  /**
   * Live "free right now" predicate. When provided and the filters ask for
   * free group rooms only, spaces failing this check are excluded. Passing it
   * lets callers (result list, mobile draft count, "remove filter" suggestions)
   * share one matcher instead of re-implementing availability filtering.
   */
  isFree?: (s: Space) => boolean;
  /**
   * Extra haystack for free-text search, e.g. English room-type labels and
   * location metadata, so searching in English finds the same spaces.
   */
  extraSearchText?: (s: Space) => string;
};

export function normalizeSearchText(value: string): string {
  return value
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLocaleLowerCase("sv");
}

export function matchesSpace(
  s: Space,
  filters: Filters,
  categories: FilterCategoryRow[],
  opts: MatchOptions = {},
): boolean {
  const q = normalizeSearchText(filters.query.trim());
  if (q) {
    const haystack = normalizeSearchText(
      [
        s.name,
        s.name_en ?? "",
        ...(s.lokaltyp ?? []),
        s.floor ?? "",
        s.floor_en ?? "",
        s.located_in ?? "",
        s.located_in_en ?? "",
        opts.extraSearchText?.(s) ?? "",
      ].join(" "),
    );
    if (!haystack.includes(q)) return false;
  }


  if (filters.workMode === "grupprum") {
    if (!(s.lokaltyp ?? []).includes("Grupprum") && !(s.intent ?? []).includes("grupprum")) return false;
    if (filters.groupSize === "5+") {
      const cap = s.capacity ?? 0;
      if (cap < 5) return false;
    }
    // For "2-4": show all group rooms; ranking is handled by sort (seats asc).
    if (filters.freeOnly && opts.isFree && !opts.isFree(s)) return false;
  } else if (filters.workMode) {
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
