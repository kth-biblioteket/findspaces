import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import type { Lang } from "@/i18n";

const SETTINGS_KEY_SV = "landing_message";
const SETTINGS_KEY_EN = "landing_message_en";

export const DEFAULT_LANDING_MESSAGE =
  "Börja med att välja i menyn hur du vill arbeta idag för att hitta rätt studieplats.";

export const DEFAULT_LANDING_MESSAGE_EN =
  "Start by choosing in the menu how you want to work today to find the right study space.";

function settingsKeyFor(lang: Lang): string {
  return lang === "en" ? SETTINGS_KEY_EN : SETTINGS_KEY_SV;
}

function defaultFor(lang: Lang): string {
  return lang === "en" ? DEFAULT_LANDING_MESSAGE_EN : DEFAULT_LANDING_MESSAGE;
}

export function useLandingMessage() {
  const { i18n } = useTranslation();
  const lang = (i18n.resolvedLanguage ?? "sv") as Lang;
  return useQuery({
    queryKey: ["landing-message", lang],
    queryFn: async (): Promise<string> => {
      // For English: try EN variant, fall back to SV.
      if (lang === "en") {
        const { data: enRow } = await supabase
          .from("app_settings")
          .select("value")
          .eq("key", SETTINGS_KEY_EN)
          .maybeSingle();
        if (enRow?.value) return enRow.value;
      }
      const { data, error } = await supabase
        .from("app_settings")
        .select("value")
        .eq("key", SETTINGS_KEY_SV)
        .maybeSingle();
      if (error) throw error;
      if (!data?.value) return defaultFor(lang);
      return data.value;
    },
  });
}

/**
 * Save the landing message for a specific language (defaults to SV).
 */
export function useSaveLandingMessage() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ message, lang = "sv" }: { message: string; lang?: Lang }) => {
      const key = settingsKeyFor(lang);
      const { error } = await supabase
        .from("app_settings")
        .upsert({ key, value: message });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["landing-message"] }),
  });
}

/**
 * Read the raw SV+EN values for admin editing.
 */
export function useLandingMessageAdmin() {
  return useQuery({
    queryKey: ["landing-message-admin"],
    queryFn: async (): Promise<{ sv: string; en: string }> => {
      const { data, error } = await supabase
        .from("app_settings")
        .select("key, value")
        .in("key", [SETTINGS_KEY_SV, SETTINGS_KEY_EN]);
      if (error) throw error;
      const map = new Map((data ?? []).map((r) => [r.key, r.value]));
      return {
        sv: map.get(SETTINGS_KEY_SV) ?? "",
        en: map.get(SETTINGS_KEY_EN) ?? "",
      };
    },
  });
}
