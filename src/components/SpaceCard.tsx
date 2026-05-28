import { useState } from "react";
import { ChevronDown, MapPin, Calendar, Info } from "lucide-react";
import { ChairIcon } from "./icons/ChairIcon";


import { type Space } from "@/lib/spaces";
import { useFilterOptions } from "@/lib/useFilterOptions";
import { useCardLayout, type CardSectionKey } from "@/lib/useCardLayout";
import { useCapacityIcon } from "@/lib/useCapacityIcon";
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
  const { data: capacityIconUrl } = useCapacityIcon();
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

  const metaParts = [
    space.floor,
    ...(space.lokaltyp ?? []),
  ].filter(Boolean) as string[];

  const showCapacity =
    space.show_capacity_publicly && (space.capacity ?? 0) > 0;

  const renderSection = (key: CardSectionKey, idx: number) => {
    const spacing = idx === 0 ? "" : "mt-3";
    switch (key) {
      case "header":
        return (
          <div key="header" className={cn(spacing)}>
            <h3 className="text-lg font-semibold leading-tight">{space.name}</h3>
            {metaParts.length > 0 && (
              <p className="mt-0.5 text-sm text-muted-foreground leading-snug">
                {metaParts.join(" • ")}
              </p>
            )}
            {showCapacity && (
              <p className="mt-0.5 inline-flex items-center gap-1.5 text-sm leading-snug text-foreground">
                {capacityIconUrl ? (
                  <img src={capacityIconUrl} alt="" className="h-4 w-4 object-contain" />
                ) : (
                  <ChairIcon className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                )}
                <span>
                  <span className="sr-only">Kapacitet: </span>
                  <span className="font-semibold">{space.capacity}</span> platser
                </span>
              </p>
            )}

            {space.notice && (
              <div
                role="status"
                className="mt-3 mb-1 flex items-start gap-2 bg-amber-100 text-amber-900 border border-amber-200 rounded-md px-3 py-2 text-sm"
              >
                <Info className="h-4 w-4 mt-0.5 shrink-0" aria-hidden="true" />
                <span className="whitespace-pre-line">
                  <span className="sr-only">Viktigt meddelande: </span>
                  {space.notice}
                </span>
              </div>
            )}
          </div>
        );
      case "chips":
        return (
          <div key="chips" className={cn(spacing, "mb-4 flex flex-wrap items-center gap-2")}>

            {chips.map((c) => {
              const opt = lookup.get(c.key);
              if (!opt) return null;
              return (
                <span
                  key={c.key}
                  title={c.label}
                  className="inline-flex items-center gap-1.5 text-xs text-muted-foreground bg-secondary/60 rounded-md px-2 py-1 max-w-full"
                >
                  <OptionIcon option={opt} className="h-3.5 w-3.5 shrink-0" />
                  <span className="break-words">{c.label}</span>
                </span>
              );
            })}
          </div>
        );
      case "button_map":
      case "button_booking":
        // Rendered together in the bottom action row.
        return null;
    }
  };


  return (
    <article
      onClick={() => setOpen((o) => !o)}
      className="bg-card rounded-2xl border border-border overflow-hidden cursor-pointer transition-all hover:shadow-md"
    >
      <div className="flex flex-col md:flex-row items-stretch gap-4">
        <div className="order-2 md:order-1 flex-1 min-w-0 flex flex-col p-4">
          {layout.map((k, i) => renderSection(k, i))}

          <div className="mt-auto pt-3 flex items-center justify-between gap-3 flex-wrap">
            <div className="inline-flex items-center text-xs text-muted-foreground">
              <ChevronDown
                className={cn("h-4 w-4 transition-transform", open && "rotate-180")}
              />
              <span className="ml-1">{open ? "Dölj beskrivning" : "Visa beskrivning"}</span>
            </div>
            {(space.map_url || space.booking_url) && (
              <div className="flex flex-wrap items-center gap-2 ml-auto">
                {space.map_url && (
                  <a
                    href={space.map_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    className="inline-flex items-center gap-1.5 rounded-md border border-[var(--kth-blue)] bg-white text-[var(--kth-blue)] px-2.5 py-1 text-xs font-medium hover:bg-[var(--kth-blue)]/5"
                  >
                    <MapPin className="h-3.5 w-3.5" /> Visa på karta
                  </a>
                )}
                {space.booking_url && (
                  <a
                    href={space.booking_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    className="inline-flex items-center gap-1.5 rounded-md border border-[var(--kth-blue)] bg-white text-[var(--kth-blue)] px-2.5 py-1 text-xs font-medium hover:bg-[var(--kth-blue)]/5"
                  >
                    <Calendar className="h-3.5 w-3.5" /> Se bokningsschema
                  </a>
                )}
              </div>
            )}
          </div>

        </div>

        <div className="order-1 md:order-2 w-full md:w-72 lg:w-80 shrink-0 self-stretch h-56 md:h-auto md:aspect-[4/3] overflow-hidden rounded-t-2xl md:rounded-t-none md:rounded-r-2xl">
          <ImageCarousel images={images} alts={space.image_alts ?? []} alt={space.name} />
        </div>
      </div>





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
