import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

const SETTINGS_KEY = "hidden_icons";

export function useHiddenIcons() {
  return useQuery({
    queryKey: ["hidden-icons"],
    queryFn: async (): Promise<string[]> => {
      const { data, error } = await supabase
        .from("app_settings")
        .select("value")
        .eq("key", SETTINGS_KEY)
        .maybeSingle();
      if (error) throw error;
      if (!data?.value) return [];
      try {
        const parsed = JSON.parse(data.value);
        return Array.isArray(parsed) ? parsed : [];
      } catch {
        return [];
      }
    },
  });
}

export function useSaveHiddenIcons() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (hidden: string[]) => {
      const { error } = await supabase
        .from("app_settings")
        .upsert({ key: SETTINGS_KEY, value: JSON.stringify(hidden) });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["hidden-icons"] }),
  });
}
