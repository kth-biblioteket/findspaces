import { describe, expect, it } from "vitest";
import { emptyFilters, type Filters } from "@/components/FilterPanel";
import { countSpacesForKind, filterSpaces, type AvailabilitySnapshot } from "@/lib/filterSpaces";
import type { FilterCategoryRow, Space } from "@/lib/spaces";
import { makeSpace } from "@/test/spaceFixture";

const noiseCategory: FilterCategoryRow = {
  id: "noise",
  key: "noise",
  title: "Ljudnivå",
  title_en: "Noise",
  style: "pills",
  match_mode: "any",
  is_single_select: false,
  locked: true,
  sort_order: 1,
  special_kind: null,
};

function groupRoom(id: string, roomNumber: number | null): Space {
  return makeSpace({
    id,
    name: id,
    name_en: id,
    intent: ["grupprum"],
    lokaltyp: ["Grupprum"],
    booking_room_number: roomNumber,
  });
}

describe("filterSpaces", () => {
  it("limits results and totals to the selected space kind", () => {
    const spaces = [
      makeSpace({ id: "study", space_kind: "study" }),
      makeSpace({ id: "service", space_kind: "service" }),
      makeSpace({ id: "creative", space_kind: "creative" }),
    ];

    expect(countSpacesForKind(spaces, "study")).toBe(1);
    expect(filterSpaces(spaces, { ...emptyFilters, spaceKind: "service" }, [])).toEqual([
      spaces[1],
    ]);
  });

  it("uses live availability for free group rooms", () => {
    const spaces = [groupRoom("free", 1), groupRoom("busy", 2), groupRoom("missing", null)];
    const filters: Filters = {
      ...emptyFilters,
      workMode: "grupprum",
      freeOnly: true,
    };
    const availability: AvailabilitySnapshot = {
      rooms: {
        "1": { status: "free" },
        "2": { status: "busy" },
      },
    };

    expect(filterSpaces(spaces, filters, [], availability).map((space) => space.id)).toEqual([
      "free",
    ]);
  });

  it("excludes disabled rooms and returns no false positives when availability is absent", () => {
    const spaces = [groupRoom("disabled", 1)];
    const filters: Filters = {
      ...emptyFilters,
      workMode: "grupprum",
      freeOnly: true,
    };

    expect(filterSpaces(spaces, filters, [])).toEqual([]);
    expect(
      filterSpaces(spaces, filters, [], {
        rooms: { "1": { status: "free", disabled: true } },
      }),
    ).toEqual([]);
  });

  it("produces the exact post-removal count for free-only and category filters", () => {
    const spaces = [groupRoom("quiet", 1), groupRoom("loud", 2)];
    spaces[0].noise = ["Tyst"];
    spaces[1].noise = ["Samtal"];
    const availability: AvailabilitySnapshot = {
      rooms: {
        "1": { status: "busy" },
        "2": { status: "busy" },
      },
    };
    const filters: Filters = {
      ...emptyFilters,
      workMode: "grupprum",
      freeOnly: true,
      byCategory: { noise: ["Tyst"] },
    };

    expect(filterSpaces(spaces, filters, [noiseCategory], availability)).toHaveLength(0);
    expect(
      filterSpaces(spaces, { ...filters, freeOnly: false }, [noiseCategory], availability),
    ).toHaveLength(1);
    expect(
      filterSpaces(
        spaces,
        {
          ...filters,
          freeOnly: false,
          byCategory: { noise: [] },
        },
        [noiseCategory],
        availability,
      ),
    ).toHaveLength(2);
  });
});
