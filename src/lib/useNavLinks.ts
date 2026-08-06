import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Lang } from "@/i18n";

export const NAV_LINK_KEYS = [
  "education",
  "research",
  "collaboration",
  "about",
  "library",
] as const;

export type NavLinkKey = (typeof NAV_LINK_KEYS)[number];

/** Fallback destinations used until an admin sets their own URLs. */
export const NAV_LINK_DEFAULTS: Record<NavLinkKey, { sv: string; en: string }> = {
  education: { sv: "https://www.kth.se/utbildning", en: "https://www.kth.se/en/studies" },
  research: { sv: "https://www.kth.se/forskning", en: "https://www.kth.se/en/research" },
  collaboration: { sv: "https://www.kth.se/samverkan", en: "https://www.kth.se/en/samverkan" },
  about: { sv: "https://www.kth.se/om", en: "https://www.kth.se/en/om" },
  library: { sv: "https://www.kth.se/biblioteket", en: "https://www.kth.se/en/biblioteket" },
};

function settingKey(key: NavLinkKey, lang: Lang): string {
  return `nav_link:${lang}:${key}`;
}

export type NavLinkPairs = Record<NavLinkKey, { sv: string; en: string }>;

async function fetchNavLinks(): Promise<NavLinkPairs> {
  const keys = NAV_LINK_KEYS.flatMap((k) => [settingKey(k, "sv"), settingKey(k, "en")]);
  const { data, error } = await supabase.from("app_settings").select("key, value").in("key", keys);
  if (error) throw error;
  const map = new Map((data ?? []).map((r) => [r.key, r.value ?? ""]));
  return Object.fromEntries(
    NAV_LINK_KEYS.map((k) => [
      k,
      {
        sv: map.get(settingKey(k, "sv")) ?? "",
        en: map.get(settingKey(k, "en")) ?? "",
      },
    ]),
  ) as NavLinkPairs;
}

/** Resolved URLs for the current language (falls back to SV, then defaults). */
export function useNavLinks(lang: Lang) {
  return useQuery({
    queryKey: ["nav-links"],
    queryFn: fetchNavLinks,
    staleTime: 5 * 60_000,
    select: (pairs): Record<NavLinkKey, string> =>
      Object.fromEntries(
        NAV_LINK_KEYS.map((k) => {
          const pair = pairs[k];
          const value =
            (lang === "en" ? pair.en.trim() || pair.sv.trim() : pair.sv.trim()) ||
            NAV_LINK_DEFAULTS[k][lang];
          return [k, value];
        }),
      ) as Record<NavLinkKey, string>,
  });
}

/** Raw SV/EN values for admin editing. */
export function useNavLinksAdmin() {
  return useQuery({ queryKey: ["nav-links-admin"], queryFn: fetchNavLinks });
}

export function useSaveNavLink() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ key, lang, value }: { key: NavLinkKey; lang: Lang; value: string }) => {
      const { error } = await supabase
        .from("app_settings")
        .upsert({ key: settingKey(key, lang), value });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["nav-links"] });
      qc.invalidateQueries({ queryKey: ["nav-links-admin"] });
    },
  });
}
