import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { type Space, type FilterCategoryRow, type FilterOption } from "@/lib/spaces";
import { emptyFilters, type Filters } from "@/components/FilterPanel";
import {
  matchesCategory,
  matchesFreeOnly,
  matchesGroupSize,
  matchesQuery,
  matchesWorkMode,
  type MatchOptions,
} from "@/lib/filterMatch";
import { pickLocalized, type Lang } from "@/i18n";

export type FilterDimension = {
  id: string;
  label: string;
  remove: (f: Filters) => Filters;
  wouldMatch: number;
};

type Candidate = {
  id: string;
  label: string;
  remove: (f: Filters) => Filters;
  /** Base dimension ids that stop blocking once this candidate is removed. */
  covers: string[];
  /** For single-option removals: re-check the category with the values left. */
  recheck?: { cat: FilterCategoryRow; remaining: string[] };
  /** Single option removals are preferred over dropping a whole category. */
  granular: boolean;
};

/**
 * Suggest the single filter choice whose removal opens up the most spaces.
 * Candidates include each active dimension *and* each individual option inside
 * a multi-select category, so the empty state can suggest the smallest useful
 * change instead of always dropping a whole category.
 *
 * Performance: every space is evaluated once per active dimension (cheap
 * predicates), then candidates are scored from that precomputed failure set —
 * no full re-match per candidate.
 */
export function useNarrowestFilter(
  spaces: Space[],
  filters: Filters,
  categories: FilterCategoryRow[],
  options: FilterOption[] = [],
  matchOptions: MatchOptions = {},
): FilterDimension | null {
  const { t, i18n } = useTranslation();
  const lang = (i18n.resolvedLanguage ?? "sv") as Lang;

  return useMemo(() => {
    const optLookup = new Map(options.map((o) => [`${o.category}:${o.label}`, o]));
    const optionLabel = (catKey: string, value: string) => {
      const o = optLookup.get(`${catKey}:${value}`);
      return o ? pickLocalized(o, "label", lang) : value;
    };

    const candidates: Candidate[] = [];
    const activeCats: FilterCategoryRow[] = [];

    if (filters.query.trim()) {
      candidates.push({
        id: "query",
        label: t("chips.search_label", { query: filters.query.trim() }),
        remove: (f) => ({ ...f, query: "" }),
        covers: ["query"],
        granular: false,
      });
    }
    if (filters.workMode) {
      const labels: Record<string, string> = {
        enskilt: t("filters.intent_enskilt"),
        tillsammans: t("filters.intent_tillsammans"),
        grupprum: t("filters.intent_grupprum"),
      };
      candidates.push({
        id: "workMode",
        label: labels[filters.workMode] ?? filters.workMode,
        remove: (f) => ({ ...f, workMode: null, groupSize: null, freeOnly: false }),
        covers: ["workMode", "groupSize", "freeOnly"],
        granular: false,
      });
    }
    if (filters.groupSize) {
      candidates.push({
        id: "groupSize",
        label:
          filters.groupSize === "2-4"
            ? t("filters.group_size_2_4")
            : t("filters.group_size_5plus"),
        remove: (f) => ({ ...f, groupSize: null }),
        covers: ["groupSize"],
        granular: false,
      });
    }
    if (filters.freeOnly) {
      candidates.push({
        id: "freeOnly",
        label: t("filters.free_only"),
        remove: (f) => ({ ...f, freeOnly: false }),
        covers: ["freeOnly"],
        granular: false,
      });
    }

    for (const cat of categories) {
      const vals = filters.byCategory[cat.key] ?? [];
      if (vals.length === 0) continue;
      activeCats.push(cat);
      const catTitle = pickLocalized(cat, "title", lang);

      candidates.push({
        id: `cat:${cat.key}`,
        label: `${catTitle}: ${vals.map((v) => optionLabel(cat.key, v)).join(", ")}`,
        remove: (f) => ({ ...f, byCategory: { ...f.byCategory, [cat.key]: [] } }),
        covers: [`cat:${cat.key}`],
        granular: false,
      });

      if (vals.length > 1) {
        for (const value of vals) {
          const remaining = vals.filter((v) => v !== value);
          candidates.push({
            id: `cat:${cat.key}:${value}`,
            label: `${catTitle}: ${optionLabel(cat.key, value)}`,
            remove: (f) => ({
              ...f,
              byCategory: { ...f.byCategory, [cat.key]: (f.byCategory[cat.key] ?? []).filter((v) => v !== value) },
            }),
            covers: [`cat:${cat.key}`],
            recheck: { cat, remaining },
            granular: true,
          });
        }
      }
    }

    if (candidates.length === 0) return null;

    // One cheap pass per space: which base dimensions block it right now.
    const failures: string[][] = spaces.map((s) => {
      const failed: string[] = [];
      if (!matchesQuery(s, filters, matchOptions)) failed.push("query");
      if (!matchesWorkMode(s, filters, matchOptions)) failed.push("workMode");
      if (!matchesGroupSize(s, filters)) failed.push("groupSize");
      if (!matchesFreeOnly(s, filters, matchOptions)) failed.push("freeOnly");
      for (const cat of activeCats) {
        if (!matchesCategory(s, cat, filters.byCategory[cat.key] ?? [])) {
          failed.push(`cat:${cat.key}`);
        }
      }
      return failed;
    });

    const scored: FilterDimension[] = candidates.map((c) => {
      let count = 0;
      for (let i = 0; i < spaces.length; i++) {
        const failed = failures[i];
        if (!failed.every((id) => c.covers.includes(id))) continue;
        if (c.recheck && !matchesCategory(spaces[i], c.recheck.cat, c.recheck.remaining)) continue;
        count++;
      }
      return { id: c.id, label: c.label, remove: c.remove, wouldMatch: count };
    });

    const granularById = new Map(candidates.map((c) => [c.id, c.granular]));
    scored.sort((a, b) => {
      if (b.wouldMatch !== a.wouldMatch) return b.wouldMatch - a.wouldMatch;
      // Same gain: suggest the smallest change (drop one option, not a category).
      const ga = granularById.get(a.id) ? 0 : 1;
      const gb = granularById.get(b.id) ? 0 : 1;
      return ga - gb;
    });
    return scored[0] ?? null;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    spaces,
    filters,
    categories,
    options,
    t,
    lang,
    matchOptions.isFree,
    matchOptions.extraSearchText,
    matchOptions.isGroupRoom,
  ]);
}

export { emptyFilters };
