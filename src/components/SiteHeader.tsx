import { useTranslation } from "react-i18next";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { NAV_LINK_KEYS, useNavLinks } from "@/lib/useNavLinks";
import kthLogo from "@/assets/kth-logo-white.svg.asset.json";
import type { Lang } from "@/i18n";

export function SiteHeader() {
  const { t, i18n } = useTranslation();
  const lang = (i18n.resolvedLanguage ?? "sv") as Lang;
  const { data: links } = useNavLinks(lang);

  return (
    <header className="bg-[#000061] text-white">
      <div className="max-w-7xl mx-auto h-24 px-4 sm:px-6 grid grid-cols-[auto_1fr] items-center gap-4 lg:gap-10">
        <div className="flex min-w-0 items-center gap-6 lg:gap-10">
          <a
            href={links?.library ?? "https://www.kth.se"}
            className="shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white rounded"
          >
            <img src={kthLogo.url} alt="KTH" className="h-16 w-auto" />
          </a>
          <nav aria-label={t("nav.label")} className="hidden lg:block">
            <ul className="flex items-center gap-8">
              {NAV_LINK_KEYS.map((key) => (
                <li key={key}>
                  <a
                    href={links?.[key] ?? "#"}
                    className="text-base font-medium text-white hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white rounded px-0.5 py-1"
                  >
                    {t(`nav.${key}`)}
                  </a>
                </li>
              ))}
            </ul>
          </nav>
        </div>
        <div className="flex justify-end">
          <LanguageSwitcher tone="light" />
        </div>
      </div>
    </header>
  );
}
