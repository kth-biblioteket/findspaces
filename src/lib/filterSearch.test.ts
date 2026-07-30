import { describe, expect, test } from "vitest";
import type { Filters } from "@/components/FilterPanel";
import type { FilterCategoryRow, FilterOption } from "@/lib/spaces";
import {
  canonicalizeSearch,
  filtersToSearch,
  searchParamsEqual,
  searchToFilters,
  validateSearchInput,
} from "./filterSearch";

const categories: FilterCategoryRow[] = [
  {
    id: "kind",
    key: "space_kind",
    title: "Vad letar du efter?",
    title_en: "What are you looking for?",
    style: "pills",
    match_mode: "any",
    is_single_select: true,
    locked: true,
    sort_order: 10,
    special_kind: "space_kind",
  },
  {
    id: "mode",
    key: "arbetssatt",
    title: "Hur vill du arbeta?",
    title_en: "How do you want to work?",
    style: "pills",
    match_mode: "any",
    is_single_select: true,
    locked: true,
    sort_order: 20,
    special_kind: "arbetssatt",
  },
  {
    id: "noise",
    key: "noise",
    title: "Ljudnivå",
    title_en: "Noise level",
    style: "pills",
    match_mode: "any",
    is_single_select: false,
    locked: true,
    sort_order: 30,
    special_kind: null,
  },
  {
    id: "equipment",
    key: "equipment",
    title: "Utrustning",
    title_en: "Equipment",
    style: "list",
    match_mode: "all",
    is_single_select: false,
    locked: true,
    sort_order: 40,
    special_kind: null,
  },
];

function option(
  id: string,
  category: string,
  label: string,
  valueKey: string | null = null,
  hidden = false,
): FilterOption {
  return {
    id,
    category,
    label,
    label_en: null,
    icon_url: null,
    default_icon: null,
    sort_order: 10,
    value_key: valueKey,
    is_seed: false,
    hidden,
  };
}

const options: FilterOption[] = [
  option("study", "space_kind", "En studieplats", "study"),
  option("service", "space_kind", "Service", "service"),
  option("custom", "space_kind", "Ny dynamisk typ", "custom_kind"),
  option("alone", "arbetssatt", "Enskilt", "enskilt"),
  option("group", "arbetssatt", "I grupprum", "grupprum"),
  option("custom-mode", "arbetssatt", "Nytt arbetssätt", "custom_mode"),
  option("quiet", "noise", "Tyst"),
  option("loud", "noise", "Ljudligt"),
  option("computer", "equipment", "Dator"),
  option("hidden-screen", "equipment", "Dold skärm", null, true),
];

describe("validateSearchInput", () => {
  test("omits empty defaults instead of serializing them", () => {
    expect(validateSearchInput({ q: "", cats: {} })).toEqual({});
    expect(validateSearchInput({ q: "   ", cats: { noise: [] } })).toEqual({});
  });

  test("keeps structurally valid values for dynamic validation", () => {
    expect(
      validateSearchInput({
        q: " Ångdomen ",
        kind: "custom_kind",
        mode: "custom_mode",
        size: "5+",
        free: "true",
        highlight: "space-1",
        cats: { noise: ["Tyst", "Tyst", 7] },
        sort: "name_asc",
      }),
    ).toEqual({
      q: " Ångdomen ",
      kind: "custom_kind",
      mode: "custom_mode",
      size: "5+",
      free: true,
      highlight: "space-1",
      cats: { noise: ["Tyst"] },
      sort: "name_asc",
    });
  });
});

describe("canonicalizeSearch", () => {
  test("preserves valid DB-driven kinds and removes study-only state", () => {
    expect(
      canonicalizeSearch(
        {
          kind: "custom_kind",
          mode: "grupprum",
          size: "5+",
          free: true,
          cats: { noise: ["Tyst"] },
          sort: "seats_desc",
          highlight: "space-1",
        },
        categories,
        options,
      ),
    ).toEqual({
      kind: "custom_kind",
      highlight: "space-1",
    });
  });

  test("falls back from unknown kinds and modes to a valid study state", () => {
    expect(
      canonicalizeSearch(
        {
          kind: "unknown",
          mode: "unknown",
          size: "5+",
          free: true,
          sort: "free_now",
        },
        categories,
        options,
      ),
    ).toEqual({});
  });

  test("drops unknown and hidden category options but preserves visible values", () => {
    expect(
      canonicalizeSearch(
        {
          mode: "enskilt",
          cats: {
            noise: ["Tyst", "Okänd"],
            equipment: ["Dator", "Dold skärm"],
            stale_category: ["Spöke"],
          },
        },
        categories,
        options,
      ),
    ).toEqual({
      mode: "enskilt",
      cats: {
        noise: ["Tyst"],
        equipment: ["Dator"],
      },
    });
  });

  test("preserves a valid group-room deep link and related sort", () => {
    expect(
      canonicalizeSearch(
        {
          mode: "grupprum",
          size: "2-4",
          free: true,
          sort: "free_now",
          highlight: "room-1",
        },
        categories,
        options,
      ),
    ).toEqual({
      mode: "grupprum",
      size: "2-4",
      free: true,
      sort: "free_now",
      highlight: "room-1",
    });
  });
});

test("filter conversion keeps the URL canonical", () => {
  const defaults: Filters = {
    query: "",
    spaceKind: "study",
    workMode: null,
    groupSize: null,
    freeOnly: false,
    byCategory: {},
  };
  expect(filtersToSearch(defaults)).toEqual({});
  expect(searchToFilters({})).toEqual(defaults);
});

test("search comparison ignores category key and value order", () => {
  expect(
    searchParamsEqual(
      { cats: { noise: ["Tyst", "Ljudligt"], equipment: ["Dator"] } },
      { cats: { equipment: ["Dator"], noise: ["Ljudligt", "Tyst"] } },
    ),
  ).toBe(true);
});
