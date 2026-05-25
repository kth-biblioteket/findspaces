import { useState } from "react";
import { BookOpen, ChevronDown } from "lucide-react";
import { type Space, iconForLabel } from "@/lib/spaces";
import { cn } from "@/lib/utils";

export function SpaceCard({ space }: { space: Space }) {
  const [open, setOpen] = useState(false);
  const chips = [space.noise, ...space.equipment, ...space.facilities];

  return (
    <article
      onClick={() => setOpen((o) => !o)}
      className="bg-card rounded-2xl border border-border overflow-hidden cursor-pointer transition-all hover:shadow-md"
    >
      <div className="flex items-stretch gap-4 p-4">
        <div className="flex-1 min-w-0 flex flex-col">
          <div className="flex items-start gap-3 flex-wrap">
            <h3 className="text-lg font-semibold leading-tight">{space.name}</h3>
            <span className="inline-flex items-center rounded-full bg-secondary text-foreground text-xs font-medium px-2.5 py-1">
              {space.category}
            </span>
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-2">
            {chips.map((c) => {
              const Icon = iconForLabel(c);
              if (!Icon) return null;
              return (
                <span
                  key={c}
                  title={c}
                  className="inline-flex items-center gap-1.5 text-xs text-muted-foreground bg-secondary/60 rounded-md px-2 py-1"
                >
                  <Icon className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">{c}</span>
                </span>
              );
            })}
          </div>

          <div className="mt-auto pt-3 flex items-center text-xs text-muted-foreground">
            <ChevronDown
              className={cn("h-4 w-4 transition-transform", open && "rotate-180")}
            />
            <span className="ml-1">{open ? "Dölj beskrivning" : "Visa beskrivning"}</span>
          </div>
        </div>

        <div className="w-24 sm:w-40 md:w-48 shrink-0 aspect-[4/3] rounded-xl overflow-hidden">
          {space.image_url ? (
            <img
              src={space.image_url}
              alt={space.name}
              className="w-full h-full object-cover"
              loading="lazy"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-[var(--kth-navy)]">
              <BookOpen className="h-10 w-10 text-white" strokeWidth={1.5} />
            </div>
          )}
        </div>
      </div>

      <div
        className={cn(
          "grid transition-all duration-300 ease-out",
          open ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
        )}
      >
        <div className="overflow-hidden">
          <div className="px-4 pb-5 pt-1 text-sm text-foreground/80 leading-relaxed border-t border-border/60">
            {space.description}
          </div>
        </div>
      </div>
    </article>
  );
}
