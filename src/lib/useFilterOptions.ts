import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { FilterCategory, FilterOption } from "./spaces";

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

export function groupOptions(options: FilterOption[]) {
  const groups: Record<FilterCategory, FilterOption[]> = {
    intent: [], noise: [], equipment: [], facility: [],
  };
  for (const o of options) groups[o.category].push(o);
  return groups;
}
