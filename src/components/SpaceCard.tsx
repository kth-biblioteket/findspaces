import { useState, useMemo } from "react";
import DOMPurify from "dompurify";
import { ChevronDown, MapPin, Calendar, Info, Users, User, X, DoorOpen, DoorClosed } from "lucide-react";
import { useTranslation } from "react-i18next";
import { ChairIcon } from "./icons/ChairIcon";


import { type Space } from "@/lib/spaces";
import { useFilterOptions } from "@/lib/useFilterOptions";
import { useCardLayout, type CardSectionKey } from "@/lib/useCardLayout";
import { useCapacityIcon } from "@/lib/useCapacityIcon";
import { useOccupancy, type OccupancyStatus } from "@/lib/useOccupancy";
import { useGroupRoomAvailability, type GroupRoomStatus } from "@/lib/useGroupRoomAvailability";
import { useOccupancySettings, isWithinSchedule, DEFAULT_SCHEDULE } from "@/lib/useOccupancySettings";
import { useUiText } from "@/lib/useUiText";
import { pickLocalized, type Lang } from "@/i18n";
import { OptionIcon } from "./OptionIcon";
import { ImageCarousel } from "./ImageCarousel";
import { ImageLightbox } from "./ImageLightbox";
import { cn } from "@/lib/utils";
import { type Filters } from "./FilterPanel";

type IntentValue = "enskilt" | "tillsammans";

export function SpaceCard({
  space,
  layoutOverride,
  filters,
  onFiltersChange,
  priority = false,
}: {
  space: Space;
  /** Optional override for live preview in admin. */
  layoutOverride?: CardSectionKey[];
  filters?: Filters;
  onFiltersChange?: (next: Filters) => void;
  /** Eagerly load the image (use for above-the-fold cards). */
  priority?: boolean;
}) {
  const { t, i18n } = useTranslation();
  const lang = (i18n.resolvedLanguage ?? "sv") as Lang;
  const [open, setOpen] = useState(false);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);
  const { data: options = [] } = useFilterOptions();
  const { data: layoutFromDb = ["header", "chips", "button_map", "button_booking"] } = useCardLayout();
  const { data: capacityIconUrl } = useCapacityIcon();
  const rawOccupancy = useOccupancy(space.countmatters_sensor_id);
  const rawGroupRoom = useGroupRoomAvailability(space.booking_room_number);
  const { data: occSettings } = useOccupancySettings();
  const settingsActive =
    (occSettings?.enabled ?? true) &&
    isWithinSchedule(occSettings?.schedule ?? DEFAULT_SCHEDULE, new Date());
  const occupancyVisible = space.show_occupancy !== false && settingsActive;
  const occupancy = occupancyVisible ? rawOccupancy : null;
  const groupRoom = settingsActive ? rawGroupRoom : null;
  const { data: showDescriptionLabel } = useUiText("show_description");
  const { data: hideDescriptionLabel } = useUiText("hide_description");
  const layout = layoutOverride ?? layoutFromDb;

  const interactive = Boolean(filters && onFiltersChange);

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

  const isGrupprum =
    (space.lokaltyp ?? []).includes("Grupprum") ||
    (space.intent ?? []).includes("grupprum");

  // Intent chips on the card: enskilt / tillsammans only (skip on grupprum cards)
  const intentChips: { value: IntentValue; label: string }[] = !isGrupprum
    ? (space.intent ?? [])
        .filter((v): v is IntentValue => v === "enskilt" || v === "tillsammans")
        .map((v) => ({
          value: v,
          label: v === "enskilt" ? t("filters.intent_enskilt") : t("filters.intent_tillsammans"),
        }))
    : [];

  type CategoryChip = { category: string; value: string; key: string; label: string };
  const categoryChips: CategoryChip[] = [
    ...(space.noise ?? []).map((n) => ({
      category: "noise", value: n, key: `noise:${n}`, label: localizeChip("noise", n),
    })),
    ...space.equipment.map((e) => ({
      category: "equipment", value: e, key: `equipment:${e}`, label: localizeChip("equipment", e),
    })),
    ...space.facilities.map((f) => ({
      category: "facility", value: f, key: `facility:${f}`, label: localizeChip("facility", f),
    })),
  ];

  const isIntentSelected = (v: IntentValue) => filters?.workMode === v;
  const isCategorySelected = (cat: string, v: string) =>
    (filters?.byCategory?.[cat] ?? []).includes(v);

  const toggleIntent = (v: IntentValue) => {
    if (!filters || !onFiltersChange) return;
    const next = filters.workMode === v ? null : v;
    onFiltersChange({
      ...filters,
      workMode: next,
      groupSize: null,
    });
  };

  const toggleCategory = (cat: string, v: string) => {
    if (!filters || !onFiltersChange) return;
    const current = filters.byCategory[cat] ?? [];
    const nextArr = current.includes(v) ? current.filter((x) => x !== v) : [...current, v];
    onFiltersChange({
      ...filters,
      byCategory: { ...filters.byCategory, [cat]: nextArr },
    });
  };

  const metaParts = [
    localizedFloor,
    localizedLocatedIn,
    ...(space.lokaltyp ?? []).map((l) => localizeChip("lokaltyp", l)),
  ].filter((s): s is string => Boolean(s && s.length > 0));

  const showCapacity =
    space.show_capacity_publicly && (space.capacity ?? 0) > 0;

  const chipBase =
    "inline-flex items-center gap-1.5 text-xs rounded-md px-2 py-1 max-w-full transition-colors";
  const chipUnselected = "text-muted-foreground bg-secondary/60";
  const chipSelected =
    "bg-primary text-primary-foreground [&_img]:brightness-0 [&_img]:invert";

  const renderSection = (key: CardSectionKey, idx: number) => {
    const spacing = idx === 0 ? "" : "mt-2";
    switch (key) {
      case "header":
        return (
          <div key="header" className={cn(spacing)}>
            <div className="text-left">
              <h3 className="text-lg font-semibold leading-tight">
                {localizedName}
              </h3>
            </div>
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
            {occupancy && (
              <OccupancyBadge level={occupancy.level} status={occupancy.status} />
            )}
            {groupRoom && <GroupRoomBadge status={groupRoom.status} />}

          {localizedNotice && (
              <div
                role="status"
                className="mt-2 mb-1 flex items-start gap-2 bg-amber-100 text-amber-900 border border-amber-200 rounded-md px-3 py-2 text-sm"
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
        if (intentChips.length === 0 && categoryChips.length === 0) return null;
        return (
          <div key="chips" className={cn(spacing, "mb-2 md:mb-3 flex flex-wrap items-center gap-2")}>
            {intentChips.map((c) => {
              const selected = isIntentSelected(c.value);
              const Icon = c.value === "enskilt" ? User : Users;
              const content = (
                <>
                  <Icon className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                  <span className="break-words">{c.label}</span>
                  {interactive && selected && (
                    <X className="h-3 w-3 shrink-0 opacity-80" aria-hidden="true" />
                  )}
                </>
              );
              return interactive ? (
                <button
                  key={`intent:${c.value}`}
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleIntent(c.value);
                  }}
                  aria-pressed={selected}
                  className={cn(chipBase, selected ? chipSelected : chipUnselected, "hover:bg-accent")}
                  title={selected ? t("chips.remove_aria", { label: c.label }) : c.label}
                >
                  {content}
                </button>
              ) : (
                <span key={`intent:${c.value}`} className={cn(chipBase, chipUnselected)}>
                  {content}
                </span>
              );
            })}
            {categoryChips.map((c) => {
              const opt = lookup.get(c.key);
              if (!opt) return null;
              const selected = isCategorySelected(c.category, c.value);
              const content = (
                <>
                  <OptionIcon option={opt} className="h-3.5 w-3.5 shrink-0" />
                  <span className="break-words">{c.label}</span>
                  {interactive && selected && (
                    <X className="h-3 w-3 shrink-0 opacity-80" aria-hidden="true" />
                  )}
                </>
              );
              return interactive ? (
                <button
                  key={c.key}
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleCategory(c.category, c.value);
                  }}
                  aria-pressed={selected}
                  className={cn(chipBase, selected ? chipSelected : chipUnselected, "hover:bg-accent")}
                  title={selected ? t("chips.remove_aria", { label: c.label }) : c.label}
                >
                  {content}
                </button>
              ) : (
                <span key={c.key} title={c.label} className={cn(chipBase, chipUnselected)}>
                  {content}
                </span>
              );
            })}
          </div>
        );
      case "button_map":
      case "button_group_booking":
      case "button_booking":
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
        if (!localizedGroupBookingUrl) return null;
        return (
          <a
            key="button_group_booking"
            href={localizedGroupBookingUrl}
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
    <article className="bg-card rounded-2xl border border-border overflow-hidden transition-all hover:shadow-md">
        <div className="flex flex-col md:flex-row items-stretch gap-3 md:gap-4">
          <div className="order-2 md:order-1 flex-1 min-w-0 flex flex-col p-3 md:p-4">
          {layout.map((k, i) => renderSection(k, i))}

          <div className="mt-auto pt-2 md:pt-3 flex items-center justify-between gap-3 flex-wrap">
            {sanitizedDescription ? (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setOpen((o) => !o);
                }}
                aria-expanded={open}
                className="inline-flex items-center text-xs text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-primary rounded"
              >
                <ChevronDown
                  className={cn("h-4 w-4 transition-transform", open && "rotate-180")}
                  aria-hidden="true"
                />
                <span className="ml-1">{open ? (hideDescriptionLabel ?? t("card.hide_description")) : (showDescriptionLabel ?? t("card.show_description"))}</span>
              </button>
            ) : (
              <span />
            )}
            {renderedButtons.length > 0 && (
              <div className="flex flex-wrap items-center gap-2 ml-auto">
                {renderedButtons}
              </div>
            )}
          </div>
        </div>

        <div className="order-1 md:order-2 w-full md:w-72 lg:w-80 shrink-0 self-stretch h-40 md:h-auto md:aspect-[4/3] overflow-hidden rounded-t-2xl md:rounded-t-none md:rounded-r-2xl">
          <ImageCarousel
            images={images}
            alts={space.image_alts ?? []}
            alt={localizedName}
            priority={priority}
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
          <div className="px-3 pb-4 pt-1 md:px-4 md:pb-5 border-t border-border/60">
            <div
              className="text-sm text-foreground/80 leading-relaxed pt-3 space-y-2 [&_a]:text-[var(--kth-blue)] [&_a]:underline [&_a:hover]:opacity-80 [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5 whitespace-pre-line"
              dangerouslySetInnerHTML={{ __html: sanitizedDescription }}
            />
          </div>
        </div>
      </div>
    </article>
  );
}

const OCCUPANCY_LABELS: Record<OccupancyStatus, string> = {
  free: "occupancy.free",
  moderate: "occupancy.moderate",
  busy: "occupancy.busy",
};

function OccupancyBlocks({ level }: { level: 1 | 2 | 3 }) {
  return (
    <div className="flex items-center gap-[2px]" aria-hidden="true">
      {[1, 2, 3].map((i) => (
        <div
          key={i}
          className={cn(
            "w-5 h-2 rounded-sm",
            i <= level ? "bg-[#1954a6]" : "bg-gray-200"
          )}
        />
      ))}
    </div>
  );
}

function OccupancyBadge({
  level,
  status,
}: {
  level: 1 | 2 | 3;
  status: OccupancyStatus;
}) {
  const { t } = useTranslation();
  return (
    <div className="flex items-center gap-1.5 md:gap-2 mb-2 md:mb-3 mt-0.5 md:mt-1">
      <Users className="h-4 w-4 text-gray-600" aria-hidden="true" />
      <OccupancyBlocks level={level} />
      <span className="text-sm text-gray-700">
        <strong>{t("occupancy.right_now")}:</strong>{" "}
        {t(OCCUPANCY_LABELS[status])}
      </span>
    </div>
  );
}


const GROUP_ROOM_LABELS: Record<GroupRoomStatus, string> = {
  free: "group_room.free",
  busy: "group_room.busy",
  tentative: "group_room.tentative",
};

function GroupRoomBadge({ status }: { status: GroupRoomStatus }) {
  const { t } = useTranslation();
  const Icon = status === "free" ? DoorOpen : DoorClosed;
  const dotClass =
    status === "free"
      ? "bg-emerald-500"
      : status === "tentative"
      ? "bg-amber-400"
      : "bg-red-500";
  return (
    <div className="flex items-center gap-1.5 md:gap-2 mb-2 md:mb-3 mt-0.5 md:mt-1">
      <Icon className="h-4 w-4 text-gray-600" aria-hidden="true" />
      <span className={cn("inline-block h-2.5 w-2.5 rounded-full", dotClass)} aria-hidden="true" />
      <span className="text-sm text-gray-700">
        <strong>{t("group_room.right_now")}:</strong>{" "}
        {t(GROUP_ROOM_LABELS[status])}
      </span>
    </div>
  );
}
