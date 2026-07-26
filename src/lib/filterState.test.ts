import { describe, expect, it } from "vitest";
import { emptyFilters } from "@/components/FilterPanel";
import { hasActiveFilters, resetSpaceKind } from "@/lib/filterState";

describe("filter state", () => {
  it("treats a non-default space kind as active", () => {
    expect(hasActiveFilters(emptyFilters)).toBe(false);
    expect(hasActiveFilters({ ...emptyFilters, spaceKind: "service" })).toBe(true);
  });

  it("resets incompatible state when the space-kind chip is removed", () => {
    expect(
      resetSpaceKind({
        query: "bibliotek",
        spaceKind: "service",
        workMode: "grupprum",
        groupSize: "5+",
        freeOnly: true,
        byCategory: { noise: ["Tyst"] },
      }),
    ).toEqual({
      query: "bibliotek",
      spaceKind: "study",
      workMode: null,
      groupSize: null,
      freeOnly: false,
      byCategory: {},
    });
  });
});
