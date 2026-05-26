import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export const CARD_SECTION_KEYS = ["header", "chips", "buttons"] as const;
export type CardSectionKey = typeof CARD_SECTION_KEYS[number];

export const CARD_SECTION_LABELS: Record<CardSectionKey, string> = {
  header: "Rubrik (namn, våning, lokaltyp)",
  chips: "Ikon-chips (ljudnivå, utrustning, faciliteter)",
  buttons: "Knappar (Karta & Bokningsschema)",
};

const DEFAULT_ORDER: CardSectionKey[] = ["header", "chips", "buttons"];
const SETTINGS_KEY = "card_section_order";

function normalize(arr: unknown): CardSectionKey[] {
  const valid = (v: unknown): v is CardSectionKey =>
    typeof v === "string" && (CARD_SECTION_KEYS as readonly string[]).includes(v);
  const list = Array.isArray(arr) ? arr.filter(valid) : [];
  // Ensure all keys are present (append any missing in default order).
  for (const k of DEFAULT_ORDER) if (!list.includes(k)) list.push(k);
  return list;
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
