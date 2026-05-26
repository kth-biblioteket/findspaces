import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

const SETTINGS_KEY = "landing_message";
export const DEFAULT_LANDING_MESSAGE =
  "Börja med att välja i menyn hur du vill arbeta idag för att hitta rätt studieplats.";

export function useLandingMessage() {
  return useQuery({
    queryKey: ["landing-message"],
    queryFn: async (): Promise<string> => {
      const { data, error } = await supabase
        .from("app_settings")
        .select("value")
        .eq("key", SETTINGS_KEY)
        .maybeSingle();
      if (error) throw error;
      if (!data?.value) return DEFAULT_LANDING_MESSAGE;
      return data.value;
    },
  });
}

export function useSaveLandingMessage() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (message: string) => {
      const { error } = await supabase
        .from("app_settings")
        .upsert({ key: SETTINGS_KEY, value: message });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["landing-message"] }),
  });
}
