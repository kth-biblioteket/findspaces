import { useMemo } from "react";
import { type Space, type FilterCategoryRow } from "@/lib/spaces";
import { emptyFilters, type Filters } from "@/components/FilterPanel";
import { matchesSpace } from "@/lib/filterMatch";

export type FilterDimension = {
  id: string;
  label: string;
  remove: (f: Filters) => Filters;
  wouldMatch: number;
};

/**
 * For each currently active filter dimension, compute how many spaces would
 * match if that single dimension were removed. The "narrowest" filter is the
 * one whose removal yields the largest jump in matches.
 */
export function useNarrowestFilter(
  spaces: Space[],
  filters: Filters,
  categories: FilterCategoryRow[]
): FilterDimension | null {
  return useMemo(() => {
    const dimensions: Omit<FilterDimension, "wouldMatch">[] = [];

    if (filters.query.trim()) {
      dimensions.push({
        id: "query",
        label: `Sök: "${filters.query.trim()}"`,
        remove: (f) => ({ ...f, query: "" }),
      });
    }
    if (filters.workMode) {
      const labels = { enskilt: "Enskilt", tillsammans: "Tillsammans", grupprum: "I grupprum" } as const;
      dimensions.push({
        id: "workMode",
        label: labels[filters.workMode],
        remove: (f) => ({ ...f, workMode: null, groupSize: null }),
      });
    }
    if (filters.groupSize) {
      dimensions.push({
        id: "groupSize",
        label: filters.groupSize === "2-4" ? "2–4 pers" : "5+ pers",
        remove: (f) => ({ ...f, groupSize: null }),
      });
    }
    for (const cat of categories) {
      const vals = filters.byCategory[cat.key] ?? [];
      if (vals.length === 0) continue;
      dimensions.push({
        id: `cat:${cat.key}`,
        label: `${cat.title}: ${vals.join(", ")}`,
        remove: (f) => ({
          ...f,
          byCategory: { ...f.byCategory, [cat.key]: [] },
        }),
      });
    }

    if (dimensions.length === 0) return null;

    const scored: FilterDimension[] = dimensions.map((d) => {
      const next = d.remove(filters);
      const count = spaces.filter((s) => matchesSpace(s, next, categories)).length;
      return { ...d, wouldMatch: count };
    });

    // Pick dimension whose removal yields most matches; tie-break by id stability
    scored.sort((a, b) => b.wouldMatch - a.wouldMatch);
    return scored[0] ?? null;
  }, [spaces, filters, categories]);
}

export { emptyFilters };
