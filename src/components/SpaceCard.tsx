import { useState, useMemo } from "react";
import DOMPurify from "dompurify";
import { ChevronDown, MapPin, Calendar, Info, Users } from "lucide-react";
import { useTranslation } from "react-i18next";
import { ChairIcon } from "./icons/ChairIcon";


import { type Space } from "@/lib/spaces";
import { useFilterOptions } from "@/lib/useFilterOptions";
import { useCardLayout, type CardSectionKey } from "@/lib/useCardLayout";
import { useCapacityIcon } from "@/lib/useCapacityIcon";
import { pickLocalized, type Lang } from "@/i18n";
import { OptionIcon } from "./OptionIcon";
import { ImageCarousel } from "./ImageCarousel";
import { ImageLightbox } from "./ImageLightbox";
import { cn } from "@/lib/utils";


export function SpaceCard({
  space,
  layoutOverride,
}: {
  space: Space;
  /** Optional override for live preview in admin. */
  layoutOverride?: CardSectionKey[];
}) {
  const { t, i18n } = useTranslation();
  const lang = (i18n.resolvedLanguage ?? "sv") as Lang;
  const [open, setOpen] = useState(false);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);
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

  const localizedName = pickLocalized(space, "name", lang);
  const localizedDescription = pickLocalized(space, "description", lang);
  const localizedNotice = pickLocalized(space, "notice", lang);
  const localizedFloor = pickLocalized(space, "floor", lang);
  const localizedLocatedIn = pickLocalized(space, "located_in", lang);
  const localizedGroupBookingUrl =
    pickLocalized(space, "group_booking_url", lang) || space.group_booking_url || "";

  const sanitizedDescription = useMemo(() => {
    if (!localizedDescription) return "";
    const clean = DOMPurify.sanitize(localizedDescription, {
      ALLOWED_TAGS: ["a", "b", "strong", "i", "em", "br", "p", "ul", "ol", "li", "span"],
      ALLOWED_ATTR: ["href", "target", "rel", "title"],
    });
    // Force all links to open safely in a new tab.
    if (typeof window === "undefined") return clean;
    const tmp = document.createElement("div");
    tmp.innerHTML = clean;
    tmp.querySelectorAll("a").forEach((a) => {
      a.setAttribute("target", "_blank");
      a.setAttribute("rel", "noopener noreferrer");
    });
    return tmp.innerHTML;
  }, [localizedDescription]);

  const localizeChip = (category: string, value: string): string => {
    const opt = lookup.get(`${category}:${value}`);
    return opt ? pickLocalized(opt, "label", lang) : value;
  };

  const chips: { key: string; label: string }[] = [
    ...(space.noise ?? []).map((n) => ({ key: `noise:${n}`, label: localizeChip("noise", n) })),
    ...space.equipment.map((e) => ({ key: `equipment:${e}`, label: localizeChip("equipment", e) })),
    ...space.facilities.map((f) => ({ key: `facility:${f}`, label: localizeChip("facility", f) })),
  ];

  const metaParts = [
    localizedFloor,
    localizedLocatedIn,
    ...(space.lokaltyp ?? []).map((l) => localizeChip("lokaltyp", l)),
  ].filter((s): s is string => Boolean(s && s.length > 0));

  const showCapacity =
    space.show_capacity_publicly && (space.capacity ?? 0) > 0;

  const renderSection = (key: CardSectionKey, idx: number) => {
    const spacing = idx === 0 ? "" : "mt-3";
    switch (key) {
      case "header":
        return (
          <div key="header" className={cn(spacing)}>
            <h3 className="text-lg font-semibold leading-tight">{localizedName}</h3>
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
                  <span className="sr-only">{t("card.capacity_sr")} </span>
                  <span className="font-semibold">{space.capacity}</span> {t("card.capacity_seats")}
                </span>
              </p>
            )}

            {localizedNotice && (
              <div
                role="status"
                className="mt-3 mb-1 flex items-start gap-2 bg-amber-100 text-amber-900 border border-amber-200 rounded-md px-3 py-2 text-sm"
              >
                <Info className="h-4 w-4 mt-0.5 shrink-0" aria-hidden="true" />
                <span className="whitespace-pre-line">
                  <span className="sr-only">{t("card.notice_sr")} </span>
                  {localizedNotice}
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
      case "button_group_booking":
      case "button_booking":
        // Rendered together in the bottom action row, in layout order.
        return null;
    }
  };

  const buttonClass =
    "inline-flex items-center gap-1.5 rounded-md border border-[var(--kth-blue)] bg-white text-[var(--kth-blue)] px-2.5 py-1 text-xs font-medium hover:bg-[var(--kth-blue)]/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-primary";

  const renderButton = (key: CardSectionKey) => {
    switch (key) {
      case "button_map":
        if (!space.map_url) return null;
        return (
          <a
            key="button_map"
            href={space.map_url}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className={buttonClass}
          >
            <MapPin className="h-3.5 w-3.5" aria-hidden="true" />
            <span>{t("card.button_map")}</span>
            <span className="sr-only">{t("card.opens_new_tab_sr")}</span>
          </a>
        );
      case "button_group_booking":
        if (!space.group_booking_url) return null;
        return (
          <a
            key="button_group_booking"
            href={space.group_booking_url}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className={buttonClass}
          >
            <Users className="h-3.5 w-3.5" aria-hidden="true" />
            <span>{t("card.button_group_booking")}</span>
            <span className="sr-only">{t("card.opens_new_tab_sr")}</span>
          </a>
        );
      case "button_booking":
        if (!space.booking_url) return null;
        return (
          <a
            key="button_booking"
            href={space.booking_url}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className={buttonClass}
          >
            <Calendar className="h-3.5 w-3.5" aria-hidden="true" />
            <span>{t("card.button_booking")}</span>
            <span className="sr-only">{t("card.opens_new_tab_sr")}</span>
          </a>
        );
      default:
        return null;
    }
  };

  const buttonKeys = layout.filter((k): k is CardSectionKey =>
    k === "button_map" || k === "button_group_booking" || k === "button_booking"
  );
  const renderedButtons = buttonKeys.map(renderButton).filter(Boolean);


  return (
    <article
      role="button"
      tabIndex={0}
      aria-expanded={open}
      aria-label={t("card.expand_aria", {
        name: localizedName,
        action: open ? t("card.expand_hide") : t("card.expand_show"),
      })}
      onClick={() => setOpen((o) => !o)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          setOpen((o) => !o);
        }
      }}
      className="bg-card rounded-2xl border border-border overflow-hidden cursor-pointer transition-all hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-primary"
    >
      <div className="flex flex-col md:flex-row items-stretch gap-4">
        <div className="order-2 md:order-1 flex-1 min-w-0 flex flex-col p-4">
          {layout.map((k, i) => renderSection(k, i))}

          <div className="mt-auto pt-3 flex items-center justify-between gap-3 flex-wrap">
            <span
              className="inline-flex items-center text-xs text-muted-foreground"
              aria-hidden="true"
            >
              <ChevronDown
                className={cn("h-4 w-4 transition-transform", open && "rotate-180")}
              />
              <span className="ml-1">{open ? t("card.hide_description") : t("card.show_description")}</span>
            </span>
            {renderedButtons.length > 0 && (
              <div className="flex flex-wrap items-center gap-2 ml-auto">
                {renderedButtons}
              </div>
            )}
          </div>

        </div>

        <div className="order-1 md:order-2 w-full md:w-72 lg:w-80 shrink-0 self-stretch h-56 md:h-auto md:aspect-[4/3] overflow-hidden rounded-t-2xl md:rounded-t-none md:rounded-r-2xl">
          <ImageCarousel
            images={images}
            alts={space.image_alts ?? []}
            alt={localizedName}
            onImageClick={(i) => {
              setLightboxIndex(i);
              setLightboxOpen(true);
            }}
          />
        </div>
      </div>

      <ImageLightbox
        images={images}
        alts={space.image_alts ?? []}
        initialIndex={lightboxIndex}
        open={lightboxOpen}
        onClose={() => setLightboxOpen(false)}
      />




      <div
        className={cn(
          "grid transition-all duration-300 ease-out",
          open ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
        )}
      >
        <div className="overflow-hidden">
          <div className="px-4 pb-5 pt-1 border-t border-border/60">
            <p className="text-sm text-foreground/80 leading-relaxed pt-3">
              {localizedDescription}
            </p>

          </div>
        </div>
      </div>
    </article>
  );
}
