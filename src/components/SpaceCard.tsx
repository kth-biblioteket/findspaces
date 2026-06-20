import { useState, useMemo, useEffect, useCallback } from "react";
import DOMPurify from "dompurify";
import { ChevronDown, MapPin, Calendar, Info, Users, User, X, DoorOpen, DoorClosed, AlertTriangle } from "lucide-react";
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
import { track } from "@/lib/analytics";
import { type Filters } from "./FilterPanel";
import { parseSpaceLinks } from "@/lib/spaceLinks";


type IntentValue = "enskilt" | "tillsammans";

export function SpaceCard({
  space,
  layoutOverride,
  filters,
  onFiltersChange,
  priority = false,
  spaces,
  highlightId,
  highlightTick,
  onSpaceLink,
}: {
  space: Space;
  /** Optional override for live preview in admin. */
  layoutOverride?: CardSectionKey[];
  filters?: Filters;
  onFiltersChange?: (next: Filters) => void;
  /** Eagerly load the image (use for above-the-fold cards). */
  priority?: boolean;
  spaces?: Space[];
  highlightId?: string;
  highlightTick?: number;
  onSpaceLink?: (id: string) => void;
}) {
  const { t, i18n } = useTranslation();
  const lang = (i18n.resolvedLanguage ?? "sv") as Lang;
  const [open, setOpen] = useState(false);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);
  const [highlighted, setHighlighted] = useState(false);
  const { data: options = [] } = useFilterOptions();
  const { data: layoutFromDb = ["header", "notice", "info", "chips", "button_map", "button_group_booking", "button_booking"] } = useCardLayout();
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

  useEffect(() => {
    if (highlightId && (highlightId === space.id || highlightId === space.slug)) {
      setOpen(true);
      setHighlighted(true);
      const el = document.getElementById(`space-${space.id}`);
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "center" });
      }
      const timer = setTimeout(() => setHighlighted(false), 2500);
      return () => clearTimeout(timer);
    }
  }, [highlightId, highlightTick, space.id, space.slug]);

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
  const localizedInfo = pickLocalized(space, "info", lang);
  const localizedFloor = pickLocalized(space, "floor", lang);
  const localizedLocatedIn = pickLocalized(space, "located_in", lang);
  const localizedGroupBookingUrl =
    pickLocalized(space, "group_booking_url", lang) || space.group_booking_url || "";

  const bookNowUrl = useMemo(() => {
    const template =
      (lang === "en" && space.book_now_url_en?.trim())
        ? space.book_now_url_en
        : space.book_now_url ?? "";
    if (!template) return "";
    if (template.includes("{room}") && space.booking_room_number == null) return "";
    const now = new Date();
    return template
      .replaceAll("{room}", space.booking_room_number != null ? String(space.booking_room_number) : "")
      .replaceAll("{year}", String(now.getFullYear()))
      .replaceAll("{month}", String(now.getMonth() + 1))
      .replaceAll("{day}", String(now.getDate()))
      .replaceAll("{hour}", String(now.getHours()))
      .replaceAll("{minute}", "0");
  }, [lang, space.book_now_url, space.book_now_url_en, space.booking_room_number, groupRoom?.status]);

  const localizedAlts = useMemo(() => {
    const sv = space.image_alts ?? [];
    const en = space.image_alts_en ?? [];
    if (lang !== "en") return sv;
    return sv.map((s, i) => {
      const e = en[i];
      return e && e.trim().length > 0 ? e : s;
    });
  }, [lang, space.image_alts, space.image_alts_en]);

  const handleSpaceLink = useCallback(
    (id: string) => {
      track("space_link_click", { source_id: space.id, target_id: id });
      onSpaceLink?.(id);
    },
    [space.id, onSpaceLink],
  );

  const linkedNotice = useMemo(() => {
    if (!localizedNotice || !spaces || !onSpaceLink) return localizedNotice;
    return parseSpaceLinks(localizedNotice, spaces, lang, handleSpaceLink);
  }, [localizedNotice, spaces, lang, handleSpaceLink]);

  const linkedInfo = useMemo(() => {
    if (!localizedInfo || !spaces || !onSpaceLink) return localizedInfo;
    return parseSpaceLinks(localizedInfo, spaces, lang, handleSpaceLink);
  }, [localizedInfo, spaces, lang, handleSpaceLink]);

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

  const floorPart = localizedFloor;
  const otherMetaParts = [
    localizedLocatedIn,
    ...(space.lokaltyp ?? []).map((l) => localizeChip("lokaltyp", l)),
  ].filter((s): s is string => Boolean(s && s.length > 0));

  const hasMeta = Boolean(floorPart) || otherMetaParts.length > 0;

  const showCapacity =
    space.show_capacity_publicly && (space.capacity ?? 0) > 0;

  const chipBase =
    "inline-flex items-center gap-1.5 text-xs rounded-md px-2 py-1 max-w-full transition-colors";
  const chipUnselected = "text-muted-foreground bg-secondary/60";
  const chipSelected =
    "bg-primary text-primary-foreground [&_img]:brightness-0 [&_img]:invert";

  const renderSection = (key: CardSectionKey, idx: number) => {
    const spacing = idx === 0 ? "" : "mt-3 md:mt-2";
    switch (key) {
      case "header":
        return (
          <div key="header" className={cn(spacing)}>
            <div className="text-left">
              <h3 id={`space-${space.id}-title`} className="text-lg md:text-xl font-semibold leading-tight">
                {localizedName}
              </h3>
            </div>
            {hasMeta && (
              <div className="mt-1.5 flex flex-col md:flex-row md:items-baseline gap-0.5 md:gap-1 text-sm text-foreground leading-snug">
                {floorPart && (
                  <span className="inline-flex items-center gap-1 text-foreground font-medium">
                    <MapPin className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                    {floorPart}
                  </span>
                )}
                {floorPart && otherMetaParts.length > 0 && (
                  <span className="hidden md:inline text-foreground/40 mx-0.5" aria-hidden="true">|</span>
                )}
                {otherMetaParts.length > 0 && (
                  <span>{otherMetaParts.join(" • ")}</span>
                )}
              </div>
            )}
            {showCapacity && (
              <p className="mt-1 inline-flex items-end gap-1.5 text-sm text-foreground">
                <ChairIcon className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                <span>
                  <span className="sr-only">{t("card.capacity_sr")} </span>
                  {space.capacity} {t("card.capacity_seats")}
                </span>
              </p>
            )}
            {occupancy && (
              <OccupancyBadge level={occupancy.level} status={occupancy.status} />
            )}
            {groupRoom && (
              <GroupRoomBadge
                status={groupRoom.status}
                bookingUrl={bookNowUrl || null}
              />
            )}


          </div>
        );
      case "notice":
        if (!linkedNotice) return null;
        return (
          <div
            key="notice"
            role="status"
            className={cn(spacing, "flex items-start gap-2 bg-[hsl(48_100%_85%)] text-foreground rounded-lg px-3 py-2 text-sm")}
          >
            <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0 text-orange-500" aria-hidden="true" />
            <span className="whitespace-pre-line">
              <span className="sr-only">{t("card.notice_sr")} </span>
              {linkedNotice}
            </span>
          </div>
        );
      case "info":
        if (!linkedInfo) return null;
        return (
          <div key="info" className={cn(spacing, "flex items-start gap-2 text-sm text-foreground/80")}>
            <Info className="h-3.5 w-3.5 mt-0.5 shrink-0 text-muted-foreground" aria-hidden="true" />
            <span className="whitespace-pre-line">{linkedInfo}</span>
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
    "inline-flex items-center gap-1.5 rounded-full bg-[var(--kth-blue)] text-white px-4 py-1.5 text-xs font-semibold hover:bg-[var(--kth-blue)]/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-primary transition-colors";

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
            onClick={(e) => {
              e.stopPropagation();
              track("map_link_click", { space_id: space.id, name: space.name });
            }}
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
            onClick={(e) => {
              e.stopPropagation();
              track("booking_link_click", { space_id: space.id, name: space.name, kind: "group_booking" });
            }}
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
            onClick={(e) => {
              e.stopPropagation();
              track("booking_link_click", { space_id: space.id, name: space.name, kind: "booking" });
            }}
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
      id={`space-${space.id}`}
      aria-labelledby={`space-${space.id}-title`}
      className={cn(
        "bg-card rounded-2xl border border-border overflow-hidden transition-all hover:shadow-md",
        highlighted && "space-highlight",
      )}
    >
        <div className="flex flex-col md:flex-row items-stretch gap-0 md:gap-3">
          <div className="order-2 md:order-1 flex-1 min-w-0 flex flex-col p-3 md:p-3">
          {layout.map((k, i) => renderSection(k, i))}



          <div className="mt-auto pt-2 md:pt-2 flex items-center justify-between gap-3 flex-wrap">
            {sanitizedDescription ? (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setOpen((o) => {
                    const next = !o;
                    if (next) track("card_expand", { space_id: space.id, name: space.name });
                    return next;
                  });
                }}
                aria-expanded={open}
                aria-controls={`space-${space.id}-description`}
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

        <div className="order-1 md:order-2 w-full md:w-56 lg:w-64 shrink-0 self-stretch aspect-[3/2] md:aspect-[3/2] md:h-auto overflow-hidden rounded-t-2xl md:rounded-t-none md:rounded-r-2xl">
          <ImageCarousel
            images={images}
            alts={localizedAlts}
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
        alts={localizedAlts}
        initialIndex={lightboxIndex}
        open={lightboxOpen}
        onClose={() => setLightboxOpen(false)}
      />

      <div
        id={`space-${space.id}-description`}
        // @ts-expect-error inert is a valid HTML attribute (React 19) but typings lag
        inert={!open ? "" : undefined}
        aria-hidden={!open}
        className={cn(
          "grid transition-all duration-300 ease-out",
          open ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
        )}
      >
        <div className="overflow-hidden">
          <div className="px-3 pb-3 pt-1 md:px-3.5 md:pb-4 border-t border-border/60">
            <div
              className="text-sm text-foreground/80 leading-relaxed pt-2 space-y-2 [&_a]:text-[var(--kth-blue)] [&_a]:underline [&_a:hover]:opacity-80 [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5 whitespace-pre-line"
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
            i <= level ? "bg-[var(--kth-blue)]" : "bg-muted"
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
    <div className="flex items-center gap-1.5 md:gap-2 mb-1.5 md:mb-2 mt-0.5 md:mt-0.5">
      <Users className="h-4 w-4 text-foreground" aria-hidden="true" />
      <OccupancyBlocks level={level} />
      <span className="text-sm text-foreground">
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

function GroupRoomBadge({
  status,
  bookingUrl,
}: {
  status: GroupRoomStatus;
  bookingUrl?: string | null;
}) {
  const { t } = useTranslation();
  const Icon = status === "free" ? DoorOpen : DoorClosed;
  const dotClass =
    status === "free"
      ? "bg-emerald-500"
      : status === "tentative"
      ? "bg-amber-400"
      : "bg-red-500";
  return (
    <div className="flex items-center gap-1.5 md:gap-2 mb-1.5 md:mb-2 mt-0.5 md:mt-0.5 flex-wrap">
      <Icon className="h-4 w-4 text-foreground" aria-hidden="true" />
      <span className={cn("inline-block h-2.5 w-2.5 rounded-full", dotClass)} aria-hidden="true" />
      <span className="text-sm text-foreground">
        <strong>{t("group_room.right_now")}:</strong>{" "}
        {t(GROUP_ROOM_LABELS[status])}
      </span>
      {status === "free" && bookingUrl && (
        <a
          href={bookingUrl}
          target="_blank"
          rel="noopener noreferrer"
          onClick={(e) => e.stopPropagation()}
          className="ml-1 inline-flex items-center gap-1 rounded-full border border-emerald-600 bg-emerald-50 text-emerald-800 px-3 py-0.5 text-xs font-semibold hover:bg-emerald-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-emerald-600 transition-colors"
        >
          <span>{t("card.book_now")}</span>
          <span aria-hidden="true">→</span>
          <span className="sr-only">{t("card.opens_new_tab_sr")}</span>
        </a>
      )}
    </div>
  );
}

