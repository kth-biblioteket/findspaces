import { useTranslation } from "react-i18next";
import { Globe } from "lucide-react";
import { SUPPORTED_LANGUAGES, type Lang } from "@/i18n";

const LANGUAGE_LABELS: Record<Lang, string> = {
  sv: "Svenska",
  en: "English",
};

export function LanguageSwitcher({ className = "" }: { className?: string }) {
  const { i18n, t } = useTranslation();
  const current = (i18n.resolvedLanguage ?? "sv") as Lang;
  const other = SUPPORTED_LANGUAGES.find((lng) => lng !== current) ?? "en";

  return (
    <button
      type="button"
      onClick={() => i18n.changeLanguage(other)}
      aria-label={`${t("header.language")}: ${LANGUAGE_LABELS[current]}`}
      lang={current}
      className={
        "inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground " +
        "hover:text-foreground transition-colors focus-visible:outline-none " +
        "focus-visible:ring-2 focus-visible:ring-primary rounded-md px-1 py-0.5 " +
        className
      }
    >
      <Globe aria-hidden="true" size={16} />
      <span>{LANGUAGE_LABELS[current]}</span>
    </button>
  );
}

