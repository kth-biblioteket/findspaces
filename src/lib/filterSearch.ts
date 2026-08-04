import type { Filters } from "@/components/FilterPanel";
import type { FilterCategoryRow, FilterOption } from "@/lib/spaces";

export type SortKey =
  | "recommended"
  | "seats_desc"
  | "seats_asc"
  | "floor_asc"
  | "floor_desc"
  | "name_asc"
  | "name_desc"
  | "free_now";

export type SearchParams = {
  q?: string;
  kind?: string;
  mode?: string;
  size?: "2-4" | "5+";
  free?: boolean;
  highlight?: string;
  cats?: Record<string, string[]>;
  sort?: SortKey;
};

const VALID_SORTS = new Set<SortKey>([
  "recommended",
  "seats_desc",
  "seats_asc",
  "floor_asc",
  "floor_desc",
  "name_asc",
  "name_desc",
  "free_now",
]);

export function validateSearchInput(input: Record<string, unknown>): SearchParams {
  const search: SearchParams = {};

  if (typeof input.q === "string" && input.q.trim()) {
    search.q = input.q;
  }

  if (typeof input.kind === "string" && input.kind && input.kind !== "study") {
    search.kind = input.kind;
  }

  if (typeof input.mode === "string" && input.mode) {
    search.mode = input.mode;
  }

  if (input.size === "2-4" || input.size === "5+") {
    search.size = input.size;
  }

  if (input.free === true || input.free === 1 || input.free === "1" || input.free === "true") {
    search.free = true;
  }

  if (typeof input.highlight === "string" && input.highlight) {
    search.highlight = input.highlight;
  }

  if (input.cats && typeof input.cats === "object" && !Array.isArray(input.cats)) {
    const cats: Record<string, string[]> = {};
    for (const [key, rawValues] of Object.entries(input.cats as Record<string, unknown>)) {
      if (!key || !Array.isArray(rawValues)) continue;
      const values = rawValues.filter(
        (value): value is string => typeof value === "string" && value.length > 0,
      );
      if (values.length > 0) cats[key] = [...new Set(values)];
    }
    if (Object.keys(cats).length > 0) search.cats = cats;
  }

  if (VALID_SORTS.has(input.sort as SortKey)) {
    search.sort = input.sort as SortKey;
  }

  return search;
}

/**
 * Category filter values live in the URL as stable `value_key`s so renaming an
 * option in admin never breaks an existing link. Internally (and on the space
 * rows) the values are still the Swedish labels, so we translate at the URL
 * boundary.
 */
function buildValueMaps(options: FilterOption[]) {
  const labelToKey = new Map<string, string>();
  const keyToLabel = new Map<string, string>();
  for (const option of options) {
    if (!option.value_key) continue;
    labelToKey.set(`${option.category}:${option.label}`, option.value_key);
    keyToLabel.set(`${option.category}:${option.value_key}`, option.label);
  }
  return { labelToKey, keyToLabel };
}

export function searchToFilters(search: SearchParams, options: FilterOption[] = []): Filters {
  const kind = search.kind ?? "study";
  const isStudy = kind === "study";
  const { keyToLabel } = buildValueMaps(options);

  const byCategory: Record<string, string[]> = {};
  if (isStudy) {
    for (const [key, values] of Object.entries(search.cats ?? {})) {
      byCategory[key] = values.map((value) => keyToLabel.get(`${key}:${value}`) ?? value);
    }
  }

  return {
    query: search.q ?? "",
    spaceKind: kind,
    workMode: isStudy ? (search.mode ?? null) : null,
    groupSize: isStudy && search.mode === "grupprum" ? (search.size ?? null) : null,
    freeOnly: isStudy && search.mode === "grupprum" ? Boolean(search.free) : false,
    byCategory,
  };
}

export function filtersToSearch(
  filters: Filters,
  highlight?: string,
  options: FilterOption[] = [],
): SearchParams {
  const search: SearchParams = {};
  const { labelToKey } = buildValueMaps(options);

  if (filters.query.trim()) search.q = filters.query;
  if (filters.spaceKind !== "study") search.kind = filters.spaceKind;

  if (filters.spaceKind === "study") {
    if (filters.workMode) search.mode = filters.workMode;
    if (filters.workMode === "grupprum") {
      if (filters.groupSize) search.size = filters.groupSize;
      if (filters.freeOnly) search.free = true;
    }

    const cats: Record<string, string[]> = {};
    for (const [key, values] of Object.entries(filters.byCategory)) {
      if (values.length > 0) {
        cats[key] = values.map((value) => labelToKey.get(`${key}:${value}`) ?? value);
      }
    }
    if (Object.keys(cats).length > 0) search.cats = cats;
  }

  if (highlight) search.highlight = highlight;
  return search;
}


export function canonicalizeSearch(
  search: SearchParams,
  categories: FilterCategoryRow[],
  options: FilterOption[],
): SearchParams {
  const canonical: SearchParams = {};

  if (search.q?.trim()) canonical.q = search.q;
  if (search.highlight) canonical.highlight = search.highlight;

  const spaceKindCategory = categories.find((category) => category.special_kind === "space_kind");
  const workModeCategory = categories.find((category) => category.special_kind === "arbetssatt");

  const visibleOptions = options.filter((option) => !option.hidden);
  const validKinds = new Set(
    visibleOptions
      .filter((option) => option.category === spaceKindCategory?.key)
      .map((option) => option.value_key)
      .filter((value): value is string => Boolean(value)),
  );
  const validModes = new Set(
    visibleOptions
      .filter((option) => option.category === workModeCategory?.key)
      .map((option) => option.value_key)
      .filter((value): value is string => Boolean(value)),
  );

  const requestedKind = search.kind ?? "study";
  const kind = requestedKind === "study" || validKinds.has(requestedKind) ? requestedKind : "study";

  if (kind !== "study") canonical.kind = kind;

  let mode: string | undefined;
  if (kind === "study" && search.mode && validModes.has(search.mode)) {
    mode = search.mode;
    canonical.mode = mode;
  }

  if (mode === "grupprum") {
    if (search.size) canonical.size = search.size;
    if (search.free) canonical.free = true;
  }

  if (kind === "study" && search.cats) {
    const cats: Record<string, string[]> = {};
    for (const category of categories) {
      if (category.special_kind) continue;
      const selected = search.cats[category.key] ?? [];
      if (selected.length === 0) continue;

      const categoryOptions = visibleOptions.filter((option) => option.category === category.key);
      // Accept both the stable value_key and the legacy label (old links), and
      // always canonicalize to value_key.
      const toKey = new Map<string, string>();
      for (const option of categoryOptions) {
        if (!option.value_key) continue;
        toKey.set(option.value_key, option.value_key);
        toKey.set(option.label, option.value_key);
      }
      const values = [
        ...new Set(
          selected
            .map((value) => toKey.get(value))
            .filter((value): value is string => Boolean(value)),
        ),
      ];
      if (values.length > 0) cats[category.key] = values;
    }
    if (Object.keys(cats).length > 0) canonical.cats = cats;
  }


  if (
    search.sort &&
    !(search.sort === "free_now" && mode !== "grupprum") &&
    !((search.sort === "seats_desc" || search.sort === "seats_asc") && kind !== "study")
  ) {
    canonical.sort = search.sort;
  }

  return canonical;
}

function comparableSearch(search: SearchParams) {
  const cats = Object.fromEntries(
    Object.entries(search.cats ?? {})
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, values]) => [key, [...values].sort()]),
  );

  return {
    q: search.q,
    kind: search.kind,
    mode: search.mode,
    size: search.size,
    free: search.free,
    highlight: search.highlight,
    cats: Object.keys(cats).length > 0 ? cats : undefined,
    sort: search.sort,
  };
}

export function searchParamsEqual(left: SearchParams, right: SearchParams): boolean {
  return JSON.stringify(comparableSearch(left)) === JSON.stringify(comparableSearch(right));
}
