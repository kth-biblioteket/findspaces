import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { X, Info } from "lucide-react";
import { useAnnouncement } from "@/lib/useAnnouncement";

const STORAGE_KEY = "announcement_dismissed_hash";

export function AnnouncementBanner() {
  const { t } = useTranslation();
  const { data } = useAnnouncement();
  const [dismissedHash, setDismissedHash] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    try {
      setDismissedHash(localStorage.getItem(STORAGE_KEY));
    } catch {
      // ignore
    }
  }, []);

  if (!mounted || !data?.message) return null;
  if (data.hash && dismissedHash === data.hash) return null;

  const handleDismiss = () => {
    try {
      localStorage.setItem(STORAGE_KEY, data.hash);
    } catch {
      // ignore
    }
    setDismissedHash(data.hash);
  };

  return (
    <div
      role="status"
      aria-live="polite"
      className="bg-muted text-foreground border-b border-border"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-2.5 flex items-start gap-3">
        <Info className="h-4 w-4 mt-0.5 shrink-0" aria-hidden="true" />
        <p className="flex-1 text-sm leading-snug whitespace-pre-line">
          {data.message}
        </p>
        <button
          type="button"
          onClick={handleDismiss}
          aria-label={t("announcement.dismiss")}
          className="shrink-0 -m-1 p-1 rounded hover:bg-black/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground"
        >
          <X className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}
