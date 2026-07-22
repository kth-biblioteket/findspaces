import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import type { Lang } from "@/i18n";

const KEY_ENABLED = "announcement_enabled";
const KEY_SV = "announcement_sv";
const KEY_EN = "announcement_en";

export type AnnouncementData = {
  enabled: boolean;
  sv: string;
  en: string;
};

async function fetchAnnouncement(): Promise<AnnouncementData> {
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

/**
 * Public hook: returns the active message for the current language,
 * or null when announcement is disabled / empty.
 * Also returns a stable hash used to invalidate the dismissed state
 * when admin changes the text.
 */
export function useAnnouncement() {
  const { i18n } = useTranslation();
  const lang = (i18n.resolvedLanguage ?? "sv") as Lang;
  return useQuery({
    queryKey: ["announcement"],
    queryFn: fetchAnnouncement,
    select: (data) => {
      if (!data.enabled) return { message: null as string | null, hash: "" };
      const message =
        lang === "en"
          ? data.en.trim() || data.sv.trim()
          : data.sv.trim();
      if (!message) return { message: null, hash: "" };
      // Simple hash so dismissed-state resets when text changes.
      const raw = `${data.enabled ? 1 : 0}|${data.sv}|${data.en}`;
      let h = 0;
      for (let i = 0; i < raw.length; i++) {
        h = (h * 31 + raw.charCodeAt(i)) | 0;
      }
      return { message, hash: String(h) };
    },
    staleTime: 60_000,
  });
}

/** Admin: read raw values. */
export function useAnnouncementAdmin() {
  return useQuery({
    queryKey: ["announcement-admin"],
    queryFn: fetchAnnouncement,
  });
}

/** Admin: save one field at a time (enabled / sv / en). */
export function useSaveAnnouncement() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (
      patch: { enabled?: boolean; sv?: string; en?: string },
    ) => {
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
      qc.invalidateQueries({ queryKey: ["announcement"] });
      qc.invalidateQueries({ queryKey: ["announcement-admin"] });
    },
  });
}
