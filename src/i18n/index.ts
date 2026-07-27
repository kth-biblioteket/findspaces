import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import LanguageDetector from "i18next-browser-languagedetector";

import sv from "./locales/sv.json";
import en from "./locales/en.json";

export const SUPPORTED_LANGUAGES = ["sv", "en"] as const;
export type Lang = (typeof SUPPORTED_LANGUAGES)[number];

// Safe in SSR: i18next runs in-memory; LanguageDetector only touches
// localStorage/navigator in the browser. On the server it falls back to fallbackLng.
if (!i18n.isInitialized) {
  i18n
    .use(LanguageDetector)
    .use(initReactI18next)
    .init({
      resources: {
        sv: { translation: sv },
        en: { translation: en },
      },
      fallbackLng: "sv",
      supportedLngs: SUPPORTED_LANGUAGES as unknown as string[],
      interpolation: { escapeValue: false },
      detection: {
        // Only honor an explicit saved choice. First-time visitors
        // always get the Swedish fallback regardless of browser locale.
        order: ["localStorage"],
        caches: ["localStorage"],
        lookupLocalStorage: "lang",
      },
      react: { useSuspense: false },
    });
}

export default i18n;

/**
 * Pick a localized field from a DB row. Falls back to the Swedish field
 * if the English variant is missing/empty.
 */
export function pickLocalized<
  T extends Record<string, unknown>,
  K extends keyof T & string,
>(row: T | null | undefined, field: K, lang: Lang): string {
  if (!row) return "";
  if (lang === "en") {
    const en = row[(field + "_en") as keyof T];
    if (typeof en === "string" && en.trim().length > 0) return en;
  }
  const sv = row[field];
  return typeof sv === "string" ? sv : "";
}
