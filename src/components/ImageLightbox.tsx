import { useState, useEffect, useCallback } from "react";
import { X, ChevronLeft, ChevronRight } from "lucide-react";
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
  const [idx, setIdx] = useState(initialIndex);
  const list = images.filter(Boolean);
  const count = list.length;

  useEffect(() => {
    if (open) {
      setIdx(initialIndex);
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
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
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowLeft") go(-1);
      if (e.key === "ArrowRight") go(1);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, onClose, go]);

  if (!open || count === 0) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Bildgalleri"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm"
      onClick={onClose}
    >
      {/* Close button */}
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onClose();
        }}
        aria-label="Stäng bildgalleri"
        className="absolute top-4 right-4 z-10 h-10 w-10 rounded-full bg-black/50 hover:bg-black/70 text-white flex items-center justify-center transition-colors"
      >
        <X className="h-5 w-5" />
      </button>

      {/* Image counter */}
      {count > 1 && (
        <div className="absolute top-4 left-4 z-10 rounded-full bg-black/50 text-white px-3 py-1 text-sm font-medium">
          {idx + 1} / {count}
        </div>
      )}

      {/* Main image */}
      <div
        className="relative max-w-[90vw] max-h-[85vh] flex items-center justify-center"
        onClick={(e) => e.stopPropagation()}
      >
        <img
          src={list[idx]}
          alt={alts[idx]?.trim() || `Bild ${idx + 1}`}
          className="max-w-full max-h-[85vh] object-contain"
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
            aria-label="Föregående bild"
            className="absolute left-2 md:left-4 top-1/2 -translate-y-1/2 h-10 w-10 md:h-12 md:w-12 rounded-full bg-black/50 hover:bg-black/70 text-white flex items-center justify-center transition-colors"
          >
            <ChevronLeft className="h-5 w-5 md:h-6 md:w-6" />
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              go(1);
            }}
            aria-label="Nästa bild"
            className="absolute right-2 md:right-4 top-1/2 -translate-y-1/2 h-10 w-10 md:h-12 md:w-12 rounded-full bg-black/50 hover:bg-black/70 text-white flex items-center justify-center transition-colors"
          >
            <ChevronRight className="h-5 w-5 md:h-6 md:w-6" />
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
                aria-label={`Gå till bild ${i + 1}`}
                className={cn(
                  "h-2 rounded-full transition-all",
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
