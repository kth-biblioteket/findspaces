import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import type { Lang } from "@/i18n";

export type UiTextKey =
  | "landing_intro"
  | "landing_body"
  | "empty_title"
  | "empty_suggest_template"
  | "empty_fallback";

export const UI_TEXT_DEFAULTS: Record<UiTextKey, string> = {
  landing_intro: "",
  landing_body: "",
  empty_title: "Inga lokaler matchar dina filter.",
  empty_suggest_template:
    "Filtret {label} verkar smalast — om du tar bort det hittar vi {count} {lokal}.",
  empty_fallback: "Prova att rensa filtren och börja om.",
};

export const UI_TEXT_DEFAULTS_EN: Record<UiTextKey, string> = {
  landing_intro: "",
  landing_body: "",
  empty_title: "No spaces match your filters.",
  empty_suggest_template:
    "The filter {label} seems narrowest — if you remove it we find {count} {lokal}.",
  empty_fallback: "Try clearing the filters and start over.",
};

export const UI_TEXT_META: Record<
  UiTextKey,
  { title: string; description: string; rows?: number }
> = {
  landing_intro: {
    title: "Ingress på startsidan",
    description:
      'Större introduktionstext direkt under rubriken. Lämna tomt för att dölja. Du kan använda länkar: <a href="https://...">länktext</a>.',
    rows: 4,
  },
  landing_body: {
    title: "Brödtext på startsidan",
    description:
      'Mindre text i en grå ruta under ingressen. Lämna en tom rad mellan stycken. Lämna tomt för att dölja. Du kan använda länkar: <a href="https://...">länktext</a>.',
    rows: 8,
  },
  empty_title: {
    title: "Tomt resultat – rubrik",
    description: "Visas överst när inga lokaler matchar de valda filtren.",
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
        // No EN override: prefer an admin-edited SV text over our generic EN
        // default, so the admin's own wording wins.
        const { data: svRow } = await supabase
          .from("app_settings")
          .select("value")
          .eq("key", settingKey(key, "sv"))
          .maybeSingle();
        if (svRow?.value) return svRow.value;
        const enDefault = UI_TEXT_DEFAULTS_EN[key];
        if (enDefault) return enDefault;
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
    mutationFn: async ({
      key,
      value,
      lang = "sv",
    }: {
      key: UiTextKey;
      value: string;
      lang?: Lang;
    }) => {
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
