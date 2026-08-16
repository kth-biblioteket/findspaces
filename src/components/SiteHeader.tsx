import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Menu, X } from "lucide-react";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { NAV_LINK_KEYS, useNavLinks } from "@/lib/useNavLinks";
const KTH_LOGO_SRC = "/kth-logo-white.svg";
import type { Lang } from "@/i18n";

const KTH_LOGO_FALLBACK = "https://app.kth.se/style/assets/kth-logotype-white.png";

export function SiteHeader() {
  const { t, i18n } = useTranslation();
  const lang = (i18n.resolvedLanguage ?? "sv") as Lang;
  const { data: links } = useNavLinks(lang);
  const [menuOpen, setMenuOpen] = useState(false);
  const headerRef = useRef<HTMLElement>(null);
  const menuButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!menuOpen) return;

    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      setMenuOpen(false);
      menuButtonRef.current?.focus();
    };
    const closeOutsideHeader = (event: PointerEvent) => {
      if (!headerRef.current?.contains(event.target as Node)) setMenuOpen(false);
    };
    const desktopMedia = window.matchMedia("(min-width: 993px)");
    const closeAtDesktopWidth = (event: MediaQueryListEvent) => {
      if (event.matches) setMenuOpen(false);
    };

    document.addEventListener("keydown", closeOnEscape);
    document.addEventListener("pointerdown", closeOutsideHeader);
    desktopMedia.addEventListener("change", closeAtDesktopWidth);
    return () => {
      document.removeEventListener("keydown", closeOnEscape);
      document.removeEventListener("pointerdown", closeOutsideHeader);
      desktopMedia.removeEventListener("change", closeAtDesktopWidth);
    };
  }, [menuOpen]);

  return (
    <header ref={headerRef} className="relative z-40 bg-[#000061] text-white">
      <div className="mx-auto grid h-24 max-w-7xl grid-cols-[auto_1fr] items-center gap-4 px-4 sm:px-6 min-[993px]:gap-10">
        <div className="flex min-w-0 items-center gap-6 min-[993px]:gap-10">
          <a
            href={links?.library ?? "https://www.kth.se"}
            className="shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white rounded"
          >
            <img
              src={KTH_LOGO_SRC}
              alt="KTH"
              className="h-16 w-auto"
              onError={({ currentTarget }) => {
                currentTarget.onerror = null;
                currentTarget.src = KTH_LOGO_FALLBACK;
              }}
            />
          </a>
          <nav aria-label={t("nav.label")} className="hidden min-[993px]:block">
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
        <div className="flex items-center justify-end gap-3 sm:gap-5">
          <LanguageSwitcher tone="light" />
          <button
            ref={menuButtonRef}
            type="button"
            aria-expanded={menuOpen}
            aria-controls="mobile-site-navigation"
            aria-label={menuOpen ? t("nav.menu_close") : t("nav.menu_open")}
            onClick={() => setMenuOpen((open) => !open)}
            className="inline-flex items-center gap-1.5 rounded-md px-1 py-0.5 text-sm font-medium text-white hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white min-[993px]:hidden"
          >
            {menuOpen ? <X aria-hidden="true" size={20} /> : <Menu aria-hidden="true" size={20} />}
            <span>{t("nav.menu")}</span>
          </button>
        </div>
      </div>

      {menuOpen && (
        <nav
          id="mobile-site-navigation"
          aria-label={t("nav.label")}
          className="absolute inset-x-0 top-full border-t border-white/20 bg-white text-[#000061] shadow-lg min-[993px]:hidden"
        >
          <ul className="mx-auto max-w-7xl px-4 pb-3 sm:px-6">
            {NAV_LINK_KEYS.map((key) => (
              <li key={key} className="border-b border-[#d9d9d9] last:border-b-0">
                <a
                  href={links?.[key] ?? "#"}
                  onClick={() => setMenuOpen(false)}
                  className="flex min-h-12 items-center px-2 py-3 text-base font-semibold hover:bg-[#f2f2f2] hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#000061]"
                >
                  {t(`nav.${key}`)}
                </a>
              </li>
            ))}
          </ul>
        </nav>
      )}
    </header>
  );
}
