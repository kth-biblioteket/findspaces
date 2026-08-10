import { Eye, EyeOff, GripVertical, ImageOff, Trash2 } from "lucide-react";
import { optimizedImageUrl } from "@/lib/imageUrl";
import { type Space } from "@/lib/spaces";
import { useFilterCategories } from "@/lib/useFilterCategories";
import { useFilterOptions } from "@/lib/useFilterOptions";
import { cn } from "@/lib/utils";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { ContentBadges } from "./shared";

export function SortableSpaceRow({
  space,
  selected,
  compact = false,
  dragDisabled = false,
  onToggleSelected,
  onEdit,
  onDelete,
  onToggleHidden,
}: {
  space: Space;
  selected: boolean;
  compact?: boolean;
  dragDisabled?: boolean;
  onToggleSelected: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onToggleHidden: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: space.id,
    disabled: dragDisabled,
  });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const { data: filterOptions = [] } = useFilterOptions();
  const { data: categories = [] } = useFilterCategories();
  const kind = space.space_kind ?? "study";
  const kindCatKey = categories.find((c) => c.special_kind === "space_kind")?.key;
  const kindOpt = kindCatKey ? filterOptions.find((o) => o.category === kindCatKey && o.value_key === kind) : undefined;
  const kindClsByValue: Record<string, string> = {
    service:
      "bg-emerald-100 text-emerald-900 border-emerald-300 dark:bg-emerald-950/40 dark:text-emerald-200 dark:border-emerald-800",
    creative:
      "bg-violet-100 text-violet-900 border-violet-300 dark:bg-violet-950/40 dark:text-violet-200 dark:border-violet-800",
    study: "bg-primary/10 text-primary border-primary/30",
  };
  const kindMeta = {
    label:
      kindOpt?.label ??
      (kind === "service" ? "Service & faciliteter" : kind === "creative" ? "Skapande & paus" : "Studieplatser"),
    cls: kindClsByValue[kind] ?? "bg-primary/10 text-primary border-primary/30",
  };

  const locationBits: string[] = [];
  if (space.floor) locationBits.push(`Plan ${space.floor}`);
  if (space.located_in) locationBits.push(space.located_in);

  const typeChips = space.lokaltyp ?? [];
  const noiseChips = space.noise ?? [];

  const thumbRawUrl = space.images?.[0] ?? space.image_url ?? null;
  const thumbSize = compact ? 60 : 96; // width in px (3:2 ratio)
  const thumbUrl = thumbRawUrl
    ? optimizedImageUrl(thumbRawUrl, thumbSize * 2, { resize: "contain", aspect: null })
    : null;

  // Stop propagation so clicks on interactive elements inside the card
  // don't also trigger the card's onEdit.
  const stop = (e: React.MouseEvent | React.KeyboardEvent) => e.stopPropagation();

  const handleCardKey = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      onEdit();
    }
  };

  return (
    <li
      ref={setNodeRef}
      style={style}
      className={cn(
        "bg-card rounded-2xl border transition-colors",
        space.hidden && "opacity-60",
        selected ? "border-primary/60 ring-1 ring-primary/40" : "border-border hover:border-primary/40",
      )}
    >
      <div
        role="button"
        tabIndex={0}
        onClick={onEdit}
        onKeyDown={handleCardKey}
        aria-label={`Redigera ${space.name}`}
        className={cn(
          "flex items-stretch gap-2 rounded-2xl cursor-pointer hover:bg-accent/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
          compact ? "p-2" : "p-3 sm:p-4",
        )}
      >
        {/* Left rail: drag + select */}
        <div className="flex flex-col items-center gap-1 pt-1" onClick={stop}>
          <button
            {...attributes}
            {...listeners}
            type="button"
            disabled={dragDisabled}
            onClick={stop}
            className={cn(
              "h-8 w-8 inline-flex items-center justify-center rounded-md text-muted-foreground touch-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              dragDisabled ? "opacity-30 cursor-not-allowed" : "hover:bg-accent cursor-grab active:cursor-grabbing",
            )}
            aria-label={dragDisabled ? "Omordning inaktiverad med aktivt filter" : `Dra för att flytta ${space.name}`}
            title={dragDisabled ? "Rensa filter för att sortera om" : undefined}
          >
            <GripVertical className="h-4 w-4" aria-hidden="true" />
          </button>
          <input
            type="checkbox"
            aria-label={`Markera ${space.name}`}
            checked={selected}
            onClick={stop}
            onChange={onToggleSelected}
            className="h-4 w-4"
          />
        </div>

        {/* Thumbnail — 3:2 to match original photo ratio */}
        <div
          className={cn(
            "relative shrink-0 overflow-hidden rounded-lg bg-muted border border-border aspect-[3/2]",
            compact ? "h-10" : "h-16",
          )}
          aria-hidden="true"
        >
          {thumbUrl ? (
            <img src={thumbUrl} alt="" loading="lazy" className="absolute inset-0 h-full w-full object-contain" />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center">
              <ImageOff
                className={cn("text-muted-foreground/60", compact ? "h-4 w-4" : "h-5 w-5")}
                aria-hidden="true"
              />
            </div>
          )}
        </div>

        {/* Main content */}
        <div className="flex-1 min-w-0 flex flex-col gap-2">
          <div className="flex items-start justify-between gap-3 flex-wrap">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <h3
                  className={cn(
                    "font-semibold text-foreground break-words",
                    compact ? "text-sm" : "text-lg leading-snug",
                  )}
                >
                  {space.name}
                </h3>
                <span
                  className={cn(
                    "inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium",
                    kindMeta.cls,
                  )}
                >
                  {kindMeta.label}
                </span>
                {space.hidden && (
                  <span className="inline-flex items-center gap-1 rounded-full border border-amber-300 bg-amber-100 px-2 py-0.5 text-[11px] font-medium text-amber-900 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-200">
                    <EyeOff className="h-3 w-3" aria-hidden="true" /> Dold
                  </span>
                )}
              </div>
              {(locationBits.length > 0 || space.slug !== undefined) && (
                <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-muted-foreground">
                  {locationBits.map((b, i) => (
                    <span key={i} className="inline-flex items-center gap-1">
                      {i > 0 && (
                        <span aria-hidden="true" className="opacity-40">
                          ·
                        </span>
                      )}
                      {b}
                    </span>
                  ))}
                  {!compact &&
                    (space.slug ? (
                      <span className="inline-flex items-center gap-1">
                        {locationBits.length > 0 && (
                          <span aria-hidden="true" className="opacity-40">
                            ·
                          </span>
                        )}
                        slug:{" "}
                        <code className="bg-secondary px-1 py-0.5 rounded font-mono text-[11px]">{space.slug}</code>
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 italic">
                        {locationBits.length > 0 && (
                          <span aria-hidden="true" className="opacity-40">
                            ·
                          </span>
                        )}
                        ingen slug
                      </span>
                    ))}
                </div>
              )}
              {!compact && (typeChips.length > 0 || noiseChips.length > 0) && (
                <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                  {typeChips.map((t) => (
                    <span
                      key={`type-${t}`}
                      className="inline-flex items-center rounded-full border border-border bg-secondary/60 px-2 py-0.5 text-[11px] text-foreground"
                    >
                      {t}
                    </span>
                  ))}
                  {noiseChips.map((n) => (
                    <span
                      key={`noise-${n}`}
                      className="inline-flex items-center rounded-full border border-border bg-transparent px-2 py-0.5 text-[11px] text-muted-foreground"
                    >
                      Ljud: {n}
                    </span>
                  ))}
                </div>
              )}
            </div>

            <div className="flex items-center gap-1 shrink-0" onClick={stop}>
              <button
                type="button"
                onClick={(e) => {
                  stop(e);
                  onToggleHidden();
                }}
                className="min-h-9 min-w-9 inline-flex items-center justify-center rounded-md hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                aria-label={space.hidden ? `Visa ${space.name} igen` : `Dölj ${space.name}`}
                title={space.hidden ? "Visa igen" : "Dölj lokalen"}
              >
                {space.hidden ? (
                  <Eye className="h-4 w-4" aria-hidden="true" />
                ) : (
                  <EyeOff className="h-4 w-4" aria-hidden="true" />
                )}
              </button>
              <button
                type="button"
                onClick={(e) => {
                  stop(e);
                  onDelete();
                }}
                disabled={!space.hidden}
                className={cn(
                  "min-h-9 min-w-9 inline-flex items-center justify-center rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                  space.hidden
                    ? "hover:bg-destructive/10 text-destructive"
                    : "text-muted-foreground/40 cursor-not-allowed",
                )}
                aria-label={
                  space.hidden ? `Ta bort ${space.name}` : `Dölj lokalen först för att kunna ta bort ${space.name}`
                }
                title={space.hidden ? "Ta bort permanent" : "Dölj lokalen först för att kunna ta bort den"}
              >
                <Trash2 className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>
          </div>

          {!compact && <ContentBadges space={space} />}
        </div>
      </div>
    </li>
  );
}

