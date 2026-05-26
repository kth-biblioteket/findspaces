import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { DEFAULT_CATEGORY_TITLES, FILTER_CATEGORIES, type FilterCategory } from "./spaces";

const SETTING_KEY_PREFIX = "category_title.";
const db = supabase as unknown as {
  from: (table: string) => any;
};

export function settingKey(cat: FilterCategory) {
  return `${SETTING_KEY_PREFIX}${cat}`;
}

export function useCategoryTitles() {
  return useQuery({
    queryKey: ["app_settings", "category_titles"],
    queryFn: async (): Promise<Record<FilterCategory, string>> => {
      const { data, error } = await db
        .from("app_settings")
        .select("*")
        .like("key", `${SETTING_KEY_PREFIX}%`);
      if (error) throw error;
      const out: Record<FilterCategory, string> = { ...DEFAULT_CATEGORY_TITLES };
      for (const row of (data ?? []) as Array<{ key: string; value: unknown }>) {
        const cat = row.key.slice(SETTING_KEY_PREFIX.length) as FilterCategory;
        if (FILTER_CATEGORIES.includes(cat) && typeof row.value === "string") {
          out[cat] = row.value;
        }
      }
      return out;
    },
  });
}

export function useSaveCategoryTitles() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (titles: Record<FilterCategory, string>) => {
      const rows = (Object.keys(titles) as FilterCategory[]).map((cat) => ({
        key: settingKey(cat),
        value: titles[cat],
      }));
      const { error } = await db
        .from("app_settings")
        .upsert(rows, { onConflict: "key" });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["app_settings"] }),
  });
}
