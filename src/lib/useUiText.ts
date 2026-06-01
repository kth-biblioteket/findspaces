import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type UiTextKey =
  | "empty_title"
  | "empty_suggest_template"
  | "empty_fallback";

export const UI_TEXT_DEFAULTS: Record<UiTextKey, string> = {
  empty_title: "Inga lokaler matchar dina filter.",
  empty_suggest_template:
    "Filtret {label} verkar smalast — om du tar bort det hittar vi {count} {lokal}.",
  empty_fallback: "Prova att rensa filtren och börja om.",
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
};

const SETTING_PREFIX = "ui_text:";

export function useUiText(key: UiTextKey) {
  return useQuery({
    queryKey: ["ui-text", key],
    queryFn: async (): Promise<string> => {
      const { data, error } = await supabase
        .from("app_settings")
        .select("value")
        .eq("key", SETTING_PREFIX + key)
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
    mutationFn: async ({ key, value }: { key: UiTextKey; value: string }) => {
      const { error } = await supabase
        .from("app_settings")
        .upsert({ key: SETTING_PREFIX + key, value });
      if (error) throw error;
      return key;
    },
    onSuccess: (key) => qc.invalidateQueries({ queryKey: ["ui-text", key] }),
  });
}

export function formatSuggestTemplate(
  template: string,
  vars: { label: string; count: number },
): string {
  const lokal = vars.count === 1 ? "lokal" : "lokaler";
  return template
    .replaceAll("{label}", vars.label)
    .replaceAll("{count}", String(vars.count))
    .replaceAll("{lokal}", lokal);
}
