import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import type { Lang } from "@/i18n";

export type UiTextKey =
  | "empty_title"
  | "empty_suggest_template"
  | "empty_fallback"
  | "show_description"
  | "hide_description"
  | "about_button"
  | "occupancy_free"
  | "occupancy_moderate"
  | "occupancy_busy";

export const UI_TEXT_DEFAULTS: Record<UiTextKey, string> = {
  empty_title: "Inga lokaler matchar dina filter.",
  empty_suggest_template:
    "Filtret {label} verkar smalast — om du tar bort det hittar vi {count} {lokal}.",
  empty_fallback: "Prova att rensa filtren och börja om.",
  show_description: "Visa beskrivning",
  hide_description: "Dölj beskrivning",
  about_button: "Om lokalen",
  occupancy_free: "Gott om plats",
  occupancy_moderate: "Halvfullt",
  occupancy_busy: "Mycket folk",
};

export const UI_TEXT_DEFAULTS_EN: Record<UiTextKey, string> = {
  empty_title: "No spaces match your filters.",
  empty_suggest_template:
    "The filter {label} seems narrowest — if you remove it we find {count} {lokal}.",
  empty_fallback: "Try clearing the filters and start over.",
  show_description: "Show description",
  hide_description: "Hide description",
  occupancy_free: "Plenty of space",
  occupancy_moderate: "Moderately busy",
  occupancy_busy: "Very busy",
};

export const UI_TEXT_META: Record<
  UiTextKey,
  { title: string; description: string; rows?: number }
> = {
  empty_title: {
    title: "Tomt resultat – rubrik",
    description:
      "Visas överst när inga lokaler matchar de valda filtren.",
    rows: 2,
  },
  empty_suggest_template: {
    title: "Tomt resultat – förslag",
    description:
      "Visas när vi kan föreslå att ta bort ett enskilt filter. Använd platshållarna {label} (filternamnet), {count} (antal lokaler) och {lokal} (böjs automatiskt till lokal/lokaler).",
    rows: 3,
  },
  empty_fallback: {
    title: "Tomt resultat – reservtext",
    description:
      "Visas när inget enskilt filter kan föreslås (t.ex. när inga filter alls hjälper).",
    rows: 2,
  },
  show_description: {
    title: "Lokalkort – visa beskrivning",
    description:
      "Etikett på knappen som fäller ut beskrivningen på ett lokalkort. Visas endast när lokalen har en beskrivning.",
    rows: 2,
  },
  hide_description: {
    title: "Lokalkort – dölj beskrivning",
    description:
      "Etikett på knappen som fäller ihop beskrivningen på ett lokalkort.",
    rows: 2,
  },
  occupancy_free: {
    title: "Beläggning – gott om plats",
    description:
      "Visas i beläggningsmätaren på lokalkortet när det är lugnt (lägsta nivån).",
    rows: 2,
  },
  occupancy_moderate: {
    title: "Beläggning – halvfullt",
    description:
      "Visas i beläggningsmätaren på lokalkortet vid mellannivån.",
    rows: 2,
  },
  occupancy_busy: {
    title: "Beläggning – mycket folk",
    description:
      "Visas i beläggningsmätaren på lokalkortet vid högsta nivån.",
    rows: 2,
  },
};


const SETTING_PREFIX_SV = "ui_text:";
const SETTING_PREFIX_EN = "ui_text:en:";

function settingKey(key: UiTextKey, lang: Lang): string {
  return (lang === "en" ? SETTING_PREFIX_EN : SETTING_PREFIX_SV) + key;
}

export function useUiText(key: UiTextKey) {
  const { i18n } = useTranslation();
  const lang = (i18n.resolvedLanguage ?? "sv") as Lang;
  return useQuery({
    queryKey: ["ui-text", key, lang],
    queryFn: async (): Promise<string> => {
      if (lang === "en") {
        const { data: enRow } = await supabase
          .from("app_settings")
          .select("value")
          .eq("key", settingKey(key, "en"))
          .maybeSingle();
        if (enRow?.value) return enRow.value;
        // Fall back to EN default if defined, otherwise SV from DB.
        const enDefault = UI_TEXT_DEFAULTS_EN[key];
        if (enDefault) {
          // Still prefer admin-edited SV if EN is unset and SV exists,
          // so the admin's tone wins over our generic translation.
          const { data: svRow } = await supabase
            .from("app_settings")
            .select("value")
            .eq("key", settingKey(key, "sv"))
            .maybeSingle();
          if (svRow?.value) return enDefault;
          return enDefault;
        }
      }
      const { data, error } = await supabase
        .from("app_settings")
        .select("value")
        .eq("key", settingKey(key, "sv"))
        .maybeSingle();
      if (error) throw error;
      if (!data?.value) return UI_TEXT_DEFAULTS[key];
      return data.value;
    },
  });
}

export function useSaveUiText() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ key, value, lang = "sv" }: { key: UiTextKey; value: string; lang?: Lang }) => {
      const { error } = await supabase
        .from("app_settings")
        .upsert({ key: settingKey(key, lang), value });
      if (error) throw error;
      return key;
    },
    onSuccess: (key) => qc.invalidateQueries({ queryKey: ["ui-text", key] }),
  });
}

/**
 * Fetch both SV and EN raw values for a UI text key (for admin editing).
 */
export function useUiTextAdmin(key: UiTextKey) {
  return useQuery({
    queryKey: ["ui-text-admin", key],
    queryFn: async (): Promise<{ sv: string; en: string }> => {
      const { data, error } = await supabase
        .from("app_settings")
        .select("key, value")
        .in("key", [settingKey(key, "sv"), settingKey(key, "en")]);
      if (error) throw error;
      const map = new Map((data ?? []).map((r) => [r.key, r.value]));
      return {
        sv: map.get(settingKey(key, "sv")) ?? "",
        en: map.get(settingKey(key, "en")) ?? "",
      };
    },
  });
}

export function formatSuggestTemplate(
  template: string,
  vars: { label: string; count: number },
  lang: Lang = "sv",
): string {
  const lokal =
    lang === "en"
      ? vars.count === 1
        ? "space"
        : "spaces"
      : vars.count === 1
        ? "lokal"
        : "lokaler";
  return template
    .replaceAll("{label}", vars.label)
    .replaceAll("{count}", String(vars.count))
    .replaceAll("{lokal}", lokal);
}
