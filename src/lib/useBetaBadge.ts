import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  BETA_BADGE_SETTING_KEY,
  UI_SETTINGS_QUERY_KEY,
  uiSettingsQueryOptions,
} from "@/lib/useUiText";

export function useBetaBadgeEnabled() {
  return useQuery({
    ...uiSettingsQueryOptions,
    select: (settings) => (settings[BETA_BADGE_SETTING_KEY] ?? "true") === "true",
  });
}

export function useSaveBetaBadge() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (enabled: boolean) => {
      const { error } = await supabase.from("app_settings").upsert({
        key: BETA_BADGE_SETTING_KEY,
        value: enabled ? "true" : "false",
      });
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: UI_SETTINGS_QUERY_KEY }),
  });
}
