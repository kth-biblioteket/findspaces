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
    <div className={cn("relative w-full h-full overflow-hidden bg-secondary", className)}>
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-black/50 to-transparent z-10" />
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
          <button
            type="button"
            onClick={(e) => go(-1, e)}
            aria-label="Föregående bild"
            className="absolute left-1 top-1/2 -translate-y-1/2 h-7 w-7 rounded-full bg-black/40 hover:bg-black/60 text-white flex items-center justify-center"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={(e) => go(1, e)}
            aria-label="Nästa bild"
            className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 rounded-full bg-black/40 hover:bg-black/60 text-white flex items-center justify-center"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
          <div className="absolute bottom-1.5 left-0 right-0 flex justify-center gap-1.5">
            {list.map((_, i) => (
              <button
                key={i}
                type="button"
                onClick={(e) => { e.stopPropagation(); setIdx(i); }}
                aria-label={`Bild ${i + 1}`}
                className={cn(
                  "h-1.5 rounded-full transition-all",
                  i === idx ? "w-4 bg-white" : "w-1.5 bg-white/60"
                )}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
