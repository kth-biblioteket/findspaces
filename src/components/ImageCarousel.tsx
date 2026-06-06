import { useState } from "react";
import { BookOpen, ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

export function ImageCarousel({
  images, alt, alts = [], className, onImageClick,
}: { images: string[]; alt: string; alts?: string[]; className?: string; onImageClick?: (index: number) => void }) {
  const [idx, setIdx] = useState(0);
  const list = images.filter(Boolean);
  const count = list.length;

  if (count === 0) {
    return (
      <div className={cn("relative w-full h-full bg-[var(--kth-navy)] flex items-center justify-center", className)}>
        <BookOpen className="h-10 w-10 text-white" strokeWidth={1.5} />
      </div>
    );
  }

  const go = (delta: number, e: React.MouseEvent) => {
    e.stopPropagation();
    setIdx((i) => (i + delta + count) % count);
  };

  return (
    <div className={cn("relative w-full h-full overflow-hidden bg-secondary group", className)}>
      <button
        type="button"
        className="w-full h-full p-0 m-0 border-0 bg-transparent cursor-pointer"
        onClick={(e) => {
          e.stopPropagation();
          onImageClick?.(idx);
        }}
        aria-label="Öppna bild i full storlek"
      >
        <img
          src={list[idx]}
          alt={alts[idx]?.trim() || alt}
          className="w-full h-full object-cover"
          loading="lazy"
        />
      </button>

      {count > 1 && (
        <>
          {/* Gradient overlay for readability */}
          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-black/60 via-black/30 to-transparent z-10" />

          {/* Image counter (top-right) */}
          <div className="absolute top-2 right-2 z-20 px-2 py-0.5 rounded-full bg-black/60 text-white text-[11px] font-medium tabular-nums shadow-sm backdrop-blur-sm">
            {idx + 1} / {count}
          </div>

          <button
            type="button"
            onClick={(e) => go(-1, e)}
            aria-label="Föregående bild"
            className="absolute left-2 top-1/2 -translate-y-1/2 z-20 h-8 w-8 rounded-full bg-white/90 hover:bg-white text-[var(--kth-navy)] shadow-md flex items-center justify-center transition-all"
          >
            <ChevronLeft className="h-5 w-5" strokeWidth={2.5} />
          </button>
          <button
            type="button"
            onClick={(e) => go(1, e)}
            aria-label="Nästa bild"
            className="absolute right-2 top-1/2 -translate-y-1/2 z-20 h-8 w-8 rounded-full bg-white/90 hover:bg-white text-[var(--kth-navy)] shadow-md flex items-center justify-center transition-all"
          >
            <ChevronRight className="h-5 w-5" strokeWidth={2.5} />
          </button>

          {/* Pagination dots in a pill */}
          <div className="absolute bottom-2 left-1/2 -translate-x-1/2 z-20 flex items-center gap-1.5 px-2.5 py-1.5 rounded-full bg-black/55 backdrop-blur-sm shadow-md">
            {list.map((_, i) => (
              <button
                key={i}
                type="button"
                onClick={(e) => { e.stopPropagation(); setIdx(i); }}
                aria-label={`Bild ${i + 1}`}
                aria-current={i === idx}
                className={cn(
                  "h-2 rounded-full transition-all",
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
