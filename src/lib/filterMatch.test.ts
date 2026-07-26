import { describe, expect, it } from "vitest";
import { emptyFilters } from "@/components/FilterPanel";
import { matchesSpace } from "@/lib/filterMatch";
import { makeSpace } from "@/test/spaceFixture";

describe("matchesSpace free-text search", () => {
  it.each(["entré", "ENTRÉHALLEN", "Entrance", "HALL"])(
    "matches Swedish and English names for %s",
    (query) => {
      expect(matchesSpace(makeSpace(), { ...emptyFilters, query }, [])).toBe(true);
    },
  );

  it("handles a missing English name", () => {
    expect(
      matchesSpace(makeSpace({ name_en: null }), { ...emptyFilters, query: "entrance" }, []),
    ).toBe(false);
  });

  it("continues to search canonical location-type labels", () => {
    expect(matchesSpace(makeSpace(), { ...emptyFilters, query: "studie" }, [])).toBe(true);
  });
});
