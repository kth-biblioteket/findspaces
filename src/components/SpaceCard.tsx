import { useState } from "react";
import { ChevronDown, MapPin, Calendar, Info } from "lucide-react";

import { type Space } from "@/lib/spaces";
import { useFilterOptions } from "@/lib/useFilterOptions";
import { useCardLayout, type CardSectionKey } from "@/lib/useCardLayout";
import { OptionIcon } from "./OptionIcon";
import { ImageCarousel } from "./ImageCarousel";
import { cn } from "@/lib/utils";

export function SpaceCard({
  space,
  layoutOverride,
}: {
  space: Space;
  /** Optional override for live preview in admin. */
  layoutOverride?: CardSectionKey[];
}) {
  const [open, setOpen] = useState(false);
  const { data: options = [] } = useFilterOptions();
  const { data: layoutFromDb = ["header", "chips", "button_map", "button_booking"] } = useCardLayout();
  const layout = layoutOverride ?? layoutFromDb;

  const lookup = new Map(options.map((o) => [`${o.category}:${o.label}`, o]));

  const images =
    space.images && space.images.length > 0
      ? space.images
      : space.image_url
      ? [space.image_url]
      : [];

  const chips: { key: string; label: string }[] = [
    { key: `noise:${space.noise}`, label: space.noise },
    ...space.equipment.map((e) => ({ key: `equipment:${e}`, label: e })),
    ...space.facilities.map((f) => ({ key: `facility:${f}`, label: f })),
  ];

  const renderSection = (key: CardSectionKey, idx: number) => {
    const spacing = idx === 0 ? "" : "mt-3";
    switch (key) {
      case "header":
        return (
          <div key="header" className={cn(spacing, "flex items-start gap-3 flex-wrap")}>
            <h3 className="text-lg font-semibold leading-tight">{space.name}</h3>
            {space.floor && (
              <span className="inline-flex items-center rounded-full bg-[var(--kth-navy)]/10 text-[var(--kth-navy)] text-xs font-semibold px-2.5 py-1">
                {space.floor}
              </span>
            )}
            {(space.lokaltyp ?? []).map((l) => (
              <span
                key={l}
                className="inline-flex items-center rounded-full bg-secondary text-foreground text-xs font-medium px-2.5 py-1"
              >
                {l}
              </span>
            ))}
          </div>
        );
      case "chips":
        return (
          <div key="chips" className={cn(spacing, "flex flex-wrap items-center gap-2")}>
            {chips.map((c) => {
              const opt = lookup.get(c.key);
              if (!opt) return null;
              return (
                <span
                  key={c.key}
                  title={c.label}
                  className="inline-flex items-center gap-1.5 text-xs text-muted-foreground bg-secondary/60 rounded-md px-2 py-1"
                >
                  <OptionIcon option={opt} className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">{c.label}</span>
                </span>
              );
            })}
          </div>
        );
      case "button_map":
        if (!space.map_url) return null;
        return (
          <div key="button_map" className={cn(spacing, "flex flex-wrap gap-2")}>
            <a
              href={space.map_url}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="inline-flex items-center gap-2 rounded-full bg-primary text-primary-foreground px-3.5 py-1.5 text-xs font-medium hover:opacity-90"
            >
              <MapPin className="h-3.5 w-3.5" /> Visa på karta
            </a>
          </div>
        );
      case "button_booking":
        if (!space.booking_url) return null;
        return (
          <div key="button_booking" className={cn(spacing, "flex flex-wrap gap-2")}>
            <a
              href={space.booking_url}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="inline-flex items-center gap-2 rounded-full bg-secondary text-foreground border border-border px-3.5 py-1.5 text-xs font-medium hover:bg-accent"
            >
              <Calendar className="h-3.5 w-3.5" /> Se bokningsschema
            </a>
          </div>
        );
    }
  };

  return (
    <article
      onClick={() => setOpen((o) => !o)}
      className="bg-card rounded-2xl border border-border overflow-hidden cursor-pointer transition-all hover:shadow-md"
    >
      <div className="flex items-stretch gap-4 p-4">
        <div className="flex-1 min-w-0 flex flex-col">
          {layout.map((k, i) => renderSection(k, i))}

          <div className="mt-auto pt-3 flex items-center text-xs text-muted-foreground">
            <ChevronDown
              className={cn("h-4 w-4 transition-transform", open && "rotate-180")}
            />
            <span className="ml-1">{open ? "Dölj beskrivning" : "Visa beskrivning"}</span>
          </div>

        </div>

        <div className="w-40 sm:w-56 md:w-72 lg:w-80 shrink-0 aspect-[4/3] overflow-hidden">
          <ImageCarousel images={images} alts={space.image_alts ?? []} alt={space.name} />
        </div>
      </div>

      {space.notice && (
        <div className="px-4 pb-4">
          <div className="flex items-start gap-2 bg-amber-100 text-amber-900 border border-amber-200 rounded-md px-3 py-2 text-sm">
            <Info className="h-4 w-4 mt-0.5 shrink-0" />
            <span className="whitespace-pre-line">{space.notice}</span>
          </div>
        </div>
      )}


      <div
        className={cn(
          "grid transition-all duration-300 ease-out",
          open ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
        )}
      >
        <div className="overflow-hidden">
          <div className="px-4 pb-5 pt-1 border-t border-border/60">
            <p className="text-sm text-foreground/80 leading-relaxed pt-3">
              {space.description}
            </p>
          </div>

        </div>
      </div>
    </article>
  );
}
