import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

const SETTINGS_KEY = "welcome_image_url";

export function useWelcomeImage() {
  return useQuery({
    queryKey: ["welcome-image"],
    queryFn: async (): Promise<string | null> => {
      const { data, error } = await supabase
        .from("app_settings")
        .select("value")
        .eq("key", SETTINGS_KEY)
        .maybeSingle();
      if (error) throw error;
      return data?.value ? data.value : null;
    },
  });
}

export function useSaveWelcomeImage() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (url: string | null) => {
      const { error } = await supabase
        .from("app_settings")
        .upsert({ key: SETTINGS_KEY, value: url ?? "" });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["welcome-image"] }),
  });
}
