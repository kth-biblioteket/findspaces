import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

const KEY = "beta_badge_enabled";

async function fetchBetaBadgeEnabled(): Promise<boolean> {
  const { data, error } = await supabase
    .from("app_settings")
    .select("value")
    .eq("key", KEY)
    .maybeSingle();
  if (error) throw error;
  // Default: on, until an admin turns it off.
  return (data?.value ?? "true") === "true";
}

/** Public: whether the Beta badge is shown next to the landing page title. */
export function useBetaBadgeEnabled() {
  return useQuery({
    queryKey: ["beta-badge"],
    queryFn: fetchBetaBadgeEnabled,
    staleTime: 60_000,
  });
}

/** Admin: toggle the Beta badge. */
export function useSaveBetaBadge() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (enabled: boolean) => {
      const { error } = await supabase
        .from("app_settings")
        .upsert({ key: KEY, value: enabled ? "true" : "false" });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["beta-badge"] });
    },
  });
}
