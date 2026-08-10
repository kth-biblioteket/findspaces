import { useState, useEffect, useId, isValidElement, cloneElement, Children, type ReactElement } from "react";
import { AlertTriangle, Armchair, CalendarClock, GripVertical, ImageIcon, Info, MapPin, Monitor, Upload, Users, X, Zap } from "lucide-react";
import { OptionIcon } from "@/components/OptionIcon";
import { TableChairIcon } from "@/components/icons/TableChairIcon";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { supabase } from "@/integrations/supabase/client";
import { type FilterCategoryRow, type FilterOption, type Space } from "@/lib/spaces";
import { useCapacityIcon, useSaveCapacityIcon } from "@/lib/useCapacityIcon";
import { useFilterCategories } from "@/lib/useFilterCategories";
import { useFilterOptions } from "@/lib/useFilterOptions";
import { optimizedImageUrl } from "@/lib/imageUrl";
import { cn } from "@/lib/utils";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { toast } from "sonner";

export function LinkSyntaxHelp({ slug }: { slug?: string }) {
  const example = slug || "maxwell";
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="inline-flex items-center gap-1 text-[11px] font-normal text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded"
          aria-label="Visa länksyntax"
        >
          <Info className="h-3 w-3" /> Länksyntax
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-80 text-xs leading-relaxed">
        <div className="space-y-2">
          <div>
            <div className="font-semibold mb-1">Länk till annat kort</div>
            <code className="block bg-secondary rounded px-2 py-1 font-mono text-[11px] whitespace-pre-wrap break-all">
              [[{example}|valfri text]]
            </code>
          </div>
          <div>
            <div className="font-semibold mb-1">Länk till webbsida</div>
            <code className="block bg-secondary rounded px-2 py-1 font-mono text-[11px] whitespace-pre-wrap break-all">{`<a href="https://kth.se">KTH</a>`}</code>
            <p className="mt-1 text-muted-foreground">Länkar öppnas i ny flik automatiskt.</p>
          </div>
          <div className="text-muted-foreground">
            Tillåtna taggar: <code>&lt;a&gt;</code>, <code>&lt;b&gt;</code>, <code>&lt;strong&gt;</code>,{" "}
            <code>&lt;i&gt;</code>, <code>&lt;em&gt;</code>, <code>&lt;br&gt;</code>, <code>&lt;p&gt;</code>,{" "}
            <code>&lt;ul&gt;</code>, <code>&lt;ol&gt;</code>, <code>&lt;li&gt;</code>.
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}

export function Field({ label, children }: { label: React.ReactNode; children: React.ReactNode }) {
  const id = useId();
  const arr = Children.toArray(children);
  const onlyChild = arr.length === 1 ? arr[0] : null;
  const isFormControl =
    isValidElement(onlyChild) &&
    typeof onlyChild.type === "string" &&
    ["input", "textarea", "select"].includes(onlyChild.type);

  if (isFormControl) {
    const child = onlyChild as ReactElement<{ id?: string }>;
    return (
      <div>
        <label htmlFor={id} className="block text-sm font-medium mb-1.5">
          {label}
        </label>
        {cloneElement(child, { id: child.props.id ?? id })}
      </div>
    );
  }

  // Group of controls — associate with an accessible name via role=group.
  const labelId = `${id}-label`;
  return (
    <div role="group" aria-labelledby={labelId}>
      <span id={labelId} className="block text-sm font-medium mb-1.5">
        {label}
      </span>
      {children}
    </div>
  );
}


export type ContentField = {
  key: string;
  label: string;
  Icon: typeof Info;
  sv: string | null | undefined;
  en: string | null | undefined;
};

export function ContentBadges({ space }: { space: Space }) {
  const { data: capacityIconUrl } = useCapacityIcon();
  const fields: ContentField[] = [
    {
      key: "notice",
      label: "Tillfällig viktig information",
      Icon: AlertTriangle,
      sv: space.notice,
      en: space.notice_en,
    },
    { key: "info", label: "Information på kortet", Icon: Info, sv: space.info, en: space.info_en },
    { key: "map", label: "Karta", Icon: MapPin, sv: space.map_url, en: space.map_url_en },
    { key: "booking", label: "Bokningsschema", Icon: CalendarClock, sv: space.booking_url, en: space.booking_url_en },
    { key: "group", label: "Boka grupprum", Icon: Users, sv: space.group_booking_url, en: space.group_booking_url_en },
    { key: "book", label: "Boka nu", Icon: Zap, sv: space.book_now_url, en: space.book_now_url_en },
  ];
  const imgCount = space.images?.length ?? 0;
  const contentChips = fields
    .map((f) => {
      const hasSv = !!(f.sv && String(f.sv).trim());
      const hasEn = !!(f.en && String(f.en).trim());
      if (!hasSv && !hasEn) return null;
      const both = hasSv && hasEn;
      const svOnly = hasSv && !hasEn;
      const title = both
        ? `${f.label}: SV + EN`
        : svOnly
          ? `${f.label}: endast SV (visas även på engelska kortet)`
          : `${f.label}: endast EN`;
      const cls = svOnly
        ? "bg-amber-100 text-amber-900 border-amber-300 dark:bg-amber-950/40 dark:text-amber-200 dark:border-amber-800"
        : "bg-secondary text-foreground border-border";
      return (
        <span
          key={f.key}
          title={title}
          aria-label={title}
          className={cn("inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium", cls)}
        >
          <f.Icon className="h-3 w-3" aria-hidden="true" />
          <span className="tabular-nums">{both ? "SV·EN" : svOnly ? "SV" : "EN"}</span>
        </span>
      );
    })
    .filter(Boolean);

  const seats: { key: string; count: number; label: string; Icon: React.ComponentType<{ className?: string }> }[] = [
    { key: "study", count: space.capacity ?? 0, label: "studieplatser", Icon: TableChairIcon },
    { key: "informal", count: space.informal_seat_count ?? 0, label: "nedslagsplatser", Icon: Armchair },
    { key: "computers", count: space.computer_count ?? 0, label: "datorplatser", Icon: Monitor },
  ].filter((c) => c.count > 0);

  if (contentChips.length === 0 && seats.length === 0 && imgCount === 0) {
    return <span className="text-xs italic text-muted-foreground">— Inget innehåll ännu</span>;
  }

  return (
    <div className="flex flex-col gap-1.5">
      {(contentChips.length > 0 || imgCount > 0) && (
        <div className="flex flex-wrap gap-1.5 items-center">
          <span className="text-[11px] uppercase tracking-wide text-muted-foreground mr-1">Innehåll</span>
          {contentChips}
          {imgCount > 0 && (
            <span
              title={`${imgCount} foto${imgCount === 1 ? "" : "n"} inlagda`}
              aria-label={`${imgCount} foton inlagda`}
              className="inline-flex items-center gap-1 rounded-full border border-border bg-secondary text-foreground px-2 py-0.5 text-[11px] font-medium"
            >
              <ImageIcon className="h-3 w-3" aria-hidden="true" />
              <span className="tabular-nums">{imgCount}</span>
            </span>
          )}
        </div>
      )}
      {seats.length > 0 && (
        <div className="flex flex-wrap gap-1.5 items-center">
          <span className="text-[11px] uppercase tracking-wide text-muted-foreground mr-1">Platser</span>
          {seats.map((c) => (
            <span
              key={c.key}
              title={`${c.count} ${c.label}`}
              aria-label={`${c.count} ${c.label}`}
              className="inline-flex items-center gap-1 rounded-full border border-primary/30 bg-primary/10 text-primary px-2 py-0.5 text-[11px] font-medium"
            >
              {c.key === "study" && capacityIconUrl ? (
                <img src={capacityIconUrl} alt="" className="h-3 w-3 object-contain" />
              ) : (
                <c.Icon className="h-3 w-3" />
              )}
              <span className="tabular-nums">{c.count}</span>
              <span className="text-[10px] opacity-80">{c.label}</span>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}


export function DynamicCategoryField({
  cat,
  options,
  values,
  onChange,
}: {
  cat: FilterCategoryRow;
  options: FilterOption[];
  values: string[];
  onChange: (v: string[]) => void;
}) {
  if (options.length === 0) return null;

  if (cat.is_single_select) {
    return (
      <Field label={cat.title}>
        <div className="flex gap-2 flex-wrap">
          {options.map((o) => {
            const active = values[0] === o.label;
            return (
              <button
                key={o.id}
                type="button"
                onClick={() => onChange(active ? [] : [o.label])}
                aria-pressed={active}
                className={cn(
                  "inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-sm border focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                  active ? "bg-primary text-primary-foreground border-primary" : "bg-secondary border-transparent",
                )}
              >
                <OptionIcon option={o} className="h-4 w-4" /> {o.label}
              </button>
            );
          })}
        </div>
      </Field>
    );
  }

  const toggle = (label: string) =>
    onChange(values.includes(label) ? values.filter((x) => x !== label) : [...values, label]);

  return (
    <Field label={cat.title}>
      <div className="flex flex-wrap gap-2">
        {options.map((o) => {
          const active = values.includes(o.label);
          return (
            <button
              key={o.id}
              type="button"
              onClick={() => toggle(o.label)}
              aria-pressed={active}
              className={cn(
                "inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-sm border focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                active ? "bg-primary text-primary-foreground border-primary" : "bg-secondary border-transparent",
              )}
            >
              <OptionIcon option={o} className="h-4 w-4" />
              {o.label}
            </button>
          );
        })}
      </div>
    </Field>
  );
}


export function SortableImageRow({
  id,
  url,
  index,
  altSv,
  altEn,
  uploadedAt,
  onAltSv,
  onAltEn,
  onRemove,
}: {
  id: string;
  url: string;
  index: number;
  altSv: string;
  altEn: string;
  uploadedAt?: string | null;
  onAltSv: (v: string) => void;
  onAltEn: (v: string) => void;
  onRemove: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };
  const dateLabel = uploadedAt
    ? new Date(uploadedAt).toLocaleDateString("sv-SE", { year: "numeric", month: "short", day: "numeric" })
    : null;
  const altSvId = useId();
  const altEnId = useId();
  return (
    <li ref={setNodeRef} style={style} className="flex gap-3 items-start rounded-lg border border-border p-2 bg-card">
      <button
        type="button"
        {...attributes}
        {...listeners}
        className="min-h-11 min-w-11 inline-flex items-center justify-center self-center text-muted-foreground rounded hover:bg-accent cursor-grab active:cursor-grabbing touch-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        aria-label={`Dra för att flytta bild ${index + 1}`}
      >
        <GripVertical className="h-4 w-4" aria-hidden="true" />
      </button>
      <div className="relative shrink-0">
        <img src={url} alt="" className="h-20 w-28 object-cover border border-border" />
        {index === 0 && (
          <span className="absolute top-1 left-1 text-[10px] font-semibold bg-primary text-primary-foreground rounded px-1.5 py-0.5">
            Primär
          </span>
        )}
      </div>
      <div className="flex-1 min-w-0 space-y-2">
        <div>
          <label htmlFor={altSvId} className="sr-only">
            Alt-text på svenska för bild {index + 1}
          </label>
          <input
            id={altSvId}
            value={altSv}
            onChange={(e) => onAltSv(e.target.value)}
            placeholder="Alt-text SV (beskriv bilden för skärmläsare)"
            className="w-full rounded-md border border-border bg-card px-2 py-1.5 text-xs"
          />
        </div>
        <div>
          <label htmlFor={altEnId} className="sr-only">
            Alt text in English for image {index + 1}
          </label>
          <input
            id={altEnId}
            value={altEn}
            onChange={(e) => onAltEn(e.target.value)}
            placeholder="Alt text EN (describe the image for screen readers – leave blank to fall back to Swedish)"
            className="w-full rounded-md border border-border bg-card px-2 py-1.5 text-xs"
          />
        </div>
        <div className="flex items-center justify-between">
          {dateLabel ? <span className="text-[10px] text-muted-foreground">Uppladdad: {dateLabel}</span> : <span />}
          <button
            type="button"
            onClick={onRemove}
            className="min-h-11 min-w-11 rounded bg-destructive/10 text-destructive inline-flex items-center justify-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            aria-label={`Ta bort bild ${index + 1}`}
          >
            <X className="h-3.5 w-3.5" aria-hidden="true" />
          </button>
        </div>
      </div>
    </li>
  );
}


export function SelectByLokaltyp({
  spaces,
  options,
  selectedIds,
  setSelectedIds,
}: {
  spaces: Space[];
  options: FilterOption[];
  selectedIds: Set<string>;
  setSelectedIds: React.Dispatch<React.SetStateAction<Set<string>>>;
}) {
  const matchesForLabel = (label: string) =>
    spaces.filter((s) => Array.isArray(s.lokaltyp) && s.lokaltyp.includes(label));

  const { data: kindCategories = [] } = useFilterCategories();
  const kindCatKeyForGroups = kindCategories.find((c) => c.special_kind === "space_kind")?.key;
  const kindOptsForGroups = kindCatKeyForGroups
    ? options.filter((o) => o.category === kindCatKeyForGroups && !o.hidden && o.value_key)
    : [];
  const kindGroups = kindOptsForGroups.map((o) => ({ key: o.value_key as string, label: o.label }));

  const toggleForMatches = (matches: Space[]) => {
    if (matches.length === 0) return;
    setSelectedIds((prev) => {
      const next = new Set(prev);
      const allSelected = matches.every((s) => next.has(s.id));
      if (allSelected) {
        for (const s of matches) next.delete(s.id);
      } else {
        for (const s of matches) next.add(s.id);
      }
      return next;
    });
  };

  const usable = options
    .map((o) => ({ opt: o, matches: matchesForLabel(o.label) }))
    .filter((x) => x.matches.length > 0);

  if (usable.length === 0 && spaces.length === 0) return null;

  return (
    <div className="rounded-xl border border-border bg-muted/40 p-3 space-y-2">
      <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Markera flera per typ</div>

      <div className="flex flex-wrap items-center gap-1.5">
        <span className="text-xs text-muted-foreground mr-1">Kategori:</span>
        {kindGroups.map((g) => {
          const matches = spaces.filter((s) => (s.space_kind ?? "study") === g.key);
          if (matches.length === 0) return null;
          const allSelected = matches.every((s) => selectedIds.has(s.id));
          return (
            <button
              key={g.key}
              type="button"
              onClick={() => toggleForMatches(matches)}
              aria-pressed={allSelected}
              className={cn(
                "inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs transition",
                allSelected
                  ? "bg-[var(--kth-blue)] text-white border-[var(--kth-blue)]"
                  : "bg-card text-foreground border-border hover:bg-accent",
              )}
            >
              {g.label}
              <span className="opacity-70">({matches.length})</span>
            </button>
          );
        })}
      </div>

      {usable.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-xs text-muted-foreground mr-1">Lokaltyp:</span>
          {usable.map(({ opt, matches }) => {
            const allSelected = matches.every((s) => selectedIds.has(s.id));
            return (
              <button
                key={opt.id}
                type="button"
                onClick={() => toggleForMatches(matches)}
                aria-pressed={allSelected}
                className={cn(
                  "inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs transition",
                  allSelected
                    ? "bg-[var(--kth-blue)] text-white border-[var(--kth-blue)]"
                    : "bg-card text-foreground border-border hover:bg-accent",
                )}
              >
                <OptionIcon option={opt} className="h-3.5 w-3.5" />
                {opt.label}
                <span className="opacity-70">({matches.length})</span>
              </button>
            );
          })}
        </div>
      )}

      <p className="text-[11px] text-muted-foreground">
        Klicka en pill för att markera alla lokaler med den typen. Klicka igen för att avmarkera dem. Använd sedan
        bulk-verktyget ovanför tabellen för att uppdatera flera lokaler samtidigt.
      </p>
    </div>
  );
}


export function ImageDropzone({
  disabled,
  busy,
  remaining,
  maxImages,
  onFiles,
}: {
  disabled: boolean;
  busy: boolean;
  remaining: number;
  maxImages: number;
  onFiles: (files: FileList | File[]) => void;
}) {
  const [dragOver, setDragOver] = useState(false);
  const inputId = useId();

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragOver(false);
    if (disabled) return;
    const files = e.dataTransfer.files;
    if (files && files.length > 0) onFiles(files);
  };

  return (
    <div className="space-y-2">
      <div
        onDragOver={(e) => {
          e.preventDefault();
          if (!disabled) setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        className={cn(
          "rounded-xl border-2 border-dashed p-4 text-center transition-colors",
          dragOver ? "border-primary bg-primary/5" : "border-border bg-secondary/40",
          disabled && "opacity-60 cursor-not-allowed",
        )}
      >
        <div className="flex flex-col items-center gap-2">
          <Upload className="h-6 w-6 text-muted-foreground" aria-hidden="true" />
          <div className="text-sm">
            <strong>Dra och släpp bilder här</strong> eller{" "}
            <label
              htmlFor={inputId}
              className={cn("underline cursor-pointer text-primary", disabled && "pointer-events-none")}
            >
              välj filer
            </label>
            .
          </div>
          <p className="text-xs text-muted-foreground">
            {busy
              ? "Bearbetar och laddar upp..."
              : remaining > 0
                ? `Upp till ${remaining} till (max ${maxImages} totalt).`
                : `Max ${maxImages} bilder har nåtts.`}
          </p>
          <input
            id={inputId}
            type="file"
            multiple
            accept="image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp"
            className="hidden"
            disabled={disabled}
            onChange={(e) => {
              const files = e.target.files;
              if (files && files.length > 0) onFiles(files);
              e.target.value = "";
            }}
          />
        </div>
      </div>
      <p className="text-xs text-muted-foreground leading-relaxed">
        <strong>Auto-crop:</strong> bilder beskärs automatiskt centrerat till <strong>3:2</strong> (1600×1067 px) och
        konverteras till WebP under ~250 kB. JPG, PNG och WebP godtas. Motivet bör vara centrerat — kanterna kan
        beskäras något i topp/botten på desktop beroende på hur mycket text kortet innehåller.
      </p>
    </div>
  );
}


export function LangPairEditor({
  labelSv,
  labelEn,
  rows,
  valueSv,
  valueEn,
  onSaveSv,
  onSaveEn,
  defaultSv,
  defaultEn,
  isPending,
  isLoading,
}: {
  labelSv: string;
  labelEn: string;
  rows: number;
  valueSv: string;
  valueEn: string;
  onSaveSv: (v: string) => void;
  onSaveEn: (v: string) => void;
  defaultSv?: string;
  defaultEn?: string;
  isPending: boolean;
  isLoading: boolean;
}) {
  const [sv, setSv] = useState(valueSv);
  const [en, setEn] = useState(valueEn);
  useEffect(() => setSv(valueSv), [valueSv]);
  useEffect(() => setEn(valueEn), [valueEn]);

  return (
    <div className="grid gap-4 md:grid-cols-2">
      <div className="space-y-2">
        <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{labelSv} (SV)</label>
        <textarea
          rows={rows}
          value={sv}
          onChange={(e) => setSv(e.target.value)}
          disabled={isLoading}
          className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
        />
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => onSaveSv(sv)}
            disabled={isPending}
            className="inline-flex items-center gap-2 rounded-full bg-primary text-primary-foreground px-3 py-1.5 text-xs font-medium hover:opacity-90 disabled:opacity-50"
          >
            Spara SV
          </button>
          {defaultSv !== undefined && (
            <button
              type="button"
              onClick={() => setSv(defaultSv)}
              className="inline-flex items-center gap-2 rounded-full bg-secondary text-foreground px-3 py-1.5 text-xs font-medium hover:bg-accent"
            >
              Återställ
            </button>
          )}
        </div>
      </div>
      <div className="space-y-2">
        <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{labelEn} (EN)</label>
        <textarea
          rows={rows}
          value={en}
          onChange={(e) => setEn(e.target.value)}
          disabled={isLoading}
          placeholder="Lämna tomt för att falla tillbaka till svenska."
          className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
        />
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => onSaveEn(en)}
            disabled={isPending}
            className="inline-flex items-center gap-2 rounded-full bg-primary text-primary-foreground px-3 py-1.5 text-xs font-medium hover:opacity-90 disabled:opacity-50"
          >
            Spara EN
          </button>
          {defaultEn !== undefined && (
            <button
              type="button"
              onClick={() => setEn(defaultEn)}
              className="inline-flex items-center gap-2 rounded-full bg-secondary text-foreground px-3 py-1.5 text-xs font-medium hover:bg-accent"
            >
              Återställ
            </button>
          )}
        </div>
      </div>
    </div>
  );
}



export function CapacityIconSection() {
  const { data: iconUrl } = useCapacityIcon();
  const save = useSaveCapacityIcon();
  const [uploading, setUploading] = useState(false);

  const handleUpload = async (file: File) => {
    setUploading(true);
    try {
      const ext = file.name.split(".").pop();
      const path = `capacity-${crypto.randomUUID()}.${ext}`;
      const { error } = await supabase.storage.from("filter-icons").upload(path, file);
      if (error) throw error;
      const { data } = supabase.storage.from("filter-icons").getPublicUrl(path);
      await save.mutateAsync(data.publicUrl);
      toast.success("Sittplatsikon uppdaterad");
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="bg-card rounded-2xl border border-border p-6 max-w-2xl space-y-4">
      <div>
        <h2 className="text-lg font-bold">Ikon för antal sittplatser</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Visas bredvid antalet platser på alla lokalkort. Rekommenderat: kvadratisk SVG eller PNG (minst 64×64 px) med
          transparent bakgrund.
        </p>
      </div>

      <div className="flex items-center gap-4">
        <div className="h-12 w-12 rounded-md border border-border bg-secondary flex items-center justify-center">
          {iconUrl ? (
            <img src={iconUrl} alt="" className="h-7 w-7 object-contain" />
          ) : (
            <ChairIcon className="h-6 w-6 text-muted-foreground" />
          )}
        </div>
        <div className="text-sm text-muted-foreground">{iconUrl ? "Egen ikon används." : "Standardikon används."}</div>
      </div>

      <div className="flex gap-2 flex-wrap">
        <label className="inline-flex items-center gap-2 rounded-full bg-primary text-primary-foreground px-4 py-2 text-sm font-medium hover:opacity-90 cursor-pointer">
          <Upload className="h-4 w-4" />
          {uploading ? "Laddar upp..." : "Ladda upp ikon"}
          <input
            type="file"
            accept="image/*"
            className="hidden"
            disabled={uploading}
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) handleUpload(f);
              e.target.value = "";
            }}
          />
        </label>
        {iconUrl && (
          <button
            type="button"
            onClick={() => save.mutate(null, { onSuccess: () => toast.success("Återställd till standard") })}
            className="inline-flex items-center gap-2 rounded-full bg-secondary text-foreground px-4 py-2 text-sm font-medium hover:bg-accent"
          >
            Återställ till standard
          </button>
        )}
      </div>
    </div>
  );
}

// ---------------- Occupancy Settings Tab ----------------

