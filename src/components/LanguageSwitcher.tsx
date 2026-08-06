import { useTranslation } from "react-i18next";
import { Globe } from "lucide-react";
import { SUPPORTED_LANGUAGES, type Lang } from "@/i18n";

const LANGUAGE_LABELS: Record<Lang, string> = {
  sv: "Svenska",
  en: "English",
};

export function LanguageSwitcher({
  className = "",
  tone = "default",
}: {
  className?: string;
  tone?: "default" | "light";
}) {
  const { i18n, t } = useTranslation();
  const current = (i18n.resolvedLanguage ?? "sv") as Lang;
  const other = SUPPORTED_LANGUAGES.find((lng) => lng !== current) ?? "en";

  return (
    <button
      type="button"
      onClick={() => i18n.changeLanguage(other)}
      aria-label={`${t("header.language")}: ${LANGUAGE_LABELS[other]}`}
      lang={other}
      className={
        "inline-flex items-center gap-1.5 text-sm font-medium transition-colors " +
        (tone === "light"
          ? "text-white hover:opacity-80 focus-visible:ring-white "
          : "text-muted-foreground hover:text-foreground focus-visible:ring-primary ") +
        "focus-visible:outline-none focus-visible:ring-2 rounded-md px-1 py-0.5 " +
        className
      }
    >
      <Globe aria-hidden="true" size={16} />
      <span>{LANGUAGE_LABELS[other]}</span>
    </button>
  );
}


