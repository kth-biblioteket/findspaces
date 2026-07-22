import { useTranslation } from "react-i18next";
import { SUPPORTED_LANGUAGES, type Lang } from "@/i18n";

export function LanguageSwitcher({ className = "" }: { className?: string }) {
  const { i18n, t } = useTranslation();
  const current = (i18n.resolvedLanguage ?? "sv") as Lang;

  return (
    <div
      className={`inline-flex items-center gap-1 text-xs ${className}`}
      role="group"
      aria-label={t("header.language")}
    >
      {SUPPORTED_LANGUAGES.map((lng) => {
        const active = current === lng;
        const fullName = t(`languages.${lng}`);
        return (
          <button
            key={lng}
            type="button"
            onClick={() => i18n.changeLanguage(lng)}
            aria-pressed={active}
            aria-label={fullName}
            lang={lng}
            className={
              "px-2 py-1 rounded-md font-semibold uppercase tracking-wide focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary " +
              (active
                ? "bg-foreground text-background"
                : "text-muted-foreground hover:text-foreground")
            }
          >
            <span aria-hidden="true">{lng}</span>
            <span className="sr-only">{fullName}</span>
          </button>
        );
      })}
    </div>
  );
}
