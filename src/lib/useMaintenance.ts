import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import type { Lang } from "@/i18n";

const KEY_ENABLED = "maintenance_enabled";
const KEY_SV = "maintenance_sv";
const KEY_EN = "maintenance_en";

export const MAINTENANCE_DEFAULT_SV =
  "Tjänsten är tillfälligt stängd för uppdatering. Försök igen senare.";
export const MAINTENANCE_DEFAULT_EN =
  "The service is temporarily closed for maintenance. Please try again later.";

export type MaintenanceData = { enabled: boolean; sv: string; en: string };

async function fetchMaintenance(): Promise<MaintenanceData> {
  const { data, error } = await supabase
    .from("app_settings")
    .select("key, value")
    .in("key", [KEY_ENABLED, KEY_SV, KEY_EN]);
  if (error) throw error;
  const map = new Map((data ?? []).map((r) => [r.key, r.value]));
  return {
    enabled: (map.get(KEY_ENABLED) ?? "false") === "true",
    sv: map.get(KEY_SV) ?? "",
    en: map.get(KEY_EN) ?? "",
  };
}

/** Public: is the student view closed, and with what message? */
export function useMaintenance() {
  const { i18n } = useTranslation();
  const lang = (i18n.resolvedLanguage ?? "sv") as Lang;
  return useQuery({
    queryKey: ["maintenance"],
    queryFn: fetchMaintenance,
    staleTime: 30_000,
    select: (data) => ({
      enabled: data.enabled,
      message:
        lang === "en"
          ? data.en.trim() || data.sv.trim() || MAINTENANCE_DEFAULT_EN
          : data.sv.trim() || MAINTENANCE_DEFAULT_SV,
    }),
  });
}

/** Admin: raw values. */
export function useMaintenanceAdmin() {
  return useQuery({ queryKey: ["maintenance-admin"], queryFn: fetchMaintenance });
}

/** Admin: save one field at a time. */
export function useSaveMaintenance() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (patch: { enabled?: boolean; sv?: string; en?: string }) => {
      const rows: { key: string; value: string }[] = [];
      if (patch.enabled !== undefined)
        rows.push({ key: KEY_ENABLED, value: patch.enabled ? "true" : "false" });
      if (patch.sv !== undefined) rows.push({ key: KEY_SV, value: patch.sv });
      if (patch.en !== undefined) rows.push({ key: KEY_EN, value: patch.en });
      if (rows.length === 0) return;
      const { error } = await supabase.from("app_settings").upsert(rows);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["maintenance"] });
      qc.invalidateQueries({ queryKey: ["maintenance-admin"] });
    },
  });
}
