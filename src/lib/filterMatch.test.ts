import { describe, expect, test } from "vitest";
import { emptyFilters } from "@/components/FilterPanel";
import type { Space } from "@/lib/spaces";
import { matchesSpace, normalizeSearchText } from "./filterMatch";

function space(overrides: Partial<Space> = {}): Space {
  return {
    id: "space-1",
    slug: "space-1",
    name: "Ångdomen, Södra delen",
    name_en: "The Steam Dome, South section",
    space_kind: "study",
    category: "",
    description: "",
    description_en: null,
    description_inline: false,
    intent: [],
    noise: [],
    equipment: [],
    facilities: [],
    lokaltyp: ["Öppen studieyta"],
    image_url: null,
    images: [],
    image_alts: [],
    image_alts_en: [],
    map_url: null,
    map_url_en: null,
    booking_url: null,
    booking_url_en: null,
    group_booking_url: null,
    group_booking_url_en: null,
    group_booking_label: null,
    group_booking_label_en: null,
    book_now_url: null,
    book_now_url_en: null,
    sort_order: 10,
    floor: "Övre plan",
    floor_en: "Upper floor",
    located_in: "Södra galleriet",
    located_in_en: "South Gallery",
    capacity: 10,
    computer_count: 0,
    informal_seat_count: 0,
    tags: {},
    notice: null,
    notice_en: null,
    info: null,
    info_en: null,
    show_capacity_publicly: true,
    show_occupancy: false,
    countmatters_sensor_id: null,
    booking_room_number: null,
    hidden: false,
    ...overrides,
  };
}

function matches(query: string, candidate = space(), extraSearchText?: string) {
  return matchesSpace(
    candidate,
    { ...emptyFilters, query },
    [],
    extraSearchText ? { extraSearchText: () => extraSearchText } : {},
  );
}

describe("normalizeSearchText", () => {
  test.each([
    ["Ångdomen", "angdomen"],
    ["SÖDRA", "sodra"],
    ["Älvsjö", "alvsjo"],
  ])("normalizes %s to %s", (input, expected) => {
    expect(normalizeSearchText(input)).toBe(expected);
  });
});

describe("diacritic-insensitive free-text matching", () => {
  test("matches Swedish names without Swedish keyboard characters", () => {
    expect(matches("angdomen")).toBe(true);
    expect(matches("SODRA DEL")).toBe(true);
  });

  test("keeps substring and case-insensitive matching", () => {
    expect(matches("NGDOM")).toBe(true);
  });

  test("normalizes floor and location metadata", () => {
    expect(matches("ovre plan")).toBe(true);
    expect(matches("sodra galleriet")).toBe(true);
  });

  test("matches English names and extra localized room types", () => {
    expect(matches("steam dome")).toBe(true);
    expect(matches("group room", space({ lokaltyp: ["Grupprum"] }), "Group room")).toBe(true);
  });

  test("does not turn an unrelated query into a match", () => {
    expect(matches("bibliotekshallen")).toBe(false);
  });

  test("matches a DB-driven work mode without a hardcoded mode list", () => {
    expect(
      matchesSpace(space({ intent: ["fokus"] }), { ...emptyFilters, workMode: "fokus" }, []),
    ).toBe(true);
    expect(
      matchesSpace(space({ intent: ["enskilt"] }), { ...emptyFilters, workMode: "fokus" }, []),
    ).toBe(false);
  });
});
