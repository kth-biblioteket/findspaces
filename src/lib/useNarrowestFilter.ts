import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { type Space, type FilterCategoryRow, type FilterOption } from "@/lib/spaces";
import { emptyFilters, type Filters } from "@/components/FilterPanel";
import { matchesSpace } from "@/lib/filterMatch";
import { pickLocalized, type Lang } from "@/i18n";

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
  categories: FilterCategoryRow[],
  options: FilterOption[] = [],
): FilterDimension | null {
  const { t, i18n } = useTranslation();
  const lang = (i18n.resolvedLanguage ?? "sv") as Lang;

  return useMemo(() => {
    const optLookup = new Map(options.map((o) => [`${o.category}:${o.label}`, o]));
    const dimensions: Omit<FilterDimension, "wouldMatch">[] = [];

    if (filters.query.trim()) {
      dimensions.push({
        id: "query",
        label: t("chips.search_label", { query: filters.query.trim() }),
        remove: (f) => ({ ...f, query: "" }),
      });
    }
    if (filters.workMode) {
      const labels: Record<NonNullable<Filters["workMode"]>, string> = {
        enskilt: t("filters.intent_enskilt"),
        tillsammans: t("filters.intent_tillsammans"),
        grupprum: t("filters.intent_grupprum"),
      };
      dimensions.push({
        id: "workMode",
        label: labels[filters.workMode],
        remove: (f) => ({ ...f, workMode: null, groupSize: null, freeOnly: false }),
      });
    }
    if (filters.groupSize) {
      dimensions.push({
        id: "groupSize",
        label: filters.groupSize === "2-4" ? t("filters.group_size_2_4") : t("filters.group_size_5plus"),
        remove: (f) => ({ ...f, groupSize: null }),
      });
    }
    if (filters.freeOnly) {
      dimensions.push({
        id: "freeOnly",
        label: t("filters.free_only"),
        remove: (f) => ({ ...f, freeOnly: false }),
      });
    }

    for (const cat of categories) {
      const vals = filters.byCategory[cat.key] ?? [];
      if (vals.length === 0) continue;
      const localizedVals = vals
        .map((v) => {
          const o = optLookup.get(`${cat.key}:${v}`);
          return o ? pickLocalized(o, "label", lang) : v;
        })
        .join(", ");
      dimensions.push({
        id: `cat:${cat.key}`,
        label: `${pickLocalized(cat, "title", lang)}: ${localizedVals}`,
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
  }, [spaces, filters, categories, options, t, lang]);
}

export { emptyFilters };
