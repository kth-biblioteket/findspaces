import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import { useRouterState } from "@tanstack/react-router";
import { AnnouncementBanner, ANNOUNCEMENT_STORAGE_KEY } from "@/components/AnnouncementBanner";
import { LandingText } from "@/components/LandingText";
import { SiteHeader } from "@/components/SiteHeader";
import { useAnnouncement } from "@/lib/useAnnouncement";
import { useBetaBadgeEnabled } from "@/lib/useBetaBadge";
import { UI_TEXT_DEFAULTS, UI_TEXT_DEFAULTS_EN, useUiText } from "@/lib/useUiText";
import { cn } from "@/lib/utils";

type SitePageLayoutProps = {
  children: ReactNode;
  /** Swap this node for the official KTH header when it becomes available. */
  header?: ReactNode;
  /** Swap this node for the official KTH footer when it becomes available. */
  footer?: ReactNode;
};

/** Standalone page chrome around the preserved study-place application. */
export function SitePageLayout({ children, header = <SiteHeader />, footer }: SitePageLayoutProps) {
  // i18next falls back to Swedish during SSR because its browser language
  // detector cannot inspect the URL on the server. Read the validated route
  // search directly so an English request never renders a Swedish first frame.
  const langParam = useRouterState({
    select: (state) => (state.location.search as { lang?: string } | undefined)?.lang,
  });
  const lang = langParam === "en" ? "en" : "sv";
  const { data: announcement } = useAnnouncement();
  const { data: adminTitle } = useUiText("landing_title", lang);
  const { data: betaBadgeEnabled = true } = useBetaBadgeEnabled();
  const [dismissedHash, setDismissedHash] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    try {
      setDismissedHash(localStorage.getItem(ANNOUNCEMENT_STORAGE_KEY));
    } catch {
      // ignore
    }
  }, []);

  const isBannerVisible =
    mounted &&
    Boolean(announcement?.message) &&
    (!announcement?.hash || dismissedHash !== announcement?.hash);
  const title =
    adminTitle?.trim() ||
    (lang === "en" ? UI_TEXT_DEFAULTS_EN.landing_title : UI_TEXT_DEFAULTS.landing_title);

  return (
    <div className="flex min-h-dvh flex-col bg-background">
      {header}

      <section className="bg-card" aria-labelledby="page-title">
        {isBannerVisible && (
          <div className="mx-auto max-w-7xl px-4 pt-6 sm:px-6">
            <AnnouncementBanner
              dismissedHash={dismissedHash}
              onDismiss={(hash) => {
                try {
                  localStorage.setItem(ANNOUNCEMENT_STORAGE_KEY, hash);
                } catch {
                  // ignore
                }
                setDismissedHash(hash);
              }}
            />
          </div>
        )}
        <div
          className={cn(
            "mx-auto max-w-7xl px-4 sm:px-6",
            isBannerVisible ? "pt-4 pb-4" : "pt-6 pb-3",
          )}
        >
          <h1
            id="page-title"
            className="text-lg font-bold leading-tight text-foreground sm:text-3xl"
          >
            {title}{" "}
            {betaBadgeEnabled && (
              <span className="inline-flex items-center rounded-full bg-secondary px-1.5 py-0.5 align-middle text-[0.6em] font-semibold uppercase tracking-wide text-foreground sm:px-2 sm:py-0.5 sm:text-[0.55em]">
                Beta
              </span>
            )}
          </h1>
        </div>
        <LandingText compact={!isBannerVisible} />
      </section>

      <div className="flex-1">{children}</div>

      {footer}
    </div>
  );
}
