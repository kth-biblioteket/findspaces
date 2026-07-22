import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { FilterOption } from "./spaces";

export function useFilterOptions() {
  return useQuery({
    queryKey: ["filter_options"],
    queryFn: async (): Promise<FilterOption[]> => {
      const { data, error } = await supabase
        .from("filter_options")
        .select("*")
        .order("category")
        .order("sort_order");
      if (error) throw error;
      return data as FilterOption[];
    },
  });
}

/** Group options by category key. */
export function groupOptionsByKey(options: FilterOption[]): Record<string, FilterOption[]> {
  const out: Record<string, FilterOption[]> = {};
  for (const o of options) {
    (out[o.category] ??= []).push(o);
  }
  return out;
}
