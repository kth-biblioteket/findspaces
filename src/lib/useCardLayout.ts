import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export const CARD_SECTION_KEYS = [
  "header",
  "chips",
  "button_map",
  "button_group_booking",
  "button_booking",
] as const;
export type CardSectionKey = typeof CARD_SECTION_KEYS[number];

export const CARD_SECTION_LABELS: Record<CardSectionKey, string> = {
  header: "Rubrik (namn, våning, lokaltyp)",
  chips: "Ikon-chips (ljudnivå, utrustning, faciliteter)",
  button_map: "Knapp: Visa på karta",
  button_group_booking: "Knapp: Boka grupprum",
  button_booking: "Knapp: Se bokningsschema",
};

const DEFAULT_ORDER: CardSectionKey[] = [
  "header",
  "chips",
  "button_map",
  "button_group_booking",
  "button_booking",
];
const SETTINGS_KEY = "card_section_order";

function normalize(arr: unknown): CardSectionKey[] {
  const valid = (v: unknown): v is CardSectionKey =>
    typeof v === "string" && (CARD_SECTION_KEYS as readonly string[]).includes(v);
  const raw = Array.isArray(arr) ? arr : [];
  const expanded: string[] = [];
  for (const v of raw) {
    // Backwards compatibility: legacy "buttons" expands to both button sections.
    if (v === "buttons") {
      expanded.push("button_map", "button_booking");
    } else if (typeof v === "string") {
      expanded.push(v);
    }
  }
  const list = expanded.filter(valid) as CardSectionKey[];
  // De-duplicate while preserving order.
  const seen = new Set<CardSectionKey>();
  const deduped: CardSectionKey[] = [];
  for (const k of list) {
    if (!seen.has(k)) {
      seen.add(k);
      deduped.push(k);
    }
  }
  // Ensure all keys are present (append any missing in default order).
  for (const k of DEFAULT_ORDER) if (!seen.has(k)) deduped.push(k);
  return deduped;
}

export function useCardLayout() {
  return useQuery({
    queryKey: ["card-layout"],
    queryFn: async (): Promise<CardSectionKey[]> => {
      const { data, error } = await supabase
        .from("app_settings")
        .select("value")
        .eq("key", SETTINGS_KEY)
        .maybeSingle();
      if (error) throw error;
      if (!data?.value) return DEFAULT_ORDER;
      try {
        return normalize(JSON.parse(data.value));
      } catch {
        return DEFAULT_ORDER;
      }
    },
  });
}

export function useSaveCardLayout() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (order: CardSectionKey[]) => {
      const { error } = await supabase
        .from("app_settings")
        .upsert({ key: SETTINGS_KEY, value: JSON.stringify(normalize(order)) });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["card-layout"] }),
  });
}
