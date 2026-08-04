import { type Space, getSpaceValues, type FilterCategoryRow } from "@/lib/spaces";
import { type Filters } from "@/components/FilterPanel";
import { isGroupRoomSpace } from "@/lib/groupRoom";

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
  /**
   * Group-room detection. Defaults to the seed labels/intent so tests and
   * early renders keep working before the filter options have loaded.
   */
  isGroupRoom?: (s: Space) => boolean;
};

export function normalizeSearchText(value: string): string {
  return value
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLocaleLowerCase("sv");
}

function defaultIsGroupRoom(s: Space): boolean {
  return isGroupRoomSpace(s, ["Grupprum"]);
}

/* ---------- granular predicates (shared with the "remove filter" hook) ---------- */

export function matchesQuery(s: Space, filters: Filters, opts: MatchOptions = {}): boolean {
  const q = normalizeSearchText(filters.query.trim());
  if (!q) return true;
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
  return haystack.includes(q);
}

export function matchesWorkMode(s: Space, filters: Filters, opts: MatchOptions = {}): boolean {
  if (!filters.workMode) return true;
  if (filters.workMode === "grupprum") {
    return (opts.isGroupRoom ?? defaultIsGroupRoom)(s);
  }
  return (s.intent ?? []).includes(filters.workMode);
}

export function matchesGroupSize(s: Space, filters: Filters): boolean {
  if (filters.workMode !== "grupprum" || filters.groupSize !== "5+") return true;
  // For "2-4": show all group rooms; ranking is handled by sort (seats asc).
  return (s.capacity ?? 0) >= 5;
}

export function matchesFreeOnly(s: Space, filters: Filters, opts: MatchOptions = {}): boolean {
  if (filters.workMode !== "grupprum" || !filters.freeOnly || !opts.isFree) return true;
  return opts.isFree(s);
}

export function matchesCategory(
  s: Space,
  cat: FilterCategoryRow,
  selected: string[],
): boolean {
  if (selected.length === 0) return true;
  const values = getSpaceValues(s, cat.key);
  return cat.match_mode === "all"
    ? selected.every((v) => values.includes(v))
    : selected.some((v) => values.includes(v));
}

export function matchesSpace(
  s: Space,
  filters: Filters,
  categories: FilterCategoryRow[],
  opts: MatchOptions = {},
): boolean {
  if (!matchesQuery(s, filters, opts)) return false;
  if (!matchesWorkMode(s, filters, opts)) return false;
  if (!matchesGroupSize(s, filters)) return false;
  if (!matchesFreeOnly(s, filters, opts)) return false;

  for (const cat of categories) {
    if (!matchesCategory(s, cat, filters.byCategory[cat.key] ?? [])) return false;
  }
  return true;
}
