import { queryOptions, useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import type { Lang } from "@/i18n";

export const UI_TEXT_KEYS = [
  "landing_title",
  "landing_intro",
  "landing_body",
  "empty_title",
  "empty_suggest_template",
  "empty_fallback",
] as const;

export type UiTextKey = (typeof UI_TEXT_KEYS)[number];

export const UI_TEXT_DEFAULTS: Record<UiTextKey, string> = {
  landing_title: "KTH Bibliotekets studieplatsväljare",
  landing_intro: "",
  landing_body: "",
  empty_title: "Inga lokaler matchar dina filter.",
  empty_suggest_template:
    "Filtret {label} verkar smalast — om du tar bort det hittar vi {count} {lokal}.",
  empty_fallback: "Prova att rensa filtren och börja om.",
};

export const UI_TEXT_DEFAULTS_EN: Record<UiTextKey, string> = {
  landing_title: "KTH Library Spacefinder",
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
  landing_title: {
    title: "Rubrik på startsidan",
    description:
      "Den synliga huvudrubriken ovanför introduktionen. Påverkar inte webbläsarens titel, sökmetadata eller länkförhandsvisningar.",
    rows: 2,
  },
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

export const BETA_BADGE_SETTING_KEY = "beta_badge_enabled";
export const UI_SETTINGS_QUERY_KEY = ["ui-settings"] as const;

export type UiSettings = Record<string, string>;

const UI_SETTING_KEYS = [
  ...UI_TEXT_KEYS.flatMap((key) => [settingKey(key, "sv"), settingKey(key, "en")]),
  BETA_BADGE_SETTING_KEY,
];

async function fetchUiSettings(): Promise<UiSettings> {
  const { data, error } = await supabase
    .from("app_settings")
    .select("key, value")
    .in("key", UI_SETTING_KEYS);
  if (error) throw error;
  return Object.fromEntries((data ?? []).map((row) => [row.key, row.value ?? ""]));
}

export const uiSettingsQueryOptions = queryOptions({
  queryKey: UI_SETTINGS_QUERY_KEY,
  queryFn: fetchUiSettings,
  staleTime: 60_000,
});

export function resolveUiText(settings: UiSettings, key: UiTextKey, lang: Lang): string {
  const sv = (settings[settingKey(key, "sv")] ?? "").trim();
  const en = (settings[settingKey(key, "en")] ?? "").trim();

  if (lang === "en") return en || sv || UI_TEXT_DEFAULTS_EN[key] || UI_TEXT_DEFAULTS[key];
  return sv || UI_TEXT_DEFAULTS[key];
}

export function useUiText(key: UiTextKey, language?: Lang) {
  const { i18n } = useTranslation();
  const lang = language ?? ((i18n.resolvedLanguage ?? "sv") as Lang);
  return useQuery({
    ...uiSettingsQueryOptions,
    select: (settings) => resolveUiText(settings, key, lang),
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
    onSuccess: () => qc.invalidateQueries({ queryKey: UI_SETTINGS_QUERY_KEY }),
  });
}

/**
 * Fetch both SV and EN raw values for a UI text key (for admin editing).
 */
export function useUiTextAdmin(key: UiTextKey) {
  return useQuery({
    ...uiSettingsQueryOptions,
    select: (settings): { sv: string; en: string } => ({
      sv: settings[settingKey(key, "sv")] ?? "",
      en: settings[settingKey(key, "en")] ?? "",
    }),
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
