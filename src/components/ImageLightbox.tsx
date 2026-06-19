import { useState, useEffect, useCallback, useRef } from "react";
import { useTranslation } from "react-i18next";
import { X, ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

export function ImageLightbox({
  images,
  alts = [],
  initialIndex = 0,
  open,
  onClose,
}: {
  images: string[];
  alts?: string[];
  initialIndex?: number;
  open: boolean;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const [idx, setIdx] = useState(initialIndex);
  const [imgLoaded, setImgLoaded] = useState(false);
  const list = images.filter(Boolean);
  const count = list.length;

  const dialogRef = useRef<HTMLDivElement>(null);
  const closeBtnRef = useRef<HTMLButtonElement>(null);
  const previouslyFocusedRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    setImgLoaded(false);
  }, [idx, open]);

  // Preload neighbors
  useEffect(() => {
    if (!open || count <= 1) return;
    [(idx + 1) % count, (idx - 1 + count) % count].forEach((i) => {
      const img = new Image();
      img.src = list[i];
    });
  }, [idx, open, count, list]);

  useEffect(() => {
    if (open) {
      setIdx(initialIndex);
      document.body.style.overflow = "hidden";
      previouslyFocusedRef.current = (document.activeElement as HTMLElement) ?? null;
      // Move focus into the dialog on the next tick so the close button exists.
      const id = window.setTimeout(() => {
        closeBtnRef.current?.focus();
      }, 0);
      return () => {
        window.clearTimeout(id);
        document.body.style.overflow = "";
        // Restore focus to the trigger when the dialog closes.
        previouslyFocusedRef.current?.focus?.();
      };
    }
    document.body.style.overflow = "";
  }, [open, initialIndex]);

  const go = useCallback(
    (delta: number) => {
      setIdx((i) => (i + delta + count) % count);
    },
    [count]
  );

  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
        return;
      }
      if (e.key === "ArrowLeft") go(-1);
      if (e.key === "ArrowRight") go(1);
      if (e.key === "Tab") {
        // Basic focus trap — keep focus within the dialog.
        const root = dialogRef.current;
        if (!root) return;
        const focusable = root.querySelectorAll<HTMLElement>(
          'button, [href], input, [tabindex]:not([tabindex="-1"])'
        );
        if (focusable.length === 0) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        const active = document.activeElement as HTMLElement | null;
        if (e.shiftKey && active === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && active === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, onClose, go]);

  if (!open || count === 0) return null;

  return (
    <div
      ref={dialogRef}
      role="dialog"
      aria-modal="true"
      aria-label={t("gallery.label")}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm"
      onClick={onClose}
    >
      {/* Close button */}
      <button
        ref={closeBtnRef}
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onClose();
        }}
        aria-label={t("gallery.close")}
        className="absolute top-4 right-4 z-10 h-11 w-11 rounded-full bg-black/50 hover:bg-black/70 text-white flex items-center justify-center transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
      >
        <X className="h-5 w-5" aria-hidden="true" />
      </button>

      {/* Image counter */}
      {count > 1 && (
        <div className="absolute top-4 left-4 z-10 rounded-full bg-black/50 text-white px-3 py-1 text-sm font-medium font-sans">
          {idx + 1} / {count}
        </div>
      )}

      {/* Main image */}
      <div
        className="relative max-w-[90vw] max-h-[85vh] flex items-center justify-center"
        onClick={(e) => e.stopPropagation()}
      >
        {!imgLoaded && (
          <Loader2 className="absolute h-10 w-10 text-white/80 animate-spin" aria-hidden="true" />
        )}
        <img
          key={list[idx]}
          src={list[idx]}
          alt={alts[idx]?.trim() || t("gallery.image_number", { n: idx + 1 })}
          onLoad={() => setImgLoaded(true)}
          className={cn(
            "max-w-full max-h-[85vh] object-contain transition-opacity duration-200",
            imgLoaded ? "opacity-100" : "opacity-0"
          )}
        />
      </div>

      {/* Navigation arrows */}
      {count > 1 && (
        <>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              go(-1);
            }}
            aria-label={t("gallery.prev")}
            className="absolute left-2 md:left-4 top-1/2 -translate-y-1/2 h-11 w-11 md:h-12 md:w-12 rounded-full bg-black/50 hover:bg-black/70 text-white flex items-center justify-center transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
          >
            <ChevronLeft className="h-5 w-5 md:h-6 md:w-6" aria-hidden="true" />
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              go(1);
            }}
            aria-label={t("gallery.next")}
            className="absolute right-2 md:right-4 top-1/2 -translate-y-1/2 h-11 w-11 md:h-12 md:w-12 rounded-full bg-black/50 hover:bg-black/70 text-white flex items-center justify-center transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
          >
            <ChevronRight className="h-5 w-5 md:h-6 md:w-6" aria-hidden="true" />
          </button>

          {/* Dots */}
          <div className="absolute bottom-4 left-0 right-0 flex justify-center gap-2">
            {list.map((_, i) => (
              <button
                key={i}
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setIdx(i);
                }}
                aria-label={t("gallery.go_to", { n: i + 1 })}
                aria-current={i === idx ? "true" : undefined}
                className={cn(
                  "h-2 rounded-full transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white",
                  i === idx ? "w-6 bg-white" : "w-2 bg-white/50 hover:bg-white/70"
                )}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
