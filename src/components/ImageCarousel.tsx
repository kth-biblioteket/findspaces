import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { ChevronLeft, ChevronRight, BookOpen } from "lucide-react";
import { cn } from "@/lib/utils";

function Placeholder({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "relative w-full h-full bg-muted flex items-center justify-center",
        className
      )}
      aria-hidden="true"
    >
      <BookOpen className="h-20 w-20 text-primary" />
    </div>
  );
}

export function ImageCarousel({
  images, alt, alts = [], className, onImageClick, priority = false,
}: { images: string[]; alt: string; alts?: string[]; className?: string; onImageClick?: (index: number) => void; priority?: boolean }) {
  const { t } = useTranslation();
  const [idx, setIdx] = useState(0);
  const [loaded, setLoaded] = useState<Record<number, boolean>>({});
  const touchRef = useState<{ x: number; y: number; t: number; moved: boolean } | null>(null);
  const touchStart = (e: React.TouchEvent) => {
    const t = e.touches[0];
    (touchRef as any)[0] = { x: t.clientX, y: t.clientY, t: Date.now(), moved: false };
  };
  const touchMove = (e: React.TouchEvent) => {
    const s = (touchRef as any)[0];
    if (!s) return;
    const t = e.touches[0];
    if (Math.abs(t.clientX - s.x) > 8) s.moved = true;
  };
  const touchEnd = (e: React.TouchEvent) => {
    const s = (touchRef as any)[0];
    (touchRef as any)[0] = null;
    if (!s || count <= 1) return;
    const t = e.changedTouches[0];
    const dx = t.clientX - s.x;
    const dy = t.clientY - s.y;
    if (Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(dy) * 1.5) {
      e.stopPropagation();
      setIdx((i) => (i + (dx < 0 ? 1 : -1) + count) % count);
    }
  };
  const list = images.filter(Boolean);
  const count = list.length;

  // Preload neighboring images for snappier paging
  useEffect(() => {
    if (count <= 1) return;
    const neighbors = [(idx + 1) % count, (idx - 1 + count) % count];
    neighbors.forEach((i) => {
      if (loaded[i]) return;
      const img = new Image();
      img.src = list[i];
      img.onload = () => setLoaded((prev) => (prev[i] ? prev : { ...prev, [i]: true }));
    });
  }, [idx, count, list, loaded]);

  if (count === 0) {
    return <Placeholder className={className} />;
  }

  const go = (delta: number, e: React.MouseEvent) => {
    e.stopPropagation();
    setIdx((i) => (i + delta + count) % count);
  };

  const isLoaded = !!loaded[idx];

  return (
    <div className={cn("relative w-full h-full overflow-hidden bg-muted group", className)}>
      {/* Subtle shimmer skeleton — no icon, so it doesn't flash a fake placeholder */}
      {!isLoaded && (
        <div className="absolute inset-0 z-0 animate-pulse bg-gradient-to-br from-muted via-muted/60 to-muted" />
      )}

      <button
        type="button"
        className="relative z-[1] w-full h-full p-0 m-0 border-0 bg-transparent cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        onClick={(e) => {
          e.stopPropagation();
          onImageClick?.(idx);
        }}
        aria-label={t("gallery.open_full")}
      >
        <img
          key={list[idx]}
          src={list[idx]}
          alt={alts[idx]?.trim() || alt}
          className={cn(
            "w-full h-full object-cover transition-opacity duration-300",
            isLoaded ? "opacity-100" : "opacity-0"
          )}
          loading={priority ? "eager" : "lazy"}
          // @ts-expect-error -- fetchpriority is valid HTML, not yet in React types
          fetchpriority={priority ? "high" : "auto"}
          decoding="async"
          onLoad={() => setLoaded((prev) => ({ ...prev, [idx]: true }))}
        />
      </button>

      {/* All UI overlays appear only after the image is visible, so users never see
          chrome floating over an empty placeholder. */}
      {count > 1 && isLoaded && (
        <>
          {/* Gradient overlay for readability */}
          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-black/60 via-black/30 to-transparent z-10" />

          {/* Image counter (top-right) */}
          <div className="absolute top-2 right-2 z-20 px-2 py-0.5 rounded-full bg-black/60 text-white text-[11px] font-medium tabular-nums shadow-sm backdrop-blur-sm font-sans">
            {idx + 1} / {count}
          </div>

          <button
            type="button"
            onClick={(e) => go(-1, e)}
            aria-label={t("gallery.prev")}
            className="absolute left-2 top-1/2 -translate-y-1/2 z-20 h-8 w-8 rounded-full bg-white/90 hover:bg-white text-[var(--kth-navy)] shadow-md flex items-center justify-center transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <ChevronLeft className="h-5 w-5" strokeWidth={2.5} aria-hidden="true" />
          </button>
          <button
            type="button"
            onClick={(e) => go(1, e)}
            aria-label={t("gallery.next")}
            className="absolute right-2 top-1/2 -translate-y-1/2 z-20 h-8 w-8 rounded-full bg-white/90 hover:bg-white text-[var(--kth-navy)] shadow-md flex items-center justify-center transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <ChevronRight className="h-5 w-5" strokeWidth={2.5} aria-hidden="true" />
          </button>

          {/* Pagination dots in a pill */}
          <div className="absolute bottom-2 left-1/2 -translate-x-1/2 z-20 flex items-center gap-1.5 px-2.5 py-1.5 rounded-full bg-black/55 backdrop-blur-sm shadow-md">
            {list.map((_, i) => (
              <button
                key={i}
                type="button"
                onClick={(e) => { e.stopPropagation(); setIdx(i); }}
                aria-label={t("gallery.go_to", { n: i + 1 })}
                aria-current={i === idx ? "true" : undefined}
                className={cn(
                  "h-2 rounded-full transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white",
                  i === idx ? "w-5 bg-white" : "w-2 bg-white/55 hover:bg-white/80"
                )}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
