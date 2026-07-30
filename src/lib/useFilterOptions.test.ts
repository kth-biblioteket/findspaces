import { describe, expect, test } from "vitest";
import type { FilterOption } from "./spaces";
import { groupOptionsByKey } from "./useFilterOptions";

function option(id: string, category: string, hidden: boolean): FilterOption {
  return {
    id,
    category,
    label: id,
    label_en: null,
    icon_url: null,
    default_icon: null,
    sort_order: 10,
    value_key: null,
    is_seed: false,
    hidden,
  };
}

describe("groupOptionsByKey", () => {
  test("retains hidden options in the shared data selector for admin consumers", () => {
    const visible = option("visible", "equipment", false);
    const hidden = option("hidden", "equipment", true);

    expect(groupOptionsByKey([visible, hidden])).toEqual({
      equipment: [visible, hidden],
    });
  });
});
