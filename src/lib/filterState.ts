import type { Filters } from "@/components/FilterPanel";

export function hasActiveFilters(filters: Filters): boolean {
  return (
    filters.query.trim().length > 0 ||
    filters.spaceKind !== "study" ||
    filters.workMode !== null ||
    filters.groupSize !== null ||
    filters.freeOnly ||
    Object.values(filters.byCategory).some((values) => values.length > 0)
  );
}

export function resetSpaceKind(filters: Filters): Filters {
  return {
    ...filters,
    spaceKind: "study",
    workMode: null,
    groupSize: null,
    freeOnly: false,
    byCategory: {},
  };
}
